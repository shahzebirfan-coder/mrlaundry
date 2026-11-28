/* ============================================================
   Utility helpers
   ============================================================ */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escapeHtml(str){
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtMoney(n) {
  const s = DB.settings();
  const num = Number(n) || 0;
  const sign = num < 0 ? '-' : '';
  const v = Math.abs(Math.round(num));
  return `${sign}${s.currency} ${v.toLocaleString()}`;
}

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtDateShort(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

// Product quantities count service units; this snapshot multiplier counts the
// physical garments contained in each service unit (e.g. a 3-piece suit).
function getPiecesPerItem(item) {
  const value = Number(item && item.piecesPerItem);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}
function getItemPhysicalPieces(item) {
  const quantity = Number(item && item.qty);
  return (Number.isFinite(quantity) && quantity > 0 ? quantity : 0) * getPiecesPerItem(item);
}
function getOrderTotalPieces(orderOrItems) {
  const items = Array.isArray(orderOrItems)
    ? orderOrItems
    : (orderOrItems && Array.isArray(orderOrItems.items) ? orderOrItems.items : []);
  return items.reduce((sum, item) => sum + getItemPhysicalPieces(item), 0);
}

function isoDay(d=new Date()) { return d.toISOString().slice(0,10); }

// Shared receipt helper so every payment-entry path stores a consistent, dated record.
function appendPaymentReceipt(order, amount, method, note='', options={}) {
  const value = Math.max(0, Number(amount) || 0);
  const existing = Array.isArray(order && order.paymentsLog) ? [...order.paymentsLog] : [];
  if (!value) return existing;

  const user = (typeof DB !== 'undefined' && DB.currentUser) ? (DB.currentUser() || {}) : {};
  const recordedAt = options.recordedAt || new Date().toISOString();
  const receipt = {
    id: 'pay_' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
    type: 'receipt',
    amount: value,
    method: method || 'cash',
    note: note || '',
    by: user.username || 'unknown',
    byName: user.name || '',
    at: options.at || recordedAt,
    recordedAt
  };
  if (options.dateOnly) receipt.dateOnly = true;
  if (options.estimatedDate) receipt.estimatedDate = true;
  if (options.estimateReason) receipt.estimateReason = options.estimateReason;
  if (options.source) receipt.source = options.source;
  if (options.sourceId) receipt.sourceId = options.sourceId;
  return [...existing, receipt];
}

// A customer-declared transfer date has day-level precision only. Use local noon
// when serializing it so time-zone conversion cannot display the adjacent date.
function paymentDateInputToIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return '';
  const year = +match[1], month = +match[2], day = +match[3];
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return date.toISOString();
}

function getGreeting() {
  const h = new Date().getHours();
  const useT = (typeof t === 'function');
  if (h < 12) return { text: useT ? t('greet.morning') : 'Good Morning', emoji: '🌅' };
  if (h < 17) return { text: useT ? t('greet.afternoon') : 'Good Afternoon', emoji: '☀️' };
  if (h < 21) return { text: useT ? t('greet.evening') : 'Good Evening', emoji: '🌇' };
  return { text: useT ? t('greet.night') : 'Good Night', emoji: '🌙' };
}

/* ====== Toasts ====== */
function toast(msg, type='success') {
  const div = el(`<div class="toast ${type}">${escapeHtml(msg)}</div>`);
  $('#toast-container').appendChild(div);
  setTimeout(() => { div.style.opacity = '0'; div.style.transform = 'translateX(100%)'; div.style.transition = '.2s'; }, 2200);
  setTimeout(() => div.remove(), 2500);
}

/* ====== Modal ======
   Data-entry safety:
   • clicking the dark backdrop does NOT close a form any more (that is how
     entered data used to disappear by accident)
   • a form closes only via the ✕ button, the Esc key, or its own Save/Cancel
   • if the user has typed anything, ✕ / Esc first asks "discard?" and the
     form stays exactly as it was if they choose to keep editing
   ================================================================== */
let _modalDirty = false;
let _modalOpts = {};
let _modalHintAt = 0;

function openModal(innerHtml, opts = {}) {
  closeModal();
  const wrap  = el(`<div class="modal-backdrop"><div class="modal-shell ${opts.large ? 'lg' : ''}"><div class="modal ${opts.large ? 'lg' : ''}"></div></div></div>`);
  const shell = wrap.querySelector('.modal-shell');
  const card  = wrap.querySelector('.modal');
  card.innerHTML = innerHtml;

  /* ✕ close button — always available unless explicitly disabled */
  if (opts.closable !== false) {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'modal-x';
    x.setAttribute('aria-label', 'Close');
    x.title = 'Close (Esc)';
    x.textContent = '✕';
    x.onclick = (ev) => { ev.stopPropagation(); attemptCloseModal(); };
    shell.appendChild(x);
  }

  $('#modal-root').appendChild(wrap);

  /* remember whether the user typed / changed anything */
  _modalDirty = false;
  const markDirty = (e) => {
    const t = e.target;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) _modalDirty = true;
  };
  card.addEventListener('input',  markDirty, true);
  card.addEventListener('change', markDirty, true);

  /* backdrop click: keep the form open, give a short hint instead */
  wrap.addEventListener('click', (e) => {
    if (e.target !== wrap) return;
    if (opts.backdropClose === true) { attemptCloseModal(); return; }
    nudgeModal(shell);
  });

  _modalOpts = opts;
  if (opts.onOpen) opts.onOpen(card);
  return card;
}

