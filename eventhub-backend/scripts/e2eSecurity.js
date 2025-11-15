const base = 'http://localhost:3000/api';

async function j(r) {
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { status: r.status, text: t }; }
}

async function register(username, email, password) {
  const r = await fetch(base + '/users/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  return j(r);
}

async function requestVerify(email) {
  const r = await fetch(base + '/users/verify-email', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return { status: r.status, body: await j(r) };
}

async function login(email, password) {
  const r = await fetch(base + '/users/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return { status: r.status, body: await j(r) };
}

async function createEventNoAuth() {
  const fd = new FormData();
  fd.append('title', 'Evento senza auth');
  fd.append('description', 'Test protezione endpoint');
  fd.append('date', new Date(Date.now() + 86400000).toISOString());
  fd.append('location', 'Milano');
  fd.append('capacity', '5');
  fd.append('category_id', '1');
  const r = await fetch(base + '/events', { method: 'POST', body: fd });
  return r.status;
}

async function run() {
  const rnd = Math.random().toString(36).slice(2);
  const email = `e2e_${rnd}@test.local`;
  const username = `user_${rnd}`;
  const password = 'P@ssw0rd!';

  const reg = await register(username, email, password);
  console.log('REGISTER', JSON.stringify({ status: reg.status, user: reg.user }));

  // Test rate limit on verify-email: 6 requests should hit 429 on the last
  const verifyResults = [];
  for (let i = 0; i < 6; i++) {
    verifyResults.push(await requestVerify(email));
  }
  console.log('VERIFY_EMAIL_STATUSES', verifyResults.map(v => v.status));

  // Test rate limit on login with wrong password: 11 attempts last should be 429
  const loginResults = [];
  for (let i = 0; i < 11; i++) {
    loginResults.push(await login(email, 'WrongPassword!'));
  }
  console.log('LOGIN_STATUSES', loginResults.map(l => l.status));

  // Test protected POST /events without token should be 401
  const evStatus = await createEventNoAuth();
  console.log('EVENT_CREATE_NOAUTH_STATUS', evStatus);

  const summary = {
    verifyEmailLastIs429: verifyResults[verifyResults.length - 1].status === 429,
    loginLastIs429: loginResults[loginResults.length - 1].status === 429,
    eventCreateNoAuthIs401: evStatus === 401
  };
  console.log('SUMMARY', JSON.stringify(summary));
}

run().catch(e => { console.error('E2E SECURITY ERROR', e && e.message); process.exit(1); });