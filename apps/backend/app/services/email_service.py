"""
VegasDelRio - Servicio de Envío de Correos Electrónicos.

Soporta múltiples proveedores:
  - SMTP genérico (Gmail, Outlook, etc.)
  - Resend (API transaccional)

El proveedor se selecciona vía la variable EMAIL_PROVIDER en .env.
"""

import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core import get_settings

settings = get_settings()


def send_email_smtp(
    to_email: str,
    subject: str,
    html_body: str,
    attachment: bytes | None = None,
    attachment_filename: str = "recibo.pdf",
) -> bool:
    """
    Envía un correo usando SMTP directo.

    Args:
        to_email: Dirección de correo del destinatario.
        subject: Asunto del correo.
        html_body: Cuerpo del correo en HTML.
        attachment: Bytes del archivo adjunto (PDF).
        attachment_filename: Nombre del archivo adjunto.

    Returns:
        True si el envío fue exitoso, False en caso contrario.
    """
    msg = MIMEMultipart()
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    # Cuerpo HTML
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    # Adjuntar PDF si existe
    if attachment:
        pdf_part = MIMEApplication(attachment, _subtype="pdf")
        pdf_part.add_header(
            "Content-Disposition",
            "attachment",
            filename=attachment_filename,
        )
        msg.attach(pdf_part)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"❌ Error enviando email a {to_email}: {e}")
        return False


def send_email_resend(
    to_email: str,
    subject: str,
    html_body: str,
    attachment: bytes | None = None,
    attachment_filename: str = "recibo.pdf",
) -> bool:
    """
    Envía un correo usando la API de Resend.

    Requiere: RESEND_API_KEY configurada en .env.
    """
    try:
        import resend

        resend.api_key = settings.resend_api_key

        params: dict = {
            "from": f"{settings.smtp_from_name} <{settings.smtp_from_email}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }

        if attachment:
            import base64

            params["attachments"] = [
                {
                    "filename": attachment_filename,
                    "content": base64.b64encode(attachment).decode("utf-8"),
                    "content_type": "application/pdf",
                }
            ]

        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"❌ Error enviando email (Resend) a {to_email}: {e}")
        return False


def send_bill_email(
    to_email: str,
    owner_name: str,
    period_description: str,
    pdf_bytes: bytes | None = None,
) -> bool:
    """
    Envía un correo de cobro a un propietario.

    Selecciona automáticamente el proveedor configurado en EMAIL_PROVIDER.
    """
    subject = f"Recibo de Administración - {period_description} | Vegas del Río"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Vegas del Río</h2>
        <p>Estimado(a) <strong>{owner_name}</strong>,</p>
        <p>Adjunto encontrará su recibo de administración correspondiente
        al periodo <strong>{period_description}</strong>.</p>
        <p>Por favor, realice el pago antes de la fecha de vencimiento
        indicada en el recibo.</p>
        <hr style="border: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
            Este es un mensaje automático del sistema de administración
            del conjunto residencial Vegas del Río.
        </p>
    </div>
    """

    attachment_filename = f"recibo_{period_description.replace(' ', '_')}.pdf"

    if settings.email_provider == "resend":
        return send_email_resend(
            to_email, subject, html_body, pdf_bytes, attachment_filename
        )
    else:
        return send_email_smtp(
            to_email, subject, html_body, pdf_bytes, attachment_filename
        )
