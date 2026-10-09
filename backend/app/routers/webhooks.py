from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import TicketOrder
from app.services.email_service import send_ticket_email
from app.services.whatsapp_service import send_whatsapp_notification

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


@router.post("/pagarme")
async def pagarme_webhook(request: Request, db: Session = Depends(get_db)):
    """Pagar.me V5 Webhook listener for PIX payment confirmation."""
    payload = await request.json()
    print(f"[Pagar.me Webhook] Event received: {payload.get('type')}")

    event_type = payload.get("type", "")
    if "order.paid" in event_type or "charge.paid" in event_type:
        charge_data = payload.get("data", {})
        code = charge_data.get("code") or charge_data.get("order", {}).get("code")
        
        if code:
            order = db.query(TicketOrder).filter(TicketOrder.order_code == code).first()
            if order and order.payment_status != "paid":
                order.payment_status = "paid"
                db.commit()
                print(f"[Pagar.me Webhook] Order #{order.order_code} marked as PAID!")

                # Notify customer
                order_data = {
                    "order_code": order.order_code,
                    "buyer_name": order.buyer_name,
                    "event_title": "Digital Garage Car Meet",
                    "event_date": "2026-10-24",
                    "event_location": "Paddock Central",
                    "tier_name": "Ingresso Confirmado PIX",
                    "car_make": order.car_make,
                    "car_model": order.car_model,
                    "license_plate": order.license_plate
                }
                send_ticket_email(order.buyer_email, order_data)
                send_whatsapp_notification(order.buyer_phone, order_data)

    return {"status": "received"}


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe Webhook listener for Credit Card payment confirmation."""
    payload = await request.json()
    print(f"[Stripe Webhook] Event received: {payload.get('type')}")

    event_type = payload.get("type", "")
    if event_type in ["checkout.session.completed", "payment_intent.succeeded"]:
        session_data = payload.get("data", {}).get("object", {})
        order_code = session_data.get("client_reference_id")

        if order_code:
            order = db.query(TicketOrder).filter(TicketOrder.order_code == order_code).first()
            if order and order.payment_status != "paid":
                order.payment_status = "paid"
                db.commit()
                print(f"[Stripe Webhook] Order #{order.order_code} marked as PAID!")

                order_data = {
                    "order_code": order.order_code,
                    "buyer_name": order.buyer_name,
                    "event_title": "Digital Garage Car Meet",
                    "event_date": "2026-10-24",
                    "event_location": "Paddock Central",
                    "tier_name": "Ingresso Confirmado Stripe",
                    "car_make": order.car_make,
                    "car_model": order.car_model,
                    "license_plate": order.license_plate
                }
                send_ticket_email(order.buyer_email, order_data)
                send_whatsapp_notification(order.buyer_phone, order_data)

    return {"status": "received"}
