import urllib.parse
import requests
from app.config.settings import WHATSAPP_API_URL, WHATSAPP_TOKEN, FRONTEND_URL


def format_whatsapp_message(order_data: dict) -> str:
    """Formats the WhatsApp message text for ticket delivery."""
    car_text = ""
    if order_data.get("car_make"):
        car_text = f"\n🏎️ *Veículo:* {order_data.get('car_make')} {order_data.get('car_model')} ({order_data.get('license_plate', 'Sem Placa')})"

    return (
        f"🏎️ *DIGITAL GARAGE - INGRESSO CONFIRMADO* 🏎️\n\n"
        f"Olá *{order_data.get('buyer_name')}*!\n"
        f"Seu ingresso para o *{order_data.get('event_title')}* está pronto!\n\n"
        f"🎫 *Ingresso:* {order_data.get('tier_name')}\n"
        f"🔑 *Código:* `{order_data.get('order_code')}`"
        f"{car_text}\n"
        f"📅 *Data:* {order_data.get('event_date')}\n"
        f"📍 *Local:* {order_data.get('event_location')}\n\n"
        f"📲 *Ver Ingresso Digital com QR Code:* {FRONTEND_URL}/success?order_code={order_data.get('order_code')}\n\n"
        f"Nos vemos na pista! 🔥"
    )


def generate_whatsapp_deep_link(phone: str, order_data: dict) -> str:
    """Generates a wa.me deep link that opens WhatsApp directly on web/mobile."""
    clean_phone = "".join(filter(str.isdigit, phone))
    if not clean_phone.startswith("55") and len(clean_phone) <= 11:
        clean_phone = "55" + clean_phone

    text = format_whatsapp_message(order_data)
    encoded_text = urllib.parse.quote(text)
    return f"https://wa.me/{clean_phone}?text={encoded_text}"


def send_whatsapp_notification(phone: str, order_data: dict) -> dict:
    """Sends WhatsApp message via API if configured, otherwise returns wa.me deep link."""
    deep_link = generate_whatsapp_deep_link(phone, order_data)

    if WHATSAPP_API_URL and WHATSAPP_TOKEN:
        try:
            headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}", "Content-Type": "application/json"}
            payload = {
                "phone": phone,
                "message": format_whatsapp_message(order_data)
            }
            resp = requests.post(WHATSAPP_API_URL, json=payload, headers=headers, timeout=5)
            if resp.status_code == 200:
                return {"sent_via": "api", "status": "success", "deep_link": deep_link}
        except Exception as e:
            print(f"[WhatsApp API] Error: {e}")

    print(f"[WhatsApp Sim] Formatted message for {phone}. Deep link created.")
    return {"sent_via": "deep_link", "status": "simulated", "deep_link": deep_link}
