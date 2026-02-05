// Clinic Dashboard JavaScript
let clinicSession = null;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function isValidMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  return digits.length === 10;
}

// Toggle section collapse
function toggleSection(bodyId) {
  const body = document.getElementById(bodyId);
  const iconId = bodyId.replace('Body', 'Icon');
  const icon = document.getElementById(iconId);
  
  if (body && icon) {
    body.classList.toggle('collapsed');
    icon.classList.toggle('collapsed');
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  // Check session and load clinic info
  await loadClinicSession();
  
  // Load data
  loadDoctors();
  loadAvailability();
  
  // Button handlers - with null checks
  const signOutBtn = document.getElementById('signOut');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      window.location.href = '/clinic_login.html';
    });
  }
  
  // Only add listeners if buttons exist
  const profileBtn = document.getElementById('profileBtn');
  const passwordBtn = document.getElementById('changePasswordBtn');
  
  if (profileBtn) {
    profileBtn.addEventListener('click', openProfileModal);
  }
  
  if (passwordBtn) {
    passwordBtn.addEventListener('click', openPasswordModal);
  }
  
  // Initialize days grid for availability
  initializeAvailabilityDays();

  // Form handlers - with null checks
  const addDoctorForm = document.getElementById('addDoctorForm');
  const addAvailabilityForm = document.getElementById('addAvailabilityForm');
  const profileForm = document.getElementById('profileForm');
  const passwordForm = document.getElementById('passwordForm');
  const editDoctorForm = document.getElementById('editDoctorForm');
  
  if (addDoctorForm) addDoctorForm.addEventListener('submit', handleAddDoctor);
  if (addAvailabilityForm) addAvailabilityForm.addEventListener('submit', handleAddAvailability);
  if (profileForm) profileForm.addEventListener('submit', handleUpdateProfile);
  if (passwordForm) passwordForm.addEventListener('submit', handleChangePassword);
  if (editDoctorForm) editDoctorForm.addEventListener('submit', handleUpdateDoctor);
  
  // Initialize billing section
  setTimeout(() => {
    initializeBillingSection();
  }, 500);
  
  // Make functions globally accessible for inline event handlers
  window.handleAddDoctor = handleAddDoctor;
  window.handleAddAvailability = handleAddAvailability;
  window.loadAvailability = loadAvailability;
  window.editAvailability = editAvailability;
  window.closeEditAvailabilityModal = closeEditAvailabilityModal;
  window.deleteAvailability = deleteAvailability;
  window.loadInvoiceStats = loadInvoiceStats;
  window.loadTodaysCheckouts = loadTodaysCheckouts;
  window.loadAllInvoices = loadAllInvoices;
  window.markAsPaid = markAsPaid;
  window.openInvoiceModal = openInvoiceModal;
  window.closeInvoiceModal = closeInvoiceModal;
  window.loadClinicVideoConsultations = loadClinicVideoConsultations;
  window.filterVideoConsultations = filterVideoConsultations;
  window.markBookingAsPaid = markBookingAsPaid;
});

// Load clinic session
async function loadClinicSession() {
  try {
    const res = await fetch('/clinic/profile');
    const data = await res.json();
    
    if (data.success && data.clinic) {
      clinicSession = data.clinic;
      
      // Update header branding
      const headerLogo = document.getElementById('headerLogo');
      const headerTitle = document.getElementById('headerTitle');
      const headerSubtitle = document.getElementById('headerSubtitle');
      
      console.log('Clinic profile data:', data.clinic);
      
      if (headerTitle) {
        headerTitle.textContent = data.clinic.name || 'Clinic';
        console.log('Updated title to:', data.clinic.name);
      }
      
      if (headerSubtitle && data.clinic.address) {
        headerSubtitle.textContent = data.clinic.address;
        console.log('Updated address to:', data.clinic.address);
      } else if (headerSubtitle) {
        headerSubtitle.textContent = '';
      }
      
      if (headerLogo && data.clinic.logo_path) {
        headerLogo.src = data.clinic.logo_path;
        headerLogo.alt = data.clinic.name || 'Clinic Logo';
        headerLogo.style.display = 'block';
        console.log('Updated logo to:', data.clinic.logo_path);
      } else if (headerLogo) {
        headerLogo.style.display = 'none';
      }
      
      // Update elements only if they exist
      const nameEl = document.getElementById('clinicName');
      const idEl = document.getElementById('clinicId');
      const hiddenIdEl = document.getElementById('hiddenClinicId');
      
      if (nameEl) {
        nameEl.textContent = data.clinic.name || 'Clinic Dashboard';
      }
      
      if (idEl) {
        idEl.textContent = `Clinic ID: ${data.clinic.clinic_id}`;
      }
      
      if (hiddenIdEl) {
        hiddenIdEl.value = data.clinic.clinic_id;
      }
      
      // Update clinic badge
      const clinicBadge = document.getElementById('clinicBadge');
      if (clinicBadge) {
        clinicBadge.textContent = data.clinic.name || 'Clinic';
      }
    } else {
      window.location.href = '/clinic_login.html';
    }
  } catch (error) {
    window.location.href = '/clinic_login.html';
  }
}

// Update quick stats on page
function updateQuickStats(doctorCount, activeCount, scheduleCount, videoCount) {
  const statTotalDoctors = document.getElementById('statTotalDoctors');
  const statActiveDoctors = document.getElementById('statActiveDoctors');
  const statSchedules = document.getElementById('statSchedules');
  const statVideoConsults = document.getElementById('statVideoConsults');
  
  if (statTotalDoctors) statTotalDoctors.textContent = doctorCount ?? '-';
  if (statActiveDoctors) statActiveDoctors.textContent = activeCount ?? '-';
  if (statSchedules) statSchedules.textContent = scheduleCount ?? '-';
  if (statVideoConsults) statVideoConsults.textContent = videoCount ?? '-';
}

