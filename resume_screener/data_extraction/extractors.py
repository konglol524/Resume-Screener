import re
import logging
from typing import Dict, List, Optional, Union, Any, Callable
from pdfminer.high_level import extract_text


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def read_text_file(file_path: str) -> str:
    """Get string from text file"""
    with open(file_path, "r", encoding="utf-8") as file:
        text = file.read()
    return text


def extract_text_from_pdf(pdf_file: str) -> str:
    """Extracts text from a PDF file using pdfminer.six."""
    try:
        text = extract_text(pdf_file)
        return text.strip()
    except FileNotFoundError:
        return "Error: PDF file not found."
    except Exception as e:
        return f"Error: An error occurred during PDF extraction: {e}"


class DataExtractor:
    """Base class for extracting specific types of data from text."""

    def __init__(self, patterns: List[str] = None):
        self.patterns = patterns or []

    def extract(self, text: str) -> Any:
        """Extract data from text using the configured patterns."""
        raise NotImplementedError("Subclasses must implement extract method")


class RegexExtractor(DataExtractor):
    """Extract data using regular expressions."""

    def extract(self, text: str) -> List[str]:
        """Extract data from text using regex patterns."""
        results = []
        for pattern in self.patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            if matches:
                results.extend(matches)
        return results


class AddressParser:
    """Base class for address parsing."""

    def __init__(self, patterns: List[str] = None):
        self.patterns = patterns or []

    def parse(self, text: str) -> Optional[Dict]:
        """Parse an address from text."""
        for pattern in self.patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.groupdict()
        return None


