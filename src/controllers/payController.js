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

  // Compose UPI deep links for multiple apps
  const upiId = encodeURIComponent(payment.upi_id);
  const payeeName = encodeURIComponent(payment.name);
  const amount = payment.consultation_fee;
  const note = encodeURIComponent(`DoctorPod Consultation for ${payment.patient_name}`);
  
  // Generic UPI link (works with most UPI apps)
  const genericUpiLink = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`;
  
  // PhonePe specific deep link
  const phonePeLink = `phonepe://pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`;
  
  // Google Pay specific deep link  
  const googlePayLink = `gpay://upi/pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`;
  
  // Paytm specific deep link
  const paytmLink = `paytmmp://pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`;

  // Serve HTML with improved redirect logic
  res.send(`<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Pay ₹${amount} - DoctorPod</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .logo { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; color: #1a202c; margin-bottom: 8px; }
    .amount { font-size: 36px; font-weight: bold; color: #10b981; margin: 16px 0; }
    .clinic { font-size: 14px; color: #64748b; margin-bottom: 24px; }
    .btn {
      display: block;
      width: 100%;
      padding: 14px;
      margin: 12px 0;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      text-decoration: none;
      color: white;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    .btn-phonepe { background: #5f259f; }
    .btn-gpay { background: #4285f4; }
    .btn-paytm { background: #00baf2; }
    .btn-generic { background: #6366f1; }
    .info {
      font-size: 13px;
      color: #64748b;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .spinner {
      border: 3px solid #f3f4f6;
      border-top: 3px solid #10b981;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class='container'>
    <div class='logo'>💳</div>
    <h1>Complete Payment</h1>
    <div class='amount'>₹${amount}</div>
    <div class='clinic'>To: ${payment.name}</div>
    
    <div id='loading' class='hidden'>
      <div class='spinner'></div>
      <p style='color: #64748b; margin-top: 12px;'>Opening payment app...</p>
    </div>
    
    <div id='buttons'>
      <a href='${phonePeLink}' class='btn btn-phonepe' onclick='showLoading()'>📱 Pay with PhonePe</a>
      <a href='${googlePayLink}' class='btn btn-gpay' onclick='showLoading()'>🔵 Pay with Google Pay</a>
      <a href='${paytmLink}' class='btn btn-paytm' onclick='showLoading()'>💙 Pay with Paytm</a>
      <a href='${genericUpiLink}' class='btn btn-generic' onclick='showLoading()'>💰 Pay with Any UPI App</a>
    </div>
    
    <div class='info'>
      UPI ID: ${payment.upi_id}<br>
      Visit ID: ${payment.visit_id}
    </div>
  </div>
  
  <script>
    function showLoading() {
      document.getElementById('buttons').classList.add('hidden');
      document.getElementById('loading').classList.remove('hidden');
      
      // Hide loading after 3 seconds (in case app doesn't open)
      setTimeout(() => {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('buttons').classList.remove('hidden');
      }, 3000);
    }
    
    // Detect if opened in WhatsApp in-app browser
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isWhatsApp = /WhatsApp/i.test(userAgent);
    
    if (isWhatsApp) {
      // Show a prompt to open in external browser
      const openExternal = confirm("For best experience, open this payment link in your browser.\\n\\nTap 'OK' then select 'Open in Browser' from the menu (⋮)");
    }
  </script>
</body>
</html>`);
}

module.exports = { payRedirect };
