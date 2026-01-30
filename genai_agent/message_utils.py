"""
Message Utility for GenAI Agent
- Send SMS to patient using Twilio
"""
import os
from twilio.rest import Client

def send_sms(patient_number: str, message: str, from_number: str = None):
    """
    Send an SMS to the patient_number with the given message.
    from_number: Your Twilio-verified number (must be SMS enabled)
    """
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID', 'your_account_sid_here')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN', 'your_auth_token_here')
    if from_number is None:
        from_number = os.environ.get('TWILIO_FROM_NUMBER', 'your_verified_number_here')
    client = Client(account_sid, auth_token)
    msg = client.messages.create(
        to=patient_number,
        from_=from_number,
        body=message
    )
    print(f"SMS sent: SID={msg.sid} to {patient_number}")
    return msg.sid

if __name__ == '__main__':
    sid = send_sms('+911234567890', 'This is a test reminder from your clinic.', '+911112223334')
    print('SMS SID:', sid)