class ContactInfoExtractor:
    """Extracts contact information from text."""

    def __init__(self, config: Dict = None):
        """
        Initialize with configuration.

        Args:
            config: Dictionary with configuration options
        """
        self.config = config or {}

        # Initialize extractors with default patterns
        self.email_extractor = RegexExtractor(
            patterns=self.config.get("email_patterns", [r"[\w\.-]+@[\w\.-]+\.\w+"])
        )

        self.phone_extractor = RegexExtractor(
            patterns=self.config.get(
                "phone_patterns",
                [
                    r"(\+?\d[\d\s\-\(\)]{8,}\d)",
                    r"(\(\d{3}\)\s*\d{3}[-\.\s]\d{4})",
                    r"(\d{3}[-\.\s]\d{3}[-\.\s]\d{4})",
                ],
            )
        )

        # Name patterns - more sophisticated than just taking the first line
        self.name_patterns = self.config.get(
            "name_patterns",
            [
                r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$",  # Capitalized names like "John Doe"
                r"^([A-Z][a-zA-Z\-\.]+\s+[A-Z][a-zA-Z\-\.]+)$",  # Names with hyphens or periods
            ],
        )

        # Initialize address parsers
        self.thai_address_parser = AddressParser(
            patterns=self.config.get(
                "thai_address_patterns",
                [
                    # Basic Format (English)
                    r"(?P<house_number>\d+[/]?\d*)\s*(?:Moo\.?\s*(?P<moo>\d+)[,\s.]*)?\s*(?:(?:Thanon|Rd\.?|Road)\s*(?P<road>[^\n,]+)[,\s.]*)?(?:(?:Khwaeng|Kwang|Tambon|T\.?)\s*(?P<subdistrict>[^\n,]+)[,\s.]*)?(?:(?:Khet|Ket|Amphoe|A\.?)\s*(?P<district>[^\n,]+)[,\s.]*)?(?:(?:Changwat|Province|จังหวัด)?\s*(?P<province>[^\n,]+)[,\s.]*)?(?P<postal_code>\d{5})",
                    # With Soi (English)
                    r"(?P<house_number>\d+[/]?\d*)\s*(?:Soi\.?\s*(?P<soi>[^\n,]+)[,\s.]*)?(?:(?:Thanon|Rd\.?|Road)\s*(?P<road>[^\n,]+)[,\s.]*)?(?:(?:Khwaeng|Kwang|Tambon|T\.?)\s*(?P<subdistrict>[^\n,]+)[,\s.]*)?(?:(?:Khet|Ket|Amphoe|A\.?)\s*(?P<district>[^\n,]+)[,\s.]*)?(?:(?:Changwat|Province|จังหวัด)?\s*(?P<province>[^\n,]+)[,\s.]*)?(?P<postal_code>\d{5})",
                    # Condominium/Building (English)
                    r"(?:(?P<building_type>Condo|Building|อาคาร)\s*(?P<building_name>[^\n,]+)[,\s.]*)?(?:Floor\s*(?P<floor>\d+)[,\s.]*)?(?P<house_number>\d+[/]?\d*)\s*(?:(?:Thanon|Rd\.?|Road)\s*(?P<road>[^\n,]+)[,\s.]*)?(?:(?:Khwaeng|Kwang|Tambon|T\.?)\s*(?P<subdistrict>[^\n,]+)[,\s.]*)?(?:(?:Khet|Ket|Amphoe|A\.?)\s*(?P<district>[^\n,]+)[,\s.]*)?(?:(?:Changwat|Province|จังหวัด)?\s*(?P<province>[^\n,]+)[,\s.]*)?(?P<postal_code>\d{5})",
                    # Company Address (English)
                    r"(?:(?P<company>[^\n,]+)\s*(?:Co\.?\s*Ltd\.?)?[,\s.]*)?(?P<house_number>\d+[/]?\d*)\s*(?:Moo\.?\s*(?P<moo>\d+)[,\s.]*)?(?:(?:Thanon|Rd\.?|Road)\s*(?P<road>[^\n,]+)[,\s.]*)?(?:(?:Khwaeng|Kwang|Tambon|T\.?)\s*(?P<subdistrict>[^\n,]+)[,\s.]*)?(?:(?:Khet|Ket|Amphoe|A\.?)\s*(?P<district>[^\n,]+)[,\s.]*)?(?:(?:Changwat|Province|จังหวัด)?\s*(?P<province>[^\n,]+)[,\s.]*)?(?P<postal_code>\d{5})",
                    # Bangkok specific (English)
                    r"(?P<road>[^\n,]+)[,\s.]*(?P<subdistrict>[^\n,]+)[,\s.]*(?P<district>[^\n,]+)[,\s.]*(?:Bangkok|กรุงเทพ)[,\s.]*(?:Thailand|ประเทศไทย)?[,\s.]*(?P<postal_code>\d{5})",
                    # More Flexible Basic Format (English)
                    r"(?P<house_number>\d+[/]?\d*)\s*Moo\.?\s*(?P<moo>\d+)[,]?\s*(Thanon|Rd\.?)\s*(?P<road>[^\n,]+)[,]?\s*(Khwaeng|Kwang)\s*(?P<khwaeng>[^\n,]+)[,]?\s*(Khet|Ket)\s*(?P<khet>[^\n,]+)[,]?\s*(Changwat|Province)?\s*(?P<changwat>[^\n,]+)\s*(?P<postal_code>\d+)",
                    # More Flexible With Soi (English)
                    r"(?P<house_number>\d+[/]?\d*)\s*Soi\.?\s*(?P<soi>[^\n,]+)[,]?\s*(Thanon|Rd\.?)\s*(?P<road>[^\n,]+)[,]?\s*(Khwaeng|Kwang)\s*(?P<khwaeng>[^\n,]+)[,]?\s*(Khet|Ket)\s*(?P<khet>[^\n,]+)[,]?\s*(Changwat|Province)?\s*(?P<changwat>[^\n,]+)\s*(?P<postal_code>\d+)",
                    # More Flexible Upcountry Address (English)
                    r"(?P<house_number>\d+[/]?\d*)\s*Moo\.?\s*(?P<moo>\d+)[,]?\s*(Tambon|T\.?)\s*(?P<tambon>[^\n,]+)[,]?\s*(Amphoe|A\.?)\s*(?P<amphoe>[^\n,]+)[,]?\s*(Changwat|Province)?\s*(?P<changwat>[^\n,]+)\s*(?P<postal_code>\d+)",
                    # More Flexible Condominium/Apartment (English)
                    r"(?P<house_number>\d+[/]?\d*)\s*Condo\s*(?P<condo>[^\n,]+)[,]?\s*Floor\s*(?P<floor>\d+)[,]?\s*(Thanon|Rd\.?)\s*(?P<road>[^\n,]+)[,]?\s*(Khwaeng|Kwang)\s*(?P<khwaeng>[^\n,]+)[,]?\s*(Khet|Ket)\s*(?P<khet>[^\n,]+)[,]?\s*(Changwat|Province)?\s*(?P<changwat>[^\n,]+)\s*(?P<postal_code>\d+)",
                    # More Flexible Building Name (English)
                    r"(?P<house_number>\d+[/]?\d*)\s*Building\s*(?P<building>[^\n,]+)[,]?\s*(Thanon|Rd\.?)\s*(?P<road>[^\n,]+)[,]?\s*(Khwaeng|Kwang)\s*(?P<khwaeng>[^\n,]+)[,]?\s*(Khet|Ket)\s*(?P<khet>[^\n,]+)[,]?\s*(Changwat|Province)?\s*(?P<changwat>[^\n,]+)\s*(?P<postal_code>\d+)",
                    # More Flexible Company Address (English - more flexible)
                    r"(Company\s*)?(?P<company>[^\n,]+)\s*(Co\.?\s*Ltd\.?)?[,]?\s*(?P<house_number>\d+[/]?\d*)\s*Moo\.?\s*(?P<moo>\d+)[,]?\s*(Thanon|Rd\.?)\s*(?P<road>[^\n,]+)[,]?\s*(Tambon|T\.?)\s*(?P<tambon>[^\n,]+)[,]?\s*(Amphoe|A\.?)\s*(?P<amphoe>[^\n,]+)[,]?\s*(Changwat|Province)?\s*(?P<changwat>[^\n,]+)\s*(?P<postal_code>\d+)",
                    # More Flexible Rural Address (English)
                    r"(?P<house_number>\d+[/]?\d*)\s*Moo\.?\s*(?P<moo>\d+)[,]?\s*Ban\s*(?P<ban>[^\n,]+)[,]?\s*(Tambon|T\.?)\s*(?P<tambon>[^\n,]+)[,]?\s*(Amphoe|A\.?)\s*(?P<amphoe>[^\n,]+)[,]?\s*(Changwat|Province)?\s*(?P<changwat>[^\n,]+)\s*(?P<postal_code>\d+)",
                    # New Pattern for Bangkok witah Thailand at the end
                    r"(?P<road>[^\n,]+)[,]?\s*(?P<khwaeng>[^\n,]+)[,]?\s*(?P<khet>[^\n,]+)[,]?\s*Bangkok[,]?,?\s*Thailand\s*(?P<postal_code>\d+)",
                ],
            )
        )

        self.us_address_parser = AddressParser(
            patterns=self.config.get(
                "us_address_patterns",
                [
                    # Standard US address
                    r"(?P<street_number>\d+)\s+(?P<street_name>[^\n,]+)[,\s.]*(?:(?:Apt|Suite|Unit|#)\s*(?P<unit>[^\n,]+)[,\s.]*)?(?P<city>[^\n,]+)[,\s.]*(?P<state>[A-Z]{2})[,\s.]*(?P<zip_code>\d{5}(?:-\d{4})?)",
                    # US address with PO Box
                    r"(?:P\.?O\.?\s*Box\s*(?P<po_box>\d+))[,\s.]*(?P<city>[^\n,]+)[,\s.]*(?P<state>[A-Z]{2})[,\s.]*(?P<zip_code>\d{5}(?:-\d{4})?)",
                ],
            )
        )

        # Add more international address parsers as needed
        self.uk_address_parser = AddressParser(
            patterns=self.config.get(
                "uk_address_patterns",
                [
                    r"(?P<house_number>\d+)[,\s.]*(?P<street_name>[^\n,]+)[,\s.]*(?P<city>[^\n,]+)[,\s.]*(?P<postcode>[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})",
                ],
            )
        )

        # Add a generic address parser that tries to match addresses not covered by specific formats
        self.generic_address_parser = AddressParser(
            patterns=self.config.get(
                "generic_address_patterns",
                [
                    # Very generic pattern that might catch addresses that don't fit other formats
                    r"(?P<street_address>\d+\s+[^\d\n,]+(?:\s+\w+\.?)?)[,\s.]*(?P<locality>[^\d\n,]+)[,\s.]*(?P<region>[^\d\n,]+)[,\s.]*(?P<postal_code>[\d\-]+)",
                ],
            )
        )

        # Order of address parsers to try
        self.address_parsers = [
            ("thai", self.thai_address_parser),
            ("us", self.us_address_parser),
            ("uk", self.uk_address_parser),
            ("generic", self.generic_address_parser),
        ]

    def extract_name(self, text: str) -> str:
        """
        Extract a person's name from text using more sophisticated methods.

        Args:
            text: Input text

        Returns:
            Extracted name or empty string
        """
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        # Try pattern-based extraction first
        for line in lines[:3]:  # Check first few lines
            for pattern in self.name_patterns:
                match = re.match(pattern, line)
                if match:
                    return match.group(1)

        # Fallback to first line heuristic
        if lines:
            # Check if first line is short enough to be a name (not a sentence)
            if len(lines[0].split()) <= 5 and len(lines[0]) <= 40:
                return lines[0]

        return ""

    def extract_address(self, text: str) -> Dict:
        """
        Try multiple address parsers on the text.

        Args:
            text: Input text

        Returns:
            Dictionary with parsed address components and address type
        """
        # Try each parser in order
        for address_type, parser in self.address_parsers:
            for line in text.splitlines():
                result = parser.parse(line)
                if result:
                    return {"type": address_type, "components": result, "raw": line}

        # Try one more time with the whole text (some addresses might span multiple lines)
        for address_type, parser in self.address_parsers:
            result = parser.parse(text)
            if result:
                return {"type": address_type, "components": result, "raw": text}

        return {}

    def extract(self, text: str) -> Dict:
        """
        Extract contact information from text.

        Args:
            text: Input text

        Returns:
            Dictionary with extracted contact information
        """
        try:
            emails = self.email_extractor.extract(text)
            phones = self.phone_extractor.extract(text)
            name = self.extract_name(text)
            address = self.extract_address(text)

            return {
                "name": name,
                "email": emails[0] if emails else "",
                "phone": phones[0] if phones else "",
                "address": address,
                "all_emails": emails,
                "all_phones": phones,
            }
        except Exception as e:
            logger.error(f"Error extracting contact info: {str(e)}")
            return {}


