const db = require('../utils/db');
const path = require('path');

// GET /pay/:payment_id
// Redirects to UPI deep link using minimal HTML/JS
async function payRedirect(req, res) {
  const { payment_id } = req.params;
  console.log('[payRedirect] payment_id received:', payment_id);
  // Fetch payment details from DB (example: visits table)
  const payment = await db.prepare('SELECT v.visit_id, v.consultation_fee, c.upi_id, c.name, p.full_name as patient_name FROM visits v JOIN clinics c ON v.clinic_id = c.clinic_id JOIN patients p ON v.patient_id = p.patient_id WHERE v.visit_id = ?').get(payment_id);
  console.log('[payRedirect] SQL result:', payment);
  if (!payment) return res.status(404).send('Payment not found');

  // Compose UPI deep link
  const upiLink = `upi://pay?pa=${encodeURIComponent(payment.upi_id)}&pn=${encodeURIComponent(payment.name)}&am=${payment.consultation_fee}&cu=INR&tn=DoctorPod%20Consultation%20for%20${encodeURIComponent(payment.patient_name)}`;

  // Serve HTML with JS redirect
  res.send(`<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <title>Redirecting to UPI Payment...</title>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <script>
    window.UPI_LINK = '${upiLink}';
    window.location.href = window.UPI_LINK;
  </script>
</head>
<body>
  <p>Redirecting to UPI payment...</p>
  <noscript>
    <p>Please enable JavaScript to continue.</p>
  </noscript>
</body>
</html>`);
}

module.exports = { payRedirect };
