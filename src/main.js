import './styles.css';

const STORAGE_KEY = 'desktopref:mvp-state';
const MIN_SIZE = 48;
const app = document.querySelector('#app');

const state = loadState();
let selectedItemId = null;
let drag = null;
let isPinned = false;

function id(prefix) { return `${prefix}-${crypto.randomUUID()}`; }
function now() { return new Date().toISOString(); }
function initialBoard() { return { id: id('board'), name: 'Reference Board', items: [], updatedAt: now() }; }

function loadState() {
  const board = initialBoard();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.boards?.length) return saved;
  } catch {}
  return { assets: [], boards: [board], activeBoardId: board.id };
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function activeBoard() { return state.boards.find((board) => board.id === state.activeBoardId) || state.boards[0]; }
function assetFor(id) { return state.assets.find((asset) => asset.id === id); }

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function addFiles(files, source = 'file') {
  const images = [...files].filter((file) => file.type.startsWith('image/'));
  const board = activeBoard();
  for (const [index, file] of images.entries()) {
    const dataUrl = await readFileAsDataUrl(file);
    const asset = {
      id: id('asset'),
      name: file.name || `Clipboard image ${state.assets.length + 1}`,
      type: file.type,
      source,
      originalPath: source === 'file' ? file.name : undefined,
      dataUrl,
      createdAt: now(),
    };
    const item = {
      id: id('item'),
      assetId: asset.id,
      x: 96 + index * 32,
      y: 96 + index * 32,
      width: 260,
      height: 180,
      zIndex: board.items.length + index + 1,
    };
    state.assets.push(asset);
    board.items.push(item);
    selectedItemId = item.id;
  }
  board.updatedAt = now();
  persistAndRender();
}

function resizeItem(origin, corner, dx, dy) {
  let { x, y, width, height } = origin;
  if (corner.includes('e')) width = Math.max(MIN_SIZE, origin.width + dx);
  if (corner.includes('s')) height = Math.max(MIN_SIZE, origin.height + dy);
  if (corner.includes('w')) { width = Math.max(MIN_SIZE, origin.width - dx); x = origin.x + origin.width - width; }
  if (corner.includes('n')) { height = Math.max(MIN_SIZE, origin.height - dy); y = origin.y + origin.height - height; }
  return { ...origin, x, y, width, height };
}

function persistAndRender() { saveState(); render(); }

