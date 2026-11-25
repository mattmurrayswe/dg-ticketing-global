import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config.settings import SMTP_PASS, SMTP_PORT, SMTP_SERVER, SMTP_USER
from app.services.ticket_pdf_service import generate_ticket_pdf


def generate_html_email_ticket(order_data: dict) -> str:
    """Generates a Digital Garage HTML ticket email matching the platform branding."""
    car_info = ""
    if order_data.get("car_make"):
        car_info = f"""
        <div style="background-color: #08090b; padding: 14px 16px; border-radius: 10px; margin: 16px 0; border: 1px solid #262a36;">
            <p style="margin: 0 0 4px 0; color: #a1a1aa; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Veículo Expositor Registrado</p>
            <p style="margin: 0; color: #ffffff; font-weight: 700; font-size: 16px;">
                {order_data.get('car_make')} {order_data.get('car_model') or ''} ({order_data.get('car_year') or '2026'})
            </p>
            <p style="margin: 4px 0 0 0; color: #a1a1aa; font-size: 13px;">
                Placa: <strong style="color: #ffffff;">{order_data.get('license_plate') or 'N/A'}</strong> &bull; Cor: <strong style="color: #ffffff;">{order_data.get('car_color') or 'N/A'}</strong>
            </p>
        </div>
        """

    location_line = order_data.get("event_location") or "Local a confirmar"
    if order_data.get("event_city") and order_data.get("event_city").lower() not in location_line.lower():
        location_line = f"{location_line} — {order_data.get('event_city')}"

    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Seu Ingresso Digital Garage</title>
    </head>
    <body style="background-color: #050608; color: #e2e8f0; font-family: 'Figtree', Arial, sans-serif; padding: 24px 12px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #08090b; border-radius: 16px; border: 1px solid #1e222e; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(to left, #101219 0%, #0b0c11 55%, #08090b 100%); border-bottom: 1px solid #1e222e; padding: 28px 24px; text-align: center;">
                <p style="margin: 0 0 6px 0; font-family: 'Markazi Text', Georgia, serif; font-size: 16px; color: #a1a1aa;">
                    De GearHead para GearHead
                </p>
                <h1 style="margin: 0; font-family: 'Markazi Text', Georgia, serif; font-size: 30px; font-weight: 600; color: #ffffff; letter-spacing: 0.5px;">
                    {order_data.get('event_title', 'Digital Garage Car Meet')}
                </h1>
                <div style="display: inline-block; margin-top: 12px; padding: 4px 14px; border-radius: 999px; background-color: #08090b; border: 1px solid #262a36; color: #e4e4e7; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                    Ingresso Confirmado
                </div>
            </div>

            <!-- Content -->
            <div style="padding: 24px;">
                <p style="font-size: 15px; margin-top: 0; color: #ffffff;">Olá, <strong>{order_data.get('buyer_name', 'GearHead')}</strong>!</p>
                <p style="color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                    Seu ingresso oficial está confirmado. O passe completo em <strong style="color: #ffffff;">PDF com QR Code de entrada</strong> segue em anexo neste e-mail e também está disponível para download no site e no aplicativo Digital Garage.
                </p>

                <!-- Pass Details -->
                <div style="background-color: #151720; border: 1px solid #1e222e; border-left: 4px solid #ffffff; padding: 16px; border-radius: 10px; margin: 20px 0;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Código do Passe</p>
                    <p style="margin: 4px 0 12px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 1px; font-family: monospace;">#{order_data.get('order_code')}</p>

                    <p style="margin: 0; color: #a1a1aa; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Categoria</p>
                    <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #ffffff;">{order_data.get('tier_name', 'Ingresso Oficial')}</p>
                </div>

                {car_info}

                <!-- Venue & Date -->
                <div style="background-color: #151720; border: 1px solid #1e222e; border-radius: 10px; padding: 14px 16px; margin: 16px 0; font-size: 13px; color: #e2e8f0;">
                    <p style="margin: 4px 0;"><strong style="color: #a1a1aa;">Data:</strong> {order_data.get('event_date', 'A definir')}</p>
                    <p style="margin: 4px 0;"><strong style="color: #a1a1aa;">Local:</strong> {location_line}</p>
                </div>

                <div style="text-align: center; margin-top: 24px; padding-top: 18px; border-top: 1px dashed #1e222e;">
                    <p style="color: #a1a1aa; font-size: 12px; margin: 0;">Abra o PDF em anexo e apresente o QR Code no portão de entrada.</p>
                    <p style="color: #71717a; font-size: 11px; margin: 6px 0 0 0;">Digital Garage &copy; 2026 &bull; digitalgarage.com.br</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


def send_ticket_email(recipient_email: str, order_data: dict) -> bool:
    """Sends ticket email with branded PDF attachment, or logs simulation if SMTP is not configured."""
    html_content = generate_html_email_ticket(order_data)
    order_code = order_data.get("order_code", "DG-PASS")
    pdf_bytes = generate_ticket_pdf(order_data)

    if SMTP_PASS and SMTP_USER:
        try:
            msg = MIMEMultipart("mixed")
            msg["Subject"] = f"Seu Ingresso Digital Garage #{order_code}"
            msg["From"] = SMTP_USER
            msg["To"] = recipient_email

            body = MIMEMultipart("alternative")
            body.attach(MIMEText(html_content, "html", "utf-8"))
            msg.attach(body)

            pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
            pdf_attachment.add_header(
                "Content-Disposition",
                "attachment",
                filename=f"Ingresso-DigitalGarage-{order_code}.pdf",
            )
            msg.attach(pdf_attachment)

            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, recipient_email, msg.as_string())
            server.quit()
            print(f"[Email] Dispatched PDF ticket successfully to {recipient_email}")
            return True
        except Exception as e:
            print(f"[Email] Failed to send email: {e}")
            return False

    print(
        f"[Email Sim] Branded PDF ticket ({len(pdf_bytes)} bytes) generated for "
        f"{recipient_email} (Order #{order_code})"
    )
    return True