// Load doctors
async function loadDoctors() {
  const container = document.getElementById('doctorsList');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading doctors...</div>';
  
  if (!clinicSession) return;
  
  try {
    const res = await fetch(`/doctors/by-clinic/${clinicSession.clinic_id}`);
    const data = await res.json();
    const doctors = data.doctors || [];
    
    // Update stats only if element exists
    const totalDoctorsEl = document.getElementById('totalDoctors');
    if (totalDoctorsEl) {
      totalDoctorsEl.textContent = doctors.length;
    }
    
    // Update quick stats
    const activeDoctors = doctors.filter(d => d.is_active !== false && d.is_active !== 0).length;
    const statTotalDoctors = document.getElementById('statTotalDoctors');
    const statActiveDoctors = document.getElementById('statActiveDoctors');
    if (statTotalDoctors) statTotalDoctors.textContent = doctors.length;
    if (statActiveDoctors) statActiveDoctors.textContent = activeDoctors;
    
    // Populate doctor dropdown in availability form
    const doctorSelect = document.getElementById('availabilityDoctorId');
    if (doctorSelect) {
      doctorSelect.innerHTML = '<option value="">-- Select Doctor --</option>';
      doctors.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.doctor_id;
        option.textContent = `${doc.name} (${doc.doctor_id})`;
        doctorSelect.appendChild(option);
      });
    }
    
    if (!doctors.length) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">🩺</div><p>No doctors found. Add your first doctor above.</p></div>';
      return;
    }
    
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Doctor ID</th>
            <th>Name</th>
            <th>Qualification</th>
            <th>Specialization</th>
            <th>Mobile</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${doctors.map(d => `
            <tr>
              <td><strong>${d.doctor_id || d.id}</strong></td>
              <td>${d.name}</td>
              <td>${d.qualification || '-'}</td>
              <td>${d.specialization || '-'}</td>
              <td>${d.mobile || d.phone}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-sm btn-primary" onclick='editDoctor(${JSON.stringify(d).replace(/'/g, "&apos;")})'>✏️ Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteDoctor('${d.doctor_id || d.id}')">🗑️ Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error loading doctors:', error);
    container.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Error loading doctors</p></div>';
  }
}

// Add doctor
let isAddingDoctor = false;

async function handleAddDoctor(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // Prevent double submission
  if (isAddingDoctor) {
    console.log('⚠️ Form already submitting, ignoring duplicate submission');
    return false;
  }
  
  isAddingDoctor = true;
  console.log('=== ADD DOCTOR FORM SUBMITTED ===');
  
  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';
  }
  
  const formData = new FormData(e.target);
  
  // Ensure clinic_id is set
  if (!formData.get('clinic_id') && clinicSession) {
    formData.set('clinic_id', clinicSession.clinic_id);
  }
  
  console.log('Clinic Session:', clinicSession);
  console.log('FormData entries:', Array.from(formData.entries()));
  
  try {
    console.log('Sending POST request to /doctors/add...');
    const res = await fetch('/doctors/add', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response data:', data);
    
    if (data.success) {
      showSuccessModal({
        emoji: '🩺',
        title: 'Doctor Added Successfully!',
        msg: 'Doctor ID:',
        highlight: data.doctor_id,
        note: 'Share this ID with the doctor for login.'
      });
      e.target.reset();
      document.getElementById('hiddenClinicId').value = clinicSession.clinic_id;
      await loadDoctors(); // Wait for reload
    } else {
      showSuccessModal({
        emoji: '⚠️',
        title: 'Failed to Add Doctor',
        msg: data.message || 'Unknown error occurred',
        highlight: '',
        note: 'Please check the details and try again.'
      });
    }
  } catch (error) {
    console.error('Error adding doctor:', error);
    showSuccessModal({
      emoji: '❌',
      title: 'Error',
      msg: 'Could not connect to server',
      highlight: '',
      note: error.message
    });
  } finally {
    // Re-enable form
    isAddingDoctor = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Doctor';
    }
  }
  
  return false; // Extra safety to prevent default form submission
}

// Edit doctor
function editDoctor(doctor) {
  document.getElementById('editDoctorId').value = doctor.doctor_id || doctor.id;
  document.getElementById('editDoctorName').value = doctor.name;
  document.getElementById('editDoctorQual').value = doctor.qualification || '';
  document.getElementById('editDoctorSpec').value = doctor.specialization || '';
  document.getElementById('editDoctorMobile').value = doctor.mobile || doctor.phone;
  document.getElementById('editDoctorEmail').value = doctor.email || '';
  document.getElementById('editDoctorReg').value = doctor.registration_no || '';
  document.getElementById('editDoctorPassword').value = '';
  
  document.getElementById('editDoctorModal').classList.add('active');
}

function closeEditDoctorModal() {
  document.getElementById('editDoctorModal').classList.remove('active');
}

async function handleUpdateDoctor(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    doctor_id: formData.get('doctor_id'),
    name: formData.get('name'),
    qualification: formData.get('qualification'),
    specialization: formData.get('specialization'),
    mobile: formData.get('mobile'),
    email: formData.get('email'),
    registration_no: formData.get('registration_no')
  };
  
  const password = formData.get('password');
  if (password) data.password = password;
  
  try {
    const res = await fetch('/doctors/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    
    if (result.success) {
      closeEditDoctorModal();
      showSuccessModal({
        emoji: '✅',
        title: 'Doctor Updated!',
        msg: 'Doctor details have been updated successfully.',
        highlight: '',
        note: ''
      });
      loadDoctors();
    } else {
      alert(result.message || 'Failed to update doctor');
    }
  } catch (error) {
    alert('Error updating doctor');
  }
}

// Delete doctor
async function deleteDoctor(doctor_id) {
  if (!confirm(`Are you sure you want to deactivate doctor ${doctor_id}?\n\nNote: This will mark the doctor as inactive. They will no longer appear in the system or be able to login, but their data will be preserved.`)) {
    return;
  }
  
  try {
    const res = await fetch('/doctors/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doctor_id })
    });
    const data = await res.json();
    
    if (data.success) {
      loadDoctors();
    } else {
      alert(data.message || 'Failed to deactivate doctor');
    }
  } catch (error) {
    alert('Error deactivating doctor');
  }
}

// Profile modal
async function openProfileModal() {
  try {
    const res = await fetch('/clinic/profile');
    const data = await res.json();
    
    if (data.success && data.clinic) {
      document.getElementById('profileName').value = data.clinic.name || '';
      document.getElementById('profilePhone').value = data.clinic.phone || '';
      document.getElementById('profileEmail').value = data.clinic.email || '';
      document.getElementById('profileAddress').value = data.clinic.address || '';
      document.getElementById('profileUpi').value = data.clinic.upi_id || '';
      
      document.getElementById('profileModal').classList.add('active');
    }
  } catch (error) {
    alert('Error loading profile');
  }
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.remove('active');
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    clinic_id: clinicSession.clinic_id,
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    address: formData.get('address'),
    upi_id: formData.get('upi_id')
  };
  
  try {
    const res = await fetch('/clinic/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    
    if (result.success) {
      closeProfileModal();
      showSuccessModal({
        emoji: '✅',
        title: 'Profile Updated!',
        msg: 'Your clinic profile has been updated successfully.',
        highlight: '',
        note: 'Please refresh the page to see changes.'
      });
      setTimeout(() => location.reload(), 2000);
    } else {
      alert(result.message || 'Failed to update profile');
    }
  } catch (error) {
    alert('Error updating profile');
  }
}

// Password modal
function openPasswordModal() {
  document.getElementById('passwordModal').classList.add('active');
}

function closePasswordModal() {
  document.getElementById('passwordModal').classList.remove('active');
  document.getElementById('passwordForm').reset();
}

async function handleChangePassword(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const newPassword = formData.get('new_password');
  const confirmPassword = formData.get('confirm_password');
  
  if (newPassword !== confirmPassword) {
    alert('New passwords do not match');
    return;
  }
  
  const data = {
    old_password: formData.get('old_password'),
    new_password: newPassword
  };
  
  try {
    const res = await fetch('/clinic/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    
    if (result.success) {
      closePasswordModal();
      showSuccessModal({
        emoji: '🔑',
        title: 'Password Changed!',
        msg: 'Your password has been changed successfully.',
        highlight: '',
        note: 'Please use the new password for your next login.'
      });
    } else {
      alert(result.message || 'Failed to change password');
    }
  } catch (error) {
    alert('Error changing password');
  }
}

// Success modal
function showSuccessModal({ emoji, title, msg, highlight, note }) {
  document.getElementById('modalEmoji').textContent = emoji || '🎉';
  document.getElementById('modalTitle').textContent = title || 'Success!';
  document.getElementById('modalMsg').textContent = msg || '';
  
  const highlightEl = document.getElementById('modalHighlight');
  if (highlight) {
    highlightEl.textContent = highlight;
    highlightEl.style.display = 'inline-block';
  } else {
    highlightEl.style.display = 'none';
  }
  
  document.getElementById('modalNote').textContent = note || '';
  document.getElementById('successModal').classList.add('active');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.remove('active');
}

// Initialize availability days grid
function initializeAvailabilityDays() {
  const daysOfWeek = [
    { short: 'Mon', full: 'Monday' },
    { short: 'Tue', full: 'Tuesday' },
    { short: 'Wed', full: 'Wednesday' },
    { short: 'Thu', full: 'Thursday' },
    { short: 'Fri', full: 'Friday' },
    { short: 'Sat', full: 'Saturday' },
    { short: 'Sun', full: 'Sunday' }
  ];
  const container = document.getElementById('availabilityDaysContainer');
  
  container.innerHTML = daysOfWeek.map(day => `
    <div class="day-row">
      <div class="day-checkbox">
        <input type="checkbox" id="day_${day.short}" name="day_${day.short}" value="${day.short}" />
        <label for="day_${day.short}">${day.full}</label>
      </div>
      <div class="time-inputs">
        <input type="time" name="start_${day.short}" value="09:00" />
        <span>to</span>
        <input type="time" name="end_${day.short}" value="17:00" />
      </div>
    </div>
  `).join('');
}

// Handle Add Doctor Availability
let isAddingAvailability = false;

async function handleAddAvailability(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // Prevent double submission
  if (isAddingAvailability) {
    console.log('⚠️ Availability form already submitting, ignoring duplicate');
    return false;
  }
  
  isAddingAvailability = true;
  console.log('=== ADD AVAILABILITY FORM SUBMITTED ===');
  
  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';
  }
  
  const formData = new FormData(e.target);
  const doctor_id = formData.get('doctor_id');
  const clinic_id = clinicSession.clinic_id;
  const interval_minutes = parseInt(formData.get('interval_minutes')) || 15;
  const slot_type = formData.get('slot_type') || 'clinic';
  
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const entries = [];
  
  daysOfWeek.forEach(day => {
    const dayCheckbox = document.querySelector(`[name="day_${day}"]`);
    if (dayCheckbox && dayCheckbox.checked) {
      const start = document.querySelector(`[name="start_${day}"]`).value;
      const end = document.querySelector(`[name="end_${day}"]`).value;
      entries.push({ day, start, end });
    }
  });
  
  if (!doctor_id) {
    showSuccessModal({
      emoji: '⚠️',
      title: 'Validation Error',
      msg: 'Please select a doctor',
      highlight: '',
      note: 'You must choose a doctor before setting availability.'
    });
    return false;
  }
  
  if (entries.length === 0) {
    showSuccessModal({
      emoji: '⚠️',
      title: 'Validation Error',
      msg: 'Please select at least one day',
      highlight: '',
      note: 'Check the days and set timings for when the doctor is available.'
    });
    return false;
  }
  
  console.log('Availability entries:', entries);
  
  let success = true;
  let errorMessages = [];
  
  for (const entry of entries) {
    try {
      console.log(`Sending availability for ${entry.day} (${slot_type})...`);
      const res = await fetch('/availability/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id,
          clinic_id,
          interval_minutes,
          days: entry.day,
          timings: `${entry.start}-${entry.end}`,
          slot_type
        })
      });
      
      const result = await res.json();
      console.log(`Availability for ${entry.day}:`, result);
      
      if (!result.success) {
        success = false;
        errorMessages.push(`${entry.day}: ${result.message || 'Failed'}`);
      }
    } catch (error) {
      console.error('Error adding availability:', error);
      success = false;
      errorMessages.push(`${entry.day}: Network error`);
    }
  }
  
  showSuccessModal({
    emoji: success ? '📅' : '⚠️',
    title: success ? 'Availability Added!' : 'Some Entries Failed',
    msg: success ? 'Schedule updated successfully.' : errorMessages.join(', '),
    highlight: success ? entries.map(e => `${e.day}: ${e.start}-${e.end}`).join(', ') : '',
    note: success ? 'Patients can now book appointments during these times.' : 'Please check the details and try again.'
  });
  
  if (success) {
    e.target.reset();
    initializeAvailabilityDays();
    loadAvailability(); // Refresh the availability list
  }
  
  // Re-enable form
  isAddingAvailability = false;
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Availability';
  }
  
  return false; // Extra safety to prevent default form submission
}

// Load availability
async function loadAvailability() {
  const container = document.getElementById('availabilityList');
  if (!container) {
    console.log('[loadAvailability] Container not found');
    return;
  }
  
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading availability...</div>';
  
  if (!clinicSession) {
    console.log('[loadAvailability] No clinic session');
    container.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Session not loaded. Please refresh.</p></div>';
    return;
  }
  
  console.log('[loadAvailability] Fetching for clinic:', clinicSession.clinic_id);
  
  try {
    const res = await fetch(`/availability/by-clinic/${clinicSession.clinic_id}`);
    const data = await res.json();
    console.log('[loadAvailability] Response:', data);
    const availability = data.availability || [];
    
    // Update quick stats for schedules
    const statSchedules = document.getElementById('statSchedules');
    if (statSchedules) statSchedules.textContent = availability.length;
    
    if (!availability.length) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">📅</div><p>No availability set. Add doctor schedules above.</p></div>';
      return;
    }
    
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Doctor</th>
            <th>Day</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Type</th>
            <th>Interval (min)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${availability.map(a => {
            const slotTypeLabel = a.slot_type === 'video' ? '📹 Video' :
                                  a.slot_type === 'both' ? '🔄 Both' : '🏥 Clinic';
            const slotTypeColor = a.slot_type === 'video' ? '#16a34a' :
                                  a.slot_type === 'both' ? '#9333ea' : '#2563eb';
            return `
            <tr>
              <td><strong>${a.doctor_name || 'Unknown'}</strong><br><small>${a.doctor_id}</small></td>
              <td>${a.day_of_week}</td>
              <td>${a.start_time}</td>
              <td>${a.end_time}</td>
              <td><span style="color: ${slotTypeColor}; font-weight: 500;">${slotTypeLabel}</span></td>
              <td>${a.interval_minutes}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-sm btn-primary" onclick='editAvailability(${JSON.stringify(a).replace(/'/g, "&apos;")})'>✏️ Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteAvailability(${a.id})">🗑️ Delete</button>
                </div>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error loading availability:', error);
    container.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Error loading availability</p></div>';
  }
}