function closeModal() {
  _modalDirty = false;
  _modalOpts = {};
  $('#modal-root').innerHTML = '';
}

/* User-initiated close (✕ / Esc / backdrop). Asks before losing typed data. */
function attemptCloseModal() {
  const card = document.querySelector('#modal-root .modal');
  if (!card) { closeModal(); return; }
  if (_modalDirty && _modalOpts.dirtyGuard !== false) {
    askDiscard(card);
    return;
  }
  closeModal();
}

/* inline confirm strip inside the modal — never destroys the form */
function askDiscard(card) {
  if (card.querySelector('.modal-discard')) {
    card.querySelector('.modal-discard [data-keep]').focus();
    return;
  }
  const bar = document.createElement('div');
  bar.className = 'modal-discard';
  bar.innerHTML = `
    <span>⚠️ You have entered information that has not been saved.</span>
    <div class="modal-discard-actions">
      <button type="button" class="btn btn-ghost btn-sm" data-keep>Keep editing</button>
      <button type="button" class="btn btn-danger btn-sm" data-discard>Discard &amp; close</button>
    </div>`;
  bar.querySelector('[data-keep]').onclick = () => bar.remove();
  bar.querySelector('[data-discard]').onclick = () => { _modalDirty = false; closeModal(); };
  card.appendChild(bar);
  try { bar.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
}

/* small shake + one short toast so it is obvious the backdrop is not a close button */
function nudgeModal(shell) {
  if (!shell) return;
  shell.classList.remove('modal-nudge');
  void shell.offsetWidth;
  shell.classList.add('modal-nudge');
  const now = Date.now();
  if (now - _modalHintAt > 4000) {
    _modalHintAt = now;
    toast('Form stays open — use ✕ or press Esc to close', 'warning');
  }
}

/* Esc closes the modal (and only the modal), ahead of any other shortcut */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' && e.keyCode !== 27) return;
  if (!document.querySelector('#modal-root .modal')) return;
  if (document.querySelector('.photo-viewer, .pv-overlay')) return; // full-screen viewer handles its own Esc
  e.preventDefault();
  e.stopPropagation();
  attemptCloseModal();
}, true);

/* ====== Confirm ====== */
function confirmDialog(msg, onYes) {
  openModal(`
    <h3>Confirm</h3>
    <p class="sub">${escapeHtml(msg)}</p>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
      <button class="btn btn-danger" id="yesBtn">Yes, Continue</button>
    </div>
  `, { onOpen(m) {
    m.querySelector('#cancelBtn').onclick = closeModal;
    m.querySelector('#yesBtn').onclick = () => { closeModal(); onYes(); };
  }});
}

