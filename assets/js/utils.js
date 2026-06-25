/* ============================================================
   Utilities — shared helpers
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const fmtMoney = (n) => {
  const num = +n || 0;
  const settings = (typeof DB !== 'undefined') ? DB.settings() : { currency: 'Rs.' };
  return settings.currency + ' ' + Math.round(num).toLocaleString('en-PK');
};

const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const isoDay = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().slice(0, 10);
};

const uid = (prefix = 'id') =>
  prefix + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);

const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms);
  };
};

const confirmDialog = (msg, onYes, onNo) => {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">Confirm</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">${escapeHtml(msg)}</div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="confirmNo">Cancel</button>
      <button class="btn btn-primary" id="confirmYes">Confirm</button>
    </div>
  `, { onOpen: m => {
    $('#confirmNo', m).onclick = () => { closeModal(); onNo && onNo(); };
    $('#confirmYes', m).onclick = () => { closeModal(); onYes && onYes(); };
  }});
};

const productImageHTML = (image, size = 40) => {
  if (!image) return `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${size*0.5}px;">🧺</div>`;
  if (image.startsWith('data:') || image.startsWith('http')) {
    return `<img src="${escapeHtml(image)}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:4px;" />`;
  }
  return `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${size*0.5}px;">${escapeHtml(image)}</div>`;
};
