/* ═══════════════════════════════════════════════════════
   tx-form.js — ฟอร์ม "เพิ่มรายการ" ที่ใช้ร่วมกัน (แดชบอร์ด + รายรับ–รายจ่าย)
   ═══════════════════════════════════════════════════════ */
'use strict';

const TxForm = (() => {
  let type = 'expense';

  const TEMPLATE = `
  <div class="modal-overlay" id="tx-modal" aria-hidden="true">
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="tx-title" data-submit="tx-save" novalidate>
      <h2 class="modal-title" id="tx-title">เพิ่มรายการ</h2>
      <div class="form-error" id="tx-error" role="alert"></div>
      <div class="field">
        <span class="label">ประเภท</span>
        <div class="segmented block" role="group" aria-label="ประเภทรายการ">
          <button type="button" class="seg-btn is-income" data-action="tx-type" data-type="income">รายรับ</button>
          <button type="button" class="seg-btn is-expense" data-action="tx-type" data-type="expense">รายจ่าย</button>
        </div>
      </div>
      <div class="field"><label class="label" for="tx-name">ชื่อรายการ</label>
        <input class="input" id="tx-name" type="text" maxlength="60" placeholder="เช่น ข้าวกลางวัน, ค่าขนม" autocomplete="off"></div>
      <div class="field-row">
        <div class="field"><label class="label" for="tx-amount">จำนวนเงิน (บาท)</label>
          <input class="input" id="tx-amount" type="number" inputmode="decimal" min="0" step="any" placeholder="0"></div>
        <div class="field"><label class="label" for="tx-date">วันที่</label>
          <input class="input" id="tx-date" type="date"></div>
      </div>
      <div class="field"><label class="label" for="tx-cat">หมวดหมู่</label><select class="select" id="tx-cat"></select></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" data-action="close-modal" data-target="tx-modal">ยกเลิก</button>
        <button type="submit" class="btn btn-primary">บันทึก</button>
      </div>
    </form>
  </div>`;

  function mount() { if (!document.getElementById('tx-modal')) document.body.insertAdjacentHTML('beforeend', TEMPLATE); }

  function setType(t) {
    type = t;
    document.querySelectorAll('#tx-modal .seg-btn').forEach(b => {
      const on = b.dataset.type === t;
      b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
    });
    $('#tx-cat').innerHTML = catsByType(t).map(c => `<option value="${esc(c)}">${catMeta(c).emoji} ${esc(c)}</option>`).join('');
  }

  function open() {
    mount();
    showError('tx-error', '');
    $('#tx-name').value = ''; $('#tx-amount').value = '';
    $('#tx-date').value = State.monthOffset === 0 ? todayStr() : getMonthKey(State.monthOffset) + '-01';
    setType(type);
    openModal('tx-modal');
  }

  
async function save() {
  const name = $('#tx-name').value.trim();
  const amount = parseFloat($('#tx-amount').value);
  const date = $('#tx-date').value;
  const cat = $('#tx-cat').value;

  if (!name) {
    return showError('tx-error', 'กรุณาใส่ชื่อรายการ');
  }

  if (!(amount > 0) || !Number.isFinite(amount)) {
    return showError('tx-error', 'กรุณาใส่จำนวนเงินที่มากกว่า 0');
  }

  if (!date) {
    return showError('tx-error', 'กรุณาเลือกวันที่');
  }

  try {
    await API.createTransaction({
      name,
      amount,
      date,
      cat,
      type
    });

    closeModal('tx-modal');
    toast('บันทึกรายการลงฐานข้อมูลแล้ว');

    // โหลดรายการใหม่จาก MongoDB
    if (Pages.transactions?.reload) {
      await Pages.transactions.reload();
    }

    // อัปเดตส่วนอื่นของเว็บตามระบบเดิม
    DPP.refresh();

  } catch (error) {
    console.error('Save transaction failed:', error);
    showError(
      'tx-error',
      'บันทึกไม่สำเร็จ กรุณาตรวจสอบ Backend แล้วลองอีกครั้ง'
    );
  }
}

  DPP.actions['tx-open'] = open;
  DPP.actions['tx-type'] = el => setType(el.dataset.type);
  DPP.actions['tx-save'] = save;
  return { mount, open };
})();
