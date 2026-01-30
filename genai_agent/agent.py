"""
GenAI Descriptive Agent
- Reads the booking table
- Generates a descriptive call script for each booking
- (Optional) Can be extended to place calls via telephony API
"""
import sqlite3
import os
from typing import List, Dict

# For GenAI, you can use OpenAI, Azure, or any LLM provider
try:
    import openai
except ImportError:
    openai = None  # Placeholder if not installed

DB_PATH = os.environ.get('BOOKING_DB_PATH', '../database/sample_data.sql')

# --- Booking Data Access ---
def get_bookings(db_path: str) -> List[Dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute('SELECT * FROM booking')
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# --- GenAI Call Script Generation ---
def generate_call_script(booking: Dict, model: str = 'gpt-3.5-turbo') -> str:
    """
    Generate a descriptive call script for a booking using GenAI.
    """
    prompt = f"""
    You are a helpful clinic assistant. Call the following customer to confirm their booking:
    - Name: {booking.get('patient_name', 'Customer')}
    - Mobile: {booking.get('patient_mobile', 'N/A')}
    - Booking Date: {booking.get('booking_date', 'N/A')}
    - Doctor: {booking.get('doctor_name', 'N/A')}
    - Clinic: {booking.get('clinic_name', 'N/A')}
    Generate a friendly, concise call script for this customer.
    """
    if openai is None:
        return f"[GenAI not installed] {prompt}"
    response = openai.ChatCompletion.create(
        model=model,
        messages=[{"role": "system", "content": "You are a helpful assistant."},
                  {"role": "user", "content": prompt}]
    )
    return response.choices[0].message['content'].strip()

if __name__ == '__main__':
    bookings = get_bookings(DB_PATH)
    for booking in bookings:
        script = generate_call_script(booking)
        print(f"\n--- Call Script for {booking.get('patient_name', 'Customer')} ---\n{script}\n")