class DataRedactor:
    """Redacts personal information from text."""

    def __init__(self, replacement: str = ""):
        """
        Initialize with replacement string.

        Args:
            replacement: String to replace redacted content with
        """
        self.replacement = replacement

    def redact_text(self, text: str, extracted_data: Dict) -> str:
        """
        Redact personal information from text.

        Args:
            text: Original text
            extracted_data: Dictionary with extracted personal data

        Returns:
            Redacted text
        """
        redacted_text = text

        # Redact name
        if extracted_data.get("name"):
            redacted_text = redacted_text.replace(
                extracted_data["name"], self.replacement
            )

        # Redact emails
        for email in extracted_data.get("all_emails", []):
            redacted_text = redacted_text.replace(email, self.replacement)

        # Redact phones
        for phone in extracted_data.get("all_phones", []):
            redacted_text = redacted_text.replace(phone, self.replacement)

        # Redact address
        address = extracted_data.get("address", {})
        if address and "raw" in address:
            redacted_text = redacted_text.replace(address["raw"], self.replacement)

        return redacted_text


def process_document(text: str, config: Dict = {}) -> Dict:
    """
    Process a document to extract and redact personal information.

    Args:
        text: Input text
        config: Configuration dictionary

    Returns:
        Dictionary with extracted and redacted information
    """
    extractor = ContactInfoExtractor(config)
    redactor = DataRedactor(config.get("replacement", ""))

    extracted_data = extractor.extract(text)
    redacted_text = redactor.redact_text(text, extracted_data)

    return {"extracted_data": extracted_data, "redacted_text": redacted_text}
