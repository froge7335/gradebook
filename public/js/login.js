document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const messageEl = document.getElementById('message');

  // Reset message display
  messageEl.style.color = '';
  messageEl.textContent = '';

  // Client-side quick checks
  if (!username) {
    messageEl.textContent = 'Please enter your username.';
    return;
  }
  
  if (!password) {
    messageEl.textContent = 'Please enter your password.';
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      redirect: 'follow'
    });

    const ct = res.headers.get('content-type') || '';
    let body = null;
    if (ct.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    console.log('Login response', res.status, body);

    if (res.ok) {
      window.location.href = '/home';
      return;
    }

    // Handle specific statuses & messages
    // 1) Server typically returns 401 for invalid credentials
    if (res.status === 401) {
      if (body && typeof body === 'object' && body.error) {
        messageEl.textContent = body.error === 'Invalid credentials' ? 'Invalid credentials — check username and password.' : body.error;
      } else {
        messageEl.textContent = 'Invalid credentials — check username and password.';
      }
      return;
    }

    // 2) Possibly account not found
    if (res.status === 404) {
      if (body && typeof body === 'object' && body.error) {
        messageEl.textContent = body.error === 'Account not found' ? 'Account not found — please create an account.' : body.error;
      } else {
        messageEl.textContent = 'Account not found — please create an account.';
      }
      return;
    }

    // 3) Validation errors (express-validator)
    if (body && typeof body === 'object' && Array.isArray(body.errors) && body.errors.length) {
      const msgs = body.errors.map(e => {
        if (e.param === 'username') return 'Username: ' + e.msg;
        if (e.param === 'password') return 'Password: ' + e.msg;
        return e.msg || `${e.param}: invalid`;
      });
      messageEl.textContent = msgs.join(' — ');
      return;
    }

    // 4) Generic JSON error { error: '...' } or { message: '...' }
    if (body && typeof body === 'object') {
      if (body.error) {
        messageEl.textContent = body.error;
        return;
      }
      if (body.message) {
        messageEl.textContent = body.message;
        return;
      }
    }

    // 5) Plain text or HTML fallback — strip tags and show snippet
    if (typeof body === 'string') {
      const withoutTags = body.replace(/(<([^>]+)>)/gi, ''); // crude tag strip
      const snippet = withoutTags.trim().slice(0, 500);
      messageEl.textContent = snippet || `Login failed (status ${res.status})`;
      return;
    }

    // 6) Generic fallback
    messageEl.textContent = `Login failed (status ${res.status}).`;

  } catch (err) {
    console.error('Network or JS error during login:', err);
    messageEl.textContent = 'Network error — check that the server is running.';
  }
});