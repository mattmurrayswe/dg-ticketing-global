import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config.settings import SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASS


def generate_html_email_ticket(order_data: dict) -> str:
    """Generates a Digital Garage HTML ticket email template."""
    car_info = ""
    if order_data.get("car_make"):
        car_info = f"""
        <div style="background-color: #1a1c23; padding: 12px; border-radius: 8px; margin: 12px 0; border: 1px solid #2d313e;">
            <p style="margin: 0 0 4px 0; color: #a1a1aa; font-size: 12px; text-transform: uppercase;">Veículo Registrado</p>
            <p style="margin: 0; color: #00f0ff; font-weight: bold; font-size: 16px;">
                {order_data.get('car_make')} {order_data.get('car_model')} ({order_data.get('car_year')})
            </p>
            <p style="margin: 4px 0 0 0; color: #e4e4e7; font-size: 13px;">
                Placa: <strong style="color: #ffffff;">{order_data.get('license_plate', 'N/A')}</strong> | Cor: {order_data.get('car_color', 'N/A')}
            </p>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Seu Ingresso Digital Garage</title>
    </head>
    <body style="background-color: #0c0d10; color: #ffffff; font-family: Arial, sans-serif; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #121318; border-radius: 12px; border: 1px solid #1f222e; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ef4444 0%, #8b5cf6 100%); padding: 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff;">DIGITAL GARAGE</h1>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #f4f4f5; text-transform: uppercase; tracking: 1px;">Car Meet Official Pass</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 24px;">
                <p style="font-size: 16px; margin-top: 0;">Olá, <strong>{order_data.get('buyer_name')}</strong>!</p>
                <p style="color: #a1a1aa; font-size: 14px;">Seu ingresso para o evento <strong>{order_data.get('event_title', 'Digital Garage Car Meet')}</strong> foi confirmado com sucesso.</p>

                <!-- Pass Details -->
                <div style="background-color: #181920; border-left: 4px solid #00f0ff; padding: 16px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 12px;">CÓDIGO DO INGRESSO</p>
                    <p style="margin: 2px 0 10px 0; font-size: 22px; font-weight: bold; color: #ffffff; letter-spacing: 1px;">{order_data.get('order_code')}</p>

                    <p style="margin: 0; color: #a1a1aa; font-size: 12px;">TIPO DE INGRESSO</p>
                    <p style="margin: 2px 0 0 0; font-size: 15px; font-weight: bold; color: #00f0ff;">{order_data.get('tier_name')}</p>
                </div>

                {car_info}

                <!-- Venue & Guidelines -->
                <div style="margin: 20px 0; font-size: 14px; color: #d4d4d8;">
                    <p style="margin: 4px 0;">📍 <strong>Local:</strong> {order_data.get('event_location', 'Paddock Central - São Paulo')}</p>
                    <p style="margin: 4px 0;">📅 <strong>Data:</strong> {order_data.get('event_date', '2026-11-15')}</p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #27272a;">
                    <p style="color: #71717a; font-size: 12px; margin: 0;">Apresente este código QR ou o código do ingresso no portão de entrada.</p>
                    <p style="color: #71717a; font-size: 12px; margin: 4px 0 0 0;">Digital Garage © 2026 - Todos os direitos reservados.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


def send_ticket_email(recipient_email: str, order_data: dict) -> bool:
    """Sends ticket email or logs dispatch if SMTP is not configured."""
    html_content = generate_html_email_ticket(order_data)

    if SMTP_PASS and SMTP_USER:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Seu Ingresso Digital Garage #{order_data.get('order_code')}"
            msg["From"] = SMTP_USER
            msg["To"] = recipient_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, recipient_email, msg.as_string())
            server.quit()
            print(f"[Email] Dispatched successfully to {recipient_email}")
            return True
        except Exception as e:
            print(f"[Email] Failed to send email: {e}")
            return False

    print(f"[Email Sim] Email ticket generated for {recipient_email} (Order #{order_data.get('order_code')})")
    return True
