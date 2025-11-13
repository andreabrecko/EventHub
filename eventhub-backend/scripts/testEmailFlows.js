const base = 'http://localhost:3000/api';

async function j(r) { const t = await r.text(); try { return JSON.parse(t); } catch { return { status: r.status, text: t }; } }

async function register(username, email, password) {
  const r = await fetch(base + '/users/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password }) });
  return j(r);
}

async function verifyCode(email, code) {
  const r = await fetch(base + '/users/verify-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
  return j(r);
}

async function login(email, password) {
  const r = await fetch(base + '/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  return j(r);
}

async function toggleNotify(token, enabled) {
  const r = await fetch(base + '/users/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ enabled }) });
  return j(r);
}

async function run() {
  const uniq = Math.floor(Math.random() * 1e6);
  const email = `user${uniq}@example.com`;
  const reg = await register('user' + uniq, email, 'Aa1!test123');
  console.log('REGISTER', reg.message || reg.error || reg.status);
  const codeFetch = await fetch(base + '/admin/users', { method: 'GET', headers: { Authorization: 'Bearer ' + (await login('admin@test.com','Password123')).token } });
  const users = await j(codeFetch);
  const me = Array.isArray(users.users) ? users.users.find(u => u.email === email) : null;
  if (!me) { console.log('NO_USER'); return; }
  const tokenData = await j(await fetch(base + '/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Aa1!test123' }) }));
  console.log('LOGIN_BEFORE_VERIFY', tokenData.error || tokenData.message);
}

run().catch(e => { console.error(e); process.exit(1); });