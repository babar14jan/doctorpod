// adminDashboard.js

document.addEventListener('DOMContentLoaded', function() {
      // Populate clinic dropdown for Add Doctor form
      const doctorClinicSelect = document.getElementById('doctorClinicSelect');
      async function populateDoctorClinicDropdown() {
        if (!doctorClinicSelect) return;
        try {
          const res = await fetch('/clinic/all');
          const j = await res.json();
          const clinics = j.clinics || [];
          doctorClinicSelect.innerHTML = clinics.length
            ? clinics.map(c => `<option value="${c.clinic_id}">${c.name} (${c.clinic_id})</option>`).join('')
            : '<option value="">No clinics found</option>';
        } catch (e) {
          doctorClinicSelect.innerHTML = '<option value="">Error loading clinics</option>';
        }
      }
      populateDoctorClinicDropdown();
    const clinicsList = document.getElementById('clinicsList');
    loadClinics();

    async function loadClinics(){
      if (!clinicsList) return;
      clinicsList.innerHTML = '<div class="small-muted">Loading...</div>';
      try{
        const res = await fetch('/clinic/all');
        if(!res.ok){ clinicsList.innerHTML = '<div class="small-muted">Unable to load clinics</div>'; return; }
        const j = await res.json();
        const clinics = j.clinics || [];
        renderClinics(clinics);
      }catch(e){ clinicsList.innerHTML = '<div class="small-muted">Error</div>'; }
    }

    function renderClinics(clinics){
      let table = `<table style="width:100%;border-collapse:collapse;font-size:1em;border:1px solid #bbb;">
        <colgroup>
          <col style="width:22%">
          <col style="width:34%">
          <col style="width:22%">
          <col style="width:22%">
        </colgroup>
        <thead>
          <tr style="background:#f1f3f5;color:#222;">
            <th style="padding:8px 6px;border:1px solid #bbb;">ID</th>
            <th style="padding:8px 6px;border:1px solid #bbb;">Name</th>
            <th style="padding:8px 6px;border:1px solid #bbb;">Phone</th>
            <th style="padding:8px 6px;border:1px solid #bbb;">Address</th>
          </tr>
        </thead>
        <tbody>`;
      if(!clinics.length) {
        table += `<tr><td colspan="4" style="text-align:center;padding:1em;border:1px solid #bbb;"><div class="small-muted">No clinics found</div></td></tr>`;
      } else {
        clinics.forEach(c => {
          table += `<tr style="background:#fff;color:#222;">
            <td style="padding:8px 6px;border:1px solid #bbb;"><strong>${c.clinic_id}</strong></td>
            <td style="padding:8px 6px;border:1px solid #bbb;">${c.name}</td>
            <td style="padding:8px 6px;border:1px solid #bbb;">${c.phone}</td>
            <td style="padding:8px 6px;border:1px solid #bbb;">${typeof c.address !== 'undefined' ? c.address : (c.email || '')}</td>
          </tr>`;
        });
      }
      table += '</tbody></table>';
      clinicsList.innerHTML = table;
    }
  // Modal elements (reusable)
  const successModal = document.getElementById('successModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalEmoji = document.getElementById('modalEmoji');
  const modalTitle = document.getElementById('modalTitle');
  const modalMsg = document.getElementById('modalMsg');
  const modalHighlight = document.getElementById('modalHighlight');
  const modalNote = document.getElementById('modalNote');

  function showSuccessModal({emoji, title, msg, highlight, note}) {
    modalEmoji.textContent = emoji || '🎉';
    modalTitle.textContent = title || 'Success!';
    modalMsg.textContent = msg || '';
    if (highlight) {
      modalHighlight.textContent = highlight;
      modalHighlight.style.display = 'inline-block';
    } else {
      modalHighlight.style.display = 'none';
    }
    modalNote.textContent = note || '';
    successModal.style.display = 'flex';
  }
  function hideSuccessModal() {
    successModal.style.display = 'none';
  }
  if (closeModalBtn) closeModalBtn.onclick = hideSuccessModal;
  if (successModal) successModal.onclick = function(e) { if (e.target === successModal) hideSuccessModal(); };

  const addForm = document.getElementById('addDoctorForm');
  const addClinicForm = document.getElementById('addClinicForm');
  const addAvailabilityForm = document.getElementById('addAvailabilityForm');
  const doctorsList = document.getElementById('doctorsList');

  async function loadDoctors(){
    doctorsList.innerHTML = '<div class="small-muted">Loading...</div>';
    try{
      const res = await fetch('/doctors/all');
      if(!res.ok){ doctorsList.innerHTML = '<div class="small-muted">Unable to load doctors</div>'; return; }
      const j = await res.json();
      const docs = j.doctors || [];
      renderDoctors(docs);
    }catch(e){ doctorsList.innerHTML = '<div class="small-muted">Error</div>'; }
  }

  function renderDoctors(docs){
    // Table design with clear border lines for rows and columns
    let table = `<table style="width:100%;border-collapse:collapse;font-size:1em;border:1px solid #bbb;">
      <colgroup>
        <col style="width:18%">
        <col style="width:40%">
        <col style="width:28%">
        <col style="width:14%">
      </colgroup>
      <thead>
        <tr style="background:#f1f3f5;color:#222;">
          <th style="padding:8px 6px;border:1px solid #bbb;">ID</th>
          <th style="padding:8px 6px;border:1px solid #bbb;">Name</th>
          <th style="padding:8px 6px;border:1px solid #bbb;">Phone</th>
          <th style="padding:8px 6px;border:1px solid #bbb;">Action</th>
        </tr>
      </thead>
      <tbody>`;
    if(!docs.length) {
      table += `<tr><td colspan="4" style="text-align:center;padding:1em;border:1px solid #bbb;"><div class="small-muted">No doctors found</div></td></tr>`;
    } else {
      docs.forEach(d=>{
        const id = d.id || d.doctor_id || '';
        const name = d.name || d.full_name || '';
        const phone = d.phone || d.mobile || '';
        table += `<tr style="background:#fff;color:#222;">
          <td style="padding:8px 6px;border:1px solid #bbb;"><strong>${id}</strong></td>
          <td style="padding:8px 6px;border:1px solid #bbb;">${name}</td>
          <td style="padding:8px 6px;border:1px solid #bbb;">${phone}</td>
          <td style="padding:8px 6px;border:1px solid #bbb;"><button class="btn btn-sm" data-id="${id}">Delete</button></td>
        </tr>`;
      });
    }
    table += '</tbody></table>';
    doctorsList.innerHTML = table;
    // Add event listeners for delete buttons
    doctorsList.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', function(){
        const id = btn.getAttribute('data-id');
        if(confirm('Delete doctor?')) deleteDoctor(id);
      });
    });
  }

  async function deleteDoctor(id){
    try{
      const res = await fetch('/doctors/delete',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
      const j = await res.json();
      if(j.success){ loadDoctors(); } else alert('Delete failed');
    }catch(e){ alert('Delete failed'); }
  }

  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addForm);
      // Debug: print all form fields before sending
      for (let pair of fd.entries()) {
        console.log('AddDoctor FormData:', pair[0], pair[1]);
      }
      try {
        const res = await fetch('/doctors/add', { method: 'POST', body: fd, credentials: 'include' });
        const j = await res.json();
        if (j.success) {
          // Show a doctor success modal with doctor_id
          if (modalEmoji && modalTitle && modalMsg && modalHighlight && modalNote && successModal) {
            modalEmoji.textContent = '🩺';
            modalTitle.textContent = 'Doctor Added Successfully!';
            modalMsg.textContent = 'Your Doctor ID:';
            modalHighlight.textContent = j.doctor_id || '';
            modalHighlight.style.display = 'inline-block';
            modalNote.textContent = 'Share this Doctor ID with the doctor for login.';
            successModal.style.display = 'flex';
          }
          addForm.reset();
          loadDoctors();
          loadClinics();
        } else {
          alert(j.message || 'Add failed');
        }
      } catch (e) { alert('Add failed'); }
    });
  }


  // Add Clinic handler
  if (addClinicForm) {
    addClinicForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addClinicForm);
      try {
        // Update: submit to /admin/addClinic instead of /doctors/addClinic
        const res = await fetch('/admin/addClinic', {
          method: 'POST',
          body: fd,
          credentials: 'include'
        });
        const j = await res.json();
        if (j.success) {
          showSuccessModal({
            emoji: '🏥',
            title: 'Clinic Added Successfully!',
            msg: 'Your Clinic ID:',
            highlight: j.clinic_id || '',
            note: 'Please save this Clinic ID for future reference.'
          });
          addClinicForm.reset();
        } else {
          alert(j.message || 'Add clinic failed');
        }
      } catch (e) {
        alert('Add clinic failed');
      }
    });
  }

  // Enhanced Doctor Availability handler for new UI
  if (addAvailabilityForm) {
    // Render 7 checkboxes for days with time inputs
    const daysOfWeek = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const container = document.getElementById('availabilityDaysContainer');
    if (container) {
      container.innerHTML = daysOfWeek.map(day => `
        <label style="display:flex;align-items:center;gap:0.3em;margin-bottom:0.5em;">
          <input type="checkbox" name="day_${day}" value="${day}" />
          <span>${day}</span>
          <input type="time" name="start_${day}" style="width:90px;" />
          <span>-</span>
          <input type="time" name="end_${day}" style="width:90px;" />
        </label>
      `).join('');
    }
    addAvailabilityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addAvailabilityForm);
      const doctor_id = fd.get('doctor_id');
      const clinic_id = fd.get('clinic_id');
      const interval_minutes = parseInt(fd.get('interval_minutes'), 10) || 15;
      const daysData = [];
      daysOfWeek.forEach(day => {
        const checked = addAvailabilityForm.querySelector(`[name=day_${day}]`).checked;
        const start = addAvailabilityForm.querySelector(`[name=start_${day}]`).value;
        const end = addAvailabilityForm.querySelector(`[name=end_${day}]`).value;
        if (checked && start && end) {
          daysData.push({ day, start, end });
        }
      });
      if (!doctor_id || !clinic_id || daysData.length === 0) {
        alert('Please select doctor, clinic, and at least one day with timings.');
        return;
      }
      let success = true;
      for (const entry of daysData) {
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
        if (!j.success) success = false;
      }
      showSuccessModal({
        emoji: success ? '📅' : '⚠️',
        title: success ? 'Doctor Availability Added!' : 'Error Adding Availability',
        msg: success ? 'Doctor availability has been added successfully.' : 'Some entries failed.',
        highlight: '',
        note: ''
      });
      addAvailabilityForm.reset();
    });
  }

  loadDoctors();

  // Collapsible card logic for mobile
  function setupCollapsibleCards() {
    const collapsibles = document.querySelectorAll('.collapsible-btn');
    collapsibles.forEach(btn => {
      btn.addEventListener('click', function() {
        const content = document.getElementById(this.getAttribute('aria-controls'));
        const expanded = this.getAttribute('aria-expanded') === 'true';
        // Close all other cards
        collapsibles.forEach(otherBtn => {
          if (otherBtn !== this) {
            otherBtn.setAttribute('aria-expanded', 'false');
            const otherContent = document.getElementById(otherBtn.getAttribute('aria-controls'));
            if (otherContent) otherContent.setAttribute('hidden', '');
          }
        });
        // Toggle this card
        if (!expanded) {
          this.setAttribute('aria-expanded', 'true');
          content.removeAttribute('hidden');
        } else {
          this.setAttribute('aria-expanded', 'false');
          content.setAttribute('hidden', '');
        }
      });
    });
  }
  setupCollapsibleCards();

  // Analytics: show 0 if no data
  function setAnalyticsValue(id, value) {
    document.getElementById(id).textContent = (value === undefined || value === null || value === '-' || value === '') ? '0' : value;
  }

  // Example: update analytics after loading (replace with real fetch if needed)
  function updateAnalytics(data) {
    setAnalyticsValue('totalBookings', data.totalBookings);
    setAnalyticsValue('totalConsults', data.totalConsults);
    setAnalyticsValue('revenue', data.revenue);
  }

  // If you fetch analytics from server, call updateAnalytics with real data
  // For now, ensure 0 is shown if nothing is set
  updateAnalytics({
    totalBookings: document.getElementById('totalBookings').textContent,
    totalConsults: document.getElementById('totalConsults').textContent,
    revenue: document.getElementById('revenue').textContent
  });
});