function render() {
  const board = activeBoard();
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-icon">DR</div><div><h1>DesktopRef</h1><p>Image reference boards</p></div></div>
        <button class="primary-action" data-action="new-board">＋ New board</button>
        <nav class="board-list" aria-label="Boards">
          ${state.boards.map((b) => `<button class="board-tab ${b.id === board.id ? 'active' : ''}" data-board="${b.id}"><span>${escapeHtml(b.name)}</span><small>${b.items.length} items</small></button>`).join('')}
        </nav>
        <div class="asset-panel"><h2>Assets</h2><div class="asset-grid">
          ${state.assets.map((asset) => `<figure title="${escapeHtml(asset.originalPath || asset.name)}"><img src="${asset.dataUrl}" alt="${escapeHtml(asset.name)}"><figcaption>${escapeHtml(asset.name)}</figcaption></figure>`).join('')}
        </div></div>
      </aside>
      <main class="workspace">
        <header class="toolbar"><div><h2>${escapeHtml(board.name)}</h2><p>Drop images, paste from clipboard, then drag corners to resize.</p></div>
          <div class="toolbar-actions">
            <input hidden multiple id="file-input" type="file" accept="image/*">
            <button data-action="add-images">⇧ Add images</button>
            <button data-action="paste-help">⌘ Paste with Ctrl+V</button>
            <button class="${isPinned ? 'active' : ''}" data-action="pin">📌 ${isPinned ? 'Pinned' : 'Pin window'}</button>
            <button data-action="delete" ${selectedItemId ? '' : 'disabled'}>🗑 Delete</button>
            <button disabled>✓ Auto-saved</button>
          </div>
        </header>
        <section class="board-canvas" id="canvas">
          ${board.items.length ? '' : '<div class="empty-state"><div class="empty-icon">▧</div><h3>画像を追加してボードを作成</h3><p>ファイル選択、ドラッグ&ドロップ、またはクリップボード貼り付けに対応しています。</p></div>'}
          ${board.items.slice().sort((a,b) => a.zIndex - b.zIndex).map(renderItem).join('')}
        </section>
      </main>
    </div>`;
  bindEvents();
}

function renderItem(item) {
  const asset = assetFor(item.assetId);
  if (!asset) return '';
  return `<div class="board-item ${item.id === selectedItemId ? 'selected' : ''}" data-item="${item.id}" style="transform:translate(${item.x}px,${item.y}px);width:${item.width}px;height:${item.height}px;z-index:${item.zIndex}">
    <img src="${asset.dataUrl}" alt="${escapeHtml(asset.name)}" draggable="false"><span class="item-label">${escapeHtml(asset.name)}</span>
    ${['nw','ne','sw','se'].map((corner) => `<button class="resize-handle ${corner}" data-resize="${corner}" aria-label="Resize ${corner}"></button>`).join('')}
  </div>`;
}

function bindEvents() {
  document.querySelector('[data-action="new-board"]').onclick = () => {
    const board = { id: id('board'), name: `Board ${state.boards.length + 1}`, items: [], updatedAt: now() };
    state.boards.push(board); state.activeBoardId = board.id; selectedItemId = null; persistAndRender();
  };
  document.querySelector('[data-action="add-images"]').onclick = () => document.querySelector('#file-input').click();
  document.querySelector('#file-input').onchange = (event) => addFiles(event.target.files);
  document.querySelector('[data-action="delete"]').onclick = () => {
    const board = activeBoard(); board.items = board.items.filter((item) => item.id !== selectedItemId); selectedItemId = null; board.updatedAt = now(); persistAndRender();
  };
  document.querySelector('[data-action="pin"]').onclick = togglePin;
  document.querySelectorAll('[data-board]').forEach((button) => button.onclick = () => { state.activeBoardId = button.dataset.board; selectedItemId = null; persistAndRender(); });
  const canvas = document.querySelector('#canvas');
  canvas.ondragover = (event) => event.preventDefault();
  canvas.ondrop = (event) => { event.preventDefault(); addFiles(event.dataTransfer.files); };
  canvas.onpointermove = onPointerMove;
  canvas.onpointerup = () => { drag = null; };
  canvas.onpointerleave = () => { drag = null; };
  document.querySelectorAll('[data-item]').forEach((node) => {
    node.onpointerdown = (event) => {
      if (event.target.dataset.resize) return;
      const item = activeBoard().items.find((candidate) => candidate.id === node.dataset.item);
      selectedItemId = item.id;
      drag = { type: 'move', itemId: item.id, startX: event.clientX, startY: event.clientY, originX: item.x, originY: item.y };
      node.setPointerCapture(event.pointerId);
      render();
    };
  });
  document.querySelectorAll('[data-resize]').forEach((handle) => {
    handle.onpointerdown = (event) => {
      event.stopPropagation();
      const node = handle.closest('[data-item]');
      const item = activeBoard().items.find((candidate) => candidate.id === node.dataset.item);
      selectedItemId = item.id;
      drag = { type: 'resize', itemId: item.id, corner: handle.dataset.resize, startX: event.clientX, startY: event.clientY, origin: { ...item } };
      handle.setPointerCapture(event.pointerId);
      render();
    };
  });
}

function onPointerMove(event) {
  if (!drag) return;
  const board = activeBoard();
  const item = board.items.find((candidate) => candidate.id === drag.itemId);
  if (!item) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  const next = drag.type === 'move' ? { ...item, x: drag.originX + dx, y: drag.originY + dy } : resizeItem(drag.origin, drag.corner, dx, dy);
  Object.assign(item, next);
  board.updatedAt = now();
  saveState();
  const node = document.querySelector(`[data-item="${item.id}"]`);
  if (node) { node.style.transform = `translate(${item.x}px, ${item.y}px)`; node.style.width = `${item.width}px`; node.style.height = `${item.height}px`; }
}

async function togglePin() {
  isPinned = !isPinned;
  try {
    const currentWindow = window.__TAURI__?.window?.getCurrentWindow?.();
    await currentWindow?.setAlwaysOnTop?.(isPinned);
  } catch {}
  render();
}

window.addEventListener('paste', async (event) => {
  const imageItem = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith('image/'));
  const file = imageItem?.getAsFile();
  if (file) await addFiles([file], 'clipboard');
});

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

render();
