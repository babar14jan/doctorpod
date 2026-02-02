// Clear prescription form fields and medicines
document.addEventListener('DOMContentLoaded', function() {
  const clearBtn = document.getElementById('clearPrescriptionBtn');
  const presForm = document.getElementById('prescriptionForm');
  const medicinesContainer = document.getElementById('medicinesContainer');
  if (clearBtn && presForm) {
    clearBtn.addEventListener('click', function() {
      // Clear all input/select fields
      Array.from(presForm.elements).forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
          if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
          } else {
            el.value = '';
          }
        }
      });
      // Clear medicines
      if (medicinesContainer) medicinesContainer.innerHTML = '';
    });
  }
});
// doctorDashboard.js

document.addEventListener('DOMContentLoaded', function() {
      // Only modify doctor dashboard header to prevent duplicate branding
      const siteHeader = document.querySelector('header.site-header');
      if (siteHeader) {
        const brandBlock = siteHeader.querySelector('.brand-text');
        // If brand block already exists, do nothing (HTML controls branding)
        if (!brandBlock) {
          // If missing, add branding (for future-proofing)
          const headerLeft = siteHeader.querySelector('.header-left');
          if (headerLeft) {
            const brandDiv = document.createElement('div');
            brandDiv.className = 'brand';
            brandDiv.innerHTML = `
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#667eea"/><stop offset="1" stop-color="#764ba2"/></linearGradient></defs><rect rx="12" width="64" height="64" fill="url(#g)"/><g fill="#fff"><rect x="28" y="18" width="8" height="28" rx="2"/><rect x="18" y="28" width="28" height="8" rx="2"/></g></svg>
              <div style="display:inline-block;margin-left:6px">
                <div class="brand-text">DoctorPod</div>
                <div class="small-muted">Quick. Smart. Trusted.</div>
              </div>
            `;
            headerLeft.appendChild(brandDiv);
          }
        }
      }
    // Add default medicine row on page load with numbering
    function addDefaultMedicineRow() {
      if (medicinesContainer && medicinesContainer.children.length === 0) {
        medicinesContainer.appendChild(makeMedicineRow(1));
      }
    }

    // Helper to get next medicine row number
    function getNextMedicineNumber() {
      return medicinesContainer ? medicinesContainer.children.length + 1 : 1;
    }
  let selectedClinicId = sessionStorage.getItem('clinic_id') || null;
  let clinicsList = [];
  // Header elements
  // Patient history element for showing patient profile and timeline
  const patientHistoryEl = document.getElementById('patientHistory') || document.querySelector('.patient-history') || (() => {
    // If not present, create and append to body (hidden by default)
    const el = document.createElement('div');
    el.id = 'patientHistory';
    el.style.display = 'none';
    el.style.position = 'fixed';
    el.style.top = '10vh';
    el.style.right = '2vw';
    el.style.width = '340px';
    el.style.maxHeight = '80vh';
    el.style.overflowY = 'auto';
    el.style.background = '#fff';
    el.style.boxShadow = '0 2px 16px rgba(0,0,0,0.18)';
    el.style.borderRadius = '10px';
    el.style.padding = '1.2em 1.2em 1em 1.2em';
    el.style.zIndex = 1002;
    document.body.appendChild(el);
    return el;
  })();
  // Use only static header elements for clinic and doctor info
  let headerClinicName = document.getElementById('headerClinicName');
  // doctorHeaderName, doctorHeaderQual, doctorHeaderSpec, doctorHeaderMobile are used in loadDoctorInfoAndClinics()
  const signOutBtn = document.getElementById('signOut');

  const addMedicineBtn = document.getElementById('addMedicine');
  const medicinesContainer = document.getElementById('medicinesContainer');
  const generatePdfBtn = document.getElementById('generatePdf');
  const sendWhatsappBtn = document.getElementById('sendWhatsapp');
  const savePrescriptionBtn = document.getElementById('savePrescription');
  const presForm = document.getElementById('prescriptionForm');

  // Restrict Temperature, Blood Pressure, Consultation Fee to numbers only
  if (presForm) {
    // Temperature
    const tempField = presForm.querySelector('input[name="temperature"]');
    if (tempField) {
      tempField.type = 'number';
      tempField.step = '0.1';
      tempField.min = '0';
      tempField.inputMode = 'decimal';
    }
    // Blood Pressure
    const bpField = presForm.querySelector('input[name="blood_pressure"]');
    if (bpField) {
      bpField.type = 'text';
      bpField.inputMode = 'text';
      bpField.pattern = '^[0-9/ ]*$'; // allow numbers, slash, and space
      bpField.placeholder = 'e.g. 120/80';
    }
    // Consultation Fee
    const feeField = presForm.querySelector('input[name="consultation_fee"]');
    if (feeField) {
      feeField.type = 'number';
      feeField.step = '1';
      feeField.min = '0';
      feeField.inputMode = 'numeric';
    }
  }

  let allDoctors = [];
  let loggedInDoctor = null;
  let currentVisitId = null;
  let currentBookingRef = null;

  function formatDate(d){ return d.toISOString().slice(0,10); }
  // Removed date display from dashboard

  // Get logged-in doctor id from session (server should set it)
  function getLoggedInDoctorId() {
    // Try to get from sessionStorage (set after login)
    const id = sessionStorage.getItem('doctor_id');
    if (!id) {
      console.warn('[DoctorPod] No doctor_id in sessionStorage. Redirecting to login.');
      window.location.href = '/doctor_login.html';
      return null;
    }
    // Always use the actual doctor_id from DB, not mobile
    return id;
  }

  async function fetchDoctorById(id) {
    try {
      const res = await fetch('/doctors/' + encodeURIComponent(id));
      if (!res.ok) return null;
      const data = await res.json();
      return data.doctor || null;
    } catch (e) { return null; }
  }

  async function loadDoctorInfoAndClinics() {
    const doctorId = getLoggedInDoctorId();
    if (!doctorId) return;
    const res = await fetch('/doctors/' + encodeURIComponent(doctorId));
    if (!res.ok) {
      window.location.href = '/doctor_login.html';
      return;
    }
    const data = await res.json();
    const doc = data.doctor;
    const clinics = data.clinics || [];
    if (!doc) {
      window.location.href = '/doctor_login.html';
      return;
    }
    loggedInDoctor = doc;
    allDoctors = [doc]; // Ensure allDoctors is set for single-doctor login
    // Display clinic name in the center header
    const clinicHeaderName = document.getElementById('clinicHeaderName');
    if (clinicHeaderName) {
      const clinicName = sessionStorage.getItem('clinic_name') || (clinics.length > 0 ? clinics[0].name : '-');
      clinicHeaderName.textContent = clinicName;
    }
    // Doctor info fields (desktop)
    const doctorHeaderName = document.getElementById('doctorHeaderName');
    const doctorHeaderQual = document.getElementById('doctorHeaderQual');
    const doctorHeaderSpec = document.getElementById('doctorHeaderSpec');
    const doctorHeaderMobile = document.getElementById('doctorHeaderMobile');
    
    // Doctor info fields (mobile)
    const doctorHeaderNameMobile = document.getElementById('doctorHeaderNameMobile');
    const doctorHeaderQualMobile = document.getElementById('doctorHeaderQualMobile');
    const doctorHeaderSpecMobile = document.getElementById('doctorHeaderSpecMobile');
    
    if (doctorHeaderName) doctorHeaderName.textContent = doc.name || '-';
    if (doctorHeaderQual) doctorHeaderQual.textContent = doc.qualification || '-';
    if (doctorHeaderSpec) doctorHeaderSpec.textContent = doc.specialization || '-';
    if (doctorHeaderMobile) doctorHeaderMobile.textContent = doc.phone || doc.mobile || '';
    
    // Populate mobile fields
    if (doctorHeaderNameMobile) doctorHeaderNameMobile.textContent = doc.name || '-';
    if (doctorHeaderQualMobile) doctorHeaderQualMobile.textContent = doc.qualification || '-';
    if (doctorHeaderSpecMobile) doctorHeaderSpecMobile.textContent = doc.specialization || '-';
    clinicsList = clinics;
    // Debug: show what is rendered
    console.log('[DoctorPod] Rendered doctor:', doc);
    console.log('[DoctorPod] Rendered clinics:', clinicsList);
  }

  // No modal logic needed for new header design

  // No longer needed: populateClinicsForSelectedDoctor
  // Header button event handlers
  // Removed appointment and history button event handlers as per request
  if (signOutBtn) {
    signOutBtn.onclick = () => {
      window.location.href = '/doctor_home.html';
    };
  }

  // Old loadAppointments function removed - using new implementation below (checkAppointmentsBtn.onclick)


  function makeMedicineRow(num){
    const row = document.createElement('div');
    row.className = 'medicine-row';
    // Flex layout for row, responsive for mobile
    row.style.display = 'flex';
    row.style.flexWrap = 'nowrap';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.marginBottom = '8px';
    row.style.width = '100%';

    // Medicine Name (with autocomplete)
    const nameInp = document.createElement('input');
    nameInp.placeholder = 'Medicine name';
    nameInp.className = 'med-name';
    nameInp.type = 'text';
    nameInp.autocomplete = 'off';
    nameInp.style.width = '100%';
    nameInp.style.minWidth = '0';
    nameInp.style.flex = '1 1 0';
    nameInp.style.boxSizing = 'border-box';

    // Frequency dropdown (same flex as name)
    const freq = document.createElement('select');
    ['Select Frequency','once daily','twice daily','three times'].forEach(t=>{ const o=document.createElement('option'); o.text=t; freq.appendChild(o); });
    freq.style.width = '100%';
    freq.style.fontSize = '1em';
    freq.style.marginRight = '0';
    freq.style.flex = '1 1 0';
    freq.style.minWidth = '0';
    freq.style.boxSizing = 'border-box';

    // Timing dropdown (same flex as name)
    const timing = document.createElement('select');
    ['Select Timing','Before meal','After meal','With meal'].forEach(t=>{ const o=document.createElement('option'); o.text=t; timing.appendChild(o); });
    timing.style.width = '100%';
    timing.style.fontSize = '1em';
    timing.style.marginRight = '0';
    timing.style.flex = '1 1 0';
    timing.style.minWidth = '0';
    timing.style.boxSizing = 'border-box';

    // Remove button (round red)
    const rem = document.createElement('button');
    rem.type = 'button';
    rem.className = 'icon-btn medicine-remove-btn';
    rem.title = 'Remove';
    rem.setAttribute('aria-label', 'Remove Medicine');
    rem.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="#e84118"/>
        <rect x="7.5" y="13" width="13" height="2" rx="1" fill="#fff"/>
      </svg>
    `;
    rem.addEventListener('click', () => {
      row.remove();
    });

    // Add button (round green with +)
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'icon-btn medicine-add-row-btn';
    addBtn.title = 'Add Medicine';
    addBtn.setAttribute('aria-label', 'Add Medicine');
    addBtn.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="#22c55e"/>
        <rect x="7.5" y="13" width="13" height="2" rx="1" fill="#fff"/>
        <rect x="13" y="7.5" width="2" height="13" rx="1" fill="#fff"/>
      </svg>
    `;
    addBtn.addEventListener('click', () => {
      const newRow = makeMedicineRow();
      medicinesContainer.appendChild(newRow);
      // Scroll and focus
      newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const nameInput = newRow.querySelector('.med-name');
      if (nameInput) setTimeout(() => nameInput.focus(), 300);
    });

    // Buttons container
    const btnsContainer = document.createElement('div');
    btnsContainer.className = 'medicine-row-btns';
    btnsContainer.appendChild(rem);
    btnsContainer.appendChild(addBtn);

    // Autocomplete suggestions container
    const suggWrapper = document.createElement('div');
    suggWrapper.className = 'med-name-wrapper';
    suggWrapper.style.position = 'relative';
    suggWrapper.style.flex = '1 1 0';
    suggWrapper.style.minWidth = '0';
    
    const popup = document.createElement('div');
    popup.className = 'suggestions-popup';
    popup.style.cssText = 'position:absolute;top:100%;left:0;right:0;z-index:1000;background:#fff;border:1px solid #e2e8f0;border-radius:8px;display:none;max-height:180px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.12);margin-top:4px;';

    // Get doctor ID for personalized suggestions
    const doctorId = sessionStorage.getItem('doctor_id') || '';
    
    // Flag to prevent popup re-appearing after selection
    let justSelected = false;

    nameInp.addEventListener('input', debounce(async (e)=>{
      if (justSelected) { justSelected = false; return; }
      const q = e.target.value.trim();
      if(q.length < 2){ popup.style.display='none'; return; }
      try{
        const r = await fetch(`/medicines/suggestions?query=${encodeURIComponent(q)}&doctor_id=${encodeURIComponent(doctorId)}&limit=8`);
        const j = await r.json();
        const list = j.suggestions || [];
        popup.innerHTML='';
        if(!list.length){ popup.style.display='none'; return; }
        list.forEach(it=>{
          const el = document.createElement('div');
          el.className='sugg-item';
          el.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;';
          el.innerHTML = `<span style="font-weight:500;color:#1e293b;">${it.name}</span>`;
          el.addEventListener('mouseenter', () => el.style.background = '#f0fdf4');
          el.addEventListener('mouseleave', () => el.style.background = '');
          el.addEventListener('mousedown', (ev)=>{ 
            ev.preventDefault(); // Prevent blur from firing before click
            justSelected = true;
            nameInp.value = it.name; 
            popup.style.display='none'; 
            // Move focus to frequency dropdown
            freq.focus();
          });
          popup.appendChild(el);
        });
        popup.style.display='block';
      }catch(err){ popup.style.display='none'; }
    },250));

    // Hide popup when clicking outside
    nameInp.addEventListener('blur', () => setTimeout(() => popup.style.display='none', 150));
    nameInp.addEventListener('focus', (e) => { 
      if(justSelected) { justSelected = false; return; }
      if(e.target.value.trim().length >= 2) e.target.dispatchEvent(new Event('input')); 
    });

    // Keyboard navigation for suggestions
    nameInp.addEventListener('keydown', (e) => {
      const items = popup.querySelectorAll('.sugg-item');
      if (!items.length || popup.style.display === 'none') return;
      
      let activeIdx = Array.from(items).findIndex(el => el.classList.contains('active'));
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[activeIdx]?.classList.remove('active');
        activeIdx = (activeIdx + 1) % items.length;
        items[activeIdx].classList.add('active');
        items[activeIdx].style.background = '#f0fdf4';
        items[activeIdx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[activeIdx]?.classList.remove('active');
        activeIdx = activeIdx <= 0 ? items.length - 1 : activeIdx - 1;
        items[activeIdx].classList.add('active');
        items[activeIdx].style.background = '#f0fdf4';
        items[activeIdx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault();
        // Get the medicine name from the active item
        const activeItem = items[activeIdx];
        const medName = activeItem.querySelector('span')?.textContent || '';
        justSelected = true;
        nameInp.value = medName;
        popup.style.display = 'none';
        freq.focus();
      } else if (e.key === 'Escape') {
        popup.style.display = 'none';
      }
    });

    suggWrapper.appendChild(nameInp);
    suggWrapper.appendChild(popup);

    // Add to grid
    row.appendChild(suggWrapper);
    row.appendChild(freq);
    row.appendChild(timing);
    row.appendChild(btnsContainer);

    // Responsive: stack fields on small screens
    row.style.flexWrap = 'wrap';
    row.style.rowGap = '6px';
    row.style.columnGap = '8px';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';

    // Media query for mobile: stack vertically if screen < 600px
    function updateRowLayout() {
      if (window.innerWidth < 600) {
        row.style.flexDirection = 'column';
        nameInp.style.width = '100%';
        freq.style.width = '100%';
        timing.style.width = '100%';
        btnsContainer.style.width = '100%';
        btnsContainer.style.justifyContent = 'center';
        btnsContainer.style.marginTop = '4px';
      } else {
        row.style.flexDirection = 'row';
        nameInp.style.width = '100%';
        freq.style.width = '100%';
        timing.style.width = '100%';
        btnsContainer.style.width = 'auto';
        btnsContainer.style.justifyContent = 'flex-start';
        btnsContainer.style.marginTop = '0';
      }
    }
    updateRowLayout();
    window.addEventListener('resize', updateRowLayout);

    return row;
  }

  addMedicineBtn.addEventListener('click', ()=>{
    medicinesContainer.appendChild(makeMedicineRow());
    // re-number all rows
    Array.from(medicinesContainer.children).forEach((r, idx) => {
      const n = r.querySelector('span');
      if(n) n.textContent = (idx+1) + '.';
    });
  });

  function debounce(fn, ms){ let t; return function(...args){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), ms); }; }

  // mobile validation for patient mobile
  const mobileField = presForm.querySelector('input[name="patient_mobile"]') || document.getElementById('patientMobile');
  mobileField && mobileField.addEventListener('input', (e)=>{
    let v = e.target.value.replace(/\D/g,'');
    if(v.startsWith('0')) v = v.replace(/^0+/, '');
    if(v.length>10) v = v.slice(0,10);
    e.target.value = v;
  });


  // Load patient profile and visit timeline by patient_id (mobile)
  async function loadPatientHistory(mobile) {
    if (!mobile || mobile.length !== 10) return;
    try {
      // Fetch patient_id by mobile
      const resPatient = await fetch('/api/patient/by-mobile/' + encodeURIComponent(mobile));
      if (!resPatient.ok) return;
      const patientData = await resPatient.json();
      if (!patientData.success || !patientData.patient || !patientData.patient.patient_id) return;
      const patientId = patientData.patient.patient_id;
      // Fetch profile and timeline
      const res = await fetch('/history/patient/' + encodeURIComponent(patientId) + '/profile');
      if (!res.ok) return;
      const j = await res.json();
      if (!j.success || !j.timeline) return;
      // Create modal using CSS classes
      let modal = document.getElementById('patientHistoryModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'patientHistoryModal';
        modal.className = 'modal show';
        modal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h3><span class="modal-header-icon">👤</span> Patient Profile</h3>
              <button id="closePatientHistoryModal" class="modal-close">&times;</button>
            </div>
            <div class="modal-body" id="patientHistoryContent"></div>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('closePatientHistoryModal').onclick = function() {
          modal.classList.remove('show');
          modal.style.display = 'none';
        };
        // Close on backdrop click
        modal.addEventListener('click', function(e) {
          if (e.target === modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
          }
        });
      } else {
        modal.classList.add('show');
        modal.style.display = 'flex';
      }
    } catch (e) {
      console.error('Error loading patient history:', e);
    }
  }

  const historyBtn = document.getElementById('historyBtnHeader');
  let historyModal = null;
  
  // Helper function to create/show history modal
  function getOrCreateHistoryModal() {
    let modal = document.getElementById('historyModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'historyModal';
      modal.className = 'modal show';
      modal.style.display = 'flex';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3><span class="modal-header-icon">📋</span> Patient History</h3>
            <button id="closeHistoryModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div id="historyModalContent"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('closeHistoryModal').onclick = function() {
        modal.classList.remove('show');
        modal.style.display = 'none';
      };
      // Close on backdrop click
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.classList.remove('show');
          modal.style.display = 'none';
        }
      });
    } else {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
    return modal;
  }

  if (historyBtn) {
    historyBtn.addEventListener('click', async () => {
      // Get mobile from form
      const mobileField = document.getElementById('patientMobile') || (presForm && presForm.patient_mobile);
      const mobile = mobileField && mobileField.value ? mobileField.value.trim() : '';
      
      historyModal = getOrCreateHistoryModal();
      const modalContent = document.getElementById('historyModalContent');
      if (!modalContent) return;
      
      if (!mobile || mobile.length !== 10) {
        // Show search form for mobile number
        modalContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">Search Patient History</div>
            <div class="empty-state-text">Enter a valid 10-digit mobile number</div>
          </div>
          <div class="modal-search">
            <input type="text" id="historySearchMobile" maxlength="10" inputmode="numeric" placeholder="Enter mobile number" />
            <button id="historySearchBtn">Search</button>
          </div>
          <div id="historySearchError" class="modal-error" style="display:none;"></div>
        `;
        setupSearchHandlers(modalContent);
        return;
      }

      // Show loading state
      modalContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⏳</div>
          <div class="empty-state-title">Loading...</div>
          <div class="empty-state-text">Fetching patient history</div>
        </div>
      `;

      // Fetch and render history by mobile
      const history = await fetchHistoryByMobile(mobile, modalContent);
      await renderHistoryList(history, modalContent, mobile);
    });
  }
  
  // Setup search handlers for history modal
  function setupSearchHandlers(modalContent) {
    const searchBtn = document.getElementById('historySearchBtn');
    const mobileInput = document.getElementById('historySearchMobile');
    const errorDiv = document.getElementById('historySearchError');
    
    if (searchBtn && mobileInput) {
      searchBtn.onclick = async function() {
        const searchMobile = mobileInput.value.trim();
        if (!/^\d{10}$/.test(searchMobile)) {
          errorDiv.textContent = 'Please enter a valid 10-digit mobile number.';
          errorDiv.style.display = 'block';
          return;
        }
        errorDiv.style.display = 'none';
        
        // Show loading
        modalContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⏳</div>
            <div class="empty-state-title">Searching...</div>
          </div>
        `;
        
        const history = await fetchHistoryByMobile(searchMobile, modalContent);
        await renderHistoryList(history, modalContent, searchMobile);
      };
      
      // Allow Enter key to trigger search
      mobileInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') searchBtn.click();
      });
    }
  }
  
  // Fetch history by mobile
  async function fetchHistoryByMobile(mobile, modalContent) {
    try {
      // First, get patient_id by mobile
      const resPatient = await fetch('/api/patient/by-mobile/' + encodeURIComponent(mobile));
      if (!resPatient.ok) { 
        modalContent.innerHTML = '<div class="modal-error">Failed to fetch patient.</div>'; 
        return []; 
      }
      const patientData = await resPatient.json();
      if (!patientData.success || !patientData.patient || !patientData.patient.patient_id) { 
        modalContent.innerHTML = '<div class="modal-error">Patient not found.</div>'; 
        return []; 
      }
      const patientId = patientData.patient.patient_id;
      // Now fetch visits with medicines
      const res = await fetch(`/history/patient/${encodeURIComponent(patientId)}/with-medicines`);
      if (!res.ok) {
        modalContent.innerHTML = '<div class="modal-error">Failed to fetch history.</div>';
        return [];
      }
      const j = await res.json();
      if (!j.success || !Array.isArray(j.visits)) {
        modalContent.innerHTML = '<div class="modal-error">No history found.</div>';
        return [];
      }
      return j.visits;
    } catch (e) {
      modalContent.innerHTML = '<div class="modal-error">Error fetching history.</div>';
      return [];
    }
  }
  
  // Format date for display
  function formatHistoryDate(raw) {
    if (!raw) return '-';
    try {
      const match = raw.match(/\d{4}-\d{2}-\d{2}/);
      if (match) {
        const d = new Date(match[0]);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch(e) {}
    return '-';
  }

  // Render history list
  async function renderHistoryList(history, modalContent, searchedMobile) {
    if (!history.length) {
      // Show mobile field and search button for history search
      modalContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">No History Found</div>
          <div class="empty-state-text">No records for this patient</div>
        </div>
        <div class="modal-search">
          <input type="text" id="historySearchMobile" maxlength="10" inputmode="numeric" placeholder="Try another mobile" value="${searchedMobile || ''}" />
          <button id="historySearchBtn">Search</button>
        </div>
        <div id="historySearchError" class="modal-error" style="display:none;"></div>
      `;
      setupSearchHandlers(modalContent);
      return;
    }
    
    // Build compact history cards
    let html = '';
    for (const h of history) {
      const meds = h.medicines || [];
      const dateVal = formatHistoryDate(h.visit_time || h.created_at);
      
      // Build medicines as inline tags
      const medsHtml = meds.length ? meds.map(m => {
        const freq = [m.dose, m.frequency, m.timing].filter(Boolean).join(' · ');
        return `<span class="history-medicine-item"><span class="history-medicine-name">${m.medicine_name || m.name}</span>${freq ? `<span class="history-medicine-freq">${freq}</span>` : ''}</span>`;
      }).join('') : '';
      
      html += `
        <div class="history-card">
          <div class="history-card-header">
            <span class="history-card-date">${dateVal}</span>
            ${h.doctor_name ? `<span class="history-card-doctor">${h.doctor_name}</span>` : ''}
          </div>
          ${h.diagnosis ? `<div class="history-card-diagnosis">🩺 ${h.diagnosis}</div>` : ''}
          ${medsHtml ? `<div class="history-card-medicines"><div class="history-card-medicines-title">💊 Medicines</div>${medsHtml}</div>` : ''}
          ${h.investigations ? `<div class="history-card-tests">🧪 ${h.investigations}</div>` : ''}
        </div>
      `;
    }
    
    // Add search option at the bottom
    html += `
      <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid #e2e8f0;">
        <div class="modal-search">
          <input type="text" id="historySearchMobile" maxlength="10" inputmode="numeric" placeholder="Search another patient" />
          <button id="historySearchBtn">Search</button>
        </div>
        <div id="historySearchError" class="modal-error" style="display:none;"></div>
      </div>
    `;
    
    modalContent.innerHTML = html;
    setupSearchHandlers(modalContent);
  }

  // also auto-load on mobile blur
  mobileField && mobileField.addEventListener('blur', (e)=>{ const v = e.target.value.trim(); if(v.length===10) loadPatientHistory(v); });


  // Removed sign out button beside Clear button in prescription form area


  // Helper: Save prescription if not already saved, return visit_id
  let saveInProgress = false;
  async function autoSavePrescription() {
    if (saveInProgress) return currentVisitId;
    if (currentVisitId) return currentVisitId;
    saveInProgress = true;
    // gather form
    const form = new FormData(presForm);
    const medicines = [];
    medicinesContainer.querySelectorAll('.medicine-row').forEach(r => {
      const name = r.querySelector('.med-name').value.trim();
      if (!name) return;
      const selects = r.querySelectorAll('select');
      const frequency = selects[0] ? selects[0].value : '';
      const timing = selects[1] ? selects[1].value : '';
      medicines.push({
        medicine_name: name,
        frequency: frequency,
        timing: timing
      });
    });
    // Get investigations field
    let investigations = '';
    const investigationsField = presForm.querySelector('textarea[name="Medical Test"]');
    if (investigationsField) investigations = investigationsField.value || '';
    // Ensure doctor_name and doctor_id are always set
    let doctorName = null;
    let doctorId = null;
    if (!loggedInDoctor || !loggedInDoctor.name) {
      await loadDoctorInfoAndClinics();
    }
    if (loggedInDoctor && loggedInDoctor.name) {
      doctorName = loggedInDoctor.name;
      doctorId = loggedInDoctor.doctor_id;
    } else if (allDoctors.length === 1) {
      doctorName = allDoctors[0].name;
      doctorId = allDoctors[0].doctor_id;
    }
    if (!doctorName || !doctorId) {
      alert('Doctor information missing. Please log in again.');
      saveInProgress = false;
      currentVisitId = null;
      return null;
    }
    // Always get the latest value from the dropdown
    let clinicId = selectedClinicId;
    if (!clinicId) {
      alert('Please select a clinic.');
      saveInProgress = false;
      currentVisitId = null;
      return null;
    }
    // --- Patient ID logic ---
    let patientId = null;
    const patientMobile = form.get('patient_mobile');
    if (patientMobile && patientMobile.length === 10) {
      // Try to fetch patient_id from backend
      try {
        const res = await fetch('/api/patient/by-mobile/' + encodeURIComponent(patientMobile));
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.patient && data.patient.patient_id) {
            patientId = data.patient.patient_id;
          }
        }
      } catch (e) {}
    }
    // If not found, generate patient_id (first 4 chars of name + last 6 of mobile)
    if (!patientId) {
      const pname = (form.get('patient_name')||'').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0,4).padEnd(4,'x');
      const pmob = (patientMobile||'').slice(-6).padStart(6,'0');
      patientId = pname + pmob;
    }
    // Check if QR should be included
    const includeQrCheckbox = document.getElementById('includeQrCheckbox');
    const include_qr = includeQrCheckbox && includeQrCheckbox.checked ? true : false;
    // map to backend field names
    const payload = {
      visit_id: currentVisitId,
      booking_ref: currentBookingRef,
      patient_id: patientId,
      patient_name: form.get('patient_name'),
      patient_mobile: patientMobile,
      patient_age: form.get('patient_age'),
      patient_gender: form.get('patient_gender') || null,
      temperature: form.get('temperature'),
      blood_pressure: form.get('blood_pressure'),
      doctor_id: doctorId,
      doctor_name: doctorName,
      clinic_id: clinicId,
      consultation_fee: form.get('consultation_fee'),
      diagnosis: form.get('diagnosis') || '',
      advice: form.get('advise') || '',
      investigations: investigations,
      medicines,
      include_qr
    };
    console.log('[DoctorPod] Save payload:', JSON.stringify(payload, null, 2));
    // Let backend generate visit_id using doctor+patient+sequence format
    try{
      const r = await fetch('/history/save',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
      const j = await r.json();
      if(j.success && (j.visit_id || payload.visit_id)){
        currentVisitId = j.visit_id || payload.visit_id;
        // inline feedback
        let fb = document.getElementById('prescMsg');
        if (!fb) { fb = document.createElement('div'); fb.id = 'prescMsg'; fb.className = 'small-muted'; }
        fb.textContent = 'Saved (visit id: '+currentVisitId+')';
        presForm.parentNode.insertBefore(fb, presForm.nextSibling);
      } else {
        let msg = 'Save failed: ' + (j && (j.message||j.error) ? (j.message||j.error) : 'unknown error');
        // Show backend error in a visible way
        let fb = document.getElementById('prescMsg');
        if (!fb) { fb = document.createElement('div'); fb.id = 'prescMsg'; fb.className = 'small-muted'; }
        fb.style.color = '#e84118';
        fb.textContent = msg;
        presForm.parentNode.insertBefore(fb, presForm.nextSibling);
        alert(msg);
        saveInProgress = false;
        currentVisitId = null;
        return null;
      }
    }catch(e){
      let fb = document.getElementById('prescMsg');
      if (!fb) { fb = document.createElement('div'); fb.id = 'prescMsg'; fb.className = 'small-muted'; }
      fb.style.color = '#e84118';
      fb.textContent = 'Save failed: Network or server error.';
      presForm.parentNode.insertBefore(fb, presForm.nextSibling);
      alert('Save failed: Network or server error.');
      saveInProgress = false;
      currentVisitId = null;
      return null;
    }
    saveInProgress = false;
    return currentVisitId;
  }


  // Disable Generate PDF and WhatsApp buttons until saved
  generatePdfBtn.disabled = true;
  sendWhatsappBtn.disabled = true;


  // Save button logic
  savePrescriptionBtn.addEventListener('click', async () => {
    savePrescriptionBtn.disabled = true;
    const visitId = await autoSavePrescription();
    if (visitId) {
      generatePdfBtn.disabled = false;
      sendWhatsappBtn.disabled = false;
      
      // Mark appointment as 'seen' after successful save
      await markAppointmentAsSeen();
      
      const fb = document.getElementById('prescMsg') || document.createElement('div');
      fb.id = 'prescMsg';
      fb.className = 'small-muted success-msg';
      fb.innerHTML = '✓ Prescription saved successfully <span class="visit-id">(Visit #' + visitId + ')</span>';
      presForm.parentNode.insertBefore(fb, presForm.nextSibling);
      
      // Clear selected appointment reference
      selectedAppointmentId = null;
    } else {
      generatePdfBtn.disabled = true;
      sendWhatsappBtn.disabled = true;
    }
    savePrescriptionBtn.disabled = false;
  });

  generatePdfBtn.addEventListener('click', async () => {
    if (generatePdfBtn.disabled) return;
    if (!currentVisitId) {
      alert('Please save the prescription before generating PDF.');
      return;
    }
    generatePdfBtn.disabled = true;
    // Gather all required fields from the form and context
    const medicines = [];
    medicinesContainer.querySelectorAll('.medicine-row').forEach(r => {
      const name = r.querySelector('.med-name').value.trim();
      if (!name) return;
      medicines.push({
        name,
        frequency: r.querySelectorAll('select')[0] ? r.querySelectorAll('select')[0].value : '',
        meal_timing: r.querySelectorAll('select')[1] ? r.querySelectorAll('select')[1].value : ''
      });
    });
    // Ensure include_qr is sent for PDF generation
    const includeQrCheckbox = document.getElementById('includeQrCheckbox');
    const include_qr = includeQrCheckbox && includeQrCheckbox.checked ? true : false;
    const pdfData = {
      visit_id: currentVisitId,
      patient_name: presForm.patient_name ? presForm.patient_name.value : '',
      doctor_name: loggedInDoctor && loggedInDoctor.name ? loggedInDoctor.name : '',
      doctor_degree: loggedInDoctor && loggedInDoctor.degree ? loggedInDoctor.degree : '',
      doctor_address: loggedInDoctor && loggedInDoctor.address ? loggedInDoctor.address : '',
      doctor_mobile: loggedInDoctor && loggedInDoctor.mobile ? loggedInDoctor.mobile : '',
      diagnosis: presForm.notes ? presForm.notes.value : '',
      advice: presForm.advise ? presForm.advise.value : '',
      investigations: presForm.investigations ? presForm.investigations.value : '',
      medicines,
      temperature: presForm.temperature ? presForm.temperature.value : '',
      blood_pressure: presForm.blood_pressure ? presForm.blood_pressure.value : '',
      include_qr
    };
    try {
      const res = await fetch('/pdf/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfData)
      });
      const data = await res.json();
      if (data.success && data.pdfPath) {
        window.open(data.pdfPath, '_blank');
        const fb = document.getElementById('prescMsg') || document.createElement('div');
        fb.id = 'prescMsg';
        fb.className = 'small-muted';
        fb.textContent = 'PDF generated';
        presForm.parentNode.insertBefore(fb, presForm.nextSibling);
      } else {
        alert('PDF generation failed: ' + (data.message || data.error || 'unknown'));
      }
    } catch (e) {
      alert('PDF generation failed');
    }
    generatePdfBtn.disabled = false;
  });

  // Send WhatsApp (open wa.me link returned by server)
  sendWhatsappBtn && sendWhatsappBtn.addEventListener('click', async ()=>{
    if (sendWhatsappBtn.disabled) return;
    if (!currentVisitId) {
      alert('Please save the prescription before sending WhatsApp.');
      return;
    }
    sendWhatsappBtn.disabled = true;
    const visitId = currentVisitId;
    try{
      // Get patient name for message
      const patientName = presForm.patient_name ? presForm.patient_name.value : '';
      const patientAge = presForm.patient_age ? presForm.patient_age.value : '';
      const patientGender = presForm.patient_gender ? presForm.patient_gender.value : '';
      const patientMobile = presForm.patient_mobile ? presForm.patient_mobile.value : '';
      // Doctor details
      const doctorName = loggedInDoctor && loggedInDoctor.name ? loggedInDoctor.name : '';
      const doctorDegree = loggedInDoctor && loggedInDoctor.degree ? loggedInDoctor.degree : '';
      // Medicines
      const medicines = [];
      medicinesContainer.querySelectorAll('.medicine-row').forEach(r => {
        const name = r.querySelector('.med-name').value.trim();
        if (!name) return;
        const selects = r.querySelectorAll('select');
        const frequency = selects[0] ? selects[0].value : '';
        const timing = selects[1] ? selects[1].value : '';
        medicines.push(`${name}${frequency && frequency !== 'Frequency' ? ' | ' + frequency : ''}${timing && timing !== 'Timing' ? ' | ' + timing : ''}`);
      });
      
      // Auto-generate PDF if not already generated
      let pdfPath = '';
      try {
        // First check if PDF already exists
        const resPdf = await fetch(`/history/visit/${visitId}`);
        if (resPdf.ok) {
          const jPdf = await resPdf.json();
          if (jPdf.success && jPdf.visit && jPdf.visit.pres_path) pdfPath = jPdf.visit.pres_path;
        }
        
        // If no PDF, generate it now
        if (!pdfPath) {
          const includeQr = document.getElementById('includeQrCheckbox')?.checked || false;
          const pdfRes = await fetch('/pdf/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visit_id: visitId,
              include_qr: includeQr,
              temperature: presForm.temperature?.value || '',
              blood_pressure: presForm.blood_pressure?.value || ''
            })
          });
          if (pdfRes.ok) {
            const pdfJson = await pdfRes.json();
            if (pdfJson.success && pdfJson.pdfPath) pdfPath = pdfJson.pdfPath;
          }
        }
      } catch (e) { console.error('PDF generation error:', e); }
      
      // Compose WhatsApp message with clear sections
      // Try to get date from form if available
      let visitDate = '';
      if (presForm.appointment_date) visitDate = presForm.appointment_date.value;
      else if (presForm.date) visitDate = presForm.date.value;
      // Compose message with clear separation and bold headers
      let message = `*Doctor:* ${doctorName}${doctorDegree ? ' (' + doctorDegree + ')' : ''}\n`;
      message += `*Patient:* ${patientName}`;
      if (visitDate) message += `\n*Date:* ${visitDate}`;
      message += `\n`;
      if (medicines.length) {
        message += `\n*Medicines:*\n`;
        medicines.forEach((m, i) => { message += `${i + 1}. ${m}\n`; });
      }
      if (pdfPath) {
        message += `\n*Prescription Link:* ${window.location.origin + pdfPath}`;
      }
      // ...existing code...
      // Patch: send 'mobile' instead of 'patient_mobile' to backend
      // Always send doctor_id and clinic_id for robust backend lookup
      const consultationFee = presForm.consultation_fee ? presForm.consultation_fee.value : '';
      const res = await fetch('/whatsapp/send', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          visit_id: visitId,
          message,
          mobile: patientMobile,
          doctor_id: loggedInDoctor?.doctor_id || null,
          clinic_id: loggedInDoctor?.clinic_id || selectedClinicId || null,
          consultation_fee: consultationFee
        })
      });
      const j = await res.json();
      if(j.success && j.whatsappUrl){ window.open(j.whatsappUrl, '_blank'); }
      else alert('Unable to create WhatsApp link');
    }catch(e){ alert('Unable to create WhatsApp link'); }
    sendWhatsappBtn.disabled = false;
  });

  const checkAppointmentsBtn = document.getElementById('checkAppointmentsBtn');

  // Store currently selected appointment for status update after save
  let selectedAppointmentId = null;

  // Modal for appointments
  let appointmentsModal = null;

  if (checkAppointmentsBtn) {
    checkAppointmentsBtn.onclick = async function() {
      const doctorId = sessionStorage.getItem('doctor_id');
      if (!doctorId) return;

      // Create modal if not exists
      if (!appointmentsModal) {
        appointmentsModal = document.createElement('div');
        appointmentsModal.id = 'appointmentsModal';
        appointmentsModal.className = 'modal show';
        appointmentsModal.style.display = 'flex';
        appointmentsModal.innerHTML = `
          <div class="modal-content" style="max-width: 640px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);">
              <h3><span class="modal-header-icon">📅</span> Patient Queue</h3>
              <button id="closeAppointmentsModal" class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
              <div id="appointmentsFilterRow" class="filter-bar"></div>
              <div id="appointmentsModalContent"></div>
            </div>
          </div>
        `;
        document.body.appendChild(appointmentsModal);
        
        document.getElementById('closeAppointmentsModal').onclick = function() {
          appointmentsModal.classList.remove('show');
          appointmentsModal.style.display = 'none';
        };
        
        // Close on backdrop click
        appointmentsModal.addEventListener('click', function(e) {
          if (e.target === appointmentsModal) {
            appointmentsModal.classList.remove('show');
            appointmentsModal.style.display = 'none';
          }
        });
        
        // Set up click handler for select buttons ONCE using event delegation
        const modalContentEl = document.getElementById('appointmentsModalContent');
        
        modalContentEl.addEventListener('click', async function(e) {
          const btn = e.target.closest('.selectAppointmentBtn');
          if (!btn) return;
          if (btn.disabled) return;
          
          e.preventDefault();
          e.stopPropagation();
          
          const appointmentId = btn.getAttribute('data-appointment-id');
          if (!appointmentId) return;
          
          // Get booking from the data attribute on the card
          const card = btn.closest('.appointment-card');
          const patientName = card.querySelector('.patient-name')?.textContent || '';
          const mobileEl = card.querySelectorAll('.info-value')[1];
          const mobile = mobileEl ? mobileEl.textContent : '';
          const ageGenderEl = card.querySelectorAll('.info-value')[2];
          const ageGender = ageGenderEl ? ageGenderEl.textContent : '';
          
          // Parse age and gender
          const ageMatch = ageGender.match(/(\d+)\s*yrs/);
          const age = ageMatch ? ageMatch[1] : '';
          const genderMatch = ageGender.match(/\/\s*(\w+)/);
          const gender = genderMatch ? genderMatch[1] : '';

          // Store selected appointment for later status update
          selectedAppointmentId = appointmentId;
          currentBookingRef = appointmentId;

          // Auto-fill prescription form
          if (presForm.patient_name) presForm.patient_name.value = patientName;
          if (presForm.patient_age) presForm.patient_age.value = age;
          if (presForm.patient_mobile) presForm.patient_mobile.value = mobile;
          
          const genderField = presForm.querySelector('select[name="patient_gender"]');
          if (genderField) genderField.value = gender;

          // Store appointment ID in hidden field
          const appointmentIdField = document.getElementById('appointmentIdField');
          if (appointmentIdField) appointmentIdField.value = appointmentId;

          // Update status to in_progress
          try {
            await fetch(`/bookings/${appointmentId}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ consult_status: 'in_progress' })
            });
          } catch (err) {
            console.log('Status update error:', err);
          }

          // Close modal
          appointmentsModal.classList.remove('show');
          appointmentsModal.style.display = 'none';

          // Focus on first empty field
          const firstEmpty = presForm.querySelector('input[name="temperature"], input[name="diagnosis"]');
          if (firstEmpty) firstEmpty.focus();
        });
        
      } else {
        appointmentsModal.classList.add('show');
        appointmentsModal.style.display = 'flex';
      }

      // Build filter UI
      const filterRow = document.getElementById('appointmentsFilterRow');
      filterRow.innerHTML = `
        <div class="filter-toggle-group">
          <button type="button" class="filter-toggle-btn active" id="filterToday">Today</button>
          <button type="button" class="filter-toggle-btn" id="filterAllDates">All Dates</button>
        </div>
        <select id="appointmentsDateSelect" class="filter-select" style="display:none;"></select>
        <select id="appointmentsStatusSelect" class="filter-select">
          <option value="">All Status</option>
          <option value="not_seen">Not Seen</option>
          <option value="in_progress">In Progress</option>
          <option value="seen">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
        <div class="appointments-summary" id="appointmentsSummary"></div>
      `;

      const todayFilter = document.getElementById('filterToday');
      const allDatesFilter = document.getElementById('filterAllDates');
      const statusSelect = document.getElementById('appointmentsStatusSelect');
      const dateSelect = document.getElementById('appointmentsDateSelect');
      const summaryDiv = document.getElementById('appointmentsSummary');
      const modalContent = document.getElementById('appointmentsModalContent');

      // Fetch all dates for date dropdown
      try {
        const datesRes = await fetch(`/bookings/doctor/${doctorId}`);
        if (datesRes.ok) {
          const datesData = await datesRes.json();
          const allDates = (datesData.bookings || []).map(b => b.appointment_date).filter(Boolean);
          const uniqueDates = Array.from(new Set(allDates)).sort().reverse();
          dateSelect.innerHTML = uniqueDates.map(d => `<option value="${d}">${formatDateNice(d)}</option>`).join('');
        }
      } catch (e) {}

      function formatDateNice(dateStr) {
        try {
          const d = new Date(dateStr);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          d.setHours(0, 0, 0, 0);
          
          const dayDiff = Math.floor((d - today) / (1000 * 60 * 60 * 24));
          let label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          
          if (dayDiff === 0) label += ' (Today)';
          else if (dayDiff === 1) label += ' (Tomorrow)';
          else if (dayDiff === -1) label += ' (Yesterday)';
          else if (dayDiff > 1) label += ' (Upcoming)';
          
          return label;
        } catch(e) { return dateStr; }
      }

      // Toggle filters
      todayFilter.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        todayFilter.classList.add('active');
        allDatesFilter.classList.remove('active');
        dateSelect.style.display = 'none';
        reloadAppointments();
      });

      allDatesFilter.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        allDatesFilter.classList.add('active');
        todayFilter.classList.remove('active');
        dateSelect.style.display = 'inline-block';
        reloadAppointments();
      });

      statusSelect.addEventListener('change', reloadAppointments);
      dateSelect.addEventListener('change', reloadAppointments);

      async function fetchAppointments() {
        const today = new Date().toISOString().split('T')[0];
        let date = todayFilter.classList.contains('active') ? today : dateSelect.value;
        let url = `/bookings/doctor/${doctorId}?date=${date}`;
        if (statusSelect.value) url += `&status=${statusSelect.value}`;
        
        try {
          const res = await fetch(url);
          if (!res.ok) return [];
          const j = await res.json();
          return j.bookings || [];
        } catch (e) {
          return [];
        }
      }

      function getStatusClass(status) {
        if (!status) return 'status-pending';
        return 'status-' + status.toLowerCase().replace(/\s+/g, '_');
      }

      function getStatusLabel(status) {
        if (!status) return 'Pending';
        const labels = {
          'not_seen': 'Not Seen',
          'in_progress': 'In Progress',
          'seen': 'Completed',
          'cancelled': 'Cancelled',
          'no_show': 'No Show'
        };
        return labels[status.toLowerCase()] || status;
      }

      // Store current bookings for click handler
      let currentBookings = [];

      function renderAppointments(bookings) {
        // Store bookings for event handler access
        currentBookings = bookings;
        
        // Update summary
        const total = bookings.length;
        const pending = bookings.filter(b => b.consult_status === 'not_seen' || !b.consult_status).length;
        const completed = bookings.filter(b => b.consult_status === 'seen').length;
        
        summaryDiv.innerHTML = `
          <div class="summary-stat">
            <span class="summary-stat-value">${total}</span>
            <span class="summary-stat-label">Total</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-value" style="color: #f59e0b;">${pending}</span>
            <span class="summary-stat-label">Pending</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-value" style="color: #10b981;">${completed}</span>
            <span class="summary-stat-label">Done</span>
          </div>
        `;

        if (!bookings.length) {
          modalContent.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <div class="empty-state-title">No Appointments</div>
              <div class="empty-state-text">${todayFilter.classList.contains('active') ? 'No appointments scheduled for today' : 'No appointments for selected date'}</div>
            </div>
          `;
          return;
        }

        // Sort by queue number
        bookings.sort((a, b) => (a.queue_number || 999) - (b.queue_number || 999));

        modalContent.innerHTML = bookings.map(b => `
          <div class="appointment-card" data-id="${b.appointment_id}">
            <div class="appointment-queue-badge">
              <span class="queue-number">#${b.queue_number || '-'}</span>
            </div>
            <div class="appointment-card-body">
              <div class="appointment-info-row">
                <span class="info-label">Patient:</span>
                <span class="info-value patient-name">${b.patient_name || 'Unknown'}</span>
              </div>
              <div class="appointment-info-row">
                <span class="info-label">Mobile:</span>
                <span class="info-value">${b.patient_mobile || 'N/A'}</span>
              </div>
              <div class="appointment-info-row">
                <span class="info-label">Age/Gender:</span>
                <span class="info-value">${b.patient_age || '-'} yrs / ${b.patient_gender || '-'}</span>
              </div>
              <div class="appointment-info-row">
                <span class="info-label">Time:</span>
                <span class="info-value time-value">${b.appointment_time || '--:--'}</span>
              </div>
              <div class="appointment-info-row">
                <span class="info-label">Status:</span>
                <span class="appointment-card-status ${getStatusClass(b.consult_status)}">${getStatusLabel(b.consult_status)}</span>
              </div>
            </div>
            <div class="appointment-card-actions">
              <button type="button" class="selectAppointmentBtn btn-select-appointment" data-appointment-id="${b.appointment_id}" ${b.consult_status === 'seen' ? 'disabled' : ''}>
                ${b.consult_status === 'seen' ? '✓ Done' : 'Select'}
              </button>
            </div>
          </div>
        `).join('');
      }

      async function reloadAppointments() {
        modalContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⏳</div>
            <div class="empty-state-title">Loading...</div>
          </div>
        `;
        const bookings = await fetchAppointments();
        renderAppointments(bookings);
      }

      reloadAppointments();
    };
  }

  // Update appointment status to 'seen' after successful save
  async function markAppointmentAsSeen() {
    if (!selectedAppointmentId) return;
    try {
      await fetch(`/bookings/${selectedAppointmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consult_status: 'seen' })
      });
      console.log('[DoctorPod] Marked appointment as seen:', selectedAppointmentId);
    } catch (e) {
      console.error('[DoctorPod] Failed to update appointment status:', e);
    }
  }

  // initial
  addDefaultMedicineRow();
  // small poll to refresh (removed, loadAppointments not defined)
  // setInterval(loadAppointments, 30_000);

  loadDoctorInfoAndClinics();
});
