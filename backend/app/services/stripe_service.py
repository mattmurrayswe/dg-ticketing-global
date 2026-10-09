import stripe
from app.config.settings import STRIPE_SECRET_KEY, FRONTEND_URL

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def create_stripe_checkout_session(order_code: str, ticket_title: str, amount: float, currency: str, buyer_email: str) -> dict:
    """
    Creates a Stripe Checkout Session.
    Returns checkout_url and session_id.
    """
    if STRIPE_SECRET_KEY and not STRIPE_SECRET_KEY.startswith("sk_test_replace"):
        try:
            amount_in_cents = int(amount * 100)
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": currency.lower(),
                        "product_data": {
                            "name": f"Digital Garage Ticket - {ticket_title}",
                            "description": f"Order #{order_code}",
                        },
                        "unit_amount": amount_in_cents,
                    },
                    "quantity": 1,
                }],
                mode="payment",
                customer_email=buyer_email,
                client_reference_id=order_code,
                success_url=f"{FRONTEND_URL}/success?order_code={order_code}&session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{FRONTEND_URL}/checkout?cancelled=true",
            )
            return {
                "provider": "stripe",
                "session_id": session.id,
                "checkout_url": session.url
            }
        except Exception as e:
            print(f"[Stripe] Error creating session: {e}")

    # Sandbox / Demo response fallback
    demo_url = f"{FRONTEND_URL}/success?order_code={order_code}&demo=stripe_paid"
    return {
        "provider": "stripe_demo",
        "session_id": f"cs_test_demo_{order_code}",
        "checkout_url": demo_url
    }
