import os
import logging
import requests

logger = logging.getLogger(__name__)

WHATSAPP_SERVICE_URL = os.getenv('WHATSAPP_SERVICE_URL', 'http://localhost:3001')


def format_phone(phone: str) -> str:
    """
    Normalize phone number to WhatsApp format: country code + digits, no '+' or spaces.
    Indian numbers: '9876543210' or '+919876543210' -> '919876543210'
    """
    digits = ''.join(filter(str.isdigit, str(phone)))
    if len(digits) == 10:
        # Assume Indian number, prepend country code
        digits = '91' + digits
    elif len(digits) > 12:
        # Strip leading zeros or extra digits
        digits = digits[-12:]
    return digits


def send_whatsapp_message(phone: str, message: str) -> bool:
    """
    Send a WhatsApp message via the self-hosted whatsapp-web.js service.
    POST {WHATSAPP_SERVICE_URL}/send-message
    body: { "phone": "919876543210", "message": "..." }

    Returns True on success, False on failure.
    Does NOT raise — calling endpoints will always continue even if messaging fails.
    """
    formatted_phone = format_phone(phone)
    url = f"{WHATSAPP_SERVICE_URL}/send-message"

    try:
        response = requests.post(
            url,
            json={"phone": formatted_phone, "message": message},
            timeout=10
        )
        res_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"raw": response.text}

        print(f"[WhatsApp RESPONSE] Status: {response.status_code} | Target: {formatted_phone} | Data: {res_data}")

        if response.status_code == 200 and res_data.get('success'):
            logger.info(f"[WhatsApp SUCCESS] Sent to {formatted_phone}")
            return True
        else:
            err = res_data.get('error', res_data)
            logger.error(f"[WhatsApp FAIL] Target: {formatted_phone} | Error: {err}")
            print(f"[WhatsApp FAIL] Target: {formatted_phone} | Error: {err}")
            return False

    except requests.exceptions.ConnectionError:
        logger.error(f"[WhatsApp ERROR] Service unreachable at {url}. Is whatsapp-service running?")
        print(f"[WhatsApp ERROR] Service unreachable at {url}. Is whatsapp-service running?")
        return False
    except Exception as e:
        logger.error(f"[WhatsApp EXCEPTION] Target: {formatted_phone} | {str(e)}")
        print(f"[WhatsApp EXCEPTION] Target: {formatted_phone} | {str(e)}")
        return False