// Edit availability - open modal
function editAvailability(availability) {
  document.getElementById('editAvailabilityId').value = availability.id;
  document.getElementById('editAvailabilityDoctorName').textContent = availability.doctor_name || 'Unknown Doctor';
  document.getElementById('editAvailabilityDay').textContent = `📅 ${availability.day_of_week}`;
  document.getElementById('editAvailabilityStartTime').value = availability.start_time;
  document.getElementById('editAvailabilityEndTime').value = availability.end_time;
  document.getElementById('editAvailabilityInterval').value = availability.interval_minutes;
  document.getElementById('editAvailabilitySlotType').value = availability.slot_type || 'clinic';
  
  document.getElementById('editAvailabilityModal').classList.add('active');
}

// Close edit availability modal
function closeEditAvailabilityModal() {
  document.getElementById('editAvailabilityModal').classList.remove('active');
}

// Handle edit availability form submit
document.getElementById('editAvailabilityForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const id = document.getElementById('editAvailabilityId').value;
  const start_time = document.getElementById('editAvailabilityStartTime').value;
  const end_time = document.getElementById('editAvailabilityEndTime').value;
  const interval_minutes = parseInt(document.getElementById('editAvailabilityInterval').value);
  const slot_type = document.getElementById('editAvailabilitySlotType').value;
  
  if (!start_time || !end_time || !interval_minutes) {
    showSuccessModal({
      emoji: '⚠️',
      title: 'Validation Error',
      msg: 'Please fill all required fields',
      highlight: '',
      note: ''
    });
    return;
  }
  
  closeEditAvailabilityModal();
  
  updateAvailability(id, {
    start_time,
    end_time,
    interval_minutes,
    slot_type
  });
});

