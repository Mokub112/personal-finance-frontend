/* budget.js · หน้าวางแผนงบประมาณ (แยกตามเดือน) */
'use strict';
Pages.budget = (function () {
  let root, editName = null, recName = null;
  const $ = s => root.querySelector(s);
  const g = id => document.getElementById(id);
  const list = () => State.budget[monthKey(State.monthOffset)] || [];

  
  async function getActualExpenses() {
    const transactions = await API.getTransactions();
    const key = monthKey(State.monthOffset);

    return transactions.filter(t =>
      t.type === 'expense' &&
      String(t.date).slice(0, 7) === key
    );
  }

  function actualUsed(name, transactions) {
    return transactions
      .filter(t => t.cat === name)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }


  function init() {
    root = document.getElementById('page-budget');
    Months.mount($('[data-month-nav]'));
    g('bud-cat').innerHTML = CATS.expense.map(([n, e]) => `<option value="${esc(n)}">${e} ${esc(n)}</option>`).join('');
    g('bud-save').addEventListener('click', save);
    g('rec-save').addEventListener('click', record);
    $('[data-grid]').addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const n = b.dataset.name;
      if (b.dataset.act === 'edit') openForm(n); else if (b.dataset.act === 'del') del(n); else if (b.dataset.act === 'rec') openRecord(n);
      else if (b.dataset.act === 'copy') copyPrev(); else if (b.dataset.act === 'new') openForm();
    });
  }

  function openForm(name) {
    editName = name || null;
    const x = name ? list().find(b => b.name === name) : null;
    g('bud-title').textContent = x ? 'แก้ไขงบประมาณ' : 'เพิ่มหมวดงบประมาณ';
    const sel = g('bud-cat'); sel.value = x ? x.name : sel.options[0].value; sel.disabled = !!x;
    g('bud-limit').value = x ? x.limit : ''; g('bud-used').value = x ? x.used : ''; g('bud-error').hidden = true;
    openModal('bud-modal');
  }
  function save() {
    const name = g('bud-cat').value;
    const limit = parseFloat(g('bud-limit').value);
    const err = g('bud-error');

    if (!(limit > 0)) {
      err.textContent = 'กรุณากรอกงบที่ตั้งไว้มากกว่า 0';
      err.hidden = false;
      return;
    }

    const key = monthKey(State.monthOffset);

    if (!State.budget[key]) {
      State.budget[key] = [];
    }

    const arr = State.budget[key];

    if (editName) {
      const i = arr.findIndex(b => b.name === editName);

      if (i >= 0) {
        arr[i] = {
          name: editName,
          limit,
          used: 0
        };
      }
    } else {
      if (arr.some(b => b.name === name)) {
        err.textContent =
          'หมวดนี้มีงบประมาณของเดือนนี้แล้ว — กดแก้ไขที่การ์ดหมวดนั้นแทน';
        err.hidden = false;
        return;
      }

      arr.push({
        name,
        limit,
        used: 0
      });
    }

    saveAll();
    closeModal('bud-modal');
    toast('บันทึกงบประมาณแล้ว');
    render();
  }
  function del(name) {
    const key = monthKey(State.monthOffset), arr = State.budget[key] || [], i = arr.findIndex(b => b.name === name); if (i < 0) return;
    const item = arr.splice(i, 1)[0]; saveAll(); render();
    toast('ลบงบประมาณแล้ว', { action: 'เลิกทำ', onAction() { (State.budget[key] = State.budget[key] || []).splice(i, 0, item); saveAll(); App.refresh(); } });
  }
  
  function openRecord(name) {
    recName = name;

    TxModal.open('expense');

    const cat = document.getElementById('tx-cat');
    if (cat && [...cat.options].some(o => o.value === name)) {
      cat.value = name;
    }

    const txName = document.getElementById('tx-name');
    if (txName) txName.value = name;
  }

  function record() {
    const a = parseFloat(g('rec-amount').value), b = list().find(x => x.name === recName);
    if (!b) return;
    if (!(a > 0)) { g('rec-error').textContent = 'กรุณากรอกจำนวนเงินมากกว่า 0'; g('rec-error').hidden = false; return; }
    b.used = Math.round((b.used + a) * 100) / 100; saveAll(); closeModal('rec-modal'); toast('บันทึกรายจ่ายแล้ว'); render();
  }
  function copyPrev() {
    const prev = State.budget[monthKey(State.monthOffset - 1)] || [];
    State.budget[monthKey(State.monthOffset)] = prev.map(b => ({ name: b.name, limit: b.limit, used: 0 }));
    saveAll(); toast('คัดลอกงบจากเดือนก่อนแล้ว'); render();
  }

  
