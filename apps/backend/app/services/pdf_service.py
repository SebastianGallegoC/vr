"""
VegasDelRio - Servicio de Generación de PDFs.

Usa xhtml2pdf + Jinja2 para convertir plantillas HTML/CSS
en archivos PDF profesionales para los recibos de cobro.
"""

import io
import os
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

# Directorio de plantillas HTML para los PDFs
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
GENERATED_DIR = Path(__file__).parent.parent.parent / "generated_pdfs"

# Motor de plantillas Jinja2
jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=True,
)


def generate_bill_pdf(bill_data: dict, output_path: str | None = None) -> bytes:
    """
    Genera un PDF de recibo de cobro a partir de los datos de una factura.

    Args:
        bill_data: Diccionario con la información del cobro:
            - bill_number: Número de factura
            - owner_name: Nombre del propietario
            - house_number: Número de casa
            - period: Descripción del periodo
            - due_date: Fecha límite de pago
            - items: Lista de conceptos [{concept, description, amount}]
            - total_amount: Monto total
        output_path: Ruta opcional para guardar el PDF en disco.

    Returns:
        bytes: Contenido del PDF generado en memoria.
    """
    # Renderizar la plantilla HTML con los datos
    template = jinja_env.get_template("bill_receipt.html")
    html_content = template.render(**bill_data)

    from xhtml2pdf import pisa  # type: ignore[import-untyped]

    buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=buffer, encoding="utf-8")

    if pisa_status.err:
        raise RuntimeError(f"Error generando PDF con xhtml2pdf: {pisa_status.err}")

    pdf_bytes = buffer.getvalue()

    # Guardar en disco si se especifica ruta
    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(pdf_bytes)

    return pdf_bytes
