import base64
import io
import re
from typing import Optional

import qrcode
import requests

from app.config.settings import (
    BACKEND_PUBLIC_URL,
    FRONTEND_URL,
    INFINITEPAY_API_KEY,
    INFINITEPAY_API_URL,
    INFINITEPAY_HANDLE,
)

INTERNATIONAL_KEYWORDS = (
    "hungary",
    "budapest",
    "italy",
    "italia",
    "lake como",
    "como",
    "united kingdom",
    "uk",
    "england",
    "goodwood",
    "london",
    "united states",
    "usa",
    "miami",
    "california",
    "los angeles",
    "las vegas",
    "germany",
    "nürburgring",
    "nurburgring",
    "munich",
    "berlin",
    "japan",
    "tokyo",
    "yokohama",
    "osaka",
    "france",
    "paris",
    "le mans",
    "monaco",
    "spain",
    "madrid",
    "barcelona",
    "portugal",
    "lisbon",
    "lisboa",
    "porto",
    "switzerland",
    "geneva",
    "austria",
    "wörthersee",
    "uae",
    "dubai",
    "abu dhabi",
)

BRAZIL_COUNTRY_VALUES = {"br", "bra", "brazil", "brasil"}


def infer_event_country(
    country: Optional[str] = None,
    city: Optional[str] = None,
    location: Optional[str] = None,
) -> str:
    """Determines ISO-like country code ('BR' vs international code) for an event."""
    if country and country.strip():
        cleaned = country.strip()
        low = cleaned.lower()
        if low in BRAZIL_COUNTRY_VALUES:
            return "BR"
        if low in {"hu", "hungary", "hungria"}:
            return "HU"
        if low in {"it", "italy", "italia", "itália"}:
            return "IT"
        if low in {"gb", "uk", "united kingdom", "england", "reino unido"}:
            return "GB"
        if low in {"us", "usa", "united states", "estados unidos"}:
            return "US"
        if low in {"jp", "japan", "japão", "japao"}:
            return "JP"
        if low in {"de", "germany", "alemanha"}:
            return "DE"
        if low in {"pt", "portugal"}:
            return "PT"
        return cleaned.upper()[:60]

    haystack = f"{city or ''} {location or ''}".lower()
    if any(k in haystack for k in ("hungary", "budapest")):
        return "HU"
    if any(k in haystack for k in ("italy", "italia", "lake como")):
        return "IT"
    if any(k in haystack for k in ("united kingdom", "goodwood", "london", ", uk")):
        return "GB"
    if any(k in haystack for k in ("united states", "usa", "miami", "california")):
        return "US"
    if any(k in haystack for k in INTERNATIONAL_KEYWORDS):
        return "INTL"
    return "BR"


def is_brazilian_event(
    country: Optional[str] = None,
    city: Optional[str] = None,
    location: Optional[str] = None,
) -> bool:
    """Returns True when an event takes place in Brazil (routed to InfinitePay)."""
    resolved = infer_event_country(country=country, city=city, location=location)
    if resolved.upper() != "BR":
        return False
    # Double-check city/location in case country defaulted to 'BR' on an older row
    haystack = f"{city or ''} {location or ''}".lower()
    if any(k in haystack for k in INTERNATIONAL_KEYWORDS):
        return False
    return True


def default_currency_for_event(
    country: Optional[str] = None,
    city: Optional[str] = None,
    location: Optional[str] = None,
) -> str:
    """Returns default checkout currency ('BRL' for Brazil, 'EUR' for Europe, 'USD' otherwise)."""
    resolved = infer_event_country(country=country, city=city, location=location).upper()
    if resolved == "BR":
        return "BRL"
    if resolved in {"IT", "HU", "DE", "FR", "ES", "PT", "AT", "NL", "BE", "EU"}:
        return "EUR"
    return "USD"


def _format_br_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        return "+5511999999999"
    if digits.startswith("55") and len(digits) >= 12:
        return f"+{digits}"
    if len(digits) in (10, 11):
        return f"+55{digits}"
    return f"+{digits}"


