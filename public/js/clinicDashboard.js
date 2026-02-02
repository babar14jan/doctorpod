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
  
  // Make functions globally accessible for inline event handlers
  window.handleAddDoctor = handleAddDoctor;
  window.handleAddAvailability = handleAddAvailability;
  window.loadAvailability = loadAvailability;
  window.editAvailability = editAvailability;
  window.deleteAvailability = deleteAvailability;
});

// Load clinic session
async function loadClinicSession() {
  try {
    const res = await fetch('/clinic/session');
    const data = await res.json();
    
    if (data.success && data.clinic) {
      clinicSession = data.clinic;
      
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
    } else {
      window.location.href = '/clinic_login.html';
    }
  } catch (error) {
    window.location.href = '/clinic_login.html';
  }
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
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const container = document.getElementById('availabilityDaysContainer');
  
  container.innerHTML = daysOfWeek.map(day => `
    <div class="day-row">
      <div class="day-checkbox">
        <input type="checkbox" id="day_${day}" name="day_${day}" value="${day}" />
        <label for="day_${day}">${day}</label>
      </div>
      <div class="time-inputs">
        <input type="time" name="start_${day}" value="09:00" />
        <span>to</span>
        <input type="time" name="end_${day}" value="17:00" />
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
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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
      console.log(`Sending availability for ${entry.day}...`);
      const res = await fetch('/availability/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id,
          clinic_id,
          interval_minutes,
          days: entry.day,
          timings: `${entry.start}-${entry.end}`
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
  if (!container) return;
  
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading availability...</div>';
  
  if (!clinicSession) return;
  
  try {
    const res = await fetch(`/availability/by-clinic/${clinicSession.clinic_id}`);
    const data = await res.json();
    const availability = data.availability || [];
    
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
            <th>Interval (min)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${availability.map(a => `
            <tr>
              <td><strong>${a.doctor_name || 'Unknown'}</strong><br><small>${a.doctor_id}</small></td>
              <td>${a.day_of_week}</td>
              <td>${a.start_time}</td>
              <td>${a.end_time}</td>
              <td>${a.interval_minutes}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-sm btn-primary" onclick='editAvailability(${JSON.stringify(a).replace(/'/g, "&apos;")})'>✏️ Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteAvailability(${a.id})">🗑️ Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error loading availability:', error);
    container.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Error loading availability</p></div>';
  }
}

// Edit availability
function editAvailability(availability) {
  // For now, use a simple prompt. You can create a modal similar to edit doctor
  const newStartTime = prompt('Start Time (HH:MM):', availability.start_time);
  const newEndTime = prompt('End Time (HH:MM):', availability.end_time);
  const newInterval = prompt('Interval (minutes):', availability.interval_minutes);
  
  if (!newStartTime || !newEndTime || !newInterval) {
    return;
  }
  
  updateAvailability(availability.id, {
    start_time: newStartTime,
    end_time: newEndTime,
    interval_minutes: parseInt(newInterval)
  });
}

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

// End of file
