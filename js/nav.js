/* ═══════════════════════════════════════════════════════════
   DPP — nav.js · แถบเมนูด้านบน (ใช้ร่วมทุกหน้า)
   แก้ชื่อเมนู/เพิ่มหน้าใหม่ได้ที่ Nav.items
   ═══════════════════════════════════════════════════════════ */
'use strict';

const Nav = (function () {
  const items = [
    { id: 'dashboard',    label: 'แดชบอร์ด',        icon: 'dash' },
    { id: 'transactions', label: 'รายรับ–รายจ่าย',  icon: 'tx' },
    { id: 'goals',        label: 'เป้าหมายการออม',   icon: 'goal' },
    { id: 'budget',       label: 'วางแผนงบประมาณ',   icon: 'budget' }
  ];
  let bound = false;

  function menuEl() { return document.getElementById('user-menu-pop'); }
  function btnEl()  { return document.getElementById('user-btn'); }
  function closeMenu() { const m = menuEl(), b = btnEl(); if (m) m.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }

  function render(active) {
    const host = document.getElementById('app-header'); if (!host) return;
    const u = State.user || {};
    host.innerHTML = `
    <header class="topbar"><div class="topbar-inner">
      <a class="brand" href="dashboard.html" data-route="dashboard" aria-label="Dashboard Personal Planning">
        <span class="brand-mark">${ICON.logo}</span>
        <span class="brand-text">Dashboard<small>Personal Planning</small></span>
      </a>
      <nav class="nav" aria-label="เมนูหลัก">
        ${items.map(i => `<a href="${i.id}.html" data-route="${i.id}">${ICON[i.icon]}${i.label}</a>`).join('')}
      </nav>
      <div class="user-menu">
        <button type="button" class="user-btn" id="user-btn" aria-haspopup="menu" aria-expanded="false" aria-label="เมนูผู้ใช้">
          <span class="avatar">${esc(initialOf(u))}</span><span class="user-name">${esc(u.first || '')}</span>${ICON.chev}
        </button>
        <div class="menu" id="user-menu-pop" role="menu" hidden>
          <div class="menu-head"><b>${esc(fullName(u))}</b><span>${esc(u.email || '')}</span></div>
          <a role="menuitem" href="profile.html" data-route="profile">${ICON.user}บัญชีส่วนตัว</a>
          <button type="button" role="menuitem" class="danger" data-logout>${ICON.logout}ออกจากระบบ</button>
        </div>
      </div>
    </div></header>`;
    if (!bound) {
      host.addEventListener('click', e => {
        const r = e.target.closest('[data-route]');
        if (r && App.router) { e.preventDefault(); closeMenu(); App.router(r.dataset.route); return; }
        if (e.target.closest('[data-logout]')) { closeMenu(); logout(); return; }
        if (e.target.closest('#user-btn')) { const m = menuEl(), open = m.hidden; m.hidden = !open; btnEl().setAttribute('aria-expanded', String(open)); }
      });
      document.addEventListener('click', e => { if (!e.target.closest('.user-menu')) closeMenu(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
      bound = true;
    }
    setActive(active);
  }

  function setActive(id) {
    document.querySelectorAll('.nav a').forEach(a => {
      if (a.dataset.route === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const b = btnEl(); if (b) b.classList.toggle('active', id === 'profile');
    const cur = document.querySelector('.nav a[aria-current="page"]');
    if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} }
  }
  return { items, render, setActive };
})();
