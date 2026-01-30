// clinicDashboard.js

let clinicSession = null;

// Fetch clinic session info on load
async function getClinicSession() {
  try {
    const res = await fetch('/clinic/session');
    const j = await res.json();
    if (j.success && j.clinic) {
      clinicSession = j.clinic;
      return j.clinic;
    } else {
      window.location.href = '/clinic_login.html';
      return null;
    }
  } catch (e) {
    window.location.href = '/clinic_login.html';
    return null;
  }
}

// Modal helper functions
function showSuccessModal({emoji, title, msg, highlight, note}) {
  const successModal = document.getElementById('successModal');
  const modalEmoji = document.getElementById('modalEmoji');
  const modalTitle = document.getElementById('modalTitle');
  const modalMsg = document.getElementById('modalMsg');
  const modalHighlight = document.getElementById('modalHighlight');
  const modalNote = document.getElementById('modalNote');
  
  if (!successModal) return;
  
  if (modalEmoji) modalEmoji.textContent = emoji || '🎉';
  if (modalTitle) modalTitle.textContent = title || 'Success!';
  if (modalMsg) modalMsg.textContent = msg || '';
  if (modalHighlight) {
    if (highlight) {
      modalHighlight.textContent = highlight;
      modalHighlight.classList.add('show');
    } else {
      modalHighlight.classList.remove('show');
    }
  }
  if (modalNote) modalNote.textContent = note || '';
  successModal.classList.add('show');
}

function hideSuccessModal() {
  const successModal = document.getElementById('successModal');
  if (successModal) successModal.classList.remove('show');
}

// Setup Add Doctor form for clinic
async function setupAddDoctorForm() {
  const form = document.getElementById('addDoctorForm');
  const clinicSelect = document.getElementById('doctorClinicSelect');
  if (!form || !clinicSelect) return;
  
  const clinic = await getClinicSession();
  if (!clinic) return;
  
  // Replace dropdown with locked value
  clinicSelect.innerHTML = '';
  const opt = document.createElement('option');
  opt.value = clinic.clinic_id;
  opt.textContent = clinic.name + ' (' + clinic.clinic_id + ')';
  opt.selected = true;
  clinicSelect.appendChild(opt);
  clinicSelect.disabled = true;
  
  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      name: fd.get('name'),
      qualification: fd.get('qualification') || '',
      specialization: fd.get('specialization') || '',
      phone: fd.get('phone'),
      email: fd.get('email') || '',
      password: fd.get('password'),
      clinic_id: clinic.clinic_id,
      registration_no: fd.get('registration_no') || null
    };
    
    try {
      const res = await fetch('/doctors/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      
      if (j.success) {
        showSuccessModal({
          emoji: '🩺',
          title: 'Doctor Added Successfully!',
          msg: 'Your Doctor ID:',
          highlight: j.doctor_id || '',
          note: 'Share this Doctor ID with the doctor for login.'
        });
        form.reset();
        // Re-set the clinic select
        clinicSelect.innerHTML = '';
        const newOpt = document.createElement('option');
        newOpt.value = clinic.clinic_id;
        newOpt.textContent = clinic.name + ' (' + clinic.clinic_id + ')';
        newOpt.selected = true;
        clinicSelect.appendChild(newOpt);
        loadDoctorsForClinic();
      } else {
        alert(j.message || 'Failed to add doctor');
      }
    } catch (e) {
      alert('Failed to add doctor');
    }
  });
}

