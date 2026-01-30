"""
WhatsApp Messaging Utility for GenAI Agent
- Send WhatsApp messages using a free API (e.g., UltraMsg, CallMeBot, or similar)
- No paid Twilio required
"""
import os
import requests

def send_whatsapp_ultramsg(to_number: str, message: str, instance_id: str = None, token: str = None):
    """
    Send WhatsApp message using UltraMsg free API (https://ultramsg.com/)
    You must register and get your instance_id and token from UltraMsg dashboard.
    """
    instance_id = instance_id or os.environ.get('ULTRAMSG_INSTANCE_ID', 'your_instance_id_here')
    token = token or os.environ.get('ULTRAMSG_TOKEN', 'your_token_here')
    url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
    payload = {
        "token": token,
        "to": to_number,
        "body": message
    }
    resp = requests.post(url, data=payload)
    print(f"WhatsApp API response: {resp.status_code} {resp.text}")
    return resp.status_code == 200

# Alternative: CallMeBot (https://www.callmebot.com/blog/free-api-whatsapp-messages/)
def send_whatsapp_callmebot(to_number: str, message: str, apikey: str = None):
    """
    Send WhatsApp message using CallMeBot free API
    You must register your number and get an apikey from CallMeBot.
    """
    apikey = apikey or os.environ.get('CALLMEBOT_APIKEY', 'your_apikey_here')
    url = f"https://api.callmebot.com/whatsapp.php?phone={to_number}&text={requests.utils.quote(message)}&apikey={apikey}"
    resp = requests.get(url)
    print(f"CallMeBot API response: {resp.status_code} {resp.text}")
    return resp.status_code == 200

if __name__ == '__main__':
    # Example usage (replace with your real numbers and keys)
    send_whatsapp_ultramsg('+911234567890', 'Test WhatsApp message from UltraMsg!')
    send_whatsapp_callmebot('+911234567890', 'Test WhatsApp message from CallMeBot!')
