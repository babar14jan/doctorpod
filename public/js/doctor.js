// doctor dashboard script: load appointments, add medicine rows, save history
async function getQueryParam(name){
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}


document.addEventListener('DOMContentLoaded', async ()=>{
  const doctorId = await getQueryParam('doctor_id');
  if (!doctorId) return;
  const apires = await fetch('/doctors/' + encodeURIComponent(doctorId));
  const data = await apires.json();
  if (data.success) {
    document.getElementById('doctorName').value = data.doctor.name;
    const clinics = data.clinics || [];
    const cs = document.getElementById('clinicSelect');
    cs.innerHTML = clinics.map(c=>`<option value="${c.id}">${c.clinic_name}</option>`).join('') || '<option value="">Default Clinic</option>';
    if (clinics.length === 1){ cs.selectedIndex = 0; }
    loadAppointments(doctorId);
  }

  document.getElementById('addMed').addEventListener('click', addMedicineRow);
  document.getElementById('prescForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const form = new FormData(e.target);
    const obj = Object.fromEntries(form.entries());
    // collect medicines
    const medRows = document.querySelectorAll('.medicine-row');
    const meds = [];
    medRows.forEach(row => {
      const name = row.querySelector('.med-name').value;
      if (!name) return;
      meds.push({ name, frequency: row.querySelector('.med-frequency').value, meal_timing: row.querySelector('.med-meal').value, dosage: row.querySelector('.med-dosage').value, instructions: row.querySelector('.med-instr').value });
    });
    obj.medicines = meds;
    // fallback visit_id if not present
    if (!obj.visit_id) obj.visit_id = 'VST-' + Date.now() + '-' + Math.random().toString(36).substr(2,5);
    const res = await fetch('/history/save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(obj) });
    const j = await res.json();
    document.getElementById('prescMsg').innerText = j.success ? ('Saved, visit_id: '+j.visit_id) : (j.message || 'Error');
  });

  // Attach autocomplete to all .med-name fields (fallback if DoctorPod not present)
  function fallbackAttachAutocomplete(inputEl, onSelect){
    const list = document.createElement('div');
    list.className = 'autocomplete-list';
    inputEl.parentNode.appendChild(list);
    inputEl.addEventListener('blur', ()=> setTimeout(()=>list.innerHTML='', 150));
    inputEl.addEventListener('input', (function debounce(fn, wait=300){ let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); }; })(async (e)=>{
      const q = e.target.value.trim();
      if (q.length < 2) { list.innerHTML=''; return; }
      const res = await fetch(`/medicines/suggestions?query=${encodeURIComponent(q)}&limit=10`);
      const j = await res.json();
      list.innerHTML = '';
      if (j.success && Array.isArray(j.suggestions)){
        j.suggestions.forEach(s => {
          const it = document.createElement('div');
          it.className = 'autocomplete-item';
          it.innerHTML = `<strong>${s.name}</strong><div class="small">Prescribed ${s.usage_count} times</div>`;
          it.addEventListener('click', ()=>{ onSelect(s.name); list.innerHTML=''; });
          list.appendChild(it);
        });
      }
    }, 300));
  }
  document.querySelectorAll('.med-name').forEach(inputEl => {
    if (window.DoctorPod && typeof window.DoctorPod.attachMedicineAutocomplete === 'function') {
      DoctorPod.attachMedicineAutocomplete(inputEl, val => { inputEl.value = val; });
    } else {
      fallbackAttachAutocomplete(inputEl, val => { inputEl.value = val; });
    }
  });

  // Mobile validation for patient_mobile
  const mobileInput = document.getElementById('patientMobile');
  if (mobileInput) {
    mobileInput.addEventListener('input', (e)=>{
      let v = e.target.value.replace(/\D/g, '');
      if (v.startsWith('0')) v = v.substring(1);
      if (v.length > 10) v = v.substring(0,10);
      e.target.value = v;
    });
  }
});

function addMedicineRow(){
  const con = document.getElementById('medicinesContainer');
  const div = document.createElement('div');
  div.className = 'medicine-row';
  div.innerHTML = `
    <input class="med-name" placeholder="Medicine name" />
    <input class="med-frequency" placeholder="Frequency" />
    <input class="med-meal" placeholder="Meal timing" />
    <input class="med-dosage" placeholder="Dosage" />
    <input class="med-instr" placeholder="Instructions" />
    <button type="button" class="removeMed">Remove</button>
  `;
  con.appendChild(div);
  const nameInput = div.querySelector('.med-name');
  // attach autocomplete to medicine name
  if (window.DoctorPod && typeof window.DoctorPod.attachMedicineAutocomplete === 'function'){
    DoctorPod.attachMedicineAutocomplete(nameInput, (val)=>{ nameInput.value = val; });
  }
  div.querySelector('.removeMed').addEventListener('click', ()=>div.remove());
}

async function loadAppointments(doctorId){
  const date = new Date().toISOString().split('T')[0];
  const res = await fetch('/bookings/doctor/' + encodeURIComponent(doctorId) + '?date=' + date);
  const j = await res.json();
  const ap = document.getElementById('appointments');
  if (!j.success) { ap.innerText = 'Failed to load'; return; }
  ap.innerHTML = j.bookings.map(b => `<div class="card"><strong>#${b.queue_number}</strong> ${b.patient_name} — ${b.appointment_time} — ${b.mobile} <br/>Status: ${b.status} <button data-id="${b.id}" class="markSeen">Mark Seen</button></div>`).join('');
  ap.querySelectorAll('.markSeen').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      const id = e.target.dataset.id;
      await fetch('/bookings/' + encodeURIComponent(id) + '/status', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: 'seen' }) });
      loadAppointments(doctorId);
    });
  });
}
