"""
GenAI Message Agent
- Reads booking table
- Drafts a personalized follow-up message using GenAI
- Sends SMS to patient 4 hours before appointment
"""
import os
from datetime import datetime, timedelta
from agent import get_bookings, generate_call_script
from message_utils import send_sms

def generate_followup_message(booking):
    # You can use a more specific GenAI prompt here
    patient = booking.get('patient_name', 'Customer')
    date = booking.get('booking_date', 'N/A')
    doctor = booking.get('doctor_name', 'N/A')
    clinic = booking.get('clinic_name', 'N/A')
    prompt = f"""
    Draft a friendly SMS reminder for the following appointment:
    - Name: {patient}
    - Date: {date}
    - Doctor: {doctor}
    - Clinic: {clinic}
    The message should remind the patient of their appointment and include a polite note to arrive on time.
    """
    # For demo, just return the prompt (replace with GenAI call if needed)
    return prompt.strip()

def is_4_hours_before(booking):
    # Assumes booking_date is in ISO format and booking_time is in HH:MM
    dt_str = booking.get('booking_date', '')
    tm_str = booking.get('booking_time', '09:00')
    try:
        appt_dt = datetime.strptime(f"{dt_str} {tm_str}", "%Y-%m-%d %H:%M")
        now = datetime.now()
        return timedelta(hours=3, minutes=50) < (appt_dt - now) <= timedelta(hours=4, minutes=10)
    except Exception:
        return False

if __name__ == '__main__':
    bookings = get_bookings(os.environ.get('BOOKING_DB_PATH', '../database/sample_data.sql'))
    from_number = os.environ.get('TWILIO_FROM_NUMBER', 'your_verified_number_here')
    for booking in bookings:
        patient_number = booking.get('patient_mobile')
        if not patient_number:
            continue
        if is_4_hours_before(booking):
            message = generate_followup_message(booking)
            print(f"Sending SMS to {patient_number}:\n{message}\n")
            # send_sms(patient_number, message, from_number)  # Uncomment to enable real SMS
            print("(SMS function is ready. Uncomment in code to enable real SMS.)\n")