// Setup Add Availability form
async function setupAvailabilityForm() {
  const form = document.getElementById('addAvailabilityForm');
  if (!form) return;
  
  const clinic = await getClinicSession();
  if (!clinic) return;
  
  // Pre-fill clinic ID
  const clinicIdInput = form.querySelector('input[name="clinic_id"]');
  if (clinicIdInput) {
    clinicIdInput.value = clinic.clinic_id;
    clinicIdInput.readOnly = true;
  }
  
  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const doctor_id = fd.get('doctor_id');
    const clinic_id = clinic.clinic_id;
    const interval_minutes = parseInt(fd.get('interval_minutes'), 10) || 15;
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const daysData = [];
    
    days.forEach(day => {
      const checkbox = form.querySelector(`#day_${day}`);
      const startInput = form.querySelector(`input[name="${day}_start"]`);
      const endInput = form.querySelector(`input[name="${day}_end"]`);
      
      if (checkbox && checkbox.checked && startInput && endInput) {
        const start = startInput.value;
        const end = endInput.value;
        if (start && end) {
          daysData.push({ day, start, end });
        }
      }
    });
    
    if (!doctor_id) {
      alert('Please enter a Doctor ID.');
      return;
    }
    
    if (daysData.length === 0) {
      alert('Please select at least one day with timings.');
      return;
    }
    
    let success = true;
    let failedDays = [];
    
    for (const entry of daysData) {
      try {
        const res = await fetch('/availability/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doctor_id,
            clinic_id,
            days: entry.day,
            timings: `${entry.start}-${entry.end}`,
            interval_minutes
          })
        });
        const j = await res.json();
        if (!j.success) {
          success = false;
          failedDays.push(entry.day);
        }
      } catch (e) {
        success = false;
        failedDays.push(entry.day);
      }
    }
    
    showSuccessModal({
      emoji: success ? '📅' : '⚠️',
      title: success ? 'Availability Added!' : 'Partial Success',
      msg: success ? 'Doctor availability has been added successfully.' : `Failed to add: ${failedDays.join(', ')}`,
      highlight: '',
      note: success ? '' : 'Please check the doctor ID and try again.'
    });
    
    if (success) {
      // Reset form but keep clinic_id
      form.reset();
      if (clinicIdInput) {
        clinicIdInput.value = clinic.clinic_id;
      }
      // Uncheck all days
      days.forEach(day => {
        const checkbox = form.querySelector(`#day_${day}`);
        if (checkbox) checkbox.checked = false;
      });
    }
  });
}

