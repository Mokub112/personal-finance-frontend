/* ═══════════════════════════════════════════════════════════
   DPP — app.js
   state · localStorage · auth · helper ที่ใช้ร่วมกันทุกหน้า
   (ข้อมูลแยกตามผู้ใช้: dpp2_data_<email>)
   ═══════════════════════════════════════════════════════════ */
'use strict';

const LS = { SESSION: 'dpp2_session', ACCOUNTS: 'dpp2_accounts', REMEMBER: 'dpp2_remember', DATA: 'dpp2_data_', MONTH: 'dpp2_month' };
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ── ไอคอน (SVG) ─────────────────────────────────────────── */
const svg = (p, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON = {
  dash:   svg('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  tx:     svg('<path d="M7 4v16M7 4 3.5 7.5M7 4l3.5 3.5M17 20V4M17 20l-3.5-3.5M17 20l3.5-3.5"/>'),
  goal:   svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>'),
  budget: svg('<path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M15 3.6A9 9 0 0 1 20.4 9H15z"/>'),
  user:   svg('<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>'),
  edit:   svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', 16),
  trash:  svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 16),
  plus:   svg('<path d="M12 5v14M5 12h14"/>', 20),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 18),
  logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  eye:    svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  chev:   svg('<path d="M6 9l6 6 6-6"/>', 16),
  close:  svg('<path d="M6 6l12 12M18 6L6 18"/>', 18),
  chart:  svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', 20),
  wallet: svg('<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1" fill="currentColor"/>', 20),
  logo:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="12" width="4.5" height="9" rx="1.2" fill="#fff"/><rect x="9.75" y="7" width="4.5" height="14" rx="1.2" fill="#fff"/><rect x="16.5" y="3" width="4.5" height="18" rx="1.2" fill="#fff"/></svg>'
};
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    if (!el.dataset.done && ICON[el.dataset.icon]) { el.insertAdjacentHTML('afterbegin', ICON[el.dataset.icon]); el.dataset.done = '1'; }
  });
}

/* ── State ───────────────────────────────────────────────── */
const SAVE_TARGET = 20; // เป้าหมายอัตราการออม (%)
const DEMO = { email: 'demo@dpp.com', password: 'demo1234', first: 'สมชาย', last: 'วงษ์ดี', role: 'นักศึกษา' };
const State = { user: null, accounts: [], tx: {}, goals: [], budget: {}, nextId: 100, nextGoalId: 10, monthOffset: 0 };
try { State.monthOffset = Number(sessionStorage.getItem(LS.MONTH)) || 0; } catch (e) {}

