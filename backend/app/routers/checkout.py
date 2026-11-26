import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config.settings import SMTP_PASS, SMTP_USER
from app.db.database import get_db
from app.db.models import Coupon, Event, TicketOrder, TicketTier
from app.services.email_service import send_ticket_email
from app.services.infinitepay_service import (
    create_infinitepay_checkout,
    default_currency_for_event,
    infer_event_country,
    is_brazilian_event,
    verify_infinitepay_payment,
)
from app.services.stripe_service import create_stripe_checkout_session, verify_stripe_session
from app.services.ticket_pdf_service import generate_ticket_pdf, generate_ticket_qr_base64
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
    payment_method: str = "pix"  # 'pix' or 'credit_card'
    currency: Optional[str] = None  # 'BRL' for Brazil; 'USD' or 'EUR' for International


def _tier_price_for_currency(tier: TicketTier, currency: str) -> float:
    cur = (currency or "BRL").upper()
    if cur == "USD":
        return float(tier.price_usd or round(tier.price_brl / 5.0, 2))
    if cur == "EUR":
        return float(tier.price_eur or round(tier.price_brl / 5.5, 2))
    return float(tier.price_brl)


def _to_brl_equivalent(amount: float, currency: str) -> float:
    cur = (currency or "BRL").upper()
    if cur == "USD":
        return round(amount * 5.0, 2)
    if cur == "EUR":
        return round(amount * 5.5, 2)
    return round(amount, 2)


