from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import stripe

from app.config.settings import INFINITEPAY_HANDLE, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
from app.db.database import get_db
from app.db.models import Event, TicketOrder, TicketTier
from app.services.email_service import send_ticket_email
from app.services.infinitepay_service import verify_infinitepay_payment
from app.services.whatsapp_service import send_whatsapp_notification

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


def _notify_paid_order(order: TicketOrder, db: Session):
    event = db.query(Event).filter(Event.id == order.event_id).first()
    tier = db.query(TicketTier).filter(TicketTier.id == order.ticket_tier_id).first()
    order_data = {
        "order_code": order.order_code,
        "buyer_name": order.buyer_name,
        "buyer_email": order.buyer_email,
        "buyer_phone": order.buyer_phone,
        "event_title": event.title if event else "Digital Garage Car Meet",
        "event_subtitle": event.subtitle if event else None,
        "event_date": event.date if event else "",
        "event_location": event.location if event else "",
        "event_address": event.address if event else None,
        "event_city": event.city if event else None,
        "tier_name": tier.name if tier else "Ingresso Confirmado",
        "car_make": order.car_make,
        "car_model": order.car_model,
        "car_year": order.car_year,
        "car_color": order.car_color,
        "license_plate": order.license_plate,
        "payment_method": order.payment_method,
        "payment_status": "paid",
        "total_amount_brl": order.total_amount_brl,
        "currency": order.currency,
    }
    send_ticket_email(order.buyer_email, order_data)
    send_whatsapp_notification(order.buyer_phone, order_data)


@router.post("/infinitepay")
async def infinitepay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    InfinitePay Integrated Checkout webhook listener for Brazilian events (PIX & Credit Card).
    """
    payload = await request.json()
    event_type = (payload.get("event") or payload.get("status") or "").lower()
    order_nsu = payload.get("order_nsu") or payload.get("metadata", {}).get("order_nsu")
    slug = payload.get("slug") or payload.get("invoice_slug")
    transaction_nsu = payload.get("transaction_nsu")
    capture_method = payload.get("capture_method")

    print(f"[InfinitePay Webhook] Event={event_type} order_nsu={order_nsu}")

    if not order_nsu:
        return {"status": "ignored", "reason": "missing_order_nsu"}

    order = db.query(TicketOrder).filter(TicketOrder.order_code == order_nsu).first()
    if not order:
        return {"status": "ignored", "reason": "order_not_found"}

    is_paid_signal = event_type in ("paid", "settled", "approved", "") and (
        payload.get("paid") is True or event_type in ("paid", "settled", "approved")
    )

    if is_paid_signal and order.payment_status != "paid":
        # Verify directly against InfinitePay's payment_check endpoint when handle is configured
        if INFINITEPAY_HANDLE:
            verification = verify_infinitepay_payment(
                order_code=order.order_code,
                slug=slug or order.infinitepay_slug,
                transaction_nsu=transaction_nsu,
            )
            if not verification.get("paid"):
                print(f"[InfinitePay Webhook] payment_check did not confirm order {order.order_code}")
                return {"status": "pending_verification"}

        order.payment_status = "paid"
        order.payment_provider = "infinitepay"
        if slug:
            order.infinitepay_slug = slug
        if capture_method in ("pix", "credit_card"):
            order.payment_method = capture_method
        db.commit()
        print(f"[InfinitePay Webhook] Order #{order.order_code} marked as PAID!")
        _notify_paid_order(order, db)

    return {"status": "received"}


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe Webhook listener for International Event payment confirmation."""
    raw_body = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY and sig_header:
        try:
            event_obj = stripe.Webhook.construct_event(raw_body, sig_header, STRIPE_WEBHOOK_SECRET)
            payload = dict(event_obj)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid Stripe signature: {exc}")
    else:
        payload = await request.json()

    event_type = payload.get("type", "")
    print(f"[Stripe Webhook] Event received: {event_type}")

    if event_type in ["checkout.session.completed", "payment_intent.succeeded"]:
        session_data = payload.get("data", {}).get("object", {})
        order_code = session_data.get("client_reference_id") or session_data.get("metadata", {}).get("order_code")

        if order_code:
            order = db.query(TicketOrder).filter(TicketOrder.order_code == order_code).first()
            if order and order.payment_status != "paid":
                order.payment_status = "paid"
                order.payment_provider = "stripe"
                db.commit()
                print(f"[Stripe Webhook] Order #{order.order_code} marked as PAID!")
                _notify_paid_order(order, db)

    return {"status": "received"}


@router.post("/pagarme")
async def pagarme_webhook(request: Request, db: Session = Depends(get_db)):
    """Legacy Pagar.me webhook listener kept for backward compatibility."""
    payload = await request.json()
    event_type = payload.get("type", "")
    if "order.paid" in event_type or "charge.paid" in event_type:
        charge_data = payload.get("data", {})
        code = charge_data.get("code") or charge_data.get("order", {}).get("code")
        if code:
            order = db.query(TicketOrder).filter(TicketOrder.order_code == code).first()
            if order and order.payment_status != "paid":
                order.payment_status = "paid"
                db.commit()
                _notify_paid_order(order, db)
    return {"status": "received"}
