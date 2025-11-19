document.getElementById('createForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const messageEl = document.getElementById('message');

  // Reset message display
  messageEl.style.color = '';
  messageEl.textContent = '';

  // Client-side quick checks
  if (!username) {
    messageEl.textContent = 'Please enter a username.';
    return;
  }

  if (username.length < 3) {
    messageEl.textContent = 'Username too short (minimum 3 characters).';
    return;
  }

  if (!password) {
    messageEl.textContent = 'Please enter a password.';
    return;
  }

  if (password.length < 6) {
    messageEl.textContent = 'Password too short (minimum 6 characters).';
    return;
  }

  if (password.length > 128) {
    messageEl.textContent = 'Password too long (maximum 128 characters).';
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
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

    console.log('Register response', res.status, body);

    if (res.ok) {
      messageEl.style.color = 'green';
      messageEl.textContent = 'Account created successfully — redirecting...';
      setTimeout(() => window.location.href = '/home', 700);
      return;
    }

    // Handle common error cases
    // 1) Duplicate username (server returned 409 with { error: 'Username exists' } or similar)
    if (res.status === 409) {
      if (body && typeof body === 'object' && body.error) {
        messageEl.textContent = body.error === 'Username exists' ? 'Duplicate username — try another one.' : body.error;
      } else {
        messageEl.textContent = 'Duplicate username — try another one.';
      }
      return;
    }

    // 2) Validation errors from express-validator: { errors: [ { msg, param, ... }, ... ] }
    if (body && typeof body === 'object' && Array.isArray(body.errors) && body.errors.length) {
      const msgs = [];
      for (const err of body.errors) {
        // err.param might be 'username' or 'password'
        if (err.param === 'password') {
          if (/length/i.test(err.msg) || /at least/i.test(err.msg)) msgs.push('Password too short (minimum 6 characters).');
          else msgs.push(err.msg);
        } else if (err.param === 'username') {
          if (/length/i.test(err.msg) || /at least/i.test(err.msg)) msgs.push('Username too short (minimum 3 characters).');
          else msgs.push(err.msg);
        } else {
          msgs.push(err.msg || `${err.param}: invalid`);
        }
      }
      messageEl.textContent = msgs.join(' — ');
      return;
    }

    // 3) Other server-provided JSON { error: '...', message: '...' }
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

    // 4) Plain text or HTML fallback: strip tags and show short snippet
    if (typeof body === 'string') {
      const withoutTags = body.replace(/(<([^>]+)>)/gi, ''); // crude strip tags
      const snippet = withoutTags.trim().slice(0, 500);
      messageEl.textContent = snippet || `Server returned status ${res.status}`;
      return;
    }

    // 5) Generic fallback
    messageEl.textContent = `Error creating account (status ${res.status}).`;

  } catch (err) {
    console.error('Network error during register:', err);
    messageEl.textContent = 'Network error — please check the server and try again.';
  }
});