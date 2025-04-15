# data_extraction/__init__.py
from .extractors import (
    read_text_file,
    extract_text_from_pdf,
    ContactInfoExtractor,
    DataRedactor,
    process_document,
)

# You can also set a version
__version__ = "0.1.0"
