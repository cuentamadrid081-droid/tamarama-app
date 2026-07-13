/**
 * TAMARAMA — Módulo de Stock
 * Gestión de categorías y productos del inventario
 */

const StockModule = (() => {
  'use strict';

  const STORAGE_KEY = 'tamarama_stock_v1';
  let currentCategoryId = null;

  const CATEGORY_COLORS = [
    { bg: '#FDF2F8', accent: '#EC4899', label: 'Rosa'     },
    { bg: '#FFF7ED', accent: '#F97316', label: 'Naranja'  },
    { bg: '#FFFBEB', accent: '#D97706', label: 'Amarillo' },
    { bg: '#F0FDFA', accent: '#0D9488', label: 'Turquesa' },
    { bg: '#FAF5FF', accent: '#9333EA', label: 'Violeta'  },
    { bg: '#EFF6FF', accent: '#2563EB', label: 'Azul'     },
    { bg: '#F0FDF4', accent: '#16A34A', label: 'Verde'    },
  ];

  const CATEGORY_ICONS = [
    '📦','🛒','🎉','📚','📝','🖊️','✂️','🎨','🖼️','🔧',
    '⚡','💼','🎁','🌟','💎','🏷️','🧸','🪀','🖇️','📐',
  ];

  // ── DATOS ───────────────────────────────────────────────────────────────

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignorar */ }
    // Guardar categorías por defecto en localStorage inmediatamente
    const defaults = {
      categories: [
        { id: uid(), name: 'Servicios en general', icon: '🔧', colorIndex: 0, items: [] },
        { id: uid(), name: 'Cotillón',              icon: '🎉', colorIndex: 1, items: [] },
        { id: uid(), name: 'Artículos de librería', icon: '📚', colorIndex: 4, items: [] },
      ]
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // MOVIMIENTOS HISTÓRICOS
  const MOV_KEY = 'tamarama_stock_mov_v1';
  function recordMovement(itemId, itemName, catName, qtyChange, typeDesc) {
    try {
      let movs = [];
      const raw = localStorage.getItem(MOV_KEY);
      if (raw) movs = JSON.parse(raw);
      
      movs.push({
        id: uid(),
        timestamp: Date.now(),
        itemId,
        itemName,
        catName,
        qtyChange,
        typeDesc
      });
      localStorage.setItem(MOV_KEY, JSON.stringify(movs));
    } catch (e) {}
  }

  function uid() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  // ── RENDER PRINCIPAL ────────────────────────────────────────────────────

  function render() {
    const container = document.getElementById('stock-container');
    if (!container) return;

    const data = loadData();

    if (currentCategoryId === null) {
      renderBlocks(container, data);
    } else {
      const category = data.categories.find(c => c.id === currentCategoryId);
      if (category) {
        renderItems(container, category);
      } else {
        currentCategoryId = null;
        renderBlocks(container, data);
      }
    }
  }

  // ── VISTA DE BLOQUES ────────────────────────────────────────────────────

  function renderBlocks(container, data) {
    container.innerHTML = `
      <div class="stock-page-header">
        <h2 class="stock-page-title">Stock</h2>
        <p class="stock-page-sub">Seleccioná una categoría para ver su inventario</p>
      </div>

      <div class="stock-grid">
        ${data.categories.map(cat => buildBlockCard(cat)).join('')}

        <button class="stock-block stock-block--add"
                data-action="add-category"
                type="button"
                aria-label="Agregar categoría">
          <span class="add-block-plus">＋</span>
          <span class="add-block-label">Nueva categoría</span>
        </button>
      </div>
    `;

    // ── Delegación de eventos sobre el contenedor completo ──
    if (container.blockHandler) container.removeEventListener('click', container.blockHandler);
    container.blockHandler = function handler(e) {
      // Botón editar bloque (✏️)
      const editBtn = e.target.closest('[data-action="edit-category"]');
      if (editBtn) {
        e.stopPropagation();
        const catId = editBtn.dataset.catId;
        const d = loadData();
        const cat = d.categories.find(c => c.id === catId);
        if (cat) openCategoryModal('edit', cat);
        return;
      }

      // Botón nueva categoría
      const addBtn = e.target.closest('[data-action="add-category"]');
      if (addBtn) {
        openCategoryModal('add', null);
        return;
      }

      // Clic en un bloque de categoría → navegar a sus items
      const block = e.target.closest('[data-cat-id]');
      if (block && block.classList.contains('stock-block') && !block.classList.contains('stock-block--add')) {
        currentCategoryId = block.dataset.catId;
        // La navegación se encargará de re-renderizar
        render();
        return;
      }
    };
    container.addEventListener('click', container.blockHandler);
  }

  function buildBlockCard(cat) {
    const color      = CATEGORY_COLORS[cat.colorIndex ?? 0];
    const count      = (cat.items || []).length;
    const totalUnits = (cat.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);

    return `
      <div class="stock-block"
           data-cat-id="${cat.id}"
           tabindex="0"
           role="button"
           style="--blk-bg:${color.bg}; --blk-accent:${color.accent};">
        <button class="block-menu-btn"
                data-action="edit-category"
                data-cat-id="${cat.id}"
                type="button"
                aria-label="Editar ${esc(cat.name)}">✏️</button>
        <div class="block-icon">${cat.icon}</div>
        <div class="block-name">${esc(cat.name)}</div>
        <div class="block-meta">
          <span class="block-badge"
                style="background:${color.accent}22; color:${color.accent};">
            ${count} ${count === 1 ? 'tipo' : 'tipos'}
          </span>
          <span class="block-units">${totalUnits} uds.</span>
        </div>
      </div>
    `;
  }

  // ── MODAL: CATEGORÍA (agregar / editar) ─────────────────────────────────

  function openCategoryModal(mode, cat) {
    closeModal();
    const isEdit      = mode === 'edit';
    const selColorIdx = cat?.colorIndex ?? 0;
    const selIcon     = cat?.icon ?? '📦';

    const m = createModal(`
      <div class="modal-head" style="background:linear-gradient(135deg,#F9A8D4,#EC4899);">
        <h3 class="modal-title">${isEdit ? '✏️ Editar categoría' : '➕ Nueva categoría'}</h3>
        <button class="modal-x" data-action="close-modal" type="button">✕</button>
      </div>
      <div class="modal-body">

        <label class="form-label">Nombre <span class="req">*</span></label>
        <input id="mc-name" class="form-input" type="text" maxlength="40"
               placeholder="Ej: Regalería" value="${esc(cat?.name ?? '')}">

        <label class="form-label" style="margin-top:18px;">Ícono</label>
        <div class="icon-picker">
          ${CATEGORY_ICONS.map(ic => `
            <button class="icon-opt ${ic === selIcon ? 'sel' : ''}"
                    data-icon="${ic}" type="button">${ic}</button>
          `).join('')}
        </div>

        <label class="form-label" style="margin-top:18px;">Color</label>
        <div class="color-picker-row">
          ${CATEGORY_COLORS.map((c, i) => `
            <button class="color-dot ${i === selColorIdx ? 'sel' : ''}"
                    data-color-idx="${i}" type="button"
                    style="background:${c.accent};" aria-label="${c.label}"></button>
          `).join('')}
        </div>

        <div class="modal-actions" style="margin-top:28px;">
          ${isEdit ? `<button class="btn-danger" data-action="delete-cat" type="button">🗑️ Eliminar</button>` : ''}
          <button class="btn-secondary" data-action="close-modal" type="button">Cancelar</button>
          <button class="btn-primary" data-action="save-cat" type="button">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </div>
    `);

    let curIcon     = selIcon;
    let curColorIdx = selColorIdx;

    m.addEventListener('click', function(e) {
      // Cambiar ícono
      const iconBtn = e.target.closest('.icon-opt');
      if (iconBtn) {
        m.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('sel'));
        iconBtn.classList.add('sel');
        curIcon = iconBtn.dataset.icon;
        return;
      }
      // Cambiar color
      const colorBtn = e.target.closest('.color-dot');
      if (colorBtn) {
        m.querySelectorAll('.color-dot').forEach(b => b.classList.remove('sel'));
        colorBtn.classList.add('sel');
        curColorIdx = parseInt(colorBtn.dataset.colorIdx);
        return;
      }
      // Eliminar
      if (e.target.closest('[data-action="delete-cat"]')) {
        if (!confirm(`¿Eliminar "${cat.name}" y todos sus productos?`)) return;
        const d = loadData();
        d.categories = d.categories.filter(c => c.id !== cat.id);
        saveData(d);
        closeModal();
        currentCategoryId = null;
        render();
        return;
      }
      // Cerrar
      if (e.target.closest('[data-action="close-modal"]') || e.target === m) {
        closeModal();
        return;
      }
      // Guardar
      if (e.target.closest('[data-action="save-cat"]')) {
        const name = document.getElementById('mc-name')?.value.trim();
        if (!name) { shake(document.getElementById('mc-name')); return; }
        const d = loadData();
        if (isEdit) {
          const c = d.categories.find(c => c.id === cat.id);
          if (c) { c.name = name; c.icon = curIcon; c.colorIndex = curColorIdx; }
        } else {
          d.categories.push({ id: uid(), name, icon: curIcon, colorIndex: curColorIdx, items: [] });
        }
        saveData(d);
        closeModal();
        render();
        return;
      }
    });

    setTimeout(() => document.getElementById('mc-name')?.focus(), 120);
  }

  // ── VISTA DE TABLA ──────────────────────────────────────────────────────

  function renderItems(container, cat) {
    const color = CATEGORY_COLORS[cat.colorIndex ?? 0];
    const items = cat.items || [];
    const total = items.reduce((s, i) => s + (Number(i.price)||0)*(Number(i.quantity)||0), 0);
    const units = items.reduce((s, i) => s + (Number(i.quantity)||0), 0);

    container.innerHTML = `
      <div class="items-topbar">
        <button class="back-btn" data-action="go-back" type="button">
          <span class="back-arrow">‹</span> Volver
        </button>
        <div class="items-topbar-center">
          <span class="items-header-icon">${cat.icon}</span>
          <h2 class="items-topbar-title">${esc(cat.name)}</h2>
        </div>
        <button class="add-item-fab" data-action="add-item" type="button"
                style="background:${color.accent};">
          ＋ Agregar
        </button>
      </div>

      <div class="summary-row">
        <div class="sum-card" style="--sa:${color.accent};">
          <div class="sum-val">${items.length}</div>
          <div class="sum-lbl">Tipos de productos</div>
        </div>
        <div class="sum-card" style="--sa:${color.accent};">
          <div class="sum-val">${units}</div>
          <div class="sum-lbl">Unidades en stock</div>
        </div>
        <div class="sum-card" style="--sa:${color.accent};">
          <div class="sum-val">₲${fmt(total)}</div>
          <div class="sum-lbl">Valor total</div>
        </div>
      </div>

      ${items.length === 0
        ? `<div class="empty-state">
             <div class="empty-icon">${cat.icon}</div>
             <p class="empty-title">Sin productos aún</p>
             <p class="empty-sub">Tocá <strong>＋ Agregar</strong> para cargar el primero.</p>
           </div>`
        : `<div class="table-wrap">
             <table class="items-table">
               <thead>
                 <tr>
                   <th class="th-desc">Descripción</th>
                   <th class="th-price">Precio</th>
                   <th class="th-qty">Cantidad</th>
                   <th class="th-total">Total</th>
                   <th class="th-act"></th>
                 </tr>
               </thead>
               <tbody>
                 ${items.map(item => buildItemRow(item, color.accent)).join('')}
               </tbody>
             </table>
           </div>`
      }
    `;

    // ── Delegación de eventos ──
    if (container.itemHandler) container.removeEventListener('click', container.itemHandler);
    container.itemHandler = function handler(e) {
      // Volver
      if (e.target.closest('[data-action="go-back"]')) {
        container.removeEventListener('click', container.itemHandler);
        currentCategoryId = null;
        render();
        return;
      }
      // Agregar item
      if (e.target.closest('[data-action="add-item"]')) {
        openItemModal('add', cat.id, null, color.accent);
        return;
      }
      // Editar item
      const editBtn = e.target.closest('[data-action="edit-item"]');
      if (editBtn) {
        const d = loadData();
        const c = d.categories.find(c => c.id === cat.id);
        const item = c?.items.find(i => i.id === editBtn.dataset.itemId);
        if (item) openItemModal('edit', cat.id, item, color.accent);
        return;
      }
      // Eliminar item
      const delBtn = e.target.closest('[data-action="delete-item"]');
      if (delBtn) {
        const d = loadData();
        const c = d.categories.find(c => c.id === cat.id);
        const item = c?.items.find(i => i.id === delBtn.dataset.itemId);
        if (!item) return;
        if (!confirm(`¿Eliminar "${item.description}"?`)) return;
        c.items = c.items.filter(i => i.id !== delBtn.dataset.itemId);
        saveData(d);
        container.removeEventListener('click', container.itemHandler);
        // Recargar la categoría actualizada
        const updatedCat = d.categories.find(c => c.id === cat.id);
        renderItems(container, updatedCat);
        return;
      }
    };
    container.addEventListener('click', container.itemHandler);
  }

  function buildItemRow(item, accent) {
    const total    = (Number(item.price)||0) * (Number(item.quantity)||0);
    const noPrice  = !item.price || Number(item.price) === 0;
    const priceStr = noPrice
      ? `<span style="color:#9CA3AF;">—</span><span class="no-price-badge">Sin precio</span>`
      : `$${fmt(Number(item.price))}`;

    return `
      <tr class="${noPrice ? 'row-no-price' : ''}">
        <td class="td-desc">${esc(item.description)}</td>
        <td class="td-price">${priceStr}</td>
        <td class="td-qty">${item.quantity}</td>
        <td class="td-total">${noPrice ? '<span style="color:#9CA3AF;">—</span>' : '₲'+fmt(total)}</td>
        <td class="td-act">
          <button class="row-act" data-action="edit-item" data-item-id="${item.id}"
                  style="color:${accent}" type="button" aria-label="Editar">✏️</button>
          <button class="row-act" data-action="delete-item" data-item-id="${item.id}"
                  type="button" aria-label="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
  }

  // ── MODAL: PRODUCTO (agregar / editar) ──────────────────────────────────

  function openItemModal(mode, catId, item, accent) {
    closeModal();
    const isEdit = mode === 'edit';

    const m = createModal(`
      <div class="modal-head" style="background:linear-gradient(135deg,${accent}cc,${accent});">
        <h3 class="modal-title">${isEdit ? '✏️ Editar producto' : '➕ Agregar producto'}</h3>
        <button class="modal-x" data-action="close-modal" type="button">✕</button>
      </div>
      <div class="modal-body">

        <label class="form-label">Descripción <span class="req">*</span></label>
        <input id="mi-desc" class="form-input" type="text" maxlength="100"
               placeholder="Ej: Cuaderno A4 tapa dura"
               value="${esc(item?.description ?? '')}">

        <label class="form-label" style="margin-top:16px;">Precio unitario (₲)</label>
        <input id="mi-price" class="form-input" type="number"
               inputmode="decimal" placeholder="0.00" min="0" step="0.01"
               value="${item?.price ?? ''}">

        <label class="form-label" style="margin-top:16px;">Cantidad en stock</label>
        <div class="qty-row">
          <button class="qty-btn" data-action="qty-minus" type="button" aria-label="Restar">−</button>
          <input id="mi-qty" class="form-input qty-inp" type="number"
                 inputmode="numeric" placeholder="0" min="0" step="1"
                 value="${item?.quantity ?? '0'}">
          <button class="qty-btn" data-action="qty-plus" type="button" aria-label="Sumar">＋</button>
        </div>

        <div class="modal-actions" style="margin-top:28px;">
          <button class="btn-secondary" data-action="close-modal" type="button">Cancelar</button>
          <button class="btn-primary" data-action="save-item" type="button"
                  style="background:${accent};">${isEdit ? 'Guardar' : 'Agregar'}</button>
        </div>
      </div>
    `);

    m.addEventListener('click', function(e) {
      if (e.target.closest('[data-action="qty-minus"]')) {
        const inp = document.getElementById('mi-qty');
        inp.value = Math.max(0, (parseInt(inp.value) || 0) - 1);
        return;
      }
      if (e.target.closest('[data-action="qty-plus"]')) {
        const inp = document.getElementById('mi-qty');
        inp.value = (parseInt(inp.value) || 0) + 1;
        return;
      }
      if (e.target.closest('[data-action="close-modal"]') || e.target === m) {
        closeModal();
        return;
      }
      if (e.target.closest('[data-action="save-item"]')) {
        const description = document.getElementById('mi-desc')?.value.trim();
        if (!description) { shake(document.getElementById('mi-desc')); return; }

        const price    = parseFloat(document.getElementById('mi-price')?.value) || 0;
        const quantity = parseInt(document.getElementById('mi-qty')?.value)    || 0;

        const d = loadData();
        const cat = d.categories.find(c => c.id === catId);
        if (!cat) return;

        if (isEdit) {
          const ex = cat.items.find(i => i.id === item.id);
          if (ex) { 
            const diff = quantity - ex.quantity;
            if (diff !== 0) {
              recordMovement(ex.id, description, cat.name, diff, diff > 0 ? 'Ajuste positivo' : 'Ajuste negativo');
            }
            ex.description = description; 
            ex.price = price; 
            ex.quantity = quantity; 
          }
        } else {
          const newId = uid();
          cat.items.push({ id: newId, description, price, quantity });
          recordMovement(newId, description, cat.name, quantity, 'Ingreso inicial');
        }
        saveData(d);
        closeModal();
        render();
        return;
      }
    });

    setTimeout(() => document.getElementById('mi-desc')?.focus(), 120);
  }

  // ── UTILIDADES ──────────────────────────────────────────────────────────

  function createModal(innerHTML) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-card">${innerHTML}</div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
    return overlay;
  }

  function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.classList.remove('visible');
      setTimeout(() => m.remove(), 280);
    });
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmt(num) {
    return Number(num).toLocaleString('es-PY', {
      minimumFractionDigits: 0, maximumFractionDigits: 0
    });
  }

  function shake(el) {
    if (!el) return;
    el.classList.add('input-error');
    el.addEventListener('input', () => el.classList.remove('input-error'), { once: true });
  }

  // ── INIT ────────────────────────────────────────────────────────────────

  function init() {
    currentCategoryId = null;
    render();
  }

  return {
    init,
    recordMovement
  };
})();
