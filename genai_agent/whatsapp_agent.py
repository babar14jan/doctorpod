"""
GenAI WhatsApp Agent
- Reads booking table
- Drafts a personalized follow-up message using GenAI
- Sends WhatsApp message to patient 4 hours before appointment using a free API
"""
import os
from datetime import datetime, timedelta
from agent import get_bookings
import openai
from whatsapp_utils import send_whatsapp_ultramsg, send_whatsapp_callmebot

def generate_followup_message(booking):
    patient = booking.get('patient_name', 'Customer')
    date = booking.get('booking_date', 'N/A')
    doctor = booking.get('doctor_name', 'N/A')
    clinic = booking.get('clinic_name', 'N/A')
    prompt = f"""
    Draft a friendly, concise WhatsApp reminder message for a patient appointment. Include:
    - Patient name: {patient}
    - Date: {date}
    - Doctor: {doctor}
    - Clinic: {clinic}
    The message should politely remind the patient of their appointment, mention the time if available, and ask them to arrive on time. Limit to 320 characters. Write in simple, natural language suitable for WhatsApp.
    """
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful clinic assistant."},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message['content'].strip()
    except Exception as e:
        print(f"[GenAI error] {e}")
        return f"Reminder: Dear {patient}, you have an appointment with {doctor} at {clinic} on {date}. Please arrive on time."

def is_4_hours_before(booking):
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
    for booking in bookings:
        patient_number = booking.get('patient_mobile')
        if not patient_number:
            continue
        if is_4_hours_before(booking):
            message = generate_followup_message(booking)
            print(f"Sending WhatsApp to {patient_number}:\n{message}\n")
            # Choose one API (uncomment to enable real sending):
            # send_whatsapp_ultramsg(patient_number, message)
            # send_whatsapp_callmebot(patient_number, message)
            print("(WhatsApp function is ready. Uncomment in code to enable real sending.)\n")