// Update availability
async function updateAvailability(id, updates) {
  try {
    const res = await fetch('/availability/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showSuccessModal({
        emoji: '✅',
        title: 'Availability Updated!',
        msg: 'Schedule has been updated successfully.',
        highlight: '',
        note: ''
      });
      loadAvailability();
    } else {
      showSuccessModal({
        emoji: '⚠️',
        title: 'Update Failed',
        msg: data.message || 'Unknown error',
        highlight: '',
        note: ''
      });
    }
  } catch (error) {
    console.error('Error updating availability:', error);
    showSuccessModal({
      emoji: '❌',
      title: 'Error',
      msg: 'Could not update availability',
      highlight: '',
      note: error.message
    });
  }
}

// Delete availability
async function deleteAvailability(id) {
  if (!confirm('Are you sure you want to delete this availability slot?')) {
    return;
  }
  
  try {
    const res = await fetch('/availability/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showSuccessModal({
        emoji: '🗑️',
        title: 'Availability Deleted',
        msg: 'Schedule slot has been removed.',
        highlight: '',
        note: ''
      });
      loadAvailability();
    } else {
      showSuccessModal({
        emoji: '⚠️',
        title: 'Delete Failed',
        msg: data.message || 'Unknown error',
        highlight: '',
        note: ''
      });
    }
  } catch (error) {
    console.error('Error deleting availability:', error);
    showSuccessModal({
      emoji: '❌',
      title: 'Error',
      msg: 'Could not delete availability',
      highlight: '',
      note: error.message
    });
  }
}