@router.post("/create")
def create_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    tier = db.query(TicketTier).filter(TicketTier.id == req.ticket_tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Ticket tier not found")

    event = db.query(Event).filter(Event.id == req.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if tier.requires_car_specs and (not req.car_make or not req.car_model or not req.license_plate):
        raise HTTPException(
            status_code=400,
            detail="Marca, modelo e placa do veículo são obrigatórios para esta categoria.",
        )

    is_br = is_brazilian_event(country=event.country, city=event.city, location=event.location)

    # Enforce regional gateway & currency rules:
    # - Brazilian events -> InfinitePay (BRL, PIX or Credit Card)
    # - International events -> Stripe (USD or EUR, International Card / Apple Pay / Google Pay)
    if is_br:
        gateway = "infinitepay"
        currency = "BRL"
        payment_method = req.payment_method if req.payment_method in ("pix", "credit_card") else "pix"
    else:
        gateway = "stripe"
        requested_cur = (req.currency or "").upper()
        currency = (
            requested_cur
            if requested_cur in ("USD", "EUR")
            else default_currency_for_event(country=event.country, city=event.city, location=event.location)
        )
        payment_method = "credit_card"

    subtotal_currency = _tier_price_for_currency(tier, currency)
    discount_currency = 0.0
    applied_code = None

    if req.coupon_code:
        cp = (
            db.query(Coupon)
            .filter(Coupon.code == req.coupon_code.strip().upper(), Coupon.active == True)
            .first()
        )
        if cp and (cp.usage_limit == 0 or cp.times_used < cp.usage_limit):
            applied_code = cp.code
            if cp.discount_type == "percentage":
                discount_currency = round(subtotal_currency * (cp.discount_value / 100.0), 2)
            else:
                fixed_in_cur = (
                    cp.discount_value
                    if currency == "BRL"
                    else round(cp.discount_value / (5.0 if currency == "USD" else 5.5), 2)
                )
                discount_currency = min(fixed_in_cur, subtotal_currency)
            cp.times_used += 1

    total_currency = round(max(0.0, subtotal_currency - discount_currency), 2)
    subtotal_brl = _to_brl_equivalent(subtotal_currency, currency)
    discount_brl = _to_brl_equivalent(discount_currency, currency)
    total_amount_brl = _to_brl_equivalent(total_currency, currency)

    order_code = f"DG-{secrets.token_hex(4).upper()}"

    order = TicketOrder(
        order_code=order_code,
        event_id=event.id,
        ticket_tier_id=tier.id,
        buyer_name=req.buyer_name.strip(),
        buyer_email=req.buyer_email.strip(),
        buyer_phone=req.buyer_phone.strip(),
        cpf_cnpj=req.cpf_cnpj.strip() if req.cpf_cnpj else None,
        car_make=req.car_make.strip() if req.car_make else None,
        car_model=req.car_model.strip() if req.car_model else None,
        car_year=req.car_year.strip() if req.car_year else None,
        car_color=req.car_color.strip() if req.car_color else None,
        license_plate=req.license_plate.strip().upper() if req.license_plate else None,
        quantity=1,
        subtotal_brl=subtotal_brl,
        discount_brl=discount_brl,
        total_amount_brl=total_amount_brl,
        currency=currency,
        applied_coupon=applied_code,
        payment_method=payment_method,
        payment_provider=gateway,
        payment_status="paid" if total_currency == 0 else "pending",
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    tier.quantity_sold += 1
    db.commit()

    payment_payload: dict = {}
    if total_currency == 0:
        payment_payload = {
            "provider": f"{gateway}_free",
            "checkout_url": None,
        }
    elif gateway == "infinitepay":
        inf_res = create_infinitepay_checkout(
            order_code=order_code,
            item_title=f"{event.title} - {tier.name}",
            amount_brl=total_amount_brl,
            buyer_name=order.buyer_name,
            buyer_email=order.buyer_email,
            buyer_phone=order.buyer_phone,
            payment_method=payment_method,
            cpf_cnpj=order.cpf_cnpj,
        )
        order.infinitepay_slug = inf_res.get("slug")
        order.checkout_url = inf_res.get("checkout_url")
        order.pix_qr_code = inf_res.get("pix_qr_code_base64")
        order.pix_copy_paste = inf_res.get("pix_copy_paste")
        db.commit()

        payment_payload = {
            "provider": inf_res.get("provider", "infinitepay"),
            "gateway": "infinitepay",
            "slug": order.infinitepay_slug,
            "checkout_url": order.checkout_url,
            "pix_copy_paste": order.pix_copy_paste,
            "pix_qr_code_base64": order.pix_qr_code,
        }
    else:
        stripe_res = create_stripe_checkout_session(
            order_code=order_code,
            ticket_title=f"{event.title} - {tier.name}",
            amount=total_currency,
            currency=currency,
            buyer_email=order.buyer_email,
            event_slug=event.slug,
        )
        order.stripe_session_id = stripe_res.get("session_id")
        order.checkout_url = stripe_res.get("checkout_url")
        db.commit()

        payment_payload = {
            "provider": stripe_res.get("provider", "stripe"),
            "gateway": "stripe",
            "session_id": order.stripe_session_id,
            "checkout_url": order.checkout_url,
        }

    order_data = _build_order_ticket_payload(order, event, tier)
    send_ticket_email(order.buyer_email, order_data)
    wa_res = send_whatsapp_notification(order.buyer_phone, order_data)

    return {
        "status": "success",
        "order_code": order_code,
        "payment_gateway": gateway,
        "payment_method": payment_method,
        "payment_status": order.payment_status,
        "currency": currency,
        "subtotal": subtotal_currency,
        "discount": discount_currency,
        "total_amount": total_currency,
        "total_amount_brl": total_amount_brl,
        "applied_coupon": applied_code,
        "discount_brl": discount_brl,
        "payment_details": payment_payload,
        "ticket_qr_base64": order_data["ticket_qr_base64"],
        "pdf_url": f"/api/checkout/order/{order_code}/pdf",
        "whatsapp_link": wa_res.get("deep_link"),
    }


def _build_order_ticket_payload(order: TicketOrder, event: Optional[Event], tier: Optional[TicketTier]) -> dict:
    country = (
        infer_event_country(country=event.country, city=event.city, location=event.location)
        if event
        else "BR"
    )
    is_br = (
        is_brazilian_event(country=country, city=event.city, location=event.location)
        if event
        else True
    )
    cur = (order.currency or "BRL").upper()
    if cur == "USD":
        display_amount = round(order.total_amount_brl / 5.0, 2)
    elif cur == "EUR":
        display_amount = round(order.total_amount_brl / 5.5, 2)
    else:
        display_amount = round(order.total_amount_brl, 2)

    return {
        "order_code": order.order_code,
        "event_slug": event.slug if event else None,
        "event_title": event.title if event else "Digital Garage Car Meet",
        "event_subtitle": event.subtitle if event else None,
        "event_date": event.date if event else "",
        "event_location": event.location if event else "",
        "event_address": event.address if event else None,
        "event_city": event.city if event else None,
        "event_country": country,
        "is_brazilian": is_br,
        "event_banner_url": event.banner_url if event else None,
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
        "payment_provider": order.payment_provider or ("infinitepay" if is_br else "stripe"),
        "payment_status": order.payment_status,
        "total_amount": display_amount,
        "total_amount_brl": order.total_amount_brl,
        "currency": cur,
        "checkout_url": order.checkout_url,
        "pix_copy_paste": order.pix_copy_paste,
        "pix_qr_code_base64": order.pix_qr_code,
        "ticket_qr_base64": generate_ticket_qr_base64(order.order_code),
        "pdf_url": f"/api/checkout/order/{order.order_code}/pdf",
        "checked_in": order.checked_in,
        "checked_in_at": order.checked_in_at.isoformat() if order.checked_in_at else None,
        "created_at": order.created_at.isoformat(),
    }


def _get_order_entities(order_code: str, db: Session):
    order = db.query(TicketOrder).filter(TicketOrder.order_code == order_code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    event = db.query(Event).filter(Event.id == order.event_id).first()
    tier = db.query(TicketTier).filter(TicketTier.id == order.ticket_tier_id).first()
    return order, event, tier


class VerifyPaymentRequest(BaseModel):
    provider: Optional[str] = None
    session_id: Optional[str] = None
    slug: Optional[str] = None
    transaction_nsu: Optional[str] = None
    demo: Optional[str] = None


@router.post("/order/{order_code}/verify")
def verify_order_payment(
    order_code: str,
    req: VerifyPaymentRequest,
    db: Session = Depends(get_db),
):
    order, event, tier = _get_order_entities(order_code, db)

    if order.payment_status != "paid":
        marked_paid = False
        if req.demo in ("stripe_paid", "infinitepay_paid"):
            marked_paid = True
        elif req.session_id:
            check = verify_stripe_session(req.session_id)
            if check.get("paid"):
                marked_paid = True
        elif (order.payment_provider == "infinitepay" or req.provider == "infinitepay") and (
            req.slug or req.transaction_nsu or order.infinitepay_slug
        ):
            check = verify_infinitepay_payment(
                order_code=order.order_code,
                slug=req.slug or order.infinitepay_slug,
                transaction_nsu=req.transaction_nsu,
            )
            if check.get("paid"):
                marked_paid = True

        if marked_paid:
            order.payment_status = "paid"
            db.commit()
            db.refresh(order)

    return _build_order_ticket_payload(order, event, tier)


@router.get("/order/{order_code}")
def get_order(order_code: str, db: Session = Depends(get_db)):
    order, event, tier = _get_order_entities(order_code, db)
    payload = _build_order_ticket_payload(order, event, tier)
    wa_res = send_whatsapp_notification(order.buyer_phone, payload)
    payload["whatsapp_link"] = wa_res.get("deep_link")
    return payload


@router.get("/order/{order_code}/pdf")
def download_order_pdf(
    order_code: str,
    inline: bool = Query(False, description="Render inline for browser/mobile preview instead of attachment download"),
    db: Session = Depends(get_db),
):
    order, event, tier = _get_order_entities(order_code, db)
    order_data = _build_order_ticket_payload(order, event, tier)
    pdf_bytes = generate_ticket_pdf(order_data)
    disposition = "inline" if inline else "attachment"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'{disposition}; filename="Ingresso-DigitalGarage-{order.order_code}.pdf"',
            "Cache-Control": "no-store",
        },
    )


class ResendEmailRequest(BaseModel):
    email: Optional[str] = None


@router.post("/order/{order_code}/send-email")
def resend_order_email(
    order_code: str,
    req: Optional[ResendEmailRequest] = None,
    db: Session = Depends(get_db),
):
    order, event, tier = _get_order_entities(order_code, db)
    recipient = req.email.strip() if req and req.email else order.buyer_email
    order_data = _build_order_ticket_payload(order, event, tier)
    ok = send_ticket_email(recipient, order_data)
    if not ok:
        raise HTTPException(status_code=500, detail="Falha ao enviar ingresso por e-mail")
    return {
        "status": "success",
        "sent_to": recipient,
        "simulated": not bool(SMTP_PASS and SMTP_USER),
    }