/* ── Helpers: วันที่ / ตัวเลข / ข้อความ ───────────────────── */
const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_SHORT  = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const today = new Date();
const pad = n => String(n).padStart(2, '0');
const monthDate  = (off = 0) => new Date(today.getFullYear(), today.getMonth() + off, 1);
const monthKey   = (off = 0) => { const d = monthDate(off); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const monthLabel = (off = 0) => { const d = monthDate(off); return TH_MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543); };
const monthShort = (off = 0) => TH_SHORT[monthDate(off).getMonth()];
const todayStr   = () => today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
const defaultDateFor = off => off === 0 ? todayStr() : monthKey(off) + '-01';
function fmtDate(s) { if (!s) return '—'; const [y, m, d] = s.split('-').map(Number); return d + ' ' + TH_SHORT[m - 1] + ' ' + (y + 543); }
function daysUntil(s) { const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()); const [y, m, d] = s.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - t) / 86400000); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmt(n) { n = Number(n) || 0; return Number.isInteger(n) ? n.toLocaleString('th-TH') : n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtMoney(n) { return (n < 0 ? '−' : '') + '฿' + fmt(Math.abs(n)); }
function pctChange(curr, prev) { return prev ? Math.round((curr - prev) / Math.abs(prev) * 100) : null; }
const fullName = u => ((u.first || '') + ' ' + (u.last || '')).trim();
const initialOf = u => { const m = (u.first || '').match(/[ก-ฮA-Za-z0-9]/); return m ? m[0].toUpperCase() : '?'; };

/* ── หมวดหมู่ ────────────────────────────────────────────── */
const CATS = {
  income:  [['เงินเดือน','💼'],['รายได้เสริม','💻'],['ค่าขนม','👛'],['ทุนการศึกษา','🎓'],['รายรับอื่นๆ','📥']],
  expense: [['อาหาร','🍜'],['ที่พัก','🏠'],['การเดินทาง','🚌'],['การศึกษา','📚'],['ช้อปปิ้ง','🛍️'],['สุขภาพ','💊'],['ความบันเทิง','🎬'],['รายจ่ายอื่นๆ','📌']]
};
const CHART_COLORS = ['#243591', '#1E9CF0', '#5B6EE1', '#8CCEFF', '#0F7B55', '#D9A21B', '#C23636', '#667094'];
const CAT_EMOJI = {}, CAT_COLOR = {};
CATS.income.concat(CATS.expense).forEach(([n, e]) => { CAT_EMOJI[n] = e; });
CATS.expense.forEach(([n], i) => { CAT_COLOR[n] = CHART_COLORS[i % CHART_COLORS.length]; });
const GOAL_COLORS = ['#243591', '#1E9CF0', '#0F7B55', '#5B6EE1', '#D9A21B'];

/* ── ข้อมูลตัวอย่างสำหรับบัญชี demo ───────────────────────── */
function seedDemo() {
  State.tx = {}; State.budget = {}; State.nextId = 100;
  const part = [7500, 6000, 8000, 4500, 7000, 5500], food = [3600, 3900, 3500, 3300, 3800, 3400],
        trav = [1200, 1300, 1100, 1400, 1250, 1200], edu = [1500, 0, 2200, 400, 1200, 800],
        shop = [1600, 2300, 900, 2600, 1400, 1800], fun = [900, 1500, 700, 1300, 1100, 1700];
  for (let i = 0; i < 6; i++) {
    const off = -i, d = monthDate(off), y = d.getFullYear(), m = pad(d.getMonth() + 1), maxDay = off === 0 ? today.getDate() : 28, list = [];
    const add = (name, cat, day, amount, type) => { if (amount > 0) list.push({ id: State.nextId++, name, cat, date: y + '-' + m + '-' + pad(Math.min(day, maxDay)), amount, type }); };
    add('ค่าขนมรายเดือน', 'ค่าขนม', 1, 9000, 'income');
    add('งานพิเศษ (ฟรีแลนซ์)', 'รายได้เสริม', 14, part[i], 'income');
    add('ค่าหอพัก', 'ที่พัก', 2, 3500, 'expense');
    add('ค่าน้ำ-ค่าไฟ', 'ที่พัก', 5, 650 + i * 20, 'expense');
    add('ค่าอาหาร', 'อาหาร', 9, food[i], 'expense');
    add('ค่าเดินทาง', 'การเดินทาง', 10, trav[i], 'expense');
    add('หนังสือ / ค่าเอกสาร', 'การศึกษา', 11, edu[i], 'expense');
    add('ช้อปปิ้ง', 'ช้อปปิ้ง', 17, shop[i], 'expense');
    add('ดูหนัง / สังสรรค์', 'ความบันเทิง', 20, fun[i], 'expense');
    State.tx[monthKey(off)] = list;
  }
  const inMonths = n => { const d = new Date(today.getFullYear(), today.getMonth() + n, today.getDate()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  State.goals = [
    { id: 1, emoji: '💻', name: 'โน้ตบุ๊กเครื่องใหม่', kind: 'ระยะสั้น', current: 14500, target: 28000, deadline: inMonths(6) },
    { id: 2, emoji: '✈️', name: 'ทริปหลังเรียนจบ', kind: 'ระยะกลาง', current: 18000, target: 45000, deadline: inMonths(14) },
    { id: 3, emoji: '🛟', name: 'กองทุนฉุกเฉิน', kind: 'กองทุนฉุกเฉิน', current: 12000, target: 30000, deadline: '' }
  ];
  State.nextGoalId = 10;
  State.budget[monthKey(0)] = [
    { name: 'อาหาร', limit: 4500, used: 3600 }, { name: 'การเดินทาง', limit: 1500, used: 1200 },
    { name: 'ช้อปปิ้ง', limit: 1500, used: 1600 }, { name: 'ความบันเทิง', limit: 1200, used: 900 }, { name: 'การศึกษา', limit: 2000, used: 1500 }
  ];
}

/* ── Persistence ─────────────────────────────────────────── */
function saveAll() {
  store.set(LS.ACCOUNTS, State.accounts);
  if (State.user) store.set(LS.DATA + State.user.email, { tx: State.tx, goals: State.goals, budget: State.budget, nextId: State.nextId, nextGoalId: State.nextGoalId });
}
function loadUserData() {
  const d = State.user && store.get(LS.DATA + State.user.email);
  if (d) { State.tx = d.tx || {}; State.goals = d.goals || []; State.budget = d.budget || {}; State.nextId = d.nextId || 100; State.nextGoalId = d.nextGoalId || 10; }
  else if (State.user && State.user.email === DEMO.email) { seedDemo(); saveAll(); }
  else { State.tx = {}; State.goals = []; State.budget = {}; State.nextId = 100; State.nextGoalId = 10; }
}


/* ── Auth: ใช้ Backend Token ────────────────────────────── */

function loadAccounts() {
  // ไม่โหลดบัญชี Demo หรือรหัสผ่านจาก localStorage อีก
  State.accounts = [];
}

function restoreSession() {
  const token = localStorage.getItem('token');
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem('dpp2_user') || 'null');
  } catch (error) {
    user = null;
  }

  if (!token || !user || !user.email) {
    State.user = null;
    return false;
  }

  State.user = user;
  return true;
}

function loginUser() {
  // ปิดการใช้ระบบ Login แบบเก่า
  return false;
}

function registerUser() {
  // ปิดการใช้ระบบ Register แบบเก่า
  return false;
}

function logout() {
  State.user = null;

  if (typeof API !== 'undefined') {
    API.logout();
  }

  localStorage.removeItem('dpp2_user');
  store.del(LS.SESSION);

  location.replace('../index.html');
}

async function loadTransactionsFromAPI() {
  try {
    const transactions = await API.getTransactions();
    const txByMonth = {};

    transactions.forEach(t => {
      const date = String(t.date).slice(0, 10);
      const key = date.slice(0, 7);

      if (!txByMonth[key]) txByMonth[key] = [];

    txByMonth[key].push({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      cat: t.cat || t.category || 'ไม่ระบุหมวดหมู่',
      name: t.name || t.description || t.category || 'ไม่ระบุชื่อรายการ',
      date
    });
    });
    State.tx = txByMonth;
    console.log('ข้อมูลจาก Backend:', transactions);
    console.log('ข้อมูลใน State.tx:', State.tx);
    return true;
  } catch (error) {
    console.error('Load transactions failed:', error);
    toast('โหลดรายการจาก Backend ไม่สำเร็จ');
    return false;
  }
}

/* ── Tx / KPI ────────────────────────────────────────────── */
function txFor(off = 0) { return (State.tx[monthKey(off)] || []).slice().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id); }