// ============= BILLING & INVOICE MANAGEMENT =============

let currentClinicId = null;

// Load invoice statistics
async function loadInvoiceStats() {
  if (!clinicSession || !clinicSession.clinic_id) return;
  
  currentClinicId = clinicSession.clinic_id;
  
  try {
    const res = await fetch(`/api/invoices/clinic/${currentClinicId}/stats`);
    const data = await res.json();
    
    if (data.success && data.stats) {
      const stats = data.stats;
      
      // Update stat cards
      document.getElementById('statTodayRevenue').textContent = `₹${stats.today_revenue.toFixed(2)}`;
      document.getElementById('statPendingPayments').textContent = `₹${stats.pending_payments.toFixed(2)}`;
      document.getElementById('statMonthRevenue').textContent = `₹${stats.month_revenue.toFixed(2)}`;
      document.getElementById('statTodayCheckouts').textContent = stats.today_checkouts;
      
      // Calculate invoice counts
      const todayInvoices = await getTodayInvoiceCount();
      const unpaidCount = await getUnpaidInvoiceCount();
      
      document.getElementById('statTodayInvoices').textContent = `${todayInvoices} invoice${todayInvoices !== 1 ? 's' : ''}`;
      document.getElementById('statPendingCount').textContent = `${unpaidCount} unpaid`;
    }
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

async function getTodayInvoiceCount() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/invoices/clinic/${currentClinicId}/all?start_date=${today}&end_date=${today}`);
    const data = await res.json();
    return data.success ? data.invoices.length : 0;
  } catch {
    return 0;
  }
}

async function getUnpaidInvoiceCount() {
  try {
    const res = await fetch(`/api/invoices/clinic/${currentClinicId}/all?status=unpaid`);
    const data = await res.json();
    return data.success ? data.invoices.length : 0;
  } catch {
    return 0;
  }
}

// Load today's checkouts (visits without invoices)
async function loadTodaysCheckouts() {
  if (!currentClinicId) return;
  
  const container = document.getElementById('todaysCheckoutsList');
  
  try {
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
    
    const res = await fetch(`/api/invoices/clinic/${currentClinicId}/checkouts`);
    const data = await res.json();
    
    if (data.success && data.checkouts) {
      if (data.checkouts.length === 0) {
        container.innerHTML = '<div class="empty-state">🎉 All checkouts completed for today!</div>';
        return;
      }
      
      let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
      
      data.checkouts.forEach(visit => {
        const visitTime = new Date(visit.visit_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        html += `
          <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 600; color: #1e293b; font-size: 1rem;">${visit.patient_name || 'Unknown Patient'}</div>
              <div style="color: #64748b; font-size: 0.875rem; margin-top: 0.25rem;">
                📱 ${visit.patient_mobile || 'N/A'} • 👨‍⚕️ Dr. ${visit.doctor_name || 'Unknown'} • 🕐 ${visitTime}
              </div>
              <div style="color: #10b981; font-weight: 600; font-size: 0.875rem; margin-top: 0.5rem;">₹${visit.consultation_fee || 0} consultation</div>
            </div>
            <button class="btn btn-success" onclick="openInvoiceModal('${visit.visit_id}', '${visit.patient_name || ''}', '${visit.patient_mobile || ''}', '${visit.doctor_name || ''}', ${visit.consultation_fee || 0})" style="white-space: nowrap;">
              🧾 Checkout
            </button>
          </div>
        `;
      });
      
      html += '</div>';
      container.innerHTML = html;
    } else {
      container.innerHTML = '<div class="empty-state">No checkouts pending</div>';
    }
  } catch (error) {
    console.error('Load checkouts error:', error);
    container.innerHTML = '<div class="empty-state" style="color: #ef4444;">Error loading checkouts</div>';
  }
}

// Load all invoices with filters
async function loadAllInvoices() {
  if (!currentClinicId) return;
  
  const container = document.getElementById('allInvoicesList');
  const status = document.getElementById('invoiceStatusFilter').value;
  const startDate = document.getElementById('invoiceStartDate').value;
  const endDate = document.getElementById('invoiceEndDate').value;
  const patientSearch = document.getElementById('invoicePatientSearch').value;
  
  try {
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading invoices...</div>';
    
    // Build query parameters
    const params = new URLSearchParams();
    if (status !== 'all') params.append('status', status);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (patientSearch) params.append('patient_search', patientSearch);
    
    const res = await fetch(`/api/invoices/clinic/${currentClinicId}/all?${params.toString()}`);
    const data = await res.json();
    
    if (data.success && data.invoices) {
      if (data.invoices.length === 0) {
        container.innerHTML = '<div class="empty-state">No invoices found</div>';
        return;
      }
      
      let html = '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse;">';
      html += `
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; color: #64748b; font-weight: 600;">Invoice ID</th>
            <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; color: #64748b; font-weight: 600;">Patient</th>
            <th style="padding: 0.75rem; text-align: left; font-size: 0.875rem; color: #64748b; font-weight: 600;">Doctor</th>
            <th style="padding: 0.75rem; text-align: right; font-size: 0.875rem; color: #64748b; font-weight: 600;">Amount</th>
            <th style="padding: 0.75rem; text-align: center; font-size: 0.875rem; color: #64748b; font-weight: 600;">Status</th>
            <th style="padding: 0.75rem; text-align: center; font-size: 0.875rem; color: #64748b; font-weight: 600;">Date</th>
            <th style="padding: 0.75rem; text-align: center; font-size: 0.875rem; color: #64748b; font-weight: 600;">Actions</th>
          </tr>
        </thead>
        <tbody>
      `;
      
      data.invoices.forEach((inv, index) => {
        const statusBadge = inv.payment_status === 'paid' 
          ? '<span style="background: #dcfce7; color: #166534; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">✓ PAID</span>'
          : '<span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">⏳ UNPAID</span>';
        
        const invoiceDate = new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const bgColor = index % 2 === 0 ? 'white' : '#f8fafc';
        
        html += `
          <tr style="background: ${bgColor}; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 0.75rem; font-size: 0.875rem; font-family: monospace; color: #3b82f6;">${inv.invoice_id}</td>
            <td style="padding: 0.75rem;">
              <div style="font-weight: 600; color: #1e293b; font-size: 0.875rem;">${inv.patient_name || 'Unknown'}</div>
              <div style="color: #64748b; font-size: 0.75rem;">${inv.patient_mobile || 'N/A'}</div>
            </td>
            <td style="padding: 0.75rem; font-size: 0.875rem; color: #64748b;">Dr. ${inv.doctor_name || 'Unknown'}</td>
            <td style="padding: 0.75rem; text-align: right; font-weight: 600; color: #10b981; font-size: 0.875rem;">₹${parseFloat(inv.total_amount).toFixed(2)}</td>
            <td style="padding: 0.75rem; text-align: center;">${statusBadge}</td>
            <td style="padding: 0.75rem; text-align: center; font-size: 0.875rem; color: #64748b;">${invoiceDate}</td>
            <td style="padding: 0.75rem; text-align: center;">
              <div style="display: flex; gap: 0.5rem; justify-content: center;">
                <button class="btn btn-sm btn-outline" onclick="window.open('${inv.invoice_path}', '_blank')" title="View PDF">📄</button>
                ${inv.payment_status === 'unpaid' ? `
                  <button class="btn btn-sm btn-success" onclick="markAsPaid('${inv.invoice_id}')" title="Mark as Paid">✓</button>
                ` : `
                  <button class="btn btn-sm" style="background: #f1f5f9; color: #64748b; cursor: not-allowed;" disabled title="Already Paid">✓</button>
                `}
              </div>
            </td>
          </tr>
        `;
      });
      
      html += '</tbody></table></div>';
      container.innerHTML = html;
    } else {
      container.innerHTML = '<div class="empty-state">No invoices found</div>';
    }
  } catch (error) {
    console.error('Load invoices error:', error);
    container.innerHTML = '<div class="empty-state" style="color: #ef4444;">Error loading invoices</div>';
  }
}

// Mark invoice as paid
async function markAsPaid(invoiceId) {
  if (!confirm('Mark this invoice as paid?')) return;
  
  const paymentMethod = prompt('Payment method (cash/upi/card/online):', 'cash');
  if (!paymentMethod) return;
  
  try {
    const res = await fetch(`/api/invoices/${invoiceId}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_status: 'paid',
        payment_method: paymentMethod.toLowerCase()
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showSuccessModal({
        emoji: '✅',
        title: 'Payment Recorded!',
        msg: `Invoice marked as paid`,
        highlight: `Payment: ${paymentMethod.toUpperCase()}`,
        note: 'Invoice list will be refreshed'
      });
      
      // Refresh data
      loadInvoiceStats();
      loadAllInvoices();
      loadTodaysCheckouts();
    } else {
      alert('Failed to update payment: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Mark paid error:', error);
    alert('Error updating payment status');
  }
}

