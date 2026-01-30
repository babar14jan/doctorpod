# GenAI Descriptive Agent

This folder contains code for an AI agent that reads the `booking` table and generates descriptive outbound call scripts for customer mobile numbers. The agent is designed to be run independently and does not modify or interfere with the main frontend or backend codebase.

## Features
- Reads booking data from the database
- Uses GenAI to generate a personalized call script for each booking
- (Optional) Integrates with a telephony API to place calls

## Usage
- Place your GenAI and telephony integration code here
- Do not modify main app code

---

Your WhatsApp agent now uses OpenAI to generate natural, human-like reminder messages for each booking. Just set your OpenAI API key as an environment variable (OPENAI_API_KEY), and the agent will draft personalized WhatsApp reminders for your patients.

If you need help with scheduling (e.g., running this script automatically every hour), let me know your preferred method (cron, Windows Task Scheduler, etc.) and I’ll guide you!
