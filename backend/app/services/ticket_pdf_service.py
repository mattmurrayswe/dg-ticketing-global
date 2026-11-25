import base64
import io
import os
from typing import Any, Dict

import qrcode
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Digital Garage Brand Palette (mirrors LandingPage.tsx, CreateEventFlow.tsx & .dg-parede-queimada)
DG_BLACK = colors.HexColor("#050608")
DG_DARK = colors.HexColor("#08090b")
DG_GRAD_TOP = colors.HexColor("#0d0e14")
DG_GRAD_MID = colors.HexColor("#0b0c11")
DG_GRAD_RIGHT = colors.HexColor("#101219")
DG_CARD = colors.HexColor("#0b0d12")
DG_PANEL = colors.HexColor("#08090b")
DG_BORDER = colors.HexColor("#1e222e")
DG_BORDER_STRONG = colors.HexColor("#262a36")
DG_TEXT = colors.HexColor("#ffffff")
DG_TEXT_SOFT = colors.HexColor("#e4e4e7")
DG_TEXT_MUTED = colors.HexColor("#a1a1aa")
DG_TEXT_DIM = colors.HexColor("#71717a")

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets")
LOGO_PATH = os.path.join(ASSETS_DIR, "dg-com-br.png")
RIGHTEOUS_FONT_PATH = os.path.join(ASSETS_DIR, "fonts", "Righteous-Regular.ttf")
MARKAZI_FONT_PATH = os.path.join(ASSETS_DIR, "fonts", "MarkaziText-Medium.ttf")

EVENT_TITLE_FONT = "Helvetica-Bold"
if os.path.exists(RIGHTEOUS_FONT_PATH):
    try:
        pdfmetrics.registerFont(TTFont("Righteous", RIGHTEOUS_FONT_PATH))
        EVENT_TITLE_FONT = "Righteous"
    except Exception:
        EVENT_TITLE_FONT = "Helvetica-Bold"

EYEBROW_FONT = "Times-Roman"
if os.path.exists(MARKAZI_FONT_PATH):
    try:
        pdfmetrics.registerFont(TTFont("MarkaziText", MARKAZI_FONT_PATH))
        EYEBROW_FONT = "MarkaziText"
    except Exception:
        EYEBROW_FONT = "Times-Roman"


def _make_qr_pil(data: str) -> Image.Image:
    """Generates a crisp high-contrast QR code PIL Image for the given ticket code."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    return qr.make_image(fill_color="#08090b", back_color="#ffffff").convert("RGB")


def generate_ticket_qr_base64(order_code: str) -> str:
    """Returns a PNG data URL for the ticket's scannable gate QR code."""
    img = _make_qr_pil(order_code or "DG-TICKET")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _draw_wrapped_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    font_name: str,
    font_size: float,
    line_height: float,
    color: colors.Color,
    max_lines: int = 2,
) -> float:
    """Draws wrapped left-aligned text and returns the next Y position below the block."""
    c.setFont(font_name, font_size)
    c.setFillColor(color)
    words = (text or "").split()
    if not words:
        return y

    lines = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if c.stringWidth(candidate, font_name, font_size) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)

    if len(lines) > max_lines:
        lines = lines[:max_lines]
        while c.stringWidth(lines[-1] + "...", font_name, font_size) > max_width and len(lines[-1]) > 3:
            lines[-1] = lines[-1][:-1]
        lines[-1] = lines[-1].rstrip() + "..."

    cur_y = y
    for line in lines:
        c.drawString(x, cur_y, line)
        cur_y -= line_height
    return cur_y