async function render() {
  if (!root) return;

  const items = list();
  const grid = $('[data-grid]');
  const sum = $('[data-summary]');

  $('[data-sub]').textContent =
    'ตั้งงบรายจ่ายสำหรับ' + monthLabel(State.monthOffset);

  let transactions;

  try {
    transactions = await getActualExpenses();
  } catch (error) {
    sum.innerHTML = '';
    grid.innerHTML =
      '<div class="empty">โหลดข้อมูลรายจ่ายไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>';
    console.error('Load budget expenses failed:', error);
    return;
  }

  // คำนวณยอดใช้จ่ายจริงแยกตามหมวด
  const data = items.map(b => ({
    ...b,
    used: actualUsed(b.name, transactions)
  }));

  if (!data.length) {
    sum.innerHTML = '';

    const hasPrev =
      (State.budget[monthKey(State.monthOffset - 1)] || []).length > 0;

    grid.innerHTML = `
      <div class="empty">
        <div class="empty-ico">📋</div>
        <h3>ยังไม่มีแผนงบของเดือนนี้</h3>
        <p>กำหนดงบแต่ละหมวด แล้วบันทึกรายจ่ายเพื่อดูว่าใกล้เกินหรือยัง</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button type="button" class="btn btn-primary btn-sm" data-act="new">เพิ่มหมวดงบ</button>
          ${hasPrev ? '<button type="button" class="btn btn-ghost btn-sm" data-act="copy">คัดลอกจากเดือนก่อน</button>' : ''}
        </div>
      </div>`;
    return;
  }

  const tl = data.reduce((s, b) => s + Number(b.limit), 0);
  const tu = data.reduce((s, b) => s + b.used, 0);
  const pct = tl > 0 ? Math.round(tu / tl * 100) : 0;
  const left = tl - tu;

  const c = pct >= 100
    ? 'var(--negative)'
    : pct >= 80 ? '#D9A21B' : 'var(--sky-500)';

  sum.innerHTML = `
    <div class="card budget-sum">
      <div class="budget-sum-row">
        <div><span>งบรวม</span><b>${fmtMoney(tl)}</b></div>
        <div><span>ใช้ไปแล้ว</span><b>${fmtMoney(tu)}</b></div>
        <div>
          <span>${left >= 0 ? 'คงเหลือ' : 'เกินงบ'}</span>
          <b class="${left >= 0 ? 'pos' : 'neg'}">${fmtMoney(Math.abs(left))}</b>
        </div>
      </div>
      <div class="bar" role="progressbar"
        aria-valuemin="0" aria-valuemax="100"
        aria-valuenow="${Math.min(pct, 100)}">
        <i style="--w:${Math.min(pct, 100)}%;--bar-c:${c}"></i>
      </div>
      <p class="hint">ใช้ไปแล้ว ${pct}% ของงบรวมเดือนนี้</p>
    </div>`;

  grid.innerHTML = data.map(b => {
    const p = b.limit > 0
      ? Math.round(b.used / b.limit * 100) : 0;
    const st = p >= 100 ? 'over' : p >= 80 ? 'warn' : '';
    const chip = st === 'over'
      ? '<span class="chip chip-neg">⚠ เกินงบ</span>'
      : st === 'warn'
        ? '<span class="chip chip-warn">ใกล้เกินงบ</span>'
        : '<span class="chip chip-pos">อยู่ในงบ</span>';

    const rest = b.limit - b.used;
    const n = esc(b.name);

    return `
      <article class="card bcard ${st}">
        <div class="bcard-head">
          <span class="ico" aria-hidden="true">${CAT_EMOJI[b.name] || '📌'}</span>
          <div>
            <div class="bcard-name">${n}</div>
            <div class="bcard-limit">งบ ${fmtMoney(b.limit)}</div>
          </div>
          <div class="bcard-pct">${p}%</div>
        </div>
        <div class="bar" role="progressbar"
          aria-valuemin="0" aria-valuemax="100"
          aria-valuenow="${Math.min(p, 100)}">
          <i style="--w:${Math.min(p, 100)}%;--bar-c:${CAT_COLOR[b.name] || 'var(--sky-500)'}"></i>
        </div>
        <div class="bcard-row">
          <span>ใช้ไป <b>${fmtMoney(b.used)}</b></span>
          <span>${rest >= 0
            ? 'เหลือ <b>' + fmtMoney(rest) + '</b>'
            : 'เกิน <b class="neg">' + fmtMoney(-rest) + '</b>'}</span>
        </div>
        <div class="bcard-foot">
          ${chip}
          <div class="bcard-acts">
            <button type="button" class="icon-btn"
              data-act="edit" data-name="${n}"
              aria-label="แก้ไขงบ ${n}">${ICON.edit}</button>
            <button type="button" class="icon-btn danger"
              data-act="del" data-name="${n}"
              aria-label="ลบงบ ${n}">${ICON.trash}</button>
            <button type="button" class="btn btn-ghost btn-sm"
              data-act="rec" data-name="${n}">+ บันทึกรายจ่าย</button>
          </div>
        </div>
      </article>`;
  }).join('');
}

  return { init, render, openForm };
})();