// Open invoice modal for checkout
function openInvoiceModal(visitId, patientName, patientMobile, doctorName, consultationFee) {
  const modal = document.getElementById('invoiceModal');
  
  // Set values
  document.getElementById('invoice_visit_id').value = visitId;
  document.getElementById('invoice_patient_name').textContent = patientName || 'Unknown';
  document.getElementById('invoice_patient_mobile').textContent = patientMobile || 'N/A';
  document.getElementById('invoice_doctor_name').textContent = doctorName || 'Unknown';
  document.getElementById('invoice_consultation_fee').value = consultationFee || 0;
  
  // Reset other fields
  document.getElementById('invoice_medicine_charges').value = 0;
  document.getElementById('invoice_lab_charges').value = 0;
  document.getElementById('invoice_other_charges').value = 0;
  document.getElementById('invoice_other_charges_desc').value = '';
  document.getElementById('invoice_discount').value = 0;
  document.getElementById('invoice_tax_percentage').value = 0;
  document.getElementById('invoice_payment_status').value = 'unpaid';
  document.getElementById('invoice_payment_method').value = '';
  document.getElementById('invoice_notes').value = '';
  document.getElementById('invoiceError').style.display = 'none';
  
  // Show/hide payment method based on status
  const paymentStatusSelect = document.getElementById('invoice_payment_status');
  const paymentMethodGroup = document.getElementById('payment_method_group');
  
  paymentStatusSelect.onchange = function() {
    paymentMethodGroup.style.display = this.value === 'paid' ? 'block' : 'none';
  };
  
  // Show modal
  modal.classList.add('active');
}

