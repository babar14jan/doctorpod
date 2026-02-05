// Application Branding Configuration
// This file contains all branding and app-wide settings
// Edit this file to change app name, tagline, logo, etc.

const BRANDING_CONFIG = {
  // App Branding
  name: 'Cliniqo',
  tagline: 'Smart. Trusted. Efficient.',
  
  // Logo Configuration
  logo: {
    path: '/asset/logo/doctor_logo.png', // Default logo path
    alt: 'Cliniqo', // Alt text for logo
  },
  
  // App Metadata
  domain: process.env.DOMAIN || 'cliniqo.com',
  copyright: {
    year: new Date().getFullYear(),
    holder: 'Cliniqo'
  },
  
  // Signatures and Powered By
  signatures: {
    whatsapp: '_This is generated via Cliniqo_',
    powered_by: '_Powered by Cliniqo_'
  },
  
  // Email Configuration
  email: {
    from_name: 'Cliniqo',
    admin_subject_prefix: '🔐 Password Reset OTP - Cliniqo Admin',
    doctor_subject_prefix: '🔐 Password Reset OTP - Cliniqo Doctor'
  },
  
  // Payment Configuration
  payment: {
    note_prefix: 'Cliniqo Consultation for'
  },
  
  // Database Configuration
  database: {
    default_name: 'doctorpod.db'
  }
};

module.exports = BRANDING_CONFIG;