
const loginForm = document.getElementById('clinicLoginForm');
const actionsDiv = document.getElementById('clinicActions');
const addDoctorBtn = document.getElementById('addDoctorBtn');
const addDoctorSection = document.getElementById('addDoctorSection');
const addDoctorForm = document.getElementById('addDoctorForm');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const clinic_id = loginForm.elements['clinic_id'].value.trim();
  const password = loginForm.elements['password'].value;
  try {
    const res = await fetch('/clinic/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic_id, password })
    });
    const j = await res.json();
    if (j.success) {
      window.location.href = '/clinic_dashboard.html';
    } else {
      alert(j.message || 'Login failed.');
    }
  } catch (err) {
    alert('Network error.');
  }
});

if (addDoctorBtn) {
  addDoctorBtn.addEventListener('click', () => {
    addDoctorSection.style.display = 'block';
  });
}

if (addDoctorForm) {
  addDoctorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(addDoctorForm);
    const data = Object.fromEntries(formData.entries());
    data.clinic_id = window.clinicId;
    try {
      const res = await fetch('/doctor/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const j = await res.json();
      if (j.success) {
        alert('Doctor added successfully!');
        addDoctorForm.reset();
        addDoctorSection.style.display = 'none';
      } else {
        alert(j.message || 'Failed to add doctor.');
      }
    } catch (err) {
      alert('Network error.');
    }
  });
}
