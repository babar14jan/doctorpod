"""
GenAI Call Agent
- Reads booking table
- Generates call script
- Places call to patient using Twilio
"""
import os
from agent import get_bookings, generate_call_script
from call_utils import place_call

if __name__ == '__main__':
    # Load bookings
    bookings = get_bookings(os.environ.get('BOOKING_DB_PATH', '../database/sample_data.sql'))
    # Your verified number (or set via env TWILIO_FROM_NUMBER)
    from_number = os.environ.get('TWILIO_FROM_NUMBER', 'your_verified_number_here')
    for booking in bookings:
        patient_number = booking.get('patient_mobile')
        if not patient_number:
            print(f"No mobile for booking: {booking}")
            continue
        script = generate_call_script(booking)
        print(f"Calling {patient_number} with script:\n{script}\n")
        # Place the call (uncomment to enable actual calls)
        # place_call(patient_number, script, from_number)
        print("(Call function is ready. Uncomment in code to enable real calls.)\n")
