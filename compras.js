/**
 * TAMARAMA — Módulo de Compras
 */

const ComprasModule = (() => {
  'use strict';

  const KEY_COMPRAS = 'tamarama_compras_v1';
  const KEY_STOCK   = 'tamarama_stock_v1';

  // ── DATOS ───────────────────────────────────────────────────────────────

  function loadCompras() {
    try {
      const raw = localStorage.getItem(KEY_COMPRAS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { purchases: [] };
  }

  function saveCompras(d) {
    localStorage.setItem(KEY_COMPRAS, JSON.stringify(d));
  }

  function loadStock() {
    try {
      const raw = localStorage.getItem(KEY_STOCK);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { categories: [] };
  }

  function saveStock(d) {
    localStorage.setItem(KEY_STOCK, JSON.stringify(d));
  }

  function uid() {
    return 'pu' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  // ── RENDER ──────────────────────────────────────────────────────────────

  function render() {
    const container = document.getElementById('compras-container');
    if (!container) return;

    closePicker();
    const data = loadCompras();

    container.innerHTML = `
      <div class="section-topbar">
        <div>
          <h2 class="section-main-title">🧾 Compras</h2>
          <p class="section-main-sub">Registro de mercadería de proveedores</p>
        </div>
        <button class="add-row-btn" data-action="add-row" type="button">
          ＋ Agregar compra
        </button>
      </div>

      <div class="compras-note">
        ℹ️ <strong>Precio total</strong> = costo del cargamento al proveedor.
        Solo la descripción y cantidad pasan al Stock.
      </div>

      <div class="table-wrap">
        <table class="compras-table">
          <thead>
            <tr>
              <th class="th-prov">Proveedor</th>
              <th class="th-fecha">Fecha</th>
              <th class="th-desc-c">Descripción</th>
              <th class="th-cant-c">Cantidad</th>
              <th class="th-precio-c">Precio total <span class="th-hint">(cargamento)</span></th>
              <th class="th-stock-c">Stock</th>
              <th class="th-del-c"></th>
            </tr>
          </thead>
          <tbody id="compras-tbody">
            ${data.purchases.length === 0
              ? `<tr class="empty-row">
                   <td colspan="7">
                     <div class="compras-empty">
                       <span class="empty-icon" style="font-size:40px;">🧾</span>
                       <p>Todavía no hay compras registradas.</p>
                       <p>Tocá <strong>＋ Agregar compra</strong> para comenzar.</p>
                     </div>
                   </td>
                 </tr>`
              : data.purchases.map(p => buildRow(p)).join('')
            }
          </tbody>
        </table>
      </div>
    `;

    setupEvents(container);
  }

  // ── FILA DE COMPRA ──────────────────────────────────────────────────────

  function buildRow(p) {
    const isLinked = !!p.stockCategoryId;
    return `
      <tr class="compras-row" data-row-id="${p.id}">

        <td class="td-prov">
          <input class="cell-inp" type="text" data-field="proveedor"
                 value="${esc(p.proveedor ?? '')}" placeholder="Proveedor">
        </td>

        <td class="td-fecha-c">
          <input class="cell-inp cell-date" type="date" data-field="fecha"
                 value="${p.fecha ?? today()}">
        </td>

        <td class="td-desc-c">
          <input class="cell-inp" type="text" data-field="descripcion"
                 value="${esc(p.descripcion ?? '')}" placeholder="Descripción del artículo">
        </td>

        <td class="td-cant-c">
          <input class="cell-inp cell-num" type="number" data-field="cantidad"
                 value="${p.cantidad ?? ''}" placeholder="0" min="0">
        </td>

        <td class="td-precio-c">
          <div class="precio-cell">
            <span class="precio-prefix">₲</span>
            <input class="cell-inp cell-num precio-inp" type="number" data-field="precioTotal"
                   value="${p.precioTotal ?? ''}" placeholder="0.00" min="0" step="0.01">
          </div>
        </td>

        <td class="td-stock-c">
          <button class="stock-pick-btn ${isLinked ? 'linked' : ''}"
                  data-action="open-stock-picker"
                  data-row-id="${p.id}"
                  type="button">
            ${isLinked
              ? `<span class="stock-linked-icon">✓</span> ${esc(p.stockCategoryName)}`
              : `<span class="stock-pick-icon">📦</span> Asignar▾`
            }
          </button>
        </td>

        <td class="td-del-c">
          <button class="row-del" data-action="delete-row"
                  data-row-id="${p.id}" type="button" aria-label="Eliminar">🗑️</button>
        </td>

      </tr>
    `;
  }

  // ── EVENTOS ─────────────────────────────────────────────────────────────

  function setupEvents(container) {
    if (container.dataset.eventsAttached) return;
    container.dataset.eventsAttached = 'true';

    // Clicks
    container.addEventListener('click', function(e) {

      // Agregar fila
      if (e.target.closest('[data-action="add-row"]')) {
        const d = loadCompras();
        d.purchases.push({
          id: uid(), proveedor: '', fecha: today(),
          descripcion: '', cantidad: '', precioTotal: '',
          stockCategoryId: null, stockCategoryName: null, stockItemId: null
        });
        saveCompras(d);
        render();
        // Focus en el primer campo de la nueva fila
        setTimeout(() => {
          const rows = document.querySelectorAll('.compras-row');
          if (rows.length > 0) {
            rows[rows.length - 1].querySelector('.cell-inp')?.focus();
          }
        }, 50);
        return;
      }

      // Eliminar fila
      const delBtn = e.target.closest('[data-action="delete-row"]');
      if (delBtn) {
        if (!confirm('¿Eliminar esta compra?')) return;
        const rowId = delBtn.dataset.rowId;
        const d = loadCompras();
        const purchase = d.purchases.find(p => p.id === rowId);
        if (purchase?.stockCategoryId && purchase?.stockItemId) {
          removeFromStock(purchase.stockCategoryId, purchase.stockItemId);
        }
        d.purchases = d.purchases.filter(p => p.id !== rowId);
        saveCompras(d);
        render();
        return;
      }

      // Abrir selector de stock
      const stockBtn = e.target.closest('[data-action="open-stock-picker"]');
      if (stockBtn) {
        openStockPicker(stockBtn, stockBtn.dataset.rowId);
        return;
      }

      // Cerrar picker al hacer clic fuera
      if (!e.target.closest('.stock-picker-panel')) {
        closePicker();
      }
    });

    // Guardar automaticamente al editar
    container.addEventListener('input', function(e) {
      const input = e.target.closest('.cell-inp');
      if (!input) return;
      const row = input.closest('[data-row-id]');
      if (!row) return;

      const rowId = row.dataset.rowId;
      const field = input.dataset.field;
      const value = input.type === 'number'
        ? (input.value === '' ? '' : parseFloat(input.value))
        : input.value;

      const d = loadCompras();
      const purchase = d.purchases.find(p => p.id === rowId);
      if (!purchase) return;
      purchase[field] = value;
      saveCompras(d);

      // Sincronizar con stock si ya está vinculado
      if (purchase.stockCategoryId && purchase.stockItemId
          && (field === 'descripcion' || field === 'cantidad')) {
        syncStockItem(purchase);
      }
    });
  }

  // ── PANEL SELECTOR DE STOCK ─────────────────────────────────────────────

  function openStockPicker(triggerBtn, rowId) {
    closePicker();

    const stockData  = loadStock();
    const categories = stockData.categories || [];

    const panel = document.createElement('div');
    panel.className  = 'stock-picker-panel';
    panel.dataset.rowId = rowId;

    const d = loadCompras();
    const purchase = d.purchases.find(p => p.id === rowId);

    panel.innerHTML = `
      <div class="picker-head">📦 Asignar a categoría de Stock</div>
      ${categories.length === 0
        ? `<p class="picker-empty">No hay categorías en Stock.<br>Creá una primero en la sección Stock.</p>`
        : `<div class="picker-list">
             ${categories.map(cat => `
               <button class="picker-cat"
                       data-action="select-stock-cat"
                       data-cat-id="${cat.id}"
                       data-cat-name="${esc(cat.name)}"
                       type="button">
                 <span>${cat.icon}</span>
                 <span>${esc(cat.name)}</span>
                 ${purchase?.stockCategoryId === cat.id
                   ? '<span class="picker-check">✓</span>' : ''}
               </button>
             `).join('')}
           </div>`
      }
      ${purchase?.stockCategoryId
        ? `<div class="picker-footer">
             <button class="picker-unlink" data-action="unlink-stock" type="button">
               ✕ Quitar vínculo con stock
             </button>
           </div>`
        : ''
      }
    `;

    document.body.appendChild(panel);

    // Posicionar debajo del botón
    const rect  = triggerBtn.getBoundingClientRect();
    const panW  = 250;
    let   left  = rect.left + window.scrollX;
    let   top   = rect.bottom + window.scrollY + 5;

    if (left + panW > window.innerWidth - 12) {
      left = window.innerWidth - panW - 12;
    }
    panel.style.top  = top + 'px';
    panel.style.left = left + 'px';

    // Eventos del panel
    panel.addEventListener('click', function(e) {
      const catBtn = e.target.closest('[data-action="select-stock-cat"]');
      if (catBtn) {
        linkToStock(rowId, catBtn.dataset.catId, catBtn.dataset.catName);
        closePicker();
        return;
      }
      if (e.target.closest('[data-action="unlink-stock"]')) {
        unlinkStock(rowId);
        closePicker();
        return;
      }
    });
  }

  function closePicker() {
    document.querySelectorAll('.stock-picker-panel').forEach(p => p.remove());
  }

  // ── LÓGICA DE VINCULACIÓN CON STOCK ─────────────────────────────────────

  function linkToStock(rowId, catId, catName) {
    const comprasData = loadCompras();
    const purchase = comprasData.purchases.find(p => p.id === rowId);
    if (!purchase) return;

    // Si estaba vinculado a una categoría diferente, quitar de la anterior
    if (purchase.stockItemId && purchase.stockCategoryId && purchase.stockCategoryId !== catId) {
      removeFromStock(purchase.stockCategoryId, purchase.stockItemId);
      purchase.stockItemId = null;
    }

    const stockData = loadStock();
    const cat = stockData.categories.find(c => c.id === catId);
    if (!cat) return;

    const desc = purchase.descripcion || '';
    const qty  = Number(purchase.cantidad) || 0;

    if (purchase.stockItemId && purchase.stockCategoryId === catId) {
      // Actualizar item existente
      const item = cat.items.find(i => i.id === purchase.stockItemId);
      if (item) {
        const diff = qty - (Number(item.quantity) || 0);
        item.description = desc;
        item.quantity    = qty;
        if (diff !== 0 && typeof StockModule !== 'undefined' && StockModule.recordMovement) {
          StockModule.recordMovement(item.id, desc, catName, diff, 'Actualizado desde Compras');
        }
      }
    } else {
      // Crear nuevo item en stock SIN precio de venta (price = 0 → fila rosa)
      const newId = 'si' + uid();
      cat.items.push({
        id:           newId,
        description:  desc,
        price:        0,          // sin precio de venta todavía → rosa en stock
        quantity:     qty,
        fromPurchase: rowId,
      });
      purchase.stockItemId = newId;
      if (typeof StockModule !== 'undefined' && StockModule.recordMovement) {
        StockModule.recordMovement(newId, desc, catName, qty, 'Ingreso desde Compras');
      }
    }

    purchase.stockCategoryId   = catId;
    purchase.stockCategoryName = catName;

    saveStock(stockData);
    saveCompras(comprasData);
    render();
  }

  function unlinkStock(rowId) {
    const d = loadCompras();
    const purchase = d.purchases.find(p => p.id === rowId);
    if (!purchase) return;

    if (purchase.stockCategoryId && purchase.stockItemId) {
      removeFromStock(purchase.stockCategoryId, purchase.stockItemId);
    }

    purchase.stockCategoryId   = null;
    purchase.stockCategoryName = null;
    purchase.stockItemId       = null;
    saveCompras(d);
    render();
  }

  function removeFromStock(catId, itemId) {
    const d = loadStock();
    const cat = d.categories.find(c => c.id === catId);
    if (cat) {
      cat.items = cat.items.filter(i => i.id !== itemId);
      saveStock(d);
    }
  }

  function syncStockItem(purchase) {
    const d   = loadStock();
    const cat = d.categories.find(c => c.id === purchase.stockCategoryId);
    if (!cat) return;
    const item = cat.items.find(i => i.id === purchase.stockItemId);
    if (!item) return;
    const diff = (Number(purchase.cantidad) || 0) - (Number(item.quantity) || 0);
    item.description = purchase.descripcion || '';
    item.quantity    = Number(purchase.cantidad) || 0;
    saveStock(d);
    
    if (diff !== 0 && typeof StockModule !== 'undefined' && StockModule.recordMovement) {
      StockModule.recordMovement(item.id, item.description, cat.name, diff, 'Sincronizado desde Compras');
    }
  }

  // ── UTILS ────────────────────────────────────────────────────────────────

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── INIT ─────────────────────────────────────────────────────────────────

  function init() {
    render();
    // Cerrar picker al hacer clic fuera del contenedor de compras
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.stock-picker-panel')
          && !e.target.closest('[data-action="open-stock-picker"]')) {
        closePicker();
      }
    });
  }

  return { init };
})();
