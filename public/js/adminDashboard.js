// Admin Dashboard JavaScript

// Global sign out function
function handleSignOut() {
  console.log('Sign out clicked');
  fetch('/admin/logout', { method: 'POST' })
    .then(() => {
      window.location.href = '/admin_login.html';
    })
    .catch((e) => {
      console.error('Logout error:', e);
      // Redirect anyway
      window.location.href = '/admin_login.html';
    });
}

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

document.addEventListener('DOMContentLoaded', function() {
  console.log('Admin dashboard loaded');
  // Load initial data
  loadClinics();
  loadDoctors();
  loadDemoRequests();
  
  // Sign out handler - with null check
  const signOutBtn = document.getElementById('signOut');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        await fetch('/admin/logout', { method: 'POST' });
      } catch (e) {
        console.error('Logout error:', e);
      }
      window.location.href = '/admin_login.html';
    });
  }

  // Modal close handlers - with null checks
  const closeModalBtn = document.getElementById('closeModal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeSuccessModal);
  }
  const successModalEl = document.getElementById('successModal');
  if (successModalEl) {
    successModalEl.addEventListener('click', (e) => {
      if (e.target.id === 'successModal') closeSuccessModal();
    });
  }

  // Add Clinic Form
  const addClinicForm = document.getElementById('addClinicForm');
  if (addClinicForm) addClinicForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const phone = formData.get('phone');
    const email = formData.get('email');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!isValidMobile(phone)) {
      showSuccessModal({
        emoji: '⚠️',
        title: 'Validation Error',
        msg: 'Please enter a valid 10-digit mobile number.',
        highlight: '',
        note: 'Numbers only, e.g., 9876543210.'
      });
      return false;
    }
    
    try {
      const res = await fetch('/admin/addClinic', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.success) {
        showSuccessModal({
          emoji: '🏥',
          title: 'Clinic Added Successfully!',
          msg: 'Your Clinic ID:',
          highlight: data.clinic_id,
          note: 'Save this ID for clinic login.'
        });
        e.target.reset();
        loadClinics();
        loadClinicDropdown();
      } else {
        showToast('Failed', data.message || 'Failed to add clinic', 'error');
      }
    } catch (error) {
      showToast('Error', 'Error adding clinic. Please try again.', 'error');
    }
  });





  // Edit Clinic Form
  document.getElementById('editClinicForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Remove password if empty
    if (!formData.get('password')) {
      formData.delete('password');
    }
    
    // Remove image if not selected
    if (!formData.get('image') || !formData.get('image').name) {
      formData.delete('image');
    }
    
    try {
      const res = await fetch('/admin/updateClinic', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const result = await res.json();
      
      if (result.success) {
        closeEditClinicModal();
        showSuccessModal({
          emoji: '✅',
          title: 'Clinic Updated!',
          msg: 'Clinic details have been updated successfully.',
          highlight: '',
          note: ''
        });
        loadClinics();
      } else {
        showToast('Failed', result.message || 'Failed to update clinic', 'error');
      }
    } catch (error) {
      showToast('Error', 'Error updating clinic. Please try again.', 'error');
    }
  });

  // Edit Doctor Form
  document.getElementById('editDoctorForm').addEventListener('submit', async (e) => {
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
    
    // Only include password if provided
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
        showToast('Failed', result.message || 'Failed to update doctor', 'error');
      }
    } catch (error) {
      showToast('Error', 'Error updating doctor. Please try again.', 'error');
    }
  });
});

