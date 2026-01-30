document.getElementById('featuresToggle')?.addEventListener('click', (e)=>{
  e.preventDefault();
  const s = document.getElementById('features');
  const active = s.classList.toggle('active');
  if (active) {
    s.classList.remove('hidden');
    setTimeout(()=>s.scrollIntoView({behavior:'smooth',block:'start'}),50);
  } else {
    s.classList.add('hidden');
  }
});
document.getElementById('contactToggle')?.addEventListener('click', (e)=>{
  e.preventDefault();
  const s = document.getElementById('contact');
  const active = s.classList.toggle('active');
  if (active) {
    s.classList.remove('hidden');
    setTimeout(()=>s.scrollIntoView({behavior:'smooth',block:'start'}),50);
  } else {
    s.classList.add('hidden');
  }
});