function calcKPI(off = 0) {
  const list = State.tx[monthKey(off)] || []; let income = 0, expense = 0;
  list.forEach(t => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
  income = Math.round(income * 100) / 100; expense = Math.round(expense * 100) / 100;
  const net = Math.round((income - expense) * 100) / 100;
  return { income, expense, net, saveRate: income > 0 ? Math.round(net / income * 1000) / 10 : 0, count: list.length };
}

/* ── Modal / Toast ───────────────────────────────────────── */
function modalRoot() { let r = document.getElementById('modal-root'); if (!r) { r = document.createElement('div'); r.id = 'modal-root'; document.body.appendChild(r); } return r; }
function openModal(id) {
  const m = document.getElementById(id); if (!m) return;
  m.classList.add('open'); document.body.classList.add('modal-open');
  if (!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) { const f = m.querySelector('input:not([type=hidden]):not([disabled]), select:not([disabled])'); if (f) setTimeout(() => f.focus(), 60); }
}
function closeModal(id) {
  const m = document.getElementById(id); if (m) m.classList.remove('open');
  if (!document.querySelector('.modal-overlay.open')) document.body.classList.remove('modal-open');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id)); });
document.addEventListener('mousedown', e => { if (e.target.classList && e.target.classList.contains('modal-overlay')) closeModal(e.target.id); });
document.addEventListener('click', e => { const c = e.target.closest('[data-close]'); if (c) { const m = c.closest('.modal-overlay'); if (m) closeModal(m.id); } });

