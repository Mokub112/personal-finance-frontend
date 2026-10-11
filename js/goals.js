/* goals.js · หน้าเป้าหมายการออม */
'use strict';
Pages.goals = (function () {
  const EMOJIS = ['🎯','💻','✈️','🏠','📱','🚗','🎓','🛟','🎁','🏖️','📷','🎮'];
  const KINDS = ['ระยะสั้น', 'ระยะกลาง', 'ระยะยาว', 'กองทุนฉุกเฉิน'];
  let root, editId = null, depId = null, emoji = EMOJIS[0];
  const $ = s => root.querySelector(s);
  const g = id => document.getElementById(id);

  function init() {
    root = document.getElementById('page-goals');

    g('goal-kind').innerHTML = KINDS
      .map(k => `<option>${k}</option>`)
      .join('');

    g('goal-emoji').addEventListener('click', e => {
      const b = e.target.closest('button[data-e]');
      if (b) {
        emoji = b.dataset.e;
        drawEmoji();
      }
    });

    g('goal-save').addEventListener('click', save);
    g('dep-save').addEventListener('click', deposit);

    $('[data-grid]').addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;

      const id = b.dataset.id;

      if (b.dataset.act === 'edit') openForm(id);
      else if (b.dataset.act === 'del') del(id);
      else if (b.dataset.act === 'dep') openDeposit(id);
    });

    // โหลดเป้าหมายจาก Backend
    loadGoals();
  }

  function drawEmoji() { g('goal-emoji').innerHTML = EMOJIS.map(e => `<button type="button" data-e="${e}" class="${e === emoji ? 'on' : ''}" aria-label="ไอคอน ${e}" aria-pressed="${e === emoji}">${e}</button>`).join(''); }

  function openForm(id) {
    editId = id || null;
    const x = id ? State.goals.find(v => v.id === id) : null;
    g('goal-title').textContent = x ? 'แก้ไขเป้าหมาย' : 'ตั้งเป้าหมายใหม่';
    emoji = x ? x.emoji : EMOJIS[0]; drawEmoji();
    g('goal-name').value = x ? x.name : ''; g('goal-target').value = x ? x.target : '';
    g('goal-current').value = x ? x.current : ''; g('goal-deadline').value = x ? x.deadline : '';
    g('goal-kind').value = x ? x.kind : KINDS[0]; g('goal-error').hidden = true;
    openModal('goal-modal');
  }
  async function save() {
    const name = g('goal-name').value.trim();
    const target = parseFloat(g('goal-target').value);
    const current = parseFloat(g('goal-current').value) || 0;
    const err = g('goal-error');

    if (!name) {
      err.textContent = 'กรุณาตั้งชื่อเป้าหมาย';
      err.hidden = false;
      return;
    }

    if (!(target > 0)) {
      err.textContent = 'กรุณากรอกจำนวนเงินเป้าหมายมากกว่า 0';
      err.hidden = false;
      return;
    }

    if (current < 0 || current > target) {
      err.textContent = 'ยอดออมต้องอยู่ระหว่าง 0 ถึงจำนวนเงินเป้าหมาย';
      err.hidden = false;
      return;
    }

    const data = {
      name,
      emoji,
      target,
      current,
      deadline: g('goal-deadline').value,
      kind: g('goal-kind').value
    };

    console.log('Saving goal data:', data);
    console.log('Target type:', typeof data.target);
    console.log('Current type:', typeof data.current);

    try {
      if (editId) {
        await API.updateGoal(editId, data);
      } else {
        await API.createGoal(data);
      }

      closeModal('goal-modal');
      await loadGoals();
      toast(editId ? 'แก้ไขเป้าหมายแล้ว' : 'เพิ่มเป้าหมายแล้ว');
    } catch (error) {
      console.error('บันทึกเป้าหมายไม่สำเร็จ:', error);
      err.textContent = error.message || 'บันทึกไม่สำเร็จ กรุณาตรวจสอบ Backend';
      err.hidden = false;
    }
  }
  async function del(id) {
    if (!State.goals.some(v => v.id === id)) return;

    try {
      await API.deleteGoal(id);
      await loadGoals();
      toast('ลบเป้าหมายแล้ว');
    } catch (error) {
      console.error('ลบเป้าหมายไม่สำเร็จ:', error);
      toast('ลบเป้าหมายไม่สำเร็จ');
    }
  }

  function openDeposit(id) {
    depId = id; const x = State.goals.find(v => v.id === id); if (!x) return;
    g('dep-note').textContent = `${x.emoji} ${x.name} · เหลืออีก ${fmtMoney(Math.max(x.target - x.current, 0))}`;
    g('dep-amount').value = ''; g('dep-error').hidden = true; openModal('dep-modal');
  }
  
  async function deposit() {
    const a = parseFloat(g('dep-amount').value);
    const x = State.goals.find(v => v.id === depId);

    if (!x) return;

    if (!(a > 0)) {
      g('dep-error').textContent = 'กรุณากรอกจำนวนเงินมากกว่า 0';
      g('dep-error').hidden = false;
      return;
    }

    const nextCurrent = Math.round((x.current + a) * 100) / 100;

    try {
      await API.updateGoal(depId, {
        current: nextCurrent
      });

      closeModal('dep-modal');
      await loadGoals();

      const savedGoal = State.goals.find(v => v.id === depId);

      toast(
        savedGoal && savedGoal.current >= savedGoal.target
          ? '🎉 ถึงเป้าหมายแล้ว!'
          : `ฝากออม ${fmtMoney(a)} แล้ว`
      );
    } catch (error) {
      g('dep-error').textContent =
        error.message || 'บันทึกยอดออมไม่สำเร็จ';
      g('dep-error').hidden = false;
    }
  }
  
  async function loadGoals() {
    try {
      const data = await API.getGoals();

      State.goals = data.map(goal => ({
        id: goal.id,
        name: goal.title,
        target: goal.targetAmount,
        current: goal.savedAmount,
        deadline: goal.deadline
          ? String(goal.deadline).slice(0, 10)
          : '',
        emoji: goal.emoji || '🎯',
        kind: goal.kind || 'ระยะสั้น'
      }));

      render();
    } catch (error) {
      console.error('โหลดเป้าหมายไม่สำเร็จ:', error);
      toast('โหลดเป้าหมายไม่สำเร็จ กรุณาตรวจสอบ Backend');
    }
  }

  function render() {
    const saved = State.goals.reduce((s, v) => s + v.current, 0), target = State.goals.reduce((s, v) => s + v.target, 0);
    $('[data-sum]').innerHTML = `
      <div class="sum-item"><span>ออมได้แล้ว</span><b class="pos">${fmtMoney(saved)}</b></div>
      <div class="sum-item"><span>เป้าหมายรวม</span><b>${fmtMoney(target)}</b></div>
      <div class="sum-item"><span>ความคืบหน้า</span><b>${target > 0 ? Math.min(Math.round(saved / target * 100), 100) : 0}%</b></div>`;
    const grid = $('[data-grid]');
    if (!State.goals.length) { grid.innerHTML = '<div class="card empty" style="grid-column:1/-1"><div class="empty-ico">🎯</div><h3>ยังไม่มีเป้าหมายการออม</h3><p>ตั้งเป้าหมายแรก เช่น โน้ตบุ๊กหรือทริปเที่ยว</p><button type="button" class="btn btn-primary btn-sm" onclick="Pages.goals.openForm()">ตั้งเป้าหมายใหม่</button></div>'; return; }
    grid.innerHTML = State.goals.map(v => {
      const pct = v.target > 0 ? Math.min(Math.round(v.current / v.target * 100), 100) : 0, done = v.current >= v.target, left = Math.max(v.target - v.current, 0);
      let when = 'ไม่กำหนดวันเสร็จ', hint = '';
      if (v.deadline) {
        const d = daysUntil(v.deadline); when = fmtDate(v.deadline);
        if (done) hint = 'สำเร็จแล้ว';
        else if (d < 0) hint = 'เลยกำหนดแล้ว';
        else if (d === 0) hint = 'ครบกำหนดวันนี้';
        else hint = `อีก ${d.toLocaleString('th-TH')} วัน · ออมเดือนละ ≈ ${fmtMoney(Math.ceil(left / Math.max(1, Math.ceil(d / 30))))}`;
      }
      return `
      <article class="card goal${done ? ' done' : ''}">
        <div class="goal-head"><span class="ico" aria-hidden="true">${esc(v.emoji)}</span>
          <div class="goal-title"><h3>${esc(v.name)}</h3><p>${esc(v.kind)}</p></div>
          <div class="goal-acts"><button type="button" class="icon-btn" data-act="edit" data-id="${v.id}" aria-label="แก้ไข ${esc(v.name)}">${ICON.edit}</button><button type="button" class="icon-btn danger" data-act="del" data-id="${v.id}" aria-label="ลบ ${esc(v.name)}">${ICON.trash}</button></div></div>
        <div class="goal-money"><b>${fmtMoney(v.current)}</b><span>จาก ${fmtMoney(v.target)}</span></div>
        <div><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="--w:${pct}%"></i></div>
          <div class="goal-meta" style="margin-top:8px"><span>${pct}% ของเป้าหมาย</span><span>${done ? '<span class="chip chip-pos">สำเร็จแล้ว</span>' : 'เหลืออีก ' + fmtMoney(left)}</span></div></div>
        <div class="goal-foot"><div class="goal-date"><small>${hint ? esc(hint) : 'กำหนดเสร็จ'}</small><b>${when}</b></div>
          ${done ? '' : `<button type="button" class="btn btn-primary btn-sm" data-act="dep" data-id="${v.id}">ฝากออม</button>`}</div>
      </article>`;
    }).join('');
  }
  
  return { init, render, openForm };
})();