// Load Clinics
async function loadClinics() {
  const container = document.getElementById('clinicsList');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading clinics...</div>';
  
  try {
    const res = await fetch('/clinic/all');
    const data = await res.json();
    const clinics = data.clinics || [];
    
    // Update stats
    const totalClinicsEl = document.getElementById('totalClinics');
    if (totalClinicsEl) {
      totalClinicsEl.textContent = clinics.length;
    }
    
    if (!clinics.length) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">🏥</div><p>No clinics found. Add your first clinic above.</p></div>';
      return;
    }
    
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Clinic ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Features</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${clinics.map(c => {
            // Feature badges
            const hasVoice = c.enable_voice_prescription == 1 || c.enable_voice_prescription === true || c.enable_voice_prescription === '1';
            const hasVideo = c.enable_video_consultation == 1 || c.enable_video_consultation === true || c.enable_video_consultation === '1';
            let featureBadges = '';
            if (hasVideo) featureBadges += '<span class="badge badge-success" title="Video Consultation Enabled">📹</span> ';
            if (hasVoice) featureBadges += '<span class="badge badge-primary" title="Voice Prescription Enabled">🎤</span> ';
            if (!featureBadges) featureBadges = '<span class="badge badge-secondary">—</span>';
            
            let statusBadge = '<span class="badge badge-success">Active</span>';
            if (c.subscription_type === 'trial') {
              if (c.trial_end_date) {
                const trialEnd = new Date(c.trial_end_date);
                const now = new Date();
                const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
                
                if (c.is_trial_expired || daysLeft < 0) {
                  statusBadge = '<span class="badge badge-danger">Trial Expired</span>';
                } else if (daysLeft <= 7) {
                  statusBadge = `<span class="badge badge-warning">Trial (${daysLeft}d left)</span>`;
                } else {
                  statusBadge = `<span class="badge badge-primary">Trial (${daysLeft}d left)</span>`;
                }
              } else {
                statusBadge = '<span class="badge badge-primary">Trial</span>';
              }
            } else if (c.subscription_type === 'paid') {
              statusBadge = '<span class="badge badge-success">Paid</span>';
            }
            
            return `
            <tr>
              <td><strong>${c.clinic_id}</strong></td>
              <td>${c.name}</td>
              <td>${c.phone}</td>
              <td>${c.address || '-'}</td>
              <td>${featureBadges}</td>
              <td>${statusBadge}</td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-sm btn-primary" onclick='editClinic(${JSON.stringify(c).replace(/'/g, "&apos;")})'>✏️ Edit</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteClinic('${c.clinic_id}')">🗑️ Delete</button>
                </div>
              </td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error loading clinics:', error);
    container.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Error loading clinics</p></div>';
  }
}

// Load Doctors
async function loadDoctors() {
  const container = document.getElementById('doctorsList');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading doctors...</div>';
  
  try {
    const res = await fetch('/doctors/all');
    const data = await res.json();
    const doctors = data.doctors || [];
    
    // Update stats
    const totalDoctorsEl = document.getElementById('totalDoctors');
    if (totalDoctorsEl) {
      totalDoctorsEl.textContent = doctors.length;
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
            <th>Email</th>
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
              <td>${d.email || '-'}</td>
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


// Edit Clinic
function editClinic(clinic) {
  document.getElementById('editClinicId').value = clinic.clinic_id;
  document.getElementById('editClinicName').value = clinic.name;
  document.getElementById('editClinicPhone').value = clinic.phone;
  document.getElementById('editClinicEmail').value = clinic.email || '';
  document.getElementById('editClinicAddress').value = clinic.address || '';
  document.getElementById('editClinicUpi').value = clinic.upi_id || '';
  document.getElementById('editClinicPassword').value = '';
  
  // Set checkboxes for voice and video features (handle number, string, or boolean)
  document.getElementById('editEnableVoice').checked = clinic.enable_voice_prescription == 1 || clinic.enable_voice_prescription === true || clinic.enable_voice_prescription === '1';
  document.getElementById('editEnableVideo').checked = clinic.enable_video_consultation == 1 || clinic.enable_video_consultation === true || clinic.enable_video_consultation === '1';
  
  document.getElementById('editClinicModal').classList.add('active');
}

function closeEditClinicModal() {
  document.getElementById('editClinicModal').classList.remove('active');
}

// Delete Clinic
async function deleteClinic(clinic_id) {
  if (!confirm(`Are you sure you want to deactivate clinic ${clinic_id}?\n\nNote: This will mark the clinic and all associated doctors as inactive. They will no longer appear in the system or be able to login, but their data will be preserved.`)) {
    return;
  }
  
  try {
    const res = await fetch('/clinic/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic_id })
    });
    const data = await res.json();
    
    if (data.success) {
      loadClinics();
      loadClinicDropdown();
    } else {
      showToast('Failed', data.message || 'Failed to deactivate clinic', 'error');
    }
  } catch (error) {
    showToast('Error', 'Error deactivating clinic. Please try again.', 'error');
  }
}

// Edit Doctor
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

// Delete Doctor
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
      showToast('Failed', data.message || 'Failed to deactivate doctor', 'error');
    }
  } catch (error) {
    showToast('Error', 'Error deactivating doctor. Please try again.', 'error');
  }
}

// Show Success Modal
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
// =====================
// DEMO REQUESTS MANAGEMENT
// =====================

let allDemoRequests = [];
let currentDemoFilter = 'all';

// Load Demo Requests
async function loadDemoRequests() {
  try {
    const res = await fetch('/admin/demo-requests', {
      credentials: 'include'
    });
    const data = await res.json();
    
    if (data.success) {
      allDemoRequests = data.requests || [];
      renderDemoRequests();
    } else {
      document.getElementById('demoRequestsBody').innerHTML = `
        <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--danger);">
          ${data.message || 'Failed to load demo requests'}
        </td></tr>
      `;
    }
  } catch (error) {
    document.getElementById('demoRequestsBody').innerHTML = `
      <tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--danger);">
        Error loading demo requests
      </td></tr>
    `;
  }
}

// Filter Demo Requests
function filterDemoRequests(status) {
  currentDemoFilter = status;
  
  // Update button states
  ['all', 'pending', 'contacted', 'scheduled', 'completed', 'rejected'].forEach(s => {
    const btn = document.getElementById(`filter-${s}`);
    if (btn) {
      if (s === status) {
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
      }
    }
  });
  
  renderDemoRequests();
}

// Render Demo Requests
function renderDemoRequests() {
  const tbody = document.getElementById('demoRequestsBody');
  
  const filtered = currentDemoFilter === 'all' 
    ? allDemoRequests 
    : allDemoRequests.filter(req => req.status === currentDemoFilter);
  
  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8" style="text-align: center; padding: 2rem;">
        No ${currentDemoFilter === 'all' ? '' : currentDemoFilter} demo requests found
      </td></tr>
    `;
    return;
  }
  
  tbody.innerHTML = filtered.map(req => {
    const date = new Date(req.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    let statusBadge = '';
    if (req.status === 'pending') {
      statusBadge = '<span class="badge badge-warning">Pending</span>';
    } else if (req.status === 'contacted') {
      statusBadge = '<span class="badge" style="background: #3b82f6;">Contacted</span>';
    } else if (req.status === 'scheduled') {
      statusBadge = '<span class="badge" style="background: #8b5cf6;">Scheduled</span>';
    } else if (req.status === 'completed') {
      statusBadge = '<span class="badge badge-success">Completed</span>';
    } else {
      statusBadge = '<span class="badge badge-danger">Rejected</span>';
    }
    
    let actions = '';
    if (req.status === 'pending') {
      actions = `
        <select onchange="updateDemoStatus(${req.id}, this.value)" class="form-select" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.8125rem;">
          <option value="">Update Status</option>
          <option value="contacted">Mark as Contacted</option>
          <option value="scheduled">Mark as Scheduled</option>
          <option value="completed">Mark as Completed</option>
          <option value="rejected">Reject</option>
        </select>
      `;
    } else if (req.status === 'contacted') {
      actions = `
        <select onchange="updateDemoStatus(${req.id}, this.value)" class="form-select" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.8125rem;">
          <option value="">Update Status</option>
          <option value="scheduled">Mark as Scheduled</option>
          <option value="completed">Mark as Completed</option>
          <option value="rejected">Reject</option>
        </select>
      `;
    } else if (req.status === 'scheduled') {
      actions = `
        <select onchange="updateDemoStatus(${req.id}, this.value)" class="form-select" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.8125rem;">
          <option value="">Update Status</option>
          <option value="completed">Mark as Completed</option>
          <option value="rejected">Reject</option>
        </select>
      `;
    } else if (req.status === 'completed') {
      actions = `<small style="color: var(--success);">✓ Completed</small>`;
    } else {
      actions = `<small style="color: var(--danger);">✗ Rejected</small>`;
    }
    
    return `
      <tr>
        <td>${date}</td>
        <td><strong>${req.clinic_name}</strong></td>
        <td>${req.contact_person}</td>
        <td>${req.phone}</td>
        <td>${req.email}</td>
        <td>${req.city || '-'}</td>
        <td>${statusBadge}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join('');
}

// Update Demo Status
async function updateDemoStatus(demoId, newStatus) {
  if (!newStatus) return;
  
  const confirmMsg = `Are you sure you want to mark this demo request as "${newStatus}"?`;
  if (!confirm(confirmMsg)) {
    // Reset the select element
    event.target.value = '';
    return;
  }
  
  try {
    const adminId = sessionStorage.getItem('admin_id') || 'admin';
    
    const res = await fetch('/admin/update-demo-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        demo_id: demoId,
        status: newStatus,
        admin_id: adminId
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Status Updated! 🎉', `Demo request status changed to "${newStatus}"`, 'success');
      loadDemoRequests();
    } else {
      showToast('Failed', data.message || 'Failed to update status', 'error');
      event.target.value = '';
    }
  } catch (error) {
    showToast('Error', 'Error updating demo request status. Please try again.', 'error');
    event.target.value = '';
  }
}

// Show Approve Modal
function showApproveDemoModal(demoId) {
  const request = allDemoRequests.find(r => r.id === demoId);
  if (!request) return;
  
  // Pre-fill clinic ID suggestion
  const clinicIdSuggestion = request.clinic_name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8) + Math.floor(Math.random() * 100);
  
  document.getElementById('approve_demo_id').value = demoId;
  document.getElementById('approve_clinic_id').value = clinicIdSuggestion;
  document.getElementById('approve_password').value = '';
  document.getElementById('approve_subscription_type').value = 'trial';
  document.getElementById('approve_trial_days').value = '30';
  document.getElementById('trial_days_group').style.display = 'block';
  
  // Show/hide trial days based on subscription type
  document.getElementById('approve_subscription_type').addEventListener('change', (e) => {
    const trialDaysGroup = document.getElementById('trial_days_group');
    trialDaysGroup.style.display = e.target.value === 'trial' ? 'block' : 'none';
  });
  
  document.getElementById('approveDemoModal').classList.add('active');
}

function closeApproveDemoModal() {
  document.getElementById('approveDemoModal').classList.remove('active');
}

// Show Reject Modal
function showRejectDemoModal(demoId) {
  document.getElementById('reject_demo_id').value = demoId;
  document.getElementById('reject_reason').value = '';
  document.getElementById('rejectDemoModal').classList.add('active');
}

function closeRejectDemoModal() {
  document.getElementById('rejectDemoModal').classList.remove('active');
}

// Handle Approve Form Submit
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('approveDemoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const demoId = document.getElementById('approve_demo_id').value;
    const clinicId = document.getElementById('approve_clinic_id').value;
    const password = document.getElementById('approve_password').value;
    const subscriptionType = document.getElementById('approve_subscription_type').value;
    const trialDays = subscriptionType === 'trial' ? parseInt(document.getElementById('approve_trial_days').value) : null;
    
    try {
      const res = await fetch('/admin/approve-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          request_id: demoId,
          clinic_id: clinicId,
          password: password,
          subscription_type: subscriptionType,
          trial_days: trialDays
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        closeApproveDemoModal();
        showSuccessModal({
          emoji: '✅',
          title: 'Demo Request Approved!',
          msg: 'Clinic created with ID:',
          highlight: clinicId,
          note: subscriptionType === 'trial' 
            ? `Trial expires in ${trialDays} days. Contact the clinic with their credentials.`
            : 'Paid subscription activated. Contact the clinic with their credentials.'
        });
        loadDemoRequests();
        loadClinics();
      } else {
        showToast('Failed', data.message || 'Failed to approve demo request', 'error');
      }
    } catch (error) {
      showToast('Error', 'Error approving demo request. Please try again.', 'error');
    }
  });
  
  // Handle Reject Form Submit
  document.getElementById('rejectDemoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const demoId = document.getElementById('reject_demo_id').value;
    const reason = document.getElementById('reject_reason').value;
    
    try {
      const res = await fetch('/admin/reject-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          request_id: demoId,
          reason: reason
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        closeRejectDemoModal();
        showSuccessModal({
          emoji: '❌',
          title: 'Demo Request Rejected',
          msg: 'The request has been rejected.',
          note: 'You may want to follow up with the requester via email.'
        });
        loadDemoRequests();
      } else {
        showToast('Failed', data.message || 'Failed to reject demo request', 'error');
      }
    } catch (error) {
      showToast('Error', 'Error rejecting demo request. Please try again.', 'error');
    }
  });
  
  // Load demo requests on page load
  loadDemoRequests();
});

// Toast Notification Functions
function showToast(title, message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toastIcon');
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  
  // Remove existing type classes
  toast.classList.remove('toast-success', 'toast-error', 'toast-info', 'toast-warning', 'hiding');
  
  // Set content
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  
  // Set type and icon
  toast.classList.add(`toast-${type}`);
  if (type === 'success') {
    toastIcon.textContent = '✓';
  } else if (type === 'error') {
    toastIcon.textContent = '✕';
  } else if (type === 'info') {
    toastIcon.textContent = 'ℹ';
  } else if (type === 'warning') {
    toastIcon.textContent = '⚠';
  }
  
  // Show toast
  toast.classList.add('show');
  
  // Auto hide after 5 seconds
  setTimeout(() => hideToast(), 5000);
}

function hideToast() {
  const toast = document.getElementById('toast');
  toast.classList.add('hiding');
  setTimeout(() => {
    toast.classList.remove('show', 'hiding');
  }, 300);
}

// Refresh wrapper functions with spinning animation
async function refreshDemoRequests() {
  const btn = document.getElementById('demoRefreshBtn');
  if (btn) btn.classList.add('loading');
  try {
    await loadDemoRequests();
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

async function refreshClinics() {
  const btn = document.getElementById('clinicsRefreshBtn');
  if (btn) btn.classList.add('loading');
  try {
    await loadClinics();
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}

async function refreshDoctors() {
  const btn = document.getElementById('doctorsRefreshBtn');
  if (btn) btn.classList.add('loading');
  try {
    await loadDoctors();
  } finally {
    if (btn) btn.classList.remove('loading');
  }
}