def _format_currency(amount: Any, currency: str = "BRL") -> str:
    try:
        val = float(amount)
    except (TypeError, ValueError):
        return "—"
    if val == 0:
        return "Cortesia / VIP"
    prefix = "R$" if currency == "BRL" else "$" if currency == "USD" else "€"
    return f"{prefix} {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def generate_ticket_pdf(order_data: Dict[str, Any]) -> bytes:
    """Generates a branded Digital Garage A4 PDF ticket pass."""
    buffer = io.BytesIO()
    page_w, page_h = A4  # 595.27 x 841.89 pt
    c = canvas.Canvas(buffer, pagesize=A4)

    order_code = str(order_data.get("order_code") or "DG-0000")
    event_title = str(order_data.get("event_title") or "Digital Garage Car Meet")
    event_subtitle = str(order_data.get("event_subtitle") or "Encontro Oficial Automotivo")
    event_date = str(order_data.get("event_date") or "A definir")
    event_location = str(order_data.get("event_location") or "Local a confirmar")
    event_address = str(order_data.get("event_address") or "")
    event_city = str(order_data.get("event_city") or "")
    tier_name = str(order_data.get("tier_name") or "Ingresso Oficial")
    buyer_name = str(order_data.get("buyer_name") or "Convidado")
    buyer_email = str(order_data.get("buyer_email") or "")
    buyer_phone = str(order_data.get("buyer_phone") or "")
    payment_status = str(order_data.get("payment_status") or "confirmed").lower()
    payment_method = str(order_data.get("payment_method") or "pix").upper()
    currency = str(order_data.get("currency") or "BRL")
    total_amount = order_data.get("total_amount_brl")

    car_make = order_data.get("car_make")
    car_model = order_data.get("car_model")
    car_year = order_data.get("car_year")
    car_color = order_data.get("car_color")
    license_plate = order_data.get("license_plate")

    # 1. Full-bleed dark carbon page background (#050608 -> #08090b)
    c.setFillColor(DG_BLACK)
    c.rect(0, 0, page_w, page_h, stroke=0, fill=1)

    # 2. Main Ticket Card container with dark gradient (#0b0c11 -> #08090b)
    card_margin_x = 46
    card_w = page_w - 2 * card_margin_x
    card_bottom = 46
    card_top = page_h - 42
    card_h = card_top - card_bottom

    c.saveState()
    card_path = c.beginPath()
    card_path.roundRect(card_margin_x, card_bottom, card_w, card_h, 16)
    c.clipPath(card_path, stroke=0, fill=0)
    c.linearGradient(
        card_margin_x,
        card_top,
        card_margin_x,
        card_bottom,
        (DG_GRAD_MID, DG_DARK),
        (0.0, 1.0),
    )
    c.restoreState()

    # Top header panel inside card (mirrors .dg-parede-queimada / hero gradient: #101219 -> #0b0c11 -> #08090b)
    header_h = 144
    header_y = card_top - header_h
    c.saveState()
    hdr_path = c.beginPath()
    hdr_path.roundRect(card_margin_x, header_y, card_w, header_h, 16)
    c.clipPath(hdr_path, stroke=0, fill=0)
    c.linearGradient(
        card_margin_x + card_w,
        card_top,
        card_margin_x,
        header_y,
        (DG_GRAD_RIGHT, DG_GRAD_MID, DG_DARK),
        (0.0, 0.55, 1.0),
    )
    c.restoreState()

    # Card outer border
    c.setStrokeColor(DG_BORDER)
    c.setLineWidth(1.2)
    c.roundRect(card_margin_x, card_bottom, card_w, card_h, 16, stroke=1, fill=0)

    # Subtle monochrome accent rule at top of card
    c.setFillColor(DG_BORDER_STRONG)
    c.rect(card_margin_x + 24, card_top - 2, card_w - 48, 2, stroke=0, fill=1)

    # Logo in header (left)
    inner_x = card_margin_x + 28
    inner_w = card_w - 56
    if os.path.exists(LOGO_PATH):
        try:
            logo = ImageReader(LOGO_PATH)
            iw, ih = logo.getSize()
            target_h = 40
            target_w = target_h * (iw / ih)
            c.drawImage(logo, inner_x, card_top - 56, width=target_w, height=target_h, mask="auto")
        except Exception:
            c.setFont("Helvetica-Bold", 16)
            c.setFillColor(DG_TEXT)
            c.drawString(inner_x, card_top - 42, "DIGITAL GARAGE")
    else:
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(DG_TEXT)
        c.drawString(inner_x, card_top - 42, "DIGITAL GARAGE")

    # Status pill (top right — pure monochrome)
    status_label = "INGRESSO PAGO" if payment_status == "paid" else "INGRESSO CONFIRMADO"
    pill_w = 148
    pill_h = 22
    pill_x = card_margin_x + card_w - 28 - pill_w
    pill_y = card_top - 46
    c.setFillColor(DG_DARK)
    c.setStrokeColor(DG_BORDER_STRONG)
    c.setLineWidth(1)
    c.roundRect(pill_x, pill_y, pill_w, pill_h, 11, stroke=1, fill=1)
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(DG_TEXT_SOFT)
    c.drawCentredString(pill_x + pill_w / 2, pill_y + 7.5, status_label)

    # Eyebrow (• Ingresso Oficial in Markazi Text) + Righteous Event Title
    c.setFont(EYEBROW_FONT, 16)
    c.setFillColor(colors.HexColor("#d4d4d8"))
    c.drawString(inner_x, card_top - 96, "•  Ingresso Oficial")

    _draw_wrapped_text(
        c,
        event_title,
        x=inner_x,
        y=card_top - 122,
        max_width=inner_w,
        font_name=EVENT_TITLE_FONT,
        font_size=21,
        line_height=24,
        color=DG_TEXT,
        max_lines=2,
    )

    # Divider below header
    c.setStrokeColor(DG_BORDER)
    c.setLineWidth(1)
    c.line(card_margin_x, header_y, card_margin_x + card_w, header_y)

    # 3. Event Details Grid (Date & Location)
    cur_y = header_y - 34
    col_gap = 14
    col_w = (inner_w - col_gap) / 2
    box_h = 64

    # Date Box
    c.setFillColor(DG_PANEL)
    c.setStrokeColor(DG_BORDER)
    c.roundRect(inner_x, cur_y - box_h, col_w, box_h, 10, stroke=1, fill=1)
    c.setFont("Courier-Bold", 8)
    c.setFillColor(DG_TEXT_MUTED)
    c.drawString(inner_x + 14, cur_y - 18, "DATA & HORÁRIO")
    _draw_wrapped_text(
        c,
        event_date,
        x=inner_x + 14,
        y=cur_y - 35,
        max_width=col_w - 28,
        font_name="Helvetica-Bold",
        font_size=11,
        line_height=14,
        color=DG_TEXT_SOFT,
        max_lines=2,
    )

    # Location Box
    loc_x = inner_x + col_w + col_gap
    c.setFillColor(DG_PANEL)
    c.setStrokeColor(DG_BORDER)
    c.roundRect(loc_x, cur_y - box_h, col_w, box_h, 10, stroke=1, fill=1)
    c.setFont("Courier-Bold", 8)
    c.setFillColor(DG_TEXT_MUTED)
    c.drawString(loc_x + 14, cur_y - 18, "LOCAL DO EVENTO")
    full_location = event_location
    if event_city and event_city.lower() not in event_location.lower():
        full_location = f"{event_location} — {event_city}"
    _draw_wrapped_text(
        c,
        full_location,
        x=loc_x + 14,
        y=cur_y - 35,
        max_width=col_w - 28,
        font_name="Helvetica-Bold",
        font_size=11,
        line_height=14,
        color=DG_TEXT_SOFT,
        max_lines=2,
    )

    cur_y -= box_h + 14

    if event_address:
        c.setFont("Helvetica", 9.5)
        c.setFillColor(DG_TEXT_MUTED)
        c.drawString(inner_x, cur_y, f"Endereço: {event_address}")
        cur_y -= 18

    # 4. Ticket Tier & Attendee Block
    info_h = 104
    c.setFillColor(DG_PANEL)
    c.setStrokeColor(DG_BORDER)
    c.roundRect(inner_x, cur_y - info_h, inner_w, info_h, 10, stroke=1, fill=1)

    # Left: Tier + Order Code
    c.setFont("Courier-Bold", 8)
    c.setFillColor(DG_TEXT_MUTED)
    c.drawString(inner_x + 16, cur_y - 20, "CATEGORIA DO INGRESSO")
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(DG_TEXT_SOFT)
    c.drawString(inner_x + 16, cur_y - 38, tier_name[:38])

    c.setFont("Courier-Bold", 8)
    c.setFillColor(DG_TEXT_MUTED)
    c.drawString(inner_x + 16, cur_y - 62, "TITULAR")
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(DG_TEXT_SOFT)
    c.drawString(inner_x + 16, cur_y - 78, buyer_name[:42])
    if buyer_email or buyer_phone:
        contact_line = "  |  ".join(p for p in [buyer_email, buyer_phone] if p)
        c.setFont("Helvetica", 8.5)
        c.setFillColor(DG_TEXT_MUTED)
        c.drawString(inner_x + 16, cur_y - 93, contact_line[:68])

    # Right: Pass Code & Payment
    right_x = inner_x + inner_w - 16
    c.setFont("Courier-Bold", 8)
    c.setFillColor(DG_TEXT_MUTED)
    c.drawRightString(right_x, cur_y - 20, "CÓDIGO DO PASSE")
    c.setFont("Courier-Bold", 13)
    c.setFillColor(DG_TEXT_SOFT)
    c.drawRightString(right_x, cur_y - 38, f"#{order_code}")

    if total_amount is not None:
        c.setFont("Courier-Bold", 8)
        c.setFillColor(DG_TEXT_MUTED)
        c.drawRightString(right_x, cur_y - 62, f"PAGAMENTO ({payment_method})")
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(DG_TEXT_SOFT)
        c.drawRightString(right_x, cur_y - 78, _format_currency(total_amount, currency))

    cur_y -= info_h + 14

    # 5. Vehicle Specs Card (if exhibitor vehicle registered)
    if car_make:
        car_h = 68
        c.setFillColor(DG_DARK)
        c.setStrokeColor(DG_BORDER_STRONG)
        c.setLineWidth(1.0)
        c.roundRect(inner_x, cur_y - car_h, inner_w, car_h, 10, stroke=1, fill=1)

        c.setFont("Courier-Bold", 8)
        c.setFillColor(DG_TEXT_MUTED)
        c.drawString(inner_x + 16, cur_y - 18, "VEÍCULO EXPOSITOR REGISTRADO")

        car_title = f"{car_make} {car_model or ''} ({car_year or '2026'})".strip()
        c.setFont("Helvetica-Bold", 13)
        c.setFillColor(DG_TEXT_SOFT)
        c.drawString(inner_x + 16, cur_y - 37, car_title[:48])

        c.setFont("Helvetica", 9.5)
        c.setFillColor(DG_TEXT_MUTED)
        c.drawString(
            inner_x + 16,
            cur_y - 54,
            f"Placa: {license_plate or 'N/A'}    •    Cor: {car_color or 'N/A'}",
        )
        cur_y -= car_h + 16

    # 6. Perforated Boarding-Pass Divider with semicircular cutouts
    perf_y = card_bottom + 224
    c.saveState()
    c.setStrokeColor(DG_BORDER)
    c.setLineWidth(1.2)
    c.setDash(5, 5)
    c.line(card_margin_x + 14, perf_y, card_margin_x + card_w - 14, perf_y)
    c.restoreState()

    # Left & Right punch-out circles
    c.setFillColor(DG_BLACK)
    c.setStrokeColor(DG_BORDER)
    c.setLineWidth(1)
    c.circle(card_margin_x, perf_y, 11, stroke=1, fill=1)
    c.circle(card_margin_x + card_w, perf_y, 11, stroke=1, fill=1)
    # Hide outer stroke arc over dark background
    c.setFillColor(DG_BLACK)
    c.rect(card_margin_x - 13, perf_y - 13, 13, 26, stroke=0, fill=1)
    c.rect(card_margin_x + card_w, perf_y - 13, 13, 26, stroke=0, fill=1)

    # 7. QR Code Check-in Zone (Bottom of ticket)
    qr_size = 118
    qr_box_w = qr_size + 16
    qr_box_x = page_w / 2 - qr_box_w / 2
    qr_box_y = perf_y - 18 - qr_box_w

    c.setFillColor(DG_TEXT)
    c.roundRect(qr_box_x, qr_box_y, qr_box_w, qr_box_w, 12, stroke=0, fill=1)

    qr_img = _make_qr_pil(order_code)
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    c.drawImage(ImageReader(qr_buf), qr_box_x + 8, qr_box_y + 8, width=qr_size, height=qr_size)

    c.setFont("Courier-Bold", 11)
    c.setFillColor(DG_TEXT_SOFT)
    c.drawCentredString(page_w / 2, qr_box_y - 18, f"ENTRADA: {order_code}")

    # 8. Footer
    c.setFont("Helvetica", 8.5)
    c.setFillColor(DG_TEXT_MUTED)
    c.drawCentredString(
        page_w / 2,
        card_bottom + 28,
        "Apresente este QR Code ou o código do ingresso no portão de entrada do evento.",
    )
    c.setFont("Helvetica", 7.5)
    c.setFillColor(DG_TEXT_DIM)
    c.drawCentredString(
        page_w / 2,
        card_bottom + 14,
        f"Digital Garage © 2026  •  {event_subtitle}  •  digitalgarage.com.br",
    )

    c.showPage()
    c.save()
    return buffer.getvalue()
