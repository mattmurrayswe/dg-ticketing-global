from typing import Optional
import stripe
from app.config.settings import STRIPE_SECRET_KEY, FRONTEND_URL

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def _has_live_stripe_key() -> bool:
    return bool(STRIPE_SECRET_KEY and not STRIPE_SECRET_KEY.startswith("sk_test_replace"))


def create_stripe_checkout_session(
    order_code: str,
    ticket_title: str,
    amount: float,
    currency: str,
    buyer_email: str,
    event_slug: Optional[str] = None,
) -> dict:
    """
    Creates a Stripe Checkout Session for International events (Credit/Debit Card, Apple Pay, Google Pay).
    Returns checkout_url and session_id.
    """
    normalized_currency = (currency or "USD").lower()
    if normalized_currency not in {"usd", "eur", "gbp", "brl"}:
        normalized_currency = "usd"

    cancel_path = f"/eventos/{event_slug}?cancelled=true" if event_slug else "/checkout?cancelled=true"

    if _has_live_stripe_key():
        try:
            amount_in_cents = max(50, int(round(amount * 100)))
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": normalized_currency,
                            "product_data": {
                                "name": f"Digital Garage Pass — {ticket_title}",
                                "description": f"Official Event Pass #{order_code}",
                            },
                            "unit_amount": amount_in_cents,
                        },
                        "quantity": 1,
                    }
                ],
                mode="payment",
                customer_email=buyer_email,
                client_reference_id=order_code,
                metadata={
                    "order_code": order_code,
                    "event_slug": event_slug or "",
                },
                success_url=f"{FRONTEND_URL}/success?order_code={order_code}&provider=stripe&session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{FRONTEND_URL}{cancel_path}",
            )
            return {
                "provider": "stripe",
                "session_id": session.id,
                "checkout_url": session.url,
            }
        except Exception as e:
            print(f"[Stripe] Error creating session: {e}")

    # Sandbox / Demo response fallback
    demo_url = f"{FRONTEND_URL}/success?order_code={order_code}&provider=stripe&demo=stripe_paid"
    return {
        "provider": "stripe_demo",
        "session_id": f"cs_test_demo_{order_code}",
        "checkout_url": demo_url,
    }


def verify_stripe_session(session_id: str) -> dict:
    """Checks Stripe Checkout Session payment status when returning to /success."""
    if not session_id or not _has_live_stripe_key():
        return {"paid": False}
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "paid": session.payment_status == "paid",
            "order_code": session.client_reference_id,
        }
    except Exception as exc:
        print(f"[Stripe] Error verifying session {session_id}: {exc}")
        return {"paid": False}
