"""
VegasDelRio - Servicio de Envío de Correos Electrónicos.

Soporta múltiples proveedores (en orden de prioridad):
  1. Gmail API (si hay cuenta vinculada via OAuth)
  2. SMTP genérico (Gmail, Outlook, etc.)
  3. Resend (API transaccional)

Si hay una cuenta Gmail vinculada, se usa automáticamente.
Si no, se usa el proveedor configurado en EMAIL_PROVIDER.
"""

import base64
import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests as http_requests

from app.core import get_settings

logger = logging.getLogger(__name__)
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
        logger.error("Error enviando email a %s: %s", to_email, e)
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
        import resend  # type: ignore[import-untyped]

        resend.api_key = settings.resend_api_key

        params: dict = {
            "from": f"{settings.smtp_from_name} <{settings.smtp_from_email}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }

        if attachment:
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
        logger.error("Error enviando email (Resend) a %s: %s", to_email, e)
        return False


def _refresh_gmail_token(refresh_token: str) -> str | None:
    """
    Refresca un access_token de Gmail usando el refresh_token via HTTP.
    Retorna el nuevo access_token o None si falla.
    """
    try:
        resp = http_requests.post("https://oauth2.googleapis.com/token", data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }, timeout=15)

        if resp.status_code == 200:
            return resp.json().get("access_token")
        logger.warning("Error refrescando token de Gmail: %s %s", resp.status_code, resp.text)
        return None
    except Exception as e:
        logger.warning("Error refrescando token de Gmail: %s", e)
        return None


def send_email_gmail_api(
    to_email: str,
    subject: str,
    html_body: str,
    attachment: bytes | None = None,
    attachment_filename: str = "recibo.pdf",
    gmail_access_token: str | None = None,
    gmail_refresh_token: str | None = None,
) -> bool:
    """
    Envía un correo usando Gmail API via HTTP directo.

    Requiere gmail_access_token (y opcionalmente gmail_refresh_token para
    refrescar si el token expiró).

    Retorna True si el envío fue exitoso, False en caso contrario.
    """
    if not gmail_access_token:
        logger.error("Gmail API: No se proporcionó access_token.")
        return False

    msg = MIMEMultipart()
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    if attachment:
        pdf_part = MIMEApplication(attachment, _subtype="pdf")
        pdf_part.add_header(
            "Content-Disposition",
            "attachment",
            filename=attachment_filename,
        )
        msg.attach(pdf_part)

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    def _send(token: str) -> tuple[bool, int]:
        resp = http_requests.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"raw": raw},
            timeout=30,
        )
        return resp.status_code == 200, resp.status_code

    try:
        ok, status_code = _send(gmail_access_token)
        if ok:
            return True

        # Si 401, intentar refrescar token y reintentar
        if status_code == 401 and gmail_refresh_token:
            new_token = _refresh_gmail_token(gmail_refresh_token)
            if new_token:
                ok, _ = _send(new_token)
                return ok

        logger.error("Error enviando email (Gmail API) a %s: HTTP %s", to_email, status_code)
        return False
    except Exception as e:
        logger.error("Error enviando email (Gmail API) a %s: %s", to_email, e)
        return False


def send_bill_email(
    to_email: str,
    owner_name: str,
    period_description: str,
    pdf_bytes: bytes | None = None,
    gmail_access_token: str | None = None,
    gmail_refresh_token: str | None = None,
) -> bool:
    """
    Envía un correo de cobro a un propietario.

    Prioridad de envío:
      1. Gmail API (si hay tokens proporcionados)
      2. SMTP / Resend (según EMAIL_PROVIDER)
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

    # 1. Intentar Gmail API primero (si hay tokens)
    if gmail_access_token:
        gmail_result = send_email_gmail_api(
            to_email, subject, html_body, pdf_bytes, attachment_filename,
            gmail_access_token=gmail_access_token,
            gmail_refresh_token=gmail_refresh_token,
        )
        if gmail_result:
            return True

    # 2. Fallback a SMTP o Resend
    if settings.email_provider == "resend":
        return send_email_resend(
            to_email, subject, html_body, pdf_bytes, attachment_filename
        )
    else:
        return send_email_smtp(
            to_email, subject, html_body, pdf_bytes, attachment_filename
        )
