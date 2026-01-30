// Deployment entry point for Render.com and local
// No code needed here, app.js already starts the server
// This file exists for Render's default entrypoint


// server.js – Render entrypoint
const app = require('./app');

// Render requires a direct start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`DoctorPod running on port ${PORT}`));
