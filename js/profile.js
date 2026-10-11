
/* profile.js · หน้าบัญชีส่วนตัว */
'use strict';

Pages.profile = (function () {
  const ROLES = ['นักศึกษา', 'บุคคลทั่วไป', 'ครอบครัว'];
  let root;

  const $ = s => root.querySelector(s);
  const g = id => document.getElementById(id);

  function init() {
    root = document.getElementById('page-profile');

    g('pf-role').innerHTML = ROLES
      .map(r => `<option value="${r}">${r}</option>`)
      .join('');

    g('pf-save').addEventListener('click', saveProfile);
    g('cp-save').addEventListener('click', changePassword);
    root.querySelector('[data-logout]').addEventListener('click', logout);
  }

  // โหลดข้อมูลบัญชีจาก Backend
  async function render() {
    g('pf-msg').hidden = true;
    g('pf-err').hidden = true;

    try {
      const u = await API.getProfile();

      // รักษารูปแบบข้อมูลที่หน้าเว็บเดิมใช้อยู่
      State.user = {
        ...State.user,
        ...u,
        first: u.firstName,
        last: u.lastName
      };

      $('[data-avatar]').textContent = initialOf(State.user);
      $('[data-name]').textContent = fullName(State.user);
      $('[data-email]').textContent = u.email;
      $('[data-role]').textContent = u.role || 'บุคคลทั่วไป';

      g('pf-first').value = u.firstName || '';
      g('pf-last').value = u.lastName || '';
      g('pf-email').value = u.email || '';
      g('pf-role').value = ROLES.includes(u.role)
        ? u.role
        : 'บุคคลทั่วไป';
    } catch (error) {
      g('pf-err').textContent =
        error.message || 'โหลดข้อมูลโปรไฟล์ไม่สำเร็จ';
      g('pf-err').hidden = false;
    }
  }

  // บันทึกข้อมูลโปรไฟล์ผ่าน Backend
  async function saveProfile() {
    const firstName = g('pf-first').value.trim();
    const lastName = g('pf-last').value.trim();
    const email = g('pf-email').value.trim().toLowerCase();
    const role = g('pf-role').value;
    const err = g('pf-err');
    const msg = g('pf-msg');
    const saveButton = g('pf-save');

    msg.hidden = true;
    err.hidden = true;

    if (!firstName) {
      err.textContent = 'กรุณากรอกชื่อ';
      err.hidden = false;
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.textContent = 'รูปแบบอีเมลไม่ถูกต้อง';
      err.hidden = false;
      return;
    }

    if (!lastName) {
      err.textContent = 'กรุณากรอกนามสกุล';
      err.hidden = false;
      return;
    }

    saveButton.disabled = true;

    try {
      const u = await API.updateProfile({
        firstName,
        lastName,
        email,
        role
      });

      State.user = {
        ...State.user,
        ...u,
        first: u.firstName,
        last: u.lastName
      };

      $('[data-avatar]').textContent = initialOf(State.user);
      $('[data-name]').textContent = fullName(State.user);
      $('[data-email]').textContent = u.email;
      $('[data-role]').textContent = u.role;

      msg.textContent = 'บันทึกข้อมูลเรียบร้อยแล้ว';
      msg.hidden = false;
    } catch (error) {
      err.textContent = error.message || 'บันทึกข้อมูลไม่สำเร็จ';
      err.hidden = false;
    } finally {
      saveButton.disabled = false;
    }
  }

  function openPassword() {
    ['cp-current', 'cp-new', 'cp-confirm'].forEach(id => {
      g(id).value = '';
    });

    g('cp-error').hidden = true;
    openModal('cp-modal');
  }

  // เปลี่ยนรหัสผ่านผ่าน Backend
  async function changePassword() {
    const currentPassword = g('cp-current').value;
    const newPassword = g('cp-new').value;
    const confirmPassword = g('cp-confirm').value;
    const err = g('cp-error');
    const saveButton = g('cp-save');

    const fail = message => {
      err.textContent = message;
      err.hidden = false;
    };

    err.hidden = true;

    if (!currentPassword) {
      return fail('กรุณากรอกรหัสผ่านปัจจุบัน');
    }

    if (newPassword.length < 8) {
      return fail('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
    }

    if (newPassword.length > 72) {
      return fail('รหัสผ่านใหม่ต้องไม่เกิน 72 ตัวอักษร');
    }

    if (newPassword !== confirmPassword) {
      return fail('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
    }

    saveButton.disabled = true;

    try {
      await API.changePassword(currentPassword, newPassword);
      closeModal('cp-modal');
      toast('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
    } catch (error) {
      fail(error.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      saveButton.disabled = false;
    }
  }

  return { init, render, openPassword };
})();
