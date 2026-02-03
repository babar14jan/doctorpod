const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');

const app = express();
// const PORT = process.env.PORT || 3000;

/**
 * 🔐 REQUIRED for Render (behind proxy + HTTPS)
 */
app.set('trust proxy', 1);

/**
 * 🔁 Production-safe absolute redirects
 * MUST be before routes
 */
app.use((req, res, next) => {
  const origRedirect = res.redirect;
  res.redirect = function redirect(url, ...args) {
    if (typeof url === 'string' && url.startsWith('/')) {
      return origRedirect.call(this, url, ...args);
    }
    return origRedirect.call(this, '/' + url, ...args);
  };
  next();
});

// CORS (safe defaults)
app.use(cors());

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: true,
  })
);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Mount doctorRoutes FIRST (multer dependency)
 */
const doctorRoutes = require('./src/routes/doctorRoutes');
app.use('/doctors', doctorRoutes);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * All other routes
 */
const bookingRoutes = require('./src/routes/bookingRoutes');
const medicineRoutes = require('./src/routes/medicineRoutes');
const historyRoutes = require('./src/routes/historyRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const clinicRoutes = require('./src/routes/clinicRoutes');
const pdfRoutes = require('./src/routes/pdfRoutes');
const whatsappRoutes = require('./src/routes/whatsappRoutes');
const updateHistoryRoutes = require('./src/routes/updateHistoryRoutes');
const availabilityRoutes = require('./src/routes/availabilityRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const followUpRoutes = require('./src/routes/followUpRoutes');
const payRoutes = require('./src/routes/payRoutes');
const demoRoutes = require('./src/routes/demoRoutes');
const invoiceRoutes = require('./src/routes/invoiceRoutes');

app.use('/bookings', bookingRoutes);
app.use('/medicines', medicineRoutes);
app.use('/history', historyRoutes);
app.use('/admin', adminRoutes);
app.use('/clinic', clinicRoutes);
app.use('/pdf', pdfRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/availability', availabilityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/invoices', invoiceRoutes);

/**
 * ✅ WhatsApp-friendly UPI payment links
 * https://your-app.onrender.com/pay/{paymentId}
 */
app.use('/pay', payRoutes);

// Other updates
app.use('/', updateHistoryRoutes);

/**
 * Patient routes (mounted last)
 */
const patientRoutes = require('./src/routes/patientRoutes');
app.use('/api/patient', patientRoutes);

// Root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler (basic)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export app for Render entrypoint
module.exports = app;
