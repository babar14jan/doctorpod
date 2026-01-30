"""
Twilio Telephony Integration for GenAI Agent
- Place outbound calls to patients using your verified personal mobile number as caller ID.
- Requires Twilio account and number verification.
"""
import os
from twilio.rest import Client

def place_call(patient_number: str, script: str, from_number: str = None):
    """
    Place a call to the patient_number and read out the script using Twilio's text-to-speech.
    from_number: Your Twilio-verified personal mobile number (must be verified in Twilio console)
    """
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID', 'your_account_sid_here')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN', 'your_auth_token_here')
    if from_number is None:
        from_number = os.environ.get('TWILIO_FROM_NUMBER', 'your_verified_number_here')
    client = Client(account_sid, auth_token)

    # Twilio requires a publicly accessible URL for TwiML. For demo, use Twilio's <Say> verb via twimlets
    from urllib.parse import urlencode
    twiml_url = f"https://twimlets.com/echo?{urlencode({'Twiml': f'<Response><Say>{script}</Say></Response>'})}"

    call = client.calls.create(
        to=patient_number,
        from_=from_number,
        url=twiml_url
    )
    print(f"Call initiated: SID={call.sid} to {patient_number}")
    return call.sid

if __name__ == '__main__':
    # Example usage
    sid = place_call('+911234567890', 'Hello, this is a test call from your clinic.', '+911112223334')
    print('Call SID:', sid)
