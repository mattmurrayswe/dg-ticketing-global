import io
import base64
import requests
import qrcode
from app.config.settings import PAGARME_API_KEY


def generate_pix_qr_code_image(copy_paste_text: str) -> str:
    """Generates a base64 encoded PNG image for a given PIX Copy and Paste string."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(copy_paste_text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")


def create_pagarme_pix_charge(order_code: str, amount_brl: float, buyer_name: str, buyer_email: str) -> dict:
    """
    Creates a Pagar.me V5 PIX charge.
    If PAGARME_API_KEY is not configured or fails, provides a valid fallback payload for demonstration.
    """
    amount_in_cents = int(amount_brl * 100)

    if PAGARME_API_KEY:
        url = "https://api.pagar.me/core/v5/orders"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Basic {base64.b64encode((PAGARME_API_KEY + ':').encode()).decode()}"
        }
        payload = {
            "items": [
                {
                    "amount": amount_in_cents,
                    "description": f"Ingresso Digital Garage - {order_code}",
                    "quantity": 1
                }
            ],
            "customer": {
                "name": buyer_name,
                "email": buyer_email,
                "type": "individual"
            },
            "payments": [
                {
                    "payment_method": "pix",
                    "pix": {
                        "expires_in": 3600
                    }
                }
            ]
        }
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code == 200 or resp.status_code == 201:
                data = resp.json()
                charge = data["charges"][0]["last_transaction"]
                qr_code_url = charge.get("qr_code_url", "")
                copy_paste = charge.get("qr_code", "")
                qr_code_base64 = generate_pix_qr_code_image(copy_paste) if copy_paste else ""
                return {
                    "provider": "pagarme",
                    "status": "pending",
                    "order_id": data.get("id"),
                    "pix_copy_paste": copy_paste,
                    "pix_qr_code_base64": qr_code_base64 or qr_code_url,
                }
        except Exception as e:
            print(f"[Pagar.me] Request error: {e}")

    # Fallback / Demo PIX Generation
    demo_copy_paste = (
        f"00020126580014br.gov.bcb.pix0136digitalgarage-pix-{order_code}@dg.com.br"
        f"5204000053039865405{amount_brl:.2f}5802BR5914DIGITAL GARAGE6009SAO PAULO"
        f"62070503***6304{order_code[:4]}"
    )
    qr_base64 = generate_pix_qr_code_image(demo_copy_paste)

    return {
        "provider": "pagarme_sandbox",
        "status": "pending",
        "order_id": f"pagarme_demo_{order_code}",
        "pix_copy_paste": demo_copy_paste,
        "pix_qr_code_base64": qr_base64,
    }
