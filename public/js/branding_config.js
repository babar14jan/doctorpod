// Client-side Branding Configuration
// This file is served to the browser and contains branding settings
// Edit this file to change app name, tagline, logo on the frontend

window.BRANDING_CONFIG = {
  // App Branding
  name: 'Cliniqo',
  tagline: 'Smart. Trusted. Efficient.',
  
  // Logo Configuration
  logo: {
    path: '/asset/logo/doctor_logo.png',
    alt: 'Cliniqo'
  },
  
  // App Metadata
  copyright: {
    year: new Date().getFullYear(),
    holder: 'Cliniqo'
  },
  
  // Page Title Templates
  titles: {
    default: 'Cliniqo - Smart. Trusted. Efficient.',
    admin: 'Admin Dashboard - Cliniqo',
    admin_login: 'Admin Login - Cliniqo',
    doctor: 'Doctor Dashboard - Cliniqo',
    doctor_login: 'Doctor Login - Cliniqo', 
    doctor_home: 'Doctor Portal - Cliniqo',
    clinic: 'Clinic Dashboard - Cliniqo',
    clinic_login: 'Clinic Login - Cliniqo',
    patient: 'Book Appointment - Cliniqo',
    check_booking: 'Check Booking - Cliniqo',
    payment: 'Payment - Cliniqo'
  }
};