document.addEventListener('DOMContentLoaded', () => {
  const identifierInput = document.getElementById('identifier');
  const clinicSelect = document.getElementById('clinicSelect');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submitBtn');
  const errorMsg = document.getElementById('errorMsg');
  const infoMsg = document.getElementById('infoMsg');
  
  // Step indicators
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const line1 = document.getElementById('line1');
  const line2 = document.getElementById('line2');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('show');
    infoMsg.classList.remove('show');
  }

  function showInfo(msg) {
    infoMsg.textContent = msg;
    infoMsg.classList.add('show');
    errorMsg.classList.remove('show');
  }

  function hideMessages() {
    errorMsg.classList.remove('show');
    infoMsg.classList.remove('show');
  }

  function updateSteps(currentStep) {
    step1.classList.remove('active', 'done');
    step2.classList.remove('active', 'done');
    step3.classList.remove('active', 'done');
    line1.classList.remove('active');
    line2.classList.remove('active');

    if (currentStep >= 1) step1.classList.add(currentStep > 1 ? 'done' : 'active');
    if (currentStep >= 2) {
      step2.classList.add(currentStep > 2 ? 'done' : 'active');
      line1.classList.add('active');
    }
    if (currentStep >= 3) {
      step3.classList.add('active');
      line2.classList.add('active');
    }
  }

  // Initialize
  updateSteps(1);

  // On blur of identifier, validate and fetch clinics
  identifierInput.addEventListener('blur', async function() {
    const identifier = this.value.trim();
    hideMessages();
    
    // Reset downstream fields
    clinicSelect.innerHTML = '<option value="">-- Select clinic --</option>';
    clinicSelect.disabled = true;
    passwordInput.value = '';
    passwordInput.disabled = true;
    submitBtn.disabled = true;
    updateSteps(1);

    if (!identifier) return;

    try {
      const res = await fetch('/doctors/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, fetchClinics: true })
      });
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.clinics) && data.clinics.length) {
        data.clinics.forEach(c => {
          clinicSelect.innerHTML += `<option value="${c.clinic_id}">${c.name}</option>`;
        });
        clinicSelect.disabled = false;
        updateSteps(2);
        showInfo('Select your clinic to continue');
      } else if (res.ok && data.success && Array.isArray(data.clinics) && data.clinics.length === 0) {
        showError('No clinics assigned to this doctor.');
      } else {
        showError(data.message || 'Doctor not found. Please check your mobile or email.');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    }
  });

  // Enable password when clinic is selected
  clinicSelect.addEventListener('change', function() {
    hideMessages();
    if (this.value) {
      passwordInput.disabled = false;
      submitBtn.disabled = false;
      updateSteps(3);
      showInfo('Enter your password to sign in');
    } else {
      passwordInput.value = '';
      passwordInput.disabled = true;
      submitBtn.disabled = true;
      updateSteps(2);
    }
  });

  // Form submission
  document.getElementById('doctorLoginForm').onsubmit = async function(e) {
    e.preventDefault();
    hideMessages();

    const identifier = identifierInput.value.trim();
    const selectedClinicId = clinicSelect.value;
    const password = passwordInput.value;

    if (!identifier) {
      showError('Please enter your mobile or email.');
      return;
    }
    if (!selectedClinicId) {
      showError('Please select a clinic.');
      return;
    }
    if (!password) {
      showError('Please enter your password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');

    try {
      const res = await fetch('/doctors/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, clinic_id: selectedClinicId })
      });
      const data = await res.json();

      if (res.ok && data.success && data.clinic) {
        if (data.id) sessionStorage.setItem('doctor_id', data.id);
        if (data.clinic.clinic_id) sessionStorage.setItem('clinic_id', data.clinic.clinic_id);
        if (data.clinic.name) sessionStorage.setItem('clinic_name', data.clinic.name);
        window.location.href = '/doctor_home.html';
      } else {
        showError(data.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');
    }
  };
});

// ============= FORGOT PASSWORD FUNCTIONALITY =============

let forgotPasswordData = {
  identifier: null,
  otpToken: null
};

function showForgotPassword() {
  document.getElementById('doctorLoginForm').parentElement.style.display = 'none';
  document.getElementById('forgotPasswordModal').style.display = 'block';
  resetForgotPassword();
}

