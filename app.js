// ...existing code...

const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const app = express();
// const PORT = process.env.PORT || 3000;

// CORS (safe defaults)
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({ secret: 'dev-secret', resave: false, saveUninitialized: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Mount route modules
const doctorRoutes = require('./src/routes/doctorRoutes');
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

app.use('/doctors', doctorRoutes);
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
app.use('/', updateHistoryRoutes);


// Mount patientRoutes after all other routes and after app is initialized
const patientRoutes = require('./src/routes/patientRoutes');
app.use('/api/patient', patientRoutes);


// Serve index.html at root
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Production-safe absolute redirects middleware
app.use((req, res, next) => {
	// Patch res.redirect to always use absolute paths
	const origRedirect = res.redirect;
	res.redirect = function redirect(url, ...args) {
		if (typeof url === 'string' && url.startsWith('/')) {
			return origRedirect.call(this, url, ...args);
		}
		// If not absolute, force to root
		return origRedirect.call(this, '/' + url, ...args);
	};
	next();
});

// Error handler (basic)
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ error: 'Internal server error' });
});

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Export app for server.js (Render entrypoint)
module.exports = app;