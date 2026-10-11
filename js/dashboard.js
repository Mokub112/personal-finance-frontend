/* dashboard.js · หน้าแดชบอร์ด */
'use strict';
Pages.dashboard = (function () {
  let range = 6, root;
  const $ = s => root.querySelector(s);
  const delta = p => p === null ? 'ยังไม่มีข้อมูลเดือนก่อนเทียบ' : (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p) + '% จากเดือนก่อน';

  function init() {
    root = document.getElementById('page-dashboard');
    Months.mount($('[data-month-nav]'));
    const seg = $('[data-range]');
    seg.addEventListener('click', e => {
      const b = e.target.closest('button[data-n]'); if (!b) return;
      range = Number(b.dataset.n);
      seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      renderBars();
    });
  }
  function render() {
    $('[data-greet]').textContent = 'สวัสดี, ' + (State.user.first || '');
    renderHero(); renderBars(); renderDonut(); renderRecent();
  }

  function renderHero() {
    const cur = calcKPI(State.monthOffset), prev = calcKPI(State.monthOffset - 1);
    let status = 'ยังไม่มีรายการเดือนนี้';
    if (cur.count) status = cur.net < 0 ? 'รายจ่ายเกินรายรับ' : cur.saveRate >= SAVE_TARGET ? 'การเงินมั่นคง' : cur.saveRate >= 5 ? 'ควรออมเพิ่ม' : 'รายจ่ายค่อนข้างสูง';
    const w = Math.max(0, Math.min(100, cur.saveRate / SAVE_TARGET * 100));
    $('[data-hero]').innerHTML = `
    <section class="hero" aria-label="สรุป${esc(monthLabel(State.monthOffset))}">
      <div class="hero-main">
        <div class="hero-top"><span class="hero-label">คงเหลือสุทธิ · ${esc(monthLabel(State.monthOffset))}</span><span class="pill-light">${status}</span></div>
        <div class="hero-value${cur.net < 0 ? ' neg' : ''}">${fmtMoney(cur.net)}</div>
        <div class="hero-delta">${delta(pctChange(cur.net, prev.net))}</div>
        <div class="hero-rate">
          <div class="hero-rate-row"><span>อัตราการออม ${cur.saveRate}%</span><span>เป้าหมาย ${SAVE_TARGET}%</span></div>
          <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(w)}"><i style="--w:${w}%"></i></div>
        </div>
      </div>
      <div class="hero-side">
        <div class="hero-stat"><div class="hero-stat-label"><span class="dot" style="background:var(--sky-400)"></span>รายรับ</div><div class="hero-stat-val">${fmtMoney(cur.income)}</div><div class="hero-stat-sub">${delta(pctChange(cur.income, prev.income))}</div></div>
        <div class="hero-stat"><div class="hero-stat-label"><span class="dot" style="background:#9AA7F5"></span>รายจ่าย</div><div class="hero-stat-val">${fmtMoney(cur.expense)}</div><div class="hero-stat-sub">${delta(pctChange(cur.expense, prev.expense))}</div></div>
      </div>
    </section>`;
  }

  function renderBars() {
    const data = Array.from({ length: range }, (_, i) => {
      const off = State.monthOffset - (range - 1) + i, k = calcKPI(off);
      return { label: monthShort(off), income: k.income, expense: k.expense, cur: off === State.monthOffset };
    });
    const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
    const avg = key => { const a = data.filter(d => d[key] > 0); return a.length ? Math.round(a.reduce((s, d) => s + d[key], 0) / a.length) : 0; };
    const h = v => v > 0 ? Math.max(v / max * 100, 2) : 0;
    $('[data-bars]').innerHTML = `
      <div class="chart-stats"><div>เฉลี่ยรายรับ/เดือน<b>${fmtMoney(avg('income'))}</b></div><div>เฉลี่ยรายจ่าย/เดือน<b>${fmtMoney(avg('expense'))}</b></div></div>
      <div class="bars">${data.map(d => `
        <div class="bar-col" role="group" aria-label="${d.label}: รายรับ ${fmtMoney(d.income)} รายจ่าย ${fmtMoney(d.expense)}">
          <div class="bar-pair">
            <div class="vbar inc" style="height:${h(d.income)}%" title="${d.label} รายรับ ${fmtMoney(d.income)}"></div>
            <div class="vbar exp" style="height:${h(d.expense)}%" title="${d.label} รายจ่าย ${fmtMoney(d.expense)}"></div>
          </div>
          <span class="bar-x${d.cur ? ' cur' : ''}">${d.label}</span>
        </div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--sky-500)"></i>รายรับ</span><span><i style="background:var(--indigo-700)"></i>รายจ่าย</span></div>`;
  }

  function renderDonut() {
    const exp = (State.tx[monthKey(State.monthOffset)] || []).filter(t => t.type === 'expense');
    const total = exp.reduce((s, t) => s + t.amount, 0), by = {};
    exp.forEach(t => { by[t.cat] = (by[t.cat] || 0) + t.amount; });
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
    if (!rows.length) { $('[data-donut]').innerHTML = '<div class="empty"><div class="empty-ico">🧾</div><h3>ยังไม่มีรายจ่าย</h3><p>เพิ่มรายการเพื่อดูสัดส่วนตามหมวด</p></div>'; return; }
    const R = 70, C = 2 * Math.PI * R; let acc = 0;
    const colorOf = (cat, i) => CAT_COLOR[cat] || CHART_COLORS[i % CHART_COLORS.length];
    const arcs = rows.map(([cat, amt], i) => {
      const frac = amt / total, len = Math.max(frac * C - (rows.length > 1 ? 2 : 0), .5);
      const el = `<circle cx="84" cy="84" r="${R}" fill="none" stroke="${colorOf(cat, i)}" stroke-width="22" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}"/>`;
      acc += frac * C; return el;
    }).join('');
    $('[data-donut]').innerHTML = `
      <div class="donut"><svg viewBox="0 0 168 168" role="img" aria-label="สัดส่วนรายจ่ายตามหมวด">${arcs}</svg><div class="donut-center"><b>${fmtMoney(total)}</b><span>รายจ่ายรวม</span></div></div>
      <div class="dl">${rows.map(([cat, amt], i) => `<div class="dl-row"><i style="background:${colorOf(cat, i)}"></i><span>${CAT_EMOJI[cat] || ''} ${esc(cat)}</span><span class="num"><b>${fmtMoney(amt)}</b><em class="pct">${Math.round(amt / total * 100)}%</em></span></div>`).join('')}</div>`;
  }

  
  function renderRecent() {
    const list = txFor(State.monthOffset).slice(0, 5), box = $('[data-recent]');

    console.log('Recent transactions:', list);
    console.log('First transaction:', list[0]);

    if (!list.length) { box.innerHTML = '<div class="empty"><div class="empty-ico">📝</div><h3>ยังไม่มีรายการในเดือนนี้</h3><p>เริ่มบันทึกรายรับ–รายจ่ายแรกของคุณ</p><button type="button" class="btn btn-primary btn-sm" onclick="TxModal.open()">เพิ่มรายการ</button></div>'; return; }
    box.innerHTML = list.map(t => `
      <div class="rec-row">
        <span class="ico" aria-hidden="true">${CAT_EMOJI[t.cat] || '📌'}</span>
        <div class="rec-main"><div class="rec-name">${esc(t.name)}</div><div class="rec-sub">${esc(t.cat)} · ${fmtDate(t.date)}</div></div>
        <div class="rec-amt ${t.type === 'income' ? 'in' : ''}">${t.type === 'income' ? '+' : '−'}฿${fmt(t.amount)}</div>
      </div>`).join('');
  }
  return { init, render };
})();