function toast(msg, opt = {}) {
  let root = document.getElementById('toast-root');
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; root.setAttribute('role', 'status'); root.setAttribute('aria-live', 'polite'); document.body.appendChild(root); }
  const el = document.createElement('div'); el.className = 'toast';
  const t = document.createElement('span'); t.textContent = msg; el.appendChild(t);
  if (opt.action) { const b = document.createElement('button'); b.type = 'button'; b.textContent = opt.action; b.onclick = () => { if (opt.onAction) opt.onAction(); el.remove(); }; el.appendChild(b); }
  root.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, opt.ms || 4500);
}

/* ── ตัวเลือกเดือน (ใช้ร่วมทุกหน้า) ───────────────────────── */
const Months = {
  draws: [],
  set(off) {
    State.monthOffset = off;
    try { sessionStorage.setItem(LS.MONTH, off); } catch (e) {}
    Months.draws.forEach(f => f()); App.refresh();
  },
  mount(el) {
    if (!el) return;
    el.classList.add('month-nav');
    const draw = () => { el.innerHTML = `<button type="button" class="mn-btn" data-d="-1" aria-label="เดือนก่อนหน้า">‹</button><span class="mn-label" aria-live="polite">${monthLabel(State.monthOffset)}</span><button type="button" class="mn-btn" data-d="1" aria-label="เดือนถัดไป">›</button>`; };
    draw(); Months.draws.push(draw);
    el.addEventListener('click', e => { const b = e.target.closest('.mn-btn'); if (b) Months.set(State.monthOffset + Number(b.dataset.d)); });
  }
};

