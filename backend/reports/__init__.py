try:
    from .pdf_generator import build_agricultural_pdf_report
except ImportError:
    from reports.pdf_generator import build_agricultural_pdf_report
