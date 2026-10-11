
'use strict';

(function () {
  const $ = id => document.getElementById(id);

  const goApp = () => {
    if (typeof App.enter === 'function') {
      App.enter();
    } else {
      location.href = 'pages/dashboard.html';
    }
  };

  // ถ้ามี Token อยู่แล้ว ให้ตรวจสอบกับ Backend ก่อน
  async function restoreBackendSession() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      await API.getDashboard();

      const user = JSON.parse(localStorage.getItem('dpp2_user') || 'null');
      if (!user) return false;

      State.user = user;
      goApp();
      return true;
    } catch (error) {
      API.logout();
      localStorage.removeItem('dpp2_user');
      return false;
    }
  }

  let resetEmail = '';
  const panels = ['login', 'register', 'forgot', 'reset'];

  function show(name) {
    panels.forEach(p => {
      const panel = $('panel-' + p);
      if (panel) panel.hidden = p !== name;
    });

    document.querySelectorAll(
      '#login-root .form-error, #login-root .form-ok'
    ).forEach(el => {
      el.hidden = true;
    });

    const panel = $('panel-' + name);
    const input = panel && panel.querySelector('input');

    if (
      input &&
      !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    ) {
      input.focus();
    }
  }

  const fail = (id, msg) => {
    $(id).textContent = msg;
    $(id).hidden = false;
  };

  const okEmail = value =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // จำเฉพาะอีเมล ไม่บันทึกรหัสผ่าน
  const rememberedEmail = store.get(LS.REMEMBER);

  if (rememberedEmail) {
    $('login-email').value = rememberedEmail;
    $('remember').checked = true;
  }

  // แสดง/ซ่อนรหัสผ่าน
  document.querySelectorAll('[data-toggle-pw]').forEach(button => {
    if (typeof ICON !== 'undefined' && ICON.eye) {
      button.innerHTML = ICON.eye;
    }

    button.addEventListener('click', () => {
      const input = button.parentElement.querySelector('input');
      input.type = input.type === 'password' ? 'text' : 'password';

      button.setAttribute(
        'aria-pressed',
        String(input.type === 'text')
      );
    });
  });

  // แสดงความแข็งแรงของรหัสผ่าน
  function strength(inputId, fillId, labelId) {
    $(inputId).addEventListener('input', event => {
      const value = event.target.value;
      let score = 0;

      if (value.length >= 8) score++;
      if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
      if (/[0-9]/.test(value)) score++;
      if (/[^A-Za-z0-9]/.test(value)) score++;

      const levels = [
        ['0%', '', ''],
        ['25%', 'var(--negative)', 'อ่อน'],
        ['50%', '#D9A21B', 'พอใช้'],
        ['75%', 'var(--sky-500)', 'ดี'],
        ['100%', 'var(--positive)', 'แข็งแรง']
      ];

      const level = levels[value ? Math.max(score, 1) : 0];

      $(fillId).style.width = level[0];
      $(fillId).style.background = level[1];
      $(labelId).textContent = level[2]
        ? 'ความแข็งแรง: ' + level[2]
        : '';
    });
  }

  strength('reg-password', 'reg-fill', 'reg-strength');
  strength('rs-password', 'rs-fill', 'rs-strength');

  document.querySelectorAll('[data-show]').forEach(button => {
    button.addEventListener('click', () => show(button.dataset.show));
  });

  // ปิดการกรอกบัญชี Demo
  const demoButton = $('demo-fill');
  if (demoButton) {
    const demoBox = demoButton.closest('.demo-box');
    if (demoBox) demoBox.hidden = true;
  }

  // LOGIN
  $('form-login').addEventListener('submit', async event => {
    event.preventDefault();

    const email = $('login-email').value.trim().toLowerCase();
    const password = $('login-password').value;
    const button = $('form-login').querySelector('[type="submit"]');

    if (!email || !password) {
      return fail('login-error', 'กรุณากรอกอีเมลและรหัสผ่าน');
    }

    if (!okEmail(email)) {
      return fail('login-error', 'รูปแบบอีเมลไม่ถูกต้อง');
    }

    button.disabled = true;
    button.textContent = 'กำลังเข้าสู่ระบบ...';

    try {
      const user = await API.login(email, password);

      // เก็บข้อมูลสำหรับแสดงผลเท่านั้น
      const profile = {
        id: user.id,
        email: user.email,
        first: user.firstName || '',
        last: user.lastName || '',
        role: user.role || 'ผู้ใช้งาน'
      };

      localStorage.setItem('dpp2_user', JSON.stringify(profile));

      State.user = profile;

      if ($('remember').checked) {
        store.set(LS.REMEMBER, email);
      } else {
        store.del(LS.REMEMBER);
      }

      $('login-password').value = '';
      goApp();
    } catch (error) {
      fail(
        'login-error',
        error.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง'
      );
    } finally {
      button.disabled = false;
      button.textContent = 'เข้าสู่ระบบ';
    }
  });

  // REGISTER
  $('form-register').addEventListener('submit', async event => {
    event.preventDefault();

    const firstName = $('reg-first').value.trim();
    const lastName = $('reg-last').value.trim();
    const email = $('reg-email').value.trim().toLowerCase();
    const password = $('reg-password').value;
    const confirmPassword = $('reg-confirm').value;
    const button = $('form-register').querySelector('[type="submit"]');

    if (!firstName || !lastName || !email || !password) {
      return fail('reg-error', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
    }

    if (!okEmail(email)) {
      return fail('reg-error', 'รูปแบบอีเมลไม่ถูกต้อง');
    }

    if (password.length < 8) {
      return fail('reg-error', 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    }

    if (password !== confirmPassword) {
      return fail('reg-error', 'รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    }

    button.disabled = true;
    button.textContent = 'กำลังสร้างบัญชี...';

    try {
      const user = await API.register({
        firstName,
        lastName,
        email,
        password
      });

      const profile = {
        id: user.id,
        email: user.email,
        first: user.firstName || firstName,
        last: user.lastName || lastName,
        role: user.role || 'ผู้ใช้งาน'
      };

      localStorage.setItem('dpp2_user', JSON.stringify(profile));
      State.user = profile;

      $('reg-ok').hidden = false;
      $('reg-error').hidden = true;

      $('reg-password').value = '';
      $('reg-confirm').value = '';

      goApp();
    } catch (error) {
      fail(
        'reg-error',
        error.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง'
      );
    } finally {
      button.disabled = false;
      button.textContent = 'สร้างบัญชี';
    }
  });

  // FORGOT PASSWORD
  $('form-forgot').addEventListener('submit', event => {
    event.preventDefault();

    const email = $('forgot-email').value.trim().toLowerCase();

    if (!okEmail(email)) {
      return fail('forgot-error', 'รูปแบบอีเมลไม่ถูกต้อง');
    }

    resetEmail = email;

    fail(
      'forgot-error',
      'ระบบรีเซ็ตรหัสผ่านยังไม่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
    );
  });

  // ยังไม่อนุญาตให้เปลี่ยนรหัสผ่านเฉพาะในเบราว์เซอร์
  $('form-reset').addEventListener('submit', event => {
    event.preventDefault();

    fail(
      'rs-error',
      'ระบบรีเซ็ตรหัสผ่านยังไม่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
    );
  });

  // ตรวจสอบ Session หลังติดตั้ง Event Handlers แล้ว
  restoreBackendSession().catch(error => {
    console.error('ตรวจสอบ Session ไม่สำเร็จ:', error);
  });
})();