/* ── ฟอร์มเพิ่มรายการ (ใช้ร่วมหน้าแดชบอร์ด/รายรับ–รายจ่าย) ──── */
const TxModal = (function () {
  let type = 'expense', mounted = false;
  const $ = id => document.getElementById(id);
  const HTML = `
  <div class="modal-overlay" id="tx-modal" role="dialog" aria-modal="true" aria-labelledby="tx-title"><div class="modal">
    <div class="modal-head"><h2 id="tx-title">เพิ่มรายการ</h2><button type="button" class="icon-btn" data-close aria-label="ปิด">${ICON.close}</button></div>
    <div class="seg seg-full field" id="tx-type" style="margin-bottom:16px"><button type="button" data-t="expense" class="on">รายจ่าย</button><button type="button" data-t="income">รายรับ</button></div>
    <div class="field"><label for="tx-amount">จำนวนเงิน (บาท)</label><input id="tx-amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00"></div>
    <div class="field"><label for="tx-name">ชื่อรายการ</label><input id="tx-name" type="text" maxlength="60" placeholder="เช่น ค่าข้าวกลางวัน"></div>
    <div class="field-row">
      <div class="field"><label for="tx-cat">หมวดหมู่</label><select id="tx-cat"></select></div>
      <div class="field"><label for="tx-date">วันที่</label><input id="tx-date" type="date"></div>
    </div>
    <div class="form-error" id="tx-error" role="alert" hidden></div>
    <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>ยกเลิก</button><button type="button" class="btn btn-primary" id="tx-save">บันทึก</button></div>
  </div></div>`;
  function setType(t) {
    type = t;
    $('tx-type').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    $('tx-cat').innerHTML = CATS[t].map(([n, e]) => `<option value="${esc(n)}">${e} ${esc(n)}</option>`).join('');
  }
  function mount() {
    if (mounted || document.getElementById('tx-modal')) { mounted = true; return; }
    modalRoot().insertAdjacentHTML('beforeend', HTML);
    $('tx-type').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (b) setType(b.dataset.t); });
    $('tx-save').addEventListener('click', save);
    $('tx-modal').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') save(); });
    mounted = true;
  }
  function open(t) {
    mount(); setType(t || 'expense');
    $('tx-amount').value = ''; $('tx-name').value = ''; $('tx-date').value = defaultDateFor(State.monthOffset); $('tx-error').hidden = true;
    openModal('tx-modal');
  }
  
  async function save() {
    const amount = parseFloat($('tx-amount').value);
    const cat = $('tx-cat').value;
    const date = $('tx-date').value;
    const err = $('tx-error');
    let name = $('tx-name').value.trim();

    if (!(amount > 0)) {
      err.textContent = 'กรุณากรอกจำนวนเงินมากกว่า 0';
      err.hidden = false;
      $('tx-amount').focus();
      return;
    }

    if (!date) {
      err.textContent = 'กรุณาเลือกวันที่';
      err.hidden = false;
      return;
    }

    if (!name) name = cat;

    err.hidden = true;

    // ป้องกันกดบันทึกซ้ำระหว่างรอ Backend
    const saveButton = $('tx-save');
    if (saveButton.disabled) return;
    saveButton.disabled = true;

    try {
      // ส่งรายการไป Backend เพื่อบันทึกใน MongoDB
      const saved = await API.createTransaction({
        type: type,
        amount: amount,
        category: cat,
        description: name,
        date: date
      });

      closeModal('tx-modal');

      toast(
        type === 'income'
          ? 'บันทึกรายรับแล้ว'
          : 'บันทึกรายจ่ายแล้ว'
      );

      // ถ้าบันทึกจากหน้ารายการ ให้โหลดข้อมูลจาก Backend ใหม่
      if (Pages.transactions && Pages.transactions.reload) {
        await Pages.transactions.reload();
      }

      // อัปเดตหน้าปัจจุบัน
      App.refresh();

      // เปลี่ยนไปยังเดือนของรายการที่บันทึก
      const [y, m] = date.split('-').map(Number);
      const off =
        (y - today.getFullYear()) * 12 +
        (m - 1 - today.getMonth());

      if (off !== State.monthOffset) {
        Months.set(off);
      }

    } catch (error) {
      err.textContent =
        'บันทึกไม่สำเร็จ: ' +
        (error.message || 'ไม่สามารถเชื่อมต่อ Backend ได้');
      err.hidden = false;

      console.error('Create transaction failed:', error);

    } finally {
      saveButton.disabled = false;
    }
  }

  return { open, mount };
})();

/* ── App controller ──────────────────────────────────────── */
const Pages = {};
const App = {
  page: null, current: null, router: null, onLogout: null, enter: null,
  refresh() { if (App.current && App.current.render) App.current.render(); },
  show(page) {
    App.page = page; App.current = Pages[page]; Nav.setActive(page);
    if (App.current.init && !App.current._ready) App.current.init();
    App.current._ready = true; App.current.render();
  },
  async start(page) {
  hydrateIcons();
  Nav.render(page);
  TxModal.mount();

  if (typeof API !== 'undefined' && API.getTransactions) {
    console.log('เริ่มโหลดข้อมูลจาก Backend');
    await loadTransactionsFromAPI();
    console.log('โหลดข้อมูลเสร็จแล้ว');
  }

  App.show(page);
},
  
async boot(page) {
  if (!restoreSession()) {
    location.replace('../index.html');
    return;
  }

  try {
    // ตรวจสอบ Token กับ Backend ก่อนเปิดหน้า
    await API.getDashboard();

    // โหลดข้อมูลรายการจาก Backend
    await App.start(page);
  } catch (error) {
    console.error('ตรวจสอบ Session ไม่สำเร็จ:', error);

    API.logout();
    localStorage.removeItem('dpp2_user');

    location.replace('../index.html');
  }
}

};
document.addEventListener('DOMContentLoaded', () => { const p = document.body && document.body.dataset.page; if (p) App.boot(p); });