/* ====== Download file helper ====== */
function downloadFile(filename, content, mime='application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}


/* Add data-label attribute to all table cells based on their header.
   This powers the mobile card-style table layout (responsive.css). */
function autoLabelTableCells() {
  document.querySelectorAll('table.tbl').forEach(table => {
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    if (!headers.length) return;
    table.querySelectorAll('tbody tr').forEach(tr => {
      Array.from(tr.children).forEach((td, i) => {
        if (headers[i] && !td.hasAttribute('data-label')) {
          td.setAttribute('data-label', headers[i]);
        }
      });
    });
  });
}

/* Run after any DOM change in #app */
(function setupAutoLabel() {
  if (typeof MutationObserver === 'undefined') return;
  const target = document.getElementById('app') || document.body;
  if (!target) return;
  let pending = false;
  const obs = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    setTimeout(() => { autoLabelTableCells(); pending = false; }, 50);
  });
  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const t = document.getElementById('app') || document.body;
      if (t) obs.observe(t, { childList: true, subtree: true });
    });
  } else {
    obs.observe(target, { childList: true, subtree: true });
  }
})();

/* === Universal print helper — bulletproof version ===
   Inlines all images (data URLs) and styles so print window has zero load time.
   Works perfectly with thermal printers and all browsers. */
/* ============================================================
   THERMAL TEXT SAFETY
   Thermal printers have no colour and no emoji font. Any emoji
   in the slip prints as a blank box or garbage, so they are
   removed before printing. Symbols that DO render on thermal
   (stars, arrows, bullets) are kept.
   ============================================================ */
function thermalSafeText(str) {
  if (!str) return str;
  const KEEP = new Set([0x2605, 0x2606, 0x2022, 0x00B7, 0x2192, 0x2190, 0x2191, 0x2193,
                        0x2713, 0x2717, 0x25B8, 0x25C2, 0x2500, 0x2502]);
  let out = '';
  for (const ch of String(str)) {
    const cp = ch.codePointAt(0);
    if (KEEP.has(cp)) { out += ch; continue; }
    // drop emoji / pictographs / variation selectors
    if ((cp >= 0x1F000 && cp <= 0x1FAFF) ||   // emoji blocks
        (cp >= 0x2600 && cp <= 0x27BF) ||     // misc symbols + dingbats
        (cp >= 0x2B00 && cp <= 0x2BFF) ||     // ⭐ etc.
        (cp >= 0xFE00 && cp <= 0xFE0F) ||     // variation selectors
        cp === 0x200D ||                      // zero-width joiner
        cp === 0x20E3) {                      // keycap
      continue;
    }
    out += ch;
  }
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.:;])/g, '$1');
}

/* Walk every text node in a cloned print element and strip emoji. */
function thermalCleanTextNodes(root) {
  if (!root || !root.ownerDocument) return;
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */, null);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => {
    const cleaned = thermalSafeText(n.nodeValue);
    if (cleaned !== n.nodeValue) n.nodeValue = cleaned;
  });
}