// Load doctors for this clinic only
async function loadDoctorsForClinic() {
  const doctorsList = document.getElementById('doctorsList');
  if (!doctorsList) return;
  
  const clinic = clinicSession || await getClinicSession();
  if (!clinic) return;
  
  doctorsList.innerHTML = '<div class="small-muted" style="text-align:center;padding:2rem;">Loading...</div>';
  
  try {
    const res = await fetch(`/doctors/by-clinic/${clinic.clinic_id}`);
    const j = await res.json();
    const docs = j.doctors || [];
    
    if (!docs.length) {
      doctorsList.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--text-muted);">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">📋</div>
          <div>No doctors found for this clinic</div>
        </div>
      `;
      return;
    }
    
    // Render modern table
    let table = `<table class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Phone</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>`;
    
    docs.forEach(d => {
      const id = d.id || d.doctor_id || '';
      const name = d.name || d.full_name || '';
      const phone = d.phone || d.mobile || '';
      table += `
        <tr>
          <td><strong>${id}</strong></td>
          <td>${name}</td>
          <td>${phone}</td>
          <td><button class="btn btn-sm btn-danger" data-id="${id}">Delete</button></td>
        </tr>`;
    });
    
    table += '</tbody></table>';
    doctorsList.innerHTML = table;
    
    // Add event listeners for delete buttons
    doctorsList.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this doctor?')) {
          deleteDoctor(id);
        }
      });
    });
  } catch (e) {
    doctorsList.innerHTML = '<div class="small-muted" style="text-align:center;padding:2rem;">Error loading doctors</div>';
  }
}

// Delete doctor
async function deleteDoctor(id) {
  try {
    const res = await fetch('/doctors/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const j = await res.json();
    if (j.success) {
      loadDoctorsForClinic();
      showSuccessModal({
        emoji: '✅',
        title: 'Doctor Deleted',
        msg: 'The doctor has been removed from your clinic.',
        highlight: '',
        note: ''
      });
    } else {
      alert('Failed to delete doctor');
    }
  } catch (e) {
    alert('Failed to delete doctor');
  }
}

// Load stats
async function loadStats() {
  const clinic = clinicSession || await getClinicSession();
  if (!clinic) return;
  
  const today = new Date().toISOString().slice(0, 10);
  
  try {
    // Fetch today's bookings
    const res = await fetch(`/booking/clinic/${clinic.clinic_id}?date=${today}`);
    const j = await res.json();
    const bookings = j.bookings || [];
    
    const totalBookings = document.getElementById('totalBookings');
    const totalConsults = document.getElementById('totalConsults');
    const revenue = document.getElementById('revenue');
    
    if (totalBookings) totalBookings.textContent = bookings.length;
    
    // Count completed consultations
    const completed = bookings.filter(b => 
      b.consult_status === 'completed' || b.consult_status === 'done' || b.status === 'completed'
    ).length;
    if (totalConsults) totalConsults.textContent = completed;
    
    // Calculate revenue (assuming a fee per consultation, or from data)
    // For now, show a placeholder
    if (revenue) revenue.textContent = completed * 500; // Example: ₹500 per consultation
    
  } catch (e) {
    console.error('Error loading stats:', e);
  }
}

// Load analytics
async function loadAnalytics() {
  const clinic = clinicSession || await getClinicSession();
  if (!clinic) return;
  
  try {
    const res = await fetch(`/booking/clinic/${clinic.clinic_id}`);
    const j = await res.json();
    const bookings = j.bookings || [];
    
    const analyticsBookings = document.getElementById('analyticsBookings');
    const analyticsConsults = document.getElementById('analyticsConsults');
    const analyticsRevenue = document.getElementById('analyticsRevenue');
    
    if (analyticsBookings) analyticsBookings.textContent = bookings.length;
    
    const completed = bookings.filter(b =>
      b.consult_status === 'completed' || b.consult_status === 'done' || b.status === 'completed'
    ).length;
    if (analyticsConsults) analyticsConsults.textContent = completed;
    
    // Calculate total revenue
    if (analyticsRevenue) analyticsRevenue.textContent = '₹' + (completed * 500);
    
  } catch (e) {
    console.error('Error loading analytics:', e);
  }
}

// Collapsible sections setup
function setupCollapsibleSections() {
  document.querySelectorAll('.section-header.collapsible-btn').forEach(header => {
    header.addEventListener('click', function() {
      const contentId = this.getAttribute('aria-controls');
      const content = document.getElementById(contentId);
      const isExpanded = this.getAttribute('aria-expanded') === 'true';

      // Close all other sections
      document.querySelectorAll('.section-header.collapsible-btn').forEach(otherHeader => {
        if (otherHeader !== this) {
          otherHeader.setAttribute('aria-expanded', 'false');
          const otherId = otherHeader.getAttribute('aria-controls');
          const otherContent = document.getElementById(otherId);
          if (otherContent) {
            otherContent.classList.remove('show');
            otherContent.setAttribute('hidden', '');
          }
        }
      });

      // Toggle current section
      if (!isExpanded) {
        this.setAttribute('aria-expanded', 'true');
        content.classList.add('show');
        content.removeAttribute('hidden');
      } else {
        this.setAttribute('aria-expanded', 'false');
        content.classList.remove('show');
        content.setAttribute('hidden', '');
      }
    });
  });
}

// On DOM ready
window.addEventListener('DOMContentLoaded', async () => {
  // Get session first
  await getClinicSession();
  
  // Setup forms
  setupAddDoctorForm();
  setupAvailabilityForm();
  
  // Load data
  loadDoctorsForClinic();
  loadStats();
  loadAnalytics();
  
  // Setup collapsible sections
  setupCollapsibleSections();
  
  // Modal close button
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideSuccessModal);
  }
  
  // Close modal on backdrop click
  const successModal = document.getElementById('successModal');
  if (successModal) {
    successModal.addEventListener('click', function(e) {
      if (e.target === successModal) hideSuccessModal();
    });
  }
  
  // Sign out handler
  const signOutBtn = document.getElementById('signOut');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', function() {
      fetch('/clinic/logout', { method: 'POST' })
        .finally(() => {
          window.location.href = '/clinic_login.html';
        });
    });
  }
});
