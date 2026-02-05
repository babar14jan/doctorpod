// Branding Configuration Loader
// This script loads branding configuration and updates DOM elements

(function() {
  'use strict';

  // Ensure branding config is available
  if (typeof window.BRANDING_CONFIG === 'undefined') {
    console.error('BRANDING_CONFIG not loaded. Please include branding_config.js before this script.');
    return;
  }

  const config = window.BRANDING_CONFIG;

  // Update page title if it contains old branding
  function updatePageTitle() {
    // Use config titles if available, otherwise build dynamically
    const currentTitle = document.title;
    
    if (currentTitle.includes('Admin Login')) {
      document.title = config.titles?.admin_login || `Admin Login - ${config.name}`;
    } else if (currentTitle.includes('Doctor Login')) {
      document.title = config.titles?.doctor_login || `Doctor Login - ${config.name}`;
    } else if (currentTitle.includes('Clinic Login')) {
      document.title = config.titles?.clinic_login || `Clinic Login - ${config.name}`;
    } else if (currentTitle.includes('Admin Dashboard')) {
      document.title = config.titles?.admin || `Admin Dashboard - ${config.name}`;
    } else if (currentTitle.includes('Doctor Dashboard')) {
      document.title = config.titles?.doctor || `Doctor Dashboard - ${config.name}`;
    } else if (currentTitle.includes('Clinic Dashboard')) {
      document.title = config.titles?.clinic || `Clinic Dashboard - ${config.name}`;
    } else if (currentTitle.includes('Book Appointment')) {
      document.title = config.titles?.patient || `Book Appointment - ${config.name}`;
    } else if (currentTitle.includes('Check Booking')) {
      document.title = config.titles?.check_booking || `Check Booking - ${config.name}`;
    } else if (currentTitle.includes('Doctor Portal') || currentTitle.includes('Doctor Home')) {
      document.title = config.titles?.doctor_home || `Doctor Portal - ${config.name}`;
    } else {
      // Default/Home page
      document.title = config.titles?.default || `${config.name} - ${config.tagline}`;
    }
  }

  // Update navigation elements
  function updateNavigation() {
    // Update ALL elements containing placeholder or old branding text
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      // Update text content for single text nodes
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) { // Text node
        let text = el.textContent;
        
        // Replace loading placeholders and old branding
        if (text === 'Loading...' && (el.classList.contains('logo-text') || el.classList.contains('brand-text'))) {
          el.textContent = config.name;
        } else if (text === 'Loading...' && (el.classList.contains('logo-tagline') || el.classList.contains('small-muted'))) {
          el.textContent = config.tagline;
        } else if (text.includes('DoctorPod')) {
          el.textContent = text.replace(/DoctorPod/g, config.name);
        } else if (text.includes('Quick. Smart. Trusted.')) {
          el.textContent = text.replace(/Quick\\.\\s*Smart\\.\\s*Trusted\\./g, config.tagline);
        } else if (text.includes('MedFlow')) {
          el.textContent = text.replace(/MedFlow/g, config.name);
        } else if (text.includes('Streamlined healthcare')) {
          el.textContent = text.replace(/Streamlined healthcare/g, config.tagline);
        }
      }
      
      // Update alt attributes
      if (el.alt) {
        if (el.alt === 'App Logo' || el.alt.includes('DoctorPod') || el.alt.includes('MedFlow')) {
          el.alt = config.logo.alt;
        }
      }
      
      // Update src attributes for logos
      if (el.src && el.src.includes('doctor_logo.png')) {
        el.src = config.logo.path;
      }
    });

    // Force update specific selectors
    const logoTexts = document.querySelectorAll('.logo-text, .brand-text, .nav-title, #navTitle, #headerTitle, .brand-name');
    logoTexts.forEach(el => {
      if (el.textContent === 'Loading...' || el.textContent.includes('DoctorPod') || el.textContent.includes('MedFlow')) {
        el.textContent = config.name;
      }
    });

    const taglines = document.querySelectorAll('.logo-tagline, .logo-subtitle, .nav-subtitle, #navSubtitle, .small-muted, #headerSubtitle');
    taglines.forEach(el => {
      if (el.textContent === 'Loading...' || el.textContent.includes('Quick. Smart. Trusted.') || el.textContent.includes('Streamlined healthcare')) {
        el.textContent = config.tagline;
      }
    });

    // Update brand description elements
    const descriptions = document.querySelectorAll('.brand-description');
    descriptions.forEach(el => {
      el.textContent = `streamlines clinic operations with real-time appointment booking, instant digital prescriptions, and complete patient records — all in one platform.`;
    });

    // Update brand email elements
    const emails = document.querySelectorAll('.brand-email');
    emails.forEach(el => {
      const newEmail = `support@${config.domain}`;
      el.textContent = newEmail;
      el.href = `mailto:${newEmail}`;
    });

    // Update brand copyright elements
    const copyrightElements = document.querySelectorAll('.brand-copyright');
    copyrightElements.forEach(el => {
      el.textContent = `© ${config.copyright.year} ${config.copyright.holder}. ${config.tagline}`;
    });
    taglines.forEach(el => {
      if (el.textContent === 'Loading...' || el.textContent.includes('Quick. Smart. Trusted.') || el.textContent.includes('Streamlined healthcare')) {
        el.textContent = config.tagline;
      }
    });
  }

  // Update copyright information
  function updateCopyright() {
    const copyrightElements = document.querySelectorAll('[class*="copyright"], [id*="copyright"]');
    copyrightElements.forEach(el => {
      if (el.textContent.includes('DoctorPod') || el.textContent.includes('Quick. Smart. Trusted.')) {
        el.textContent = `© ${config.copyright.year} ${config.copyright.holder}. ${config.tagline}`;
      }
    });

    // Also check for footer text that might contain copyright
    const footers = document.querySelectorAll('footer p, .footer p');
    footers.forEach(el => {
      if (el.textContent.includes('DoctorPod')) {
        el.textContent = el.textContent
          .replace(/DoctorPod/g, config.copyright.holder)
          .replace(/Quick\.\s*Smart\.\s*Trusted\./g, config.tagline);
      }
    });
  }

  // Update meta tags
  function updateMetaTags() {
    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && metaDesc.content.includes('DoctorPod')) {
      metaDesc.content = metaDesc.content.replace(/DoctorPod/g, config.name);
    }

    // Update favicon if needed (you may want to add this)
    // const favicon = document.querySelector('link[rel="icon"]');
  }

  // Initialize all updates
  function initializeConfig() {
    updatePageTitle();
    updateNavigation();
    updateCopyright();
    updateMetaTags();
    
    // Dispatch custom event to notify other scripts
    window.dispatchEvent(new CustomEvent('brandingConfigLoaded', { detail: config }));
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConfig);
  } else {
    initializeConfig();
  }

  // Also run on dynamic content updates
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Re-run updates for any new nodes
        setTimeout(initializeConfig, 100);
      }
    });
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();