async function printElement(elementOrSelector, options) {
  options = options || {};
  let el;
  if (typeof elementOrSelector === 'string') {
    el = document.querySelector(elementOrSelector);
  } else {
    el = elementOrSelector;
  }
  if (!el) { alert('Print content not found'); return; }

  // Clone the element to manipulate safely
  const clone = el.cloneNode(true);

  // Step 1: Convert all canvases to images
  const sourceCanvases = el.querySelectorAll ? el.querySelectorAll('canvas') : [];
  const cloneCanvases = clone.querySelectorAll('canvas');
  cloneCanvases.forEach((cv, i) => {
    if (sourceCanvases[i]) {
      try {
        const img = document.createElement('img');
        img.src = sourceCanvases[i].toDataURL('image/png');
        img.width = sourceCanvases[i].width;
        img.height = sourceCanvases[i].height;
        cv.parentNode.replaceChild(img, cv);
      } catch(e) {}
    }
  });

  // Step 2: Convert all <img> src to absolute URLs OR data URLs
  const images = clone.querySelectorAll('img');
  const imagePromises = [];
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (!src) return;
    // Already data URL? Skip
    if (src.startsWith('data:')) return;
    // Make absolute URL
    const absUrl = new URL(src, location.href).href;
    img.src = absUrl;
    // Convert to data URL using fetch (works for same-origin)
    imagePromises.push(
      fetch(absUrl)
        .then(r => r.blob())
        .then(blob => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => { img.src = reader.result; resolve(); };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }))
        .catch(() => { /* leave URL as-is */ })
    );
  });
  await Promise.all(imagePromises);

  // Step 2b: thermal printers cannot render emoji — strip them
  let paper = '80', marginMm = 2, printableMm = 72, isThermal = true;
  try {
    const st = (typeof DB !== 'undefined' && DB.settings) ? DB.settings() : {};
    paper = String(st.invoicePaper || '80') === '58' ? '58' : '80';
    printableMm = paper === '58' ? 48 : 72;
    marginMm = (st.invoiceMarginMm != null) ? Math.max(0, Math.min(10, +st.invoiceMarginMm)) : 2;
    isThermal = (options.paper !== 'laser') && (String(st.invoicePaper || '').toLowerCase() !== 'laser');
  } catch (e) {}
  if (isThermal) thermalCleanTextNodes(clone);

  // Thermal rolls have no useful fixed page height. Measure each slip at the
  // printer's printable width. Print Both keeps both slips in one print job,
  // using a compact page per slip so the office copy follows the customer copy
  // without a second print dialog. The customer footer keeps its CUT HERE marker.
  const thermalRoll = options.thermalRoll === true && isThermal;
  const compactRoll = thermalRoll && options.compactRoll === true;
  let thermalPageSizes = [];
  let thermalPageRules = '';
  if (thermalRoll) {
    const measureWidthPx = printableMm * 96 / 25.4;
    const measureHost = document.createElement('div');
    measureHost.style.cssText = `position:fixed;left:-10000px;top:0;width:${measureWidthPx}px;max-width:${measureWidthPx}px;z-index:-1;visibility:hidden;pointer-events:none;background:#fff;color:#000;font-family:Arial,sans-serif;`;
    clone.style.setProperty('width', `${measureWidthPx}px`, 'important');
    clone.style.setProperty('max-width', `${measureWidthPx}px`, 'important');
    measureHost.appendChild(clone);
    document.body.appendChild(measureHost);

    try {
      const measureImages = Array.from(clone.querySelectorAll('img'));
      await Promise.all(measureImages.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(resolve => {
          const done = () => { clearTimeout(timer); resolve(); };
          const timer = setTimeout(done, 5000);
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      }));
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      const slips = Array.from(clone.querySelectorAll('.print-slip'));
      if (!slips.length) slips.push(clone);
      const prepareSlip = (slip) => {
        slip.style.setProperty('display', 'block', 'important');
        slip.style.setProperty('width', '100%', 'important');
        slip.style.setProperty('margin', '0', 'important');
        slip.querySelectorAll('.invoice-page').forEach(invoice => {
          invoice.style.setProperty('display', 'block', 'important');
          invoice.style.setProperty('width', '100%', 'important');
          invoice.style.setProperty('max-width', '100%', 'important');
          invoice.style.setProperty('padding', '0', 'important');
          invoice.style.setProperty('margin', '0 auto', 'important');
        });
      };
      const pageHeightFor = (target, pageMarginMm, isOfficeCopy) => {
        const heightPx = Math.max(target.scrollHeight, Math.ceil(target.getBoundingClientRect().height));
        // Keep the office page tight around its content so a roll driver has no
        // long blank lead-in; retain a little extra tail for the customer cut mark.
        const tailMm = isOfficeCopy ? (compactRoll ? 1 : 3) : (compactRoll ? 3 : 8);
        const minimumMm = isOfficeCopy ? (compactRoll ? 42 : 65) : (compactRoll ? 55 : 80);
        return Math.max(minimumMm, Math.ceil((heightPx * 25.4 / 96 + (pageMarginMm * 2) + tailMm) * 10) / 10);
      };

      thermalPageSizes = slips.map((slip, index) => {
        prepareSlip(slip);
        const isOfficeCopy = !!slip.querySelector('.invoice-office');
        const pageMarginMm = compactRoll ? 0 : (isOfficeCopy ? 0 : marginMm);
        const pageName = `thermalInvoice${index + 1}`;
        slip.classList.add(`thermal-roll-slip-${index + 1}`);
        slip.style.setProperty('page-break-inside', 'avoid', 'important');
        slip.style.setProperty('page-break-after', index < slips.length - 1 ? 'always' : 'auto', 'important');
        slip.style.setProperty('break-after', index < slips.length - 1 ? 'page' : 'auto', 'important');
        const heightMm = pageHeightFor(slip, pageMarginMm, isOfficeCopy);
        return { pageName, heightMm, pageMarginMm };
      });
      // A single-slip job already has an exact ordinary @page rule below. Avoid
      // a named page there: some Windows receipt drivers ignore or override it.
      thermalPageRules = thermalPageSizes.length > 1
        ? '@media print {\n' + thermalPageSizes.map((size, index) =>
          `  .thermal-roll-slip-${index + 1} { page: ${size.pageName}; }\n` +
          `  @page ${size.pageName} { size: ${paper}mm ${size.heightMm}mm; margin: ${size.pageMarginMm}mm; }`
        ).join('\n') + '\n}'
        : '';
    } finally {
      measureHost.remove();
    }
  }

  const maxThermalPageHeight = thermalPageSizes.length
    ? Math.max(...thermalPageSizes.map(page => page.heightMm))
    : null;
  // For a one-slip print job, make the unnamed page itself use that slip's
  // margins and measured height. This is also the fallback when a printer
  // driver ignores named @page rules.
  const thermalJobMarginMm = thermalPageSizes.length === 1
    ? thermalPageSizes[0].pageMarginMm
    : marginMm;

  // Step 3: Get HTML with all images inlined
  const html = clone.outerHTML;

  // Step 4: Inline ALL stylesheets
  let styleText = '';
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        styleText += rule.cssText + '\n';
      }
    } catch(e) {
      // External stylesheet — fetch it
      if (sheet.href) {
        try {
          const r = await fetch(sheet.href);
          if (r.ok) styleText += await r.text() + '\n';
        } catch(e) {}
      }
    }
  }

  // Step 5: Open one print window for this action. Print Both contains both
  // copy slips in the same document and therefore needs only one print dialog.
  const win = window.open('', '_blank', 'width=420,height=700');
  if (!win || win.closed) { alert('Please allow popups for printing!'); return; }

  const printDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${options.title || 'Print'}</title>
<style>
${styleText}
/* === Print overrides — MAX VISIBILITY === */
* { box-sizing: border-box; }
html, body {
  margin: 0 !important; padding: 0 !important;
  background: #fff !important; color: #000 !important;
  font-family: Arial, 'Helvetica Neue', sans-serif !important;
}
.no-print, .modal-backdrop, .modal-footer, .modal > div:first-child[class*="no-print"] { display: none !important; }
.invoice-page {
  display: block !important;
  visibility: visible !important;
  color: #000 !important;
  background: #fff !important;
  font-family: Arial, sans-serif !important;
  font-weight: 600 !important;
  padding: 8px !important;
  margin: 0 auto !important;
  max-width: 100% !important;
}
.invoice-page * {
  color: #000 !important;
  visibility: visible !important;
}
.invoice-page h2 { font-weight: 900 !important; }
.invoice-page b, .invoice-page strong { font-weight: 900 !important; }
.qty-circle {
  background: #fff !important;
  color: #000 !important;
  border: 4px solid #000 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-direction: column !important;
  margin: 14px auto !important;
}
.qty-circle * { color: #000 !important; }
.del-type-pill {
  background: #fff !important;
  color: #000 !important;
  border: 2px solid #000 !important;
}
img {
  max-width: 100%;
  display: inline-block;
  visibility: visible !important;
}
table { width: 100%; border-collapse: collapse; }
.print-slip {
  page-break-inside: avoid;
  page-break-after: always;
  break-after: page;
  display: block !important;
  margin: 0 auto;
}
.print-slip:last-child { page-break-after: auto; break-after: auto; }
.print-page-break { page-break-after: always; break-after: page; height: 0; }
@media print {
  @page { size: ${paper}mm ${compactRoll ? 'auto' : (thermalRoll && maxThermalPageHeight ? `${maxThermalPageHeight}mm` : 'auto')}; margin: ${compactRoll ? 0 : (thermalRoll && thermalPageSizes.length === 1 ? thermalJobMarginMm : marginMm)}mm; }
  /* Constrain to the printer's real dot area (58mm rolls are usually
     48mm printable; 80mm rolls about 72mm). Center it inside the CSS page
     margins so a driver with wider non-printable edges cannot crop columns. */
  html { width: auto !important; max-width: 100% !important; min-width: 0 !important; }
  body { width: ${isThermal ? printableMm + 'mm' : 'auto'} !important; max-width: 100% !important; min-width: 0 !important; margin: 0 auto !important; padding: 0 !important; background: #fff !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .invoice-page { width: 100% !important; max-width: 100% !important; padding: 0 !important; }
  /* Collapsed table borders can add ~2 CSS px outside a very narrow
     58mm office slip; reserve those pixels so its right border stays in. */
  .invoice-office table { width: calc(100% - 2px) !important; max-width: 100% !important; }
}
${thermalPageRules}
@media screen {
  body { padding: 20px; background: #f0f4ff; }
  .invoice-page { box-shadow: 0 4px 12px rgba(0,0,0,.1); border-radius: 8px; max-width: 380px; }
}
</style>
</head><body>
${html}
<script>
  let printStarted = false;
  let printFallback = null;
  function doPrint() {
    // Image completion and the fallback timer must never launch duplicate jobs.
    if (printStarted) return;
    printStarted = true;
    if (printFallback !== null) clearTimeout(printFallback);
    setTimeout(function() {
      window.print();
      setTimeout(function() { window.close(); }, 1000);
    }, 200);
  }
  window.onload = function() {
    printFallback = setTimeout(doPrint, 3000);
    const imgs = document.querySelectorAll('img');
    if (imgs.length === 0) { doPrint(); return; }
    let loaded = 0;
    const checkAll = function() {
      loaded++;
      if (loaded >= imgs.length) doPrint();
    };
    imgs.forEach(function(img) {
      if (img.complete && img.naturalHeight !== 0) checkAll();
      else { img.onload = checkAll; img.onerror = checkAll; }
    });
  };
</` + `script>
</body></html>`;

  win.document.open();
  win.document.write(printDoc);
  win.document.close();
}


/* ============================================================
   Product image helper — handles both emoji + image URLs/data
   ============================================================ */
function productImageHTML(image, size, classes) {
  size = size || 80;
  classes = classes || '';
  const fallback = '🧺';
  const img = image || fallback;
  // If it's a URL or data URI, render as <img> that fills its container
  if (typeof img === 'string' && (img.startsWith('data:') || img.startsWith('http') || img.startsWith('/') || img.startsWith('assets/'))) {
    return `<img src="${img}" class="${classes}" onerror="this.outerHTML='<span>${fallback}</span>'" alt=""/>`;
  }
  // Otherwise treat as emoji/text — let CSS handle size
  return `<span>${img}</span>`;
}
window.productImageHTML = productImageHTML;

/* ============================================================
   Image resize: file -> data URL of <= maxW x maxH, JPEG
   ============================================================ */
function resizeImageToDataURL(file, maxW, maxH, quality) {
  maxW = maxW || 200; maxH = maxH || 200; quality = quality || 0.85;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * ratio); h = Math.round(h * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        // white bg for transparent PNGs
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}
window.resizeImageToDataURL = resizeImageToDataURL;

/* ============================================================
   Emoji picker (simple, organized for laundry shop)
   ============================================================ */
const LAUNDRY_EMOJIS = {
  'Clothing': ['👔','👕','👖','🧥','🧦','🧢','👒','👗','👘','🥻','🩱','🩳','🩲','🥼','🎽','🧣','🧤','🥾','👠','👟','🦺','👞','🩴','👚','👜'],
  'Bedding': ['🛏️','🛌','🧶','🧵','🪡','🪢','🧺','🧽','🧼'],
  'Pakistani': ['🤵','🥻','👳','🧕','🕌','🕋'],
  'Kids': ['🧸','🧒','👶','🎒','👶'],
  'Other': ['🪟','🚿','🧖','🪞','🛋️','🪑','🛁'],
};
function openEmojiPicker(onPick) {
  const groups = Object.keys(LAUNDRY_EMOJIS).map(g => `
    <div style="margin-bottom:10px;">
      <div style="font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;margin-bottom:6px;">${g}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${LAUNDRY_EMOJIS[g].map(e => `<button type="button" class="emoji-btn" data-em="${e}" style="font-size:24px;padding:8px;background:#fff;border:1px solid #e5e9f2;border-radius:8px;cursor:pointer;">${e}</button>`).join('')}
      </div>
    </div>
  `).join('');
  openModal(`
    <h3>😀 Pick an Emoji</h3>
    ${groups}
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>
  `, { onOpen(m) {
    m.querySelectorAll('.emoji-btn').forEach(b => b.onclick = () => {
      onPick(b.dataset.em);
      closeModal();
    });
  }});
}
window.openEmojiPicker = openEmojiPicker;

/* ============================================================
   Auto Status Logic (Pending -> Washing at 5 PM)
   ============================================================ */
function getCalculatedStatus(order) {
  if (order.status !== 'pending') return order.status;
  if (!order.createdAt) return order.status;

  const d = new Date(order.createdAt);
  // Create Date object for 5 PM on the day the order was booked
  let washDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17, 0, 0);

  // If booked after 5 PM, wash day is tomorrow at 5 PM
  if (d.getHours() >= 17) {
    washDay.setDate(washDay.getDate() + 1);
  }

  // If wash day is Sunday (0), push to Monday at 5 PM
  if (washDay.getDay() === 0) {
    washDay.setDate(washDay.getDate() + 1);
  }

  // If current time is past wash day, it should be 'washing'
  if (new Date() >= washDay) {
    return 'washing';
  }

  return 'pending';
}

function autoUpdateWashingStatus() {
  if (typeof DB === 'undefined' || !DB.all || typeof DB.update !== 'function') return;
  const orders = DB.all('orders');
  if (!orders) return;
  
  let changed = false;
  orders.forEach(o => {
    if (o.status === 'pending') {
      const calc = getCalculatedStatus(o);
      if (calc === 'washing') {
        DB.update('orders', o.id, { status: 'washing' });
        changed = true;
      }
    }
  });
  
  // If we changed something and are currently on a page that shows orders, we could reload,
  // but it's okay to just let it quietly sync in the background.
}
// Run periodically (every 5 minutes)
if (typeof window !== 'undefined') {
  setTimeout(autoUpdateWashingStatus, 1500);
  setInterval(autoUpdateWashingStatus, 5 * 60 * 1000);
}

function promptPasswordModal(title, callback) {
  openModal(`
    <h3>${escapeHtml(title)}</h3>
    <div class="field">
      <label>IT ADMIN Password</label>
      <input type="password" id="itAdminPwd" placeholder="Enter password..."/>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="itAdminSubmit">Submit</button>
    </div>
  `, {
    onOpen(m) {
      const inp = m.querySelector('#itAdminPwd');
      const btn = m.querySelector('#itAdminSubmit');
      inp.focus();
      inp.addEventListener('keyup', (e) => { if (e.key === 'Enter') btn.click(); });
      btn.onclick = () => {
        const val = inp.value;
        closeModal();
        callback(val);
      };
    }
  });
}

function isAppExpired() {
  if (typeof DB === 'undefined' || !DB.settings) return false;
  const s = DB.settings();
  // Lifetime is an explicit flag — anything other than literal `true` is NOT lifetime
  if (s.lifetimeLicense === true) return false;
  const expiry = Number(s.subscriptionExpiry) || 0;
  // No expiry at all is NOT "unlimited" — an unlicensed install is expired
  if (!expiry) return true;
  return Date.now() >= expiry;
}
