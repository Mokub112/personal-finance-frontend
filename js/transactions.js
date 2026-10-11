
'use strict';

Pages.transactions = (function () {
  let root, q = '', type = 'all';
  let transactions = [];
  let loading = false;
  let loadError = '';

  const $ = s => root.querySelector(s);

  function init() {
    root = document.getElementById('page-transactions');

    Months.mount($('[data-month-nav]'));

    $('[data-search]').addEventListener('input', e => {
      q = e.target.value.trim().toLowerCase();
      renderRows();
    });

    const seg = $('[data-type]');

    seg.addEventListener('click', e => {
      const b = e.target.closest('button[data-t]');
      if (!b) return;

      type = b.dataset.t;
      seg.querySelectorAll('button').forEach(
        x => x.classList.toggle('on', x === b)
      );

      renderRows();
    });

    $('[data-rows]').addEventListener('click', e => {
      const d = e.target.closest('[data-del]');
      if (d) del(d.dataset.del);
    });

    loadTransactions();
  }

  async function loadTransactions() {
    loading = true;
    loadError = '';
    renderRows();

    try {
      transactions = await API.getTransactions();
    } catch (error) {
      loadError = error.message || 'ไม่สามารถโหลดข้อมูลได้';
    } finally {
      loading = false;
      render();
    }
  }

  function getMonthTransactions() {
    const key = monthKey(State.monthOffset);

    return transactions.filter(t =>
      String(t.date).slice(0, 7) === key
    );
  }

  function render() {
    if (!root) return;

    const all = getMonthTransactions();

    const income = all
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = all
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const net = income - expense;

    $('[data-sum]').innerHTML = `
      <div class="sum-item">
        <span>รายรับ</span>
        <b class="pos">${fmtMoney(income)}</b>
      </div>
      <div class="sum-item">
        <span>รายจ่าย</span>
        <b>${fmtMoney(expense)}</b>
      </div>
      <div class="sum-item">
        <span>คงเหลือ</span>
        <b class="${net < 0 ? 'neg' : ''}">${fmtMoney(net)}</b>
      </div>
    `;

    renderRows();
  }

  function renderRows() {
    const box = $('[data-rows]');
    if (!box) return;

    if (loading) {
      box.innerHTML = '<div class="empty">กำลังโหลดรายการ...</div>';
      return;
    }

    if (loadError) {
      box.innerHTML = `
        <div class="empty">
          <h3>โหลดข้อมูลไม่สำเร็จ</h3>
          <p>${esc(loadError)}</p>
          <button type="button" class="btn btn-primary btn-sm"
            data-retry>ลองอีกครั้ง</button>
        </div>
      `;

      box.querySelector('[data-retry]')
        ?.addEventListener('click', loadTransactions);

      return;
    }

    const all = getMonthTransactions();

    const list = all.filter(t =>
      (type === 'all' || t.type === type) &&
      (!q || (t.name + ' ' + t.cat).toLowerCase().includes(q))
    );

    if (!all.length) {
      box.innerHTML = `
        <div class="empty">
          <div class="empty-ico">📝</div>
          <h3>ยังไม่มีรายการในเดือนนี้</h3>
          <p>บันทึกรายรับ–รายจ่ายเพื่อเริ่มติดตามการเงิน</p>
          <button type="button" class="btn btn-primary btn-sm"
            onclick="TxModal.open()">เพิ่มรายการ</button>
        </div>
      `;
      return;
    }

    if (!list.length) {
      box.innerHTML = `
        <div class="empty">
          <div class="empty-ico">🔍</div>
          <h3>ไม่พบรายการที่ตรงกัน</h3>
          <p>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
        </div>
      `;
      return;
    }

    box.innerHTML = list.map(t => `
      <div class="tx-row">
        <div class="tx-main">
          <span class="ico" aria-hidden="true">
            ${CAT_EMOJI[t.cat] || '📌'}
          </span>
          <div class="tx-text">
            <div class="tx-name">${esc(t.name)}</div>
            <div class="tx-sub">${esc(t.cat)} · ${fmtDate(t.date)}</div>
          </div>
        </div>
        <div class="tx-cat">
          <span class="chip ${t.type === 'income' ? 'chip-pos' : ''}">
            ${esc(t.cat)}
          </span>
        </div>
        <div class="tx-date">${fmtDate(t.date)}</div>
        <div class="tx-amt ${t.type === 'income' ? 'in' : ''}">
          ${t.type === 'income' ? '+' : '−'}฿${fmt(t.amount)}
        </div>
        <button type="button" class="icon-btn danger"
          data-del="${esc(t.id)}"
          aria-label="ลบรายการ ${esc(t.name)}">
          ${ICON.trash}
        </button>
      </div>
    `).join('');
  }

  async function del(id) {
    if (!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return;

    
    try {
      await API.deleteTransaction(id);

      transactions = transactions.filter(t => t.id !== id);

      // อัปเดตข้อมูลกลางให้ Dashboard ด้วย
      await loadTransactionsFromAPI();

      render();
      App.refresh();

      toast('ลบรายการแล้ว');
    } catch (error) {
      toast('ลบรายการไม่สำเร็จ');
      console.error('Delete transaction failed:', error);
    }

  }

  return {
    init,
    render,
    reload: loadTransactions
  };
})();