function closeInvoiceModal() {
  document.getElementById('invoiceModal').classList.remove('active');
}

// Handle invoice form submission
document.addEventListener('DOMContentLoaded', function() {
  const invoiceForm = document.getElementById('invoiceForm');
  if (!invoiceForm) return;
  
  invoiceForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('invoiceError');
    errorDiv.style.display = 'none';
    
    // Get form values
    const visitId = document.getElementById('invoice_visit_id').value;
    const consultationFee = parseFloat(document.getElementById('invoice_consultation_fee').value) || 0;
    const medicineCharges = parseFloat(document.getElementById('invoice_medicine_charges').value) || 0;
    const labCharges = parseFloat(document.getElementById('invoice_lab_charges').value) || 0;
    const otherCharges = parseFloat(document.getElementById('invoice_other_charges').value) || 0;
    const otherChargesDesc = document.getElementById('invoice_other_charges_desc').value.trim();
    const discount = parseFloat(document.getElementById('invoice_discount').value) || 0;
    const taxPercentage = parseFloat(document.getElementById('invoice_tax_percentage').value) || 0;
    const paymentStatus = document.getElementById('invoice_payment_status').value;
    const paymentMethod = document.getElementById('invoice_payment_method').value || null;
    const notes = document.getElementById('invoice_notes').value.trim();
    
    // Validate
    if (!visitId) {
      errorDiv.textContent = 'Visit ID is missing';
      errorDiv.style.display = 'block';
      return;
    }
    
    const total = consultationFee + medicineCharges + labCharges + otherCharges;
    if (total <= 0) {
      errorDiv.textContent = 'Total amount must be greater than zero';
      errorDiv.style.display = 'block';
      return;
    }
    
    if (paymentStatus === 'paid' && !paymentMethod) {
      errorDiv.textContent = 'Please select payment method for paid invoice';
      errorDiv.style.display = 'block';
      return;
    }
    
    // Show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating...';
    
    try {
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visit_id: visitId,
          consultation_fee: consultationFee,
          medicine_charges: medicineCharges,
          lab_charges: labCharges,
          other_charges: otherCharges,
          other_charges_desc: otherChargesDesc,
          discount: discount,
          tax_percentage: taxPercentage,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          notes: notes
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Success - open PDF
        window.open(data.invoice_path, '_blank');
        closeInvoiceModal();
        
        // Show success message
        showSuccessModal({
          emoji: '✅',
          title: 'Invoice Generated!',
          msg: `Invoice ${data.invoice_id} generated successfully`,
          highlight: `Total: ₹${data.total_amount.toFixed(2)}`,
          note: 'Refreshing data...'
        });
        
        // Refresh all invoice data
        setTimeout(() => {
          loadInvoiceStats();
          loadTodaysCheckouts();
          loadAllInvoices();
        }, 1000);
      } else {
        errorDiv.textContent = data.message || 'Failed to generate invoice';
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      console.error('Invoice generation error:', error);
      errorDiv.textContent = 'Network error. Please try again.';
      errorDiv.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate Invoice';
    }
  });
});

// Initialize billing section
function initializeBillingSection() {
  if (clinicSession && clinicSession.clinic_id) {
    currentClinicId = clinicSession.clinic_id;
    loadInvoiceStats();
    loadTodaysCheckouts();
    loadAllInvoices();
  }
}

// ========================================
// VIDEO CONSULTATIONS MANAGEMENT
// ========================================

let allClinicVideoConsultations = [];