def _generate_monochrome_qr_base64(payload_text: str) -> str:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(payload_text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#08090b", back_color="#ffffff")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")


def create_infinitepay_checkout(
    order_code: str,
    item_title: str,
    amount_brl: float,
    buyer_name: str,
    buyer_email: str,
    buyer_phone: str,
    payment_method: str = "pix",
    cpf_cnpj: Optional[str] = None,
) -> dict:
    """
    Creates an InfinitePay Integrated Checkout link for Brazilian events (PIX & Credit Card).
    Uses POST https://api.checkout.infinitepay.io/links when INFINITEPAY_HANDLE is configured,
    with a seamless local sandbox fallback when credentials are not set.
    """
    amount_in_cents = max(100, int(round(amount_brl * 100))) if amount_brl > 0 else 0
    redirect_url = f"{FRONTEND_URL}/success?order_code={order_code}&provider=infinitepay"
    webhook_url = f"{BACKEND_PUBLIC_URL}/api/webhooks/infinitepay"

    handle = (INFINITEPAY_HANDLE or "").strip().lstrip("$")
    if handle and amount_in_cents > 0:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if INFINITEPAY_API_KEY:
            headers["X-Api-Key"] = INFINITEPAY_API_KEY.strip()

        customer_payload = {
            "name": buyer_name,
            "email": buyer_email,
            "phone_number": _format_br_phone(buyer_phone),
        }
        if cpf_cnpj:
            clean_doc = re.sub(r"\D", "", cpf_cnpj)
            if clean_doc:
                customer_payload["document_number"] = clean_doc

        payload = {
            "handle": handle,
            "order_nsu": order_code,
            "redirect_url": redirect_url,
            "webhook_url": webhook_url,
            "items": [
                {
                    "description": f"Digital Garage - {item_title}"[:120],
                    "quantity": 1,
                    "price": amount_in_cents,
                }
            ],
            "customer": customer_payload,
        }
        if INFINITEPAY_API_KEY:
            enabled = ["pix"] if payment_method == "pix" else ["credit_card", "pix"]
            payload["options"] = {
                "single_payment": True,
                "payment_methods_enabled": enabled,
            }

        endpoints = [
            f"{INFINITEPAY_API_URL.rstrip('/')}/links",
            "https://api.infinitepay.io/invoices/public/checkout/links",
        ]
        for url in endpoints:
            try:
                resp = requests.post(url, json=payload, headers=headers, timeout=10)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    checkout_url = data.get("url") or data.get("checkout_url")
                    slug = data.get("slug") or data.get("invoice_slug") or order_code
                    if checkout_url:
                        return {
                            "provider": "infinitepay",
                            "status": "pending",
                            "slug": slug,
                            "checkout_url": checkout_url,
                            "pix_copy_paste": data.get("pix_copy_paste") or data.get("br_code"),
                            "pix_qr_code_base64": (
                                _generate_monochrome_qr_base64(data["br_code"])
                                if data.get("br_code")
                                else None
                            ),
                        }
                else:
                    print(f"[InfinitePay] Non-200 from {url}: {resp.status_code} {resp.text[:200]}")
            except Exception as exc:
                print(f"[InfinitePay] Error calling {url}: {exc}")

    # Local dev / demo fallback when INFINITEPAY_HANDLE is not set
    demo_checkout_url = f"{FRONTEND_URL}/success?order_code={order_code}&provider=infinitepay&demo=infinitepay_paid"
    if payment_method == "pix":
        demo_pix_code = (
            f"00020126640014br.gov.bcb.pix0142infinitepay-pix-{order_code.lower()}@infinitepay.io"
            f"5204000053039865406{amount_brl:06.2f}5802BR5914INFINITEPAY DG6009SAO PAULO"
            f"62070503***6304{order_code[-4:]}"
        )
        return {
            "provider": "infinitepay_sandbox",
            "status": "pending",
            "slug": f"infpay_pix_{order_code.lower()}",
            "checkout_url": demo_checkout_url,
            "pix_copy_paste": demo_pix_code,
            "pix_qr_code_base64": _generate_monochrome_qr_base64(demo_pix_code),
        }

    return {
        "provider": "infinitepay_sandbox",
        "status": "pending",
        "slug": f"infpay_card_{order_code.lower()}",
        "checkout_url": demo_checkout_url,
        "pix_copy_paste": None,
        "pix_qr_code_base64": None,
    }


def verify_infinitepay_payment(
    order_code: str,
    slug: Optional[str] = None,
    transaction_nsu: Optional[str] = None,
) -> dict:
    """
    Confirms payment status directly with InfinitePay's payment_check endpoint.
    """
    handle = (INFINITEPAY_HANDLE or "").strip().lstrip("$")
    if not handle:
        return {"paid": False, "simulated": True}

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if INFINITEPAY_API_KEY:
        headers["X-Api-Key"] = INFINITEPAY_API_KEY.strip()

    payload = {"handle": handle, "order_nsu": order_code}
    if slug:
        payload["slug"] = slug
    if transaction_nsu:
        payload["transaction_nsu"] = transaction_nsu

    endpoints = [
        f"{INFINITEPAY_API_URL.rstrip('/')}/payment_check",
        "https://api.infinitepay.io/invoices/public/checkout/payment_check",
    ]
    for url in endpoints:
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "paid": bool(data.get("paid") is True or data.get("success") is True and data.get("paid")),
                    "capture_method": data.get("capture_method"),
                    "transaction_nsu": data.get("transaction_nsu"),
                    "receipt_url": data.get("receipt_url"),
                }
        except Exception as exc:
            print(f"[InfinitePay] payment_check error ({url}): {exc}")

    return {"paid": False, "simulated": False}
