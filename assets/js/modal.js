/* ============================================================
   Modal manager
   ============================================================ */
function openModal(html, opts = {}) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = `<div class="modal ${opts.large ? 'large' : ''}">${html}</div>`;
  root.classList.add('open');
  if (opts.onOpen) opts.onOpen(root.querySelector('.modal'));
  // Close on backdrop click
  root.onclick = (e) => { if (e.target === root) closeModal(); };
}

function closeModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.classList.remove('open');
  root.innerHTML = '';
}