// Load video consultations for clinic
async function loadClinicVideoConsultations() {
  const container = document.getElementById('videoConsultationsList');
  if (!container) return;
  
  if (!clinicSession || !clinicSession.clinic_id) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Please log in first</p></div>';
    return;
  }
  
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  
  try {
    const res = await fetch(`/bookings/clinic-video-consultations?clinic_id=${clinicSession.clinic_id}`);
    const data = await res.json();
    
    if (data.success) {
      allClinicVideoConsultations = data.consultations || [];
      
      // Update quick stats for video consults
      const statVideoConsults = document.getElementById('statVideoConsults');
      if (statVideoConsults) statVideoConsults.textContent = allClinicVideoConsultations.length;
      
      filterVideoConsultations();
    } else {
      container.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><p>${data.message || 'Failed to load'}</p></div>`;
    }
  } catch (error) {
    console.error('Error loading video consultations:', error);
    container.innerHTML = '<div class="empty"><div class="empty-icon">❌</div><p>Network error</p></div>';
  }
}

// Filter video consultations by payment status
function filterVideoConsultations() {
  const container = document.getElementById('videoConsultationsList');
  const filterSelect = document.getElementById('videoPaymentFilter');
  const filter = filterSelect ? filterSelect.value : 'all';
  
  let consultations = allClinicVideoConsultations;
  
  if (filter === 'pending') {
    consultations = allClinicVideoConsultations.filter(c => c.payment_status !== 'CONFIRMED');
  } else if (filter === 'CONFIRMED') {
    consultations = allClinicVideoConsultations.filter(c => c.payment_status === 'CONFIRMED');
  }
  
  renderVideoConsultations(consultations, container);
}

// Render video consultations list
function renderVideoConsultations(consultations, container) {
  if (!consultations.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📹</div>
        <p>No video consultations found</p>
      </div>
    `;
    return;
  }
  
  // Count stats
  const paidCount = consultations.filter(c => c.payment_status === 'CONFIRMED').length;
  const unpaidCount = consultations.filter(c => c.payment_status !== 'CONFIRMED').length;
  
  let html = `
    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
      <div style="background: #f0fdf4; padding: 0.75rem 1rem; border-radius: 8px; flex: 1; text-align: center;">
        <div style="font-size: 1.5rem; font-weight: 700; color: #16a34a;">${paidCount}</div>
        <div style="font-size: 0.75rem; color: #64748b;">Paid</div>
      </div>
      <div style="background: #fef3c7; padding: 0.75rem 1rem; border-radius: 8px; flex: 1; text-align: center;">
        <div style="font-size: 1.5rem; font-weight: 700; color: #d97706;">${unpaidCount}</div>
        <div style="font-size: 0.75rem; color: #64748b;">Unpaid</div>
      </div>
    </div>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date/Time</th>
            <th>Patient</th>
            <th>Doctor</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  consultations.forEach(c => {
    const isPaid = c.payment_status === 'CONFIRMED';
    const paymentBadge = isPaid 
      ? '<span style="background: #dcfce7; color: #16a34a; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">✓ Paid</span>'
      : '<span style="background: #fef3c7; color: #d97706; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">Unpaid</span>';
    
    const statusBadge = getConsultStatusBadge(c.consult_status);
    
    const dateStr = formatDateNice(c.appointment_date);
    const timeStr = c.appointment_time || '--:--';
    
    html += `
      <tr>
        <td>
          <div style="font-weight: 500;">${dateStr}</div>
          <div style="font-size: 0.75rem; color: #64748b;">${timeStr}</div>
        </td>
        <td>
          <div style="font-weight: 500;">${c.patient_name || 'Unknown'}</div>
          <div style="font-size: 0.75rem; color: #64748b;">${c.patient_mobile || '-'}</div>
        </td>
        <td>${c.doctor_name || '-'}</td>
        <td>${statusBadge}</td>
        <td>${paymentBadge}</td>
        <td>
          ${isPaid 
            ? '<span style="color: #64748b; font-size: 0.75rem;">—</span>'
            : `<button class="btn btn-sm btn-success" onclick="markBookingAsPaid('${c.appointment_id}')" style="white-space: nowrap;">💰 Mark Paid</button>`
          }
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// Get consult status badge
function getConsultStatusBadge(status) {
  const badges = {
    'not_seen': '<span style="background: #e2e8f0; color: #475569; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">Not Started</span>',
    'in_progress': '<span style="background: #dbeafe; color: #2563eb; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">In Progress</span>',
    'seen': '<span style="background: #dcfce7; color: #16a34a; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">Completed</span>',
    'cancelled': '<span style="background: #fee2e2; color: #dc2626; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">Cancelled</span>'
  };
  return badges[status] || badges['not_seen'];
}

// Format date nicely
function formatDateNice(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    
    const dayDiff = Math.floor((d - today) / (1000 * 60 * 60 * 24));
    
    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Tomorrow';
    if (dayDiff === -1) return 'Yesterday';
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch(e) { return dateStr; }
}

// Mark booking as paid
async function markBookingAsPaid(appointmentId) {
  const paymentMethod = prompt('Payment method (cash/upi/card/online):', 'upi');
  if (!paymentMethod) return;
  
  try {
    const res = await fetch(`/bookings/${appointmentId}/payment-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        payment_status: 'CONFIRMED',
        payment_method: paymentMethod 
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showSuccessModal({
        emoji: '✅',
        title: 'Payment Confirmed',
        msg: 'Booking marked as paid successfully',
        highlight: '',
        note: `Payment method: ${paymentMethod}`
      });
      loadClinicVideoConsultations(); // Refresh list
    } else {
      alert('Failed: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Mark as paid error:', error);
    alert('Network error. Please try again.');
  }
}

// Refresh wrapper functions with spinning animation
async function refreshDoctors() {
  const btn = document.getElementById('doctorsRefreshBtn');
  if (btn) btn.classList.add('loading');
  try {
    await loadDoctors();
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

async function refreshAvailability() {
  const btn = document.getElementById('availabilityRefreshBtn');
  if (btn) btn.classList.add('loading');
  try {
    await loadAvailability();
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

// End of file
