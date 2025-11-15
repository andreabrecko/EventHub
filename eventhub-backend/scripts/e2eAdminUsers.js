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

async function login(email, password) {
  const r = await fetch(base + '/users/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return j(r);
}

function rndEmail() {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `e2e_${rnd}@test.local`;
}

function rndUsername() {
  const rnd = Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(0, 8);
  return `user_${rnd}`; // max 13 chars, allowed charset
}

async function blockToggle(adminToken, userId, isBlocked) {
  const r = await fetch(base + `/admin/users/${userId}/block`, {
    method: 'PATCH', headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ isBlocked })
  });
  return j(r);
}

async function getAdminUsers(adminToken) {
  const r = await fetch(base + '/admin/users', { headers: { Authorization: 'Bearer ' + adminToken } });
  return j(r);
}

async function getReports(adminToken) {
  const r = await fetch(base + '/admin/reports', { headers: { Authorization: 'Bearer ' + adminToken } });
  return j(r);
}

async function resolveReport(adminToken, reportId, action) {
  const r = await fetch(base + `/admin/reports/${reportId}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  return j(r);
}

async function run() {
  // 1) Crea utente base
  const email = rndEmail();
  const username = rndUsername();
  const password = 'P@ssw0rd!';
  const reg = await register(username, email, password);
  console.log('REGISTER_USER', JSON.stringify({ status: reg.status, user: reg.user }));

  // 2) Login admin
  const admin = await login('admin@test.com', 'Password123');
  console.log('LOGIN_ADMIN', JSON.stringify({ user: admin.user }));

  // 3) Recupera utenti e blocca/sblocca il nuovo
  const usersPayload = await getAdminUsers(admin.token);
  const users = Array.isArray(usersPayload) ? usersPayload : (Array.isArray(usersPayload.users) ? usersPayload.users : []);
  const u = users.find(x => x.email === email);
  if (!u) {
    console.log('USER_NOT_FOUND_IN_ADMIN_LIST', email);
  } else {
    const blk = await blockToggle(admin.token, u.id, true);
    console.log('BLOCK_USER', JSON.stringify({ status: blk.status, body: blk }));
    const unblk = await blockToggle(admin.token, u.id, false);
    console.log('UNBLOCK_USER', JSON.stringify({ status: unblk.status, body: unblk }));
  }

  // 4) Se ci sono segnalazioni, risolvine una
  const repsPayload = await getReports(admin.token);
  const reports = Array.isArray(repsPayload) ? repsPayload : (Array.isArray(repsPayload.reports) ? repsPayload.reports : []);
  if (reports.length > 0) {
    const rep = reports[0];
    const res = await resolveReport(admin.token, rep.report_id || rep.id, 'keep');
    console.log('REPORT_RESOLVE', JSON.stringify(res));
  } else {
    console.log('NO_REPORTS');
  }
}

run().catch(e => { console.error('E2E ADMIN USERS ERROR', e && e.message); process.exit(1); });