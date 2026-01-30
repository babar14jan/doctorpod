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
        window.location.href = '/doctor_dashboard.html';
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
