// Client for /bookings/verify
const mobileEl = document.getElementById('mobile');
const bookingEl = document.getElementById('booking_id');
const doctorEl = document.getElementById('doctor_id');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');

const resultsEl = document.getElementById('results');
const feedback = document.getElementById('feedback');

// Modal elements for booking details (use modal from HTML)
const bookingModal = document.getElementById('bookingModal');
const bookingModalBody = document.getElementById('bookingModalBody');
const closeBookingModalBtn = document.getElementById('closeBookingModalBtn');
if (closeBookingModalBtn && bookingModal) {
  closeBookingModalBtn.onclick = () => bookingModal.style.display = 'none';
  bookingModal.onclick = (e) => { if (e.target === bookingModal) bookingModal.style.display = 'none'; };
}

function showBookingModal(html) {
  if (bookingModal && bookingModalBody) {
    bookingModalBody.innerHTML = html;
    bookingModal.style.display = 'flex';
  }
}

function mobileValid(v){ return /^[1-9][0-9]{9}$/.test(v || ''); }


function renderBooking(b){
  const status = (b.status||'pending').toLowerCase();
  const badgeClass = status === 'seen' ? 'seen' : status === 'cancelled' ? 'cancelled' : 'pending';
  return `
    <div class="booking-card" role="article" aria-label="Booking ${b.booking_id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <div class="patient-name" style="font-size:1.05rem;font-weight:700;">${b.patient_name || '—'}</div>
          <div class="small-muted">
            ${b.age ? b.age + ' yrs' : ''} ${b.gender ? '• ' + b.gender : ''}
          </div>
          <div style="margin-top:6px" class="small-muted">
            <b>Clinic:</b> ${b.clinic_name || '—'}<br/>
            <b>Clinic Phone:</b> ${b.clinic_phone || '—'}<br/>
            <b>Doctor:</b> ${b.doctor_name || '—'}
          </div>
        </div>

        <div style="min-width:160px;text-align:right">
          <div><span class="badge ${badgeClass}">${status.charAt(0).toUpperCase()+status.slice(1)}</span></div>
          <div class="queue-number" style="margin-top:8px;font-weight:700;font-size:1.05rem">Queue #${(b.queue_number !== undefined && b.queue_number !== null) ? b.queue_number : '-'}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.7rem;flex-wrap:wrap">
        <div class="small-muted"><b>Date:</b> ${b.appointment_date || ''} <b>Time:</b> ${b.appointment_time || ''}</div>
      </div>
    </div>
  `;
}

async function doSearch(){
  resultsEl.innerHTML = '';
  feedback.textContent = '';
  const mobile = mobileEl.value.trim();
  const appointment_id = bookingEl.value.trim();
  const doctor_id = doctorEl ? doctorEl.value.trim() : '';
  // Build params from all fields
  const params = new URLSearchParams();
  if (!mobile && !appointment_id && !doctor_id) {
    feedback.textContent = 'Please search with any ID.';
    return;
  }
  if (mobile) {
    if (!mobileValid(mobile)) {
      feedback.textContent = 'Enter a valid mobile (10 digits, no leading 0).';
      return;
    }
    params.set('mobile', mobile);
  }
  if (appointment_id) params.set('appointment_id', appointment_id);
  if (doctor_id) params.set('doctor_id', doctor_id);

  feedback.textContent = 'Searching…';
  try{
    const res = await fetch('/bookings/verify?' + params.toString());
    if (!res.ok) {
      feedback.textContent = 'Server error. Please try again later.';
      return;
    }
    const j = await res.json();
    if (!j.success) { feedback.textContent = j.message || 'No results'; return; }
    const rows = j.bookings || [];
    if (!rows.length){ feedback.textContent = 'No bookings found.'; return; }
    // Show first booking in a modal popup
    showBookingModal(renderBooking(rows[0]));
    feedback.textContent = `Found ${rows.length} booking(s).`;
  }catch(err){
    feedback.textContent = 'Server error. Please try again later.';
  }
}

searchBtn.addEventListener('click', doSearch);
clearBtn.addEventListener('click', ()=>{
  mobileEl.value = '';
    bookingEl.value = ''; // This should still clear the input
  if (doctorEl) doctorEl.value = '';
  resultsEl.innerHTML = '';
  feedback.textContent = '';
  // Hide results section if present
  const resultsSection = document.getElementById('resultsSection');
  if (resultsSection) resultsSection.style.display = 'none';
});
