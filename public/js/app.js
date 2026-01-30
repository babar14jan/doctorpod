// App utilities for DoctorPod frontend
// Mobile input cleaning per spec
function normalizeMobileInput(el){
  el.addEventListener('input', (e)=>{
    let v = e.target.value.replace(/\D/g, '');
    if (v.startsWith('0')) v = v.substring(1);
    if (v.length > 10) v = v.substring(0,10);
    e.target.value = v;
  });
}

// Generate 15-min slots from timings like "Mon-Sat 09:00-17:00"
function parseTime(t){
  const [hh,mm] = t.split(':').map(Number);
  return hh*60 + mm;
}
function formatTime(mins){
  const hh = Math.floor(mins/60).toString().padStart(2,'0');
  const mm = (mins%60).toString().padStart(2,'0');
  return `${hh}:${mm}`;
}
function generateTimeSlots(timings){
  if (!timings) return [];
  // timings = "Mon-Sat 09:00-17:00" -> take last part
  const parts = timings.trim().split(' ');
  const range = parts[parts.length-1];
  if (!range || !range.includes('-')) return [];
  const [start, end] = range.split('-');
  let current = parseTime(start);
  const endTime = parseTime(end);
  const slots = [];
  while (current < endTime){
    slots.push(formatTime(current));
    current += 15;
  }
  return slots;
}

// Simple debounce
function debounce(fn, wait=300){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
}

// Autocomplete helper: attach to input element (expects suggestions endpoint /medicines/suggestions)
function attachMedicineAutocomplete(inputEl, onSelect){
  const list = document.createElement('div');
  list.className = 'autocomplete-list';
  inputEl.parentNode.appendChild(list);
  inputEl.addEventListener('blur', ()=> setTimeout(()=>list.innerHTML='', 150));

  inputEl.addEventListener('input', debounce(async (e)=>{
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

// Export for use in pages
window.DoctorPod = { normalizeMobileInput, generateTimeSlots, attachMedicineAutocomplete };