function hideForgotPassword() {
  document.getElementById('forgotPasswordModal').style.display = 'none';
  document.getElementById('doctorLoginForm').parentElement.style.display = 'block';
  resetForgotPassword();
}

function resetForgotPassword() {
  // Reset all steps
  document.getElementById('forgotStep1').style.display = 'block';
  document.getElementById('forgotStep2').style.display = 'none';
  document.getElementById('forgotStep3').style.display = 'none';
  
  // Clear all forms
  document.getElementById('forgotForm1').reset();
  document.getElementById('forgotForm2').reset();
  document.getElementById('forgotForm3').reset();
  
  // Clear data
  forgotPasswordData = { identifier: null, otpToken: null };
  hideForgotAlert();
}

function showForgotAlert(message, type = 'error') {
  const alertBox = document.getElementById('forgotAlertBox');
  alertBox.className = type === 'success' ? 'info-msg show' : 'error-msg show';
  alertBox.textContent = message;
  alertBox.style.display = 'block';
}

function hideForgotAlert() {
  const alertBox = document.getElementById('forgotAlertBox');
  if (alertBox) alertBox.style.display = 'none';
}

async function handleForgotStep1(e) {
  e.preventDefault();
  hideForgotAlert();
  
  const identifier = document.getElementById('forgotIdentifier').value.trim();
  
  try {
    const res = await fetch('/doctors/forgot-password/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    const result = await res.json();
    
    if (result.success) {
      forgotPasswordData.identifier = identifier;
      document.getElementById('maskedEmail').textContent = result.maskedEmail;
      
      // Move to step 2
      document.getElementById('forgotStep1').style.display = 'none';
      document.getElementById('forgotStep2').style.display = 'block';
      
      showForgotAlert(`OTP sent to ${result.maskedEmail}`, 'success');
    } else {
      showForgotAlert(result.message || 'Failed to send OTP', 'error');
    }
  } catch (error) {
    showForgotAlert('Network error. Please try again.', 'error');
  }
}

async function handleForgotStep2(e) {
  e.preventDefault();
  hideForgotAlert();
  
  const otp = document.getElementById('otpInput').value.trim();
  
  try {
    const res = await fetch('/doctors/forgot-password/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        identifier: forgotPasswordData.identifier,
        otp: otp 
      })
    });
    const result = await res.json();
    
    if (result.success) {
      forgotPasswordData.otpToken = result.token;
      
      // Move to step 3
      document.getElementById('forgotStep2').style.display = 'none';
      document.getElementById('forgotStep3').style.display = 'block';
      
      showForgotAlert('OTP verified! Set your new password.', 'success');
    } else {
      showForgotAlert(result.message || 'Invalid OTP', 'error');
    }
  } catch (error) {
    showForgotAlert('Network error. Please try again.', 'error');
  }
}

async function handleForgotStep3(e) {
  e.preventDefault();
  hideForgotAlert();
  
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (newPassword !== confirmPassword) {
    showForgotAlert('Passwords do not match', 'error');
    return;
  }
  
  if (newPassword.length < 6) {
    showForgotAlert('Password must be at least 6 characters', 'error');
    return;
  }
  
  try {
    const res = await fetch('/doctors/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        identifier: forgotPasswordData.identifier,
        token: forgotPasswordData.otpToken,
        new_password: newPassword 
      })
    });
    const result = await res.json();
    
    if (result.success) {
      showForgotAlert('Password reset successful! Redirecting to login...', 'success');
      setTimeout(() => {
        hideForgotPassword();
      }, 2000);
    } else {
      showForgotAlert(result.message || 'Failed to reset password', 'error');
    }
  } catch (error) {
    showForgotAlert('Network error. Please try again.', 'error');
  }
}

async function resendOTP() {
  hideForgotAlert();
  
  try {
    const res = await fetch('/doctors/forgot-password/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: forgotPasswordData.identifier })
    });
    const result = await res.json();
    
    if (result.success) {
      showForgotAlert('OTP resent successfully!', 'success');
    } else {
      showForgotAlert(result.message || 'Failed to resend OTP', 'error');
    }
  } catch (error) {
    showForgotAlert('Network error. Please try again.', 'error');
  }
}
