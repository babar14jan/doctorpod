document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = document.getElementById('submitBtn');
  const errorMsg = document.getElementById('errorMsg');
  
  // Hide previous error
  errorMsg.classList.remove('show');
  errorMsg.textContent = '';
  
  // Get form data
  const formData = new FormData(form);
  const payload = { 
    mobile: formData.get('mobile').trim(), 
    password: formData.get('password') 
  };
  
  // Validate
  if (!payload.mobile || !payload.password) {
    errorMsg.textContent = 'Please fill in all fields';
    errorMsg.classList.add('show');
    return;
  }
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.classList.add('btn-loading');
  
  try {
    const res = await fetch('/admin/login', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) { 
      window.location.href = '/admin_dashboard.html'; 
    } else { 
      errorMsg.textContent = data.message || 'Invalid username or password';
      errorMsg.classList.add('show');
    }
  } catch (err) { 
    errorMsg.textContent = 'Connection error. Please try again.';
    errorMsg.classList.add('show');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('btn-loading');
  }
});

// ============= FORGOT PASSWORD FUNCTIONALITY =============

let forgotPasswordData = {
  identifier: null,
  otpToken: null
};

function showForgotPassword() {
  document.getElementById('adminLoginForm').parentElement.parentElement.style.display = 'none';
  document.getElementById('forgotPasswordModal').style.display = 'block';
  resetForgotPassword();
}

function hideForgotPassword() {
  document.getElementById('forgotPasswordModal').style.display = 'none';
  document.getElementById('adminLoginForm').parentElement.parentElement.style.display = 'block';
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
    const res = await fetch('/admin/forgot-password/send-otp', {
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
    const res = await fetch('/admin/forgot-password/verify-otp', {
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
    const res = await fetch('/admin/forgot-password/reset', {
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
    const res = await fetch('/admin/forgot-password/send-otp', {
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
