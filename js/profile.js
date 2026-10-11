/* profile.js · หน้าบัญชีส่วนตัว */
'use strict';
Pages.profile = (function () {
  const ROLES = ['นักศึกษา', 'บุคคลทั่วไป', 'ครอบครัว'];
  let root;
  const $ = s => root.querySelector(s);
  const g = id => document.getElementById(id);

  function init() {
    root = document.getElementById('page-profile');
    g('pf-role').innerHTML = ROLES.map(r => `<option>${r}</option>`).join('');
    g('pf-save').addEventListener('click', saveProfile);
    g('cp-save').addEventListener('click', changePassword);
    root.querySelector('[data-logout]').addEventListener('click', logout);
  }
  function render() {
    const u = State.user;
    $('[data-avatar]').textContent = initialOf(u); $('[data-name]').textContent = fullName(u); $('[data-email]').textContent = u.email; $('[data-role]').textContent = u.role || 'นักศึกษา';
    g('pf-first').value = u.first || ''; g('pf-last').value = u.last || ''; g('pf-email').value = u.email;
    g('pf-role').value = ROLES.includes(u.role) ? u.role : ROLES[0]; g('pf-msg').hidden = true; g('pf-err').hidden = true;
  }
  function saveProfile() {
    const first = g('pf-first').value.trim(), last = g('pf-last').value.trim(), email = g('pf-email').value.trim().toLowerCase(), role = g('pf-role').value, err = g('pf-err');
    g('pf-msg').hidden = true; err.hidden = true;
    if (!first) { err.textContent = 'กรุณากรอกชื่อ'; err.hidden = false; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'รูปแบบอีเมลไม่ถูกต้อง'; err.hidden = false; return; }
    const old = State.user.email;
    if (email !== old) {
      if (State.accounts.some(a => a.email === email)) { err.textContent = 'อีเมลนี้ถูกใช้งานแล้ว'; err.hidden = false; return; }
      const data = store.get(LS.DATA + old); if (data) store.set(LS.DATA + email, data); store.del(LS.DATA + old);
      store.set(LS.SESSION, { email });
    }
    Object.assign(State.user, { first, last, email, role });
    saveAll(); Nav.render('profile'); render();
    g('pf-msg').textContent = 'บันทึกข้อมูลเรียบร้อยแล้ว'; g('pf-msg').hidden = false;
  }
  function openPassword() { ['cp-current', 'cp-new', 'cp-confirm'].forEach(i => { g(i).value = ''; }); g('cp-error').hidden = true; openModal('cp-modal'); }
  function changePassword() {
    const cur = g('cp-current').value, nw = g('cp-new').value, cf = g('cp-confirm').value, err = g('cp-error');
    const fail = m => { err.textContent = m; err.hidden = false; };
    if (cur !== State.user.password) return fail('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    if (nw.length < 8) return fail('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
    if (nw !== cf) return fail('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
    State.user.password = nw; saveAll(); closeModal('cp-modal'); toast('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
  }
  return { init, render, openPassword };
})();
