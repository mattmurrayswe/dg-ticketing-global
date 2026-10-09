import secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import TicketOrder, TicketTier, Event, Coupon
from app.services.pagarme_service import create_pagarme_pix_charge
from app.services.stripe_service import create_stripe_checkout_session
from app.services.email_service import send_ticket_email
from app.services.whatsapp_service import send_whatsapp_notification

router = APIRouter(prefix="/api/checkout", tags=["Checkout"])


class CheckoutRequest(BaseModel):
    event_id: int
    ticket_tier_id: int
    buyer_name: str
    buyer_email: str
    buyer_phone: str
    cpf_cnpj: Optional[str] = None
    
    # Car Specs (optional for general admission, required for Expositor)
    car_make: Optional[str] = None
    car_model: Optional[str] = None
    car_year: Optional[str] = None
    car_color: Optional[str] = None
    license_plate: Optional[str] = None

    coupon_code: Optional[str] = None
    payment_method: str  # 'pix' or 'credit_card'
    currency: Optional[str] = "BRL"  # 'BRL', 'USD', 'EUR'


@router.post("/create")
def create_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    tier = db.query(TicketTier).filter(TicketTier.id == req.ticket_tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Ticket tier not found")

    event = db.query(Event).filter(Event.id == req.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if tier.requires_car_specs and (not req.car_make or not req.car_model or not req.license_plate):
        raise HTTPException(status_code=400, detail="Vehicle make, model and license plate are required for this ticket tier")

    # Determine base price based on currency
    if req.currency == "USD":
        base_price_brl = tier.price_usd * 5.0
    elif req.currency == "EUR":
        base_price_brl = tier.price_eur * 5.5
    else:
        base_price_brl = tier.price_brl

    subtotal = base_price_brl
    discount = 0.0
    applied_code = None

    # Process Coupon if provided
    if req.coupon_code:
        cp = db.query(Coupon).filter(Coupon.code == req.coupon_code.upper(), Coupon.active == True).first()
        if cp and (cp.usage_limit == 0 or cp.times_used < cp.usage_limit):
            applied_code = cp.code
            if cp.discount_type == "percentage":
                discount = subtotal * (cp.discount_value / 100.0)
            else:
                discount = min(cp.discount_value, subtotal)
            cp.times_used += 1

    total_amount = max(0.0, subtotal - discount)
    order_code = f"DG-{secrets.token_hex(4).upper()}"

    order = TicketOrder(
        order_code=order_code,
        event_id=event.id,
        ticket_tier_id=tier.id,
        buyer_name=req.buyer_name,
        buyer_email=req.buyer_email,
        buyer_phone=req.buyer_phone,
        cpf_cnpj=req.cpf_cnpj,
        car_make=req.car_make,
        car_model=req.car_model,
        car_year=req.car_year,
        car_color=req.car_color,
        license_plate=req.license_plate.upper() if req.license_plate else None,
        quantity=1,
        subtotal_brl=subtotal,
        discount_brl=discount,
        total_amount_brl=total_amount,
        currency=req.currency or "BRL",
        applied_coupon=applied_code,
        payment_method=req.payment_method,
        payment_status="pending"
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    # Increase tier sold quantity draft
    tier.quantity_sold += 1
    db.commit()

    payment_payload = {}
    if req.payment_method == "pix":
        pix_res = create_pagarme_pix_charge(
            order_code=order_code,
            amount_brl=total_amount,
            buyer_name=req.buyer_name,
            buyer_email=req.buyer_email
        )
        order.pix_qr_code = pix_res.get("pix_qr_code_base64")
        order.pix_copy_paste = pix_res.get("pix_copy_paste")
        db.commit()

        payment_payload = {
            "pix_copy_paste": order.pix_copy_paste,
            "pix_qr_code_base64": order.pix_qr_code,
            "provider": pix_res.get("provider")
        }
    else:
        stripe_res = create_stripe_checkout_session(
            order_code=order_code,
            ticket_title=f"{event.title} - {tier.name}",
            amount=total_amount / (5.0 if req.currency == "USD" else 5.5 if req.currency == "EUR" else 1.0),
            currency=req.currency or "BRL",
            buyer_email=req.buyer_email
        )
        order.stripe_session_id = stripe_res.get("session_id")
        db.commit()

        payment_payload = {
            "checkout_url": stripe_res.get("checkout_url"),
            "session_id": stripe_res.get("session_id"),
            "provider": stripe_res.get("provider")
        }

    # Dispatch notification triggers
    order_data = {
        "order_code": order_code,
        "buyer_name": req.buyer_name,
        "event_title": event.title,
        "event_date": event.date,
        "event_location": event.location,
        "tier_name": tier.name,
        "car_make": req.car_make,
        "car_model": req.car_model,
        "car_year": req.car_year,
        "car_color": req.car_color,
        "license_plate": req.license_plate
    }
    
    send_ticket_email(req.buyer_email, order_data)
    wa_res = send_whatsapp_notification(req.buyer_phone, order_data)

    return {
        "status": "success",
        "order_code": order_code,
        "payment_method": req.payment_method,
        "payment_status": order.payment_status,
        "total_amount_brl": total_amount,
        "applied_coupon": applied_code,
        "discount_brl": discount,
        "payment_details": payment_payload,
        "whatsapp_link": wa_res.get("deep_link")
    }


@router.get("/order/{order_code}")
def get_order(order_code: str, db: Session = Depends(get_db)):
    order = db.query(TicketOrder).filter(TicketOrder.order_code == order_code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    event = db.query(Event).filter(Event.id == order.event_id).first()
    tier = db.query(TicketTier).filter(TicketTier.id == order.ticket_tier_id).first()

    return {
        "order_code": order.order_code,
        "event_title": event.title if event else "Digital Garage Car Meet",
        "event_date": event.date if event else "",
        "event_location": event.location if event else "",
        "tier_name": tier.name if tier else "",
        "buyer_name": order.buyer_name,
        "buyer_email": order.buyer_email,
        "buyer_phone": order.buyer_phone,
        "car_make": order.car_make,
        "car_model": order.car_model,
        "car_year": order.car_year,
        "car_color": order.car_color,
        "license_plate": order.license_plate,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "total_amount_brl": order.total_amount_brl,
        "currency": order.currency,
        "pix_copy_paste": order.pix_copy_paste,
        "pix_qr_code_base64": order.pix_qr_code,
        "checked_in": order.checked_in,
        "checked_in_at": order.checked_in_at.isoformat() if order.checked_in_at else None,
        "created_at": order.created_at.isoformat()
    }
