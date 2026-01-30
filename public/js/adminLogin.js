document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = document.getElementById('submitBtn');
  const errorMsg = document.getElementById('errorMsg');
  
  // Hide previous error
  errorMsg.classList.remove('show');
  errorMsg.textContent = '';
  
  // Get form data
  const formData = new FormData(form);
  const payload = { 
    mobile: formData.get('mobile').trim(), 
    password: formData.get('password') 
  };
  
  // Validate
  if (!payload.mobile || !payload.password) {
    errorMsg.textContent = 'Please fill in all fields';
    errorMsg.classList.add('show');
    return;
  }
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.classList.add('btn-loading');
  
  try {
    const res = await fetch('/admin/login', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) { 
      window.location.href = '/admin_dashboard.html'; 
    } else { 
      errorMsg.textContent = data.message || 'Invalid username or password';
      errorMsg.classList.add('show');
    }
  } catch (err) { 
    errorMsg.textContent = 'Connection error. Please try again.';
    errorMsg.classList.add('show');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('btn-loading');
  }
});
