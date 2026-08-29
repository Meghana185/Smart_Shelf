import os
import sys
import re
import logging
import requests

logger = logging.getLogger(__name__)


def send_sms(to_phone, message):
    """
    Sends SMS message using Fast2SMS API (route=otp for OTPs, route=q for general messages).
    Returns (success_bool, response_data).
    """
    is_testing = 'test' in sys.argv or os.getenv('TESTING') == 'true'
    fast2sms_key = os.getenv('FAST2SMS_API_KEY') if not is_testing else None

    # Step 1: Clean phone number to plain 10-digit Indian format (strip +91, spaces, non-digits)
    clean_digits = ''.join(filter(str.isdigit, str(to_phone)))
    if len(clean_digits) > 10:
        clean_digits = clean_digits[-10:]

    if fast2sms_key and not fast2sms_key.startswith('your_fast2sms'):
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            
            # Step 2: Extract 6-digit OTP code if present to use dedicated route=otp
            otp_match = re.search(r'\b\d{6}\b', message)
            if otp_match:
                otp_code = otp_match.group(0)
                payload = {
                    "route": "otp",
                    "variables_values": otp_code,
                    "numbers": clean_digits,
                    "flash": 0
                }
            else:
                payload = {
                    "route": "q",
                    "message": message,
                    "language": "english",
                    "numbers": clean_digits,
                    "flash": 0
                }

            headers = {
                "authorization": fast2sms_key,
                "Content-Type": "application/json"
            }

            # Step 3: Perform API call with full response logging
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            res_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {"raw": response.text}

            # Print exact response returned by Fast2SMS to the console
            print(f"[Fast2SMS RESPONSE] Status: {response.status_code} | Target: {clean_digits} | Data: {res_data}")

            if response.status_code == 200 and res_data.get('return'):
                logger.info(f"[Fast2SMS SUCCESS] Sent to {clean_digits}: {message}")
                print(f"[Fast2SMS SUCCESS] Sent SMS to {clean_digits}")
                return (True, res_data)
            else:
                err_msg = res_data.get('message', res_data)
                err_code = res_data.get('status_code', response.status_code)
                logger.error(f"[Fast2SMS FAIL] Code {err_code}: {err_msg}")
                print(f"[Fast2SMS FAIL] Code {err_code}: {err_msg}")
                return (False, res_data)
        except Exception as e:
            logger.error(f"[Fast2SMS EXCEPTION] Error sending to {clean_digits}: {str(e)}")
            print(f"[Fast2SMS EXCEPTION] Error sending to {clean_digits}: {str(e)}")
            return (False, {"error": str(e)})

    # Dev-mode safety net console fallback (when key isn't set or during local tests)
    logger.info(f"[SMS DEV MOCK] Simulating message to {clean_digits}: {message}")
    try:
        print(f"[SMS DEV MOCK] To: {clean_digits} | Message: {message}")
    except UnicodeEncodeError:
        safe_msg = message.encode('ascii', errors='replace').decode('ascii')
        print(f"[SMS DEV MOCK] To: {clean_digits} | Message: {safe_msg}")
    return (True, {"mock": True})
