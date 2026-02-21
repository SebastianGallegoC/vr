"""
VegasDelRio - Servicio de Generación de PDFs.

Usa WeasyPrint + Jinja2 para convertir plantillas HTML/CSS
en archivos PDF profesionales para los recibos de cobro.
"""

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

    # Importamos WeasyPrint aquí para evitar error si GTK no está instalado
    # durante el import general del módulo
    try:
        from weasyprint import HTML
    except OSError as e:
        raise RuntimeError(
            "WeasyPrint no puede cargar las librerías GTK/Pango. "
            "Asegúrate de tener GTK3 Runtime instalado y en el PATH. "
            f"Error original: {e}"
        )

    # Generar PDF en memoria
    pdf_bytes = HTML(string=html_content).write_pdf()

    # Guardar en disco si se especifica ruta
    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(pdf_bytes)

    return pdf_bytes
