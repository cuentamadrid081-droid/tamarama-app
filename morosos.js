/**
 * TAMARAMA — Módulo de Morosos
 * Registro de clientes con cuentas pendientes
 */

const MorososModule = (() => {
  'use strict';

  const STORAGE_KEY = 'tamarama_morosos_v1';
  let currentClientId = null;

  // ── DATOS ───────────────────────────────────────────────────────────────

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { clients: [] };
  }

  function saveData(d) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  }

  function uid() {
    return 'm' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function fmt(num) {
    return Number(num).toLocaleString('es-PY', {
      minimumFractionDigits: 0, maximumFractionDigits: 0
    });
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── RENDER PRINCIPAL ────────────────────────────────────────────────────

  function render() {
    const container = document.getElementById('morosos-container');
    if (!container) return;

    const data = loadData();

    container.innerHTML = `
      <div class="morosos-layout">
        
        <!-- PANEL IZQUIERDO: LISTA DE CLIENTES -->
        <aside class="morosos-sidebar">
          <div class="morosos-sidebar-header">
            <h3 class="morosos-title">👥 Clientes Morosos</h3>
            <button class="add-client-btn" data-action="add-client" type="button">
              ＋ Nuevo
            </button>
          </div>
          <div class="morosos-list">
            ${data.clients.length === 0 
              ? `<div class="morosos-empty">No hay clientes con deuda.</div>`
              : data.clients.map(c => buildClientCard(c)).join('')
            }
          </div>
        </aside>

        <!-- PANEL DERECHO: DETALLE DEL CLIENTE -->
        <div class="morosos-main">
          ${currentClientId 
            ? buildClientDetail(data.clients.find(c => c.id === currentClientId))
            : `<div class="morosos-main-empty">
                 <span style="font-size:48px;">📄</span>
                 <p>Seleccioná un cliente de la lista<br>o creá uno nuevo.</p>
               </div>`
          }
        </div>
      </div>
    `;

    setupEvents(container);
  }

  // ── COMPONENTES UI ──────────────────────────────────────────────────────

  function buildClientCard(client) {
    const isSelected = client.id === currentClientId;
    const total = calculateTotal(client.items);
    const saldo = total - (Number(client.sena) || 0);

    return `
      <div class="moroso-card ${isSelected ? 'active' : ''}" data-action="select-client" data-id="${client.id}">
        <div class="moroso-card-head">
          <strong>${esc(client.nombre) || 'Sin nombre'}</strong>
          <span class="moroso-fecha">${client.fechaEmision || ''}</span>
        </div>
        <div class="moroso-card-body">
          <span class="moroso-saldo">Saldo: ₲${fmt(saldo)}</span>
        </div>
      </div>
    `;
  }

  function calculateTotal(items) {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (Number(item.cantidad)||0) * (Number(item.precioUnit)||0), 0);
  }

  function buildClientDetail(client) {
    if (!client) return '';
    const items = client.items || [];
    const total = calculateTotal(items);
    const sena = Number(client.sena) || 0;
    const saldo = total - sena;

    return `
      <div class="moroso-detail-card" data-client-id="${client.id}">
        
        <div class="moroso-detail-header">
          <div class="moroso-detail-actions">
             <button class="btn-danger-outline" data-action="delete-client" type="button">🗑️ Eliminar Cliente</button>
          </div>
        </div>

        <div class="moroso-info-grid">
          <div class="input-group">
            <label>Nombre del Cliente</label>
            <input type="text" class="cell-inp minp-nombre" data-field="nombre" value="${esc(client.nombre)}" placeholder="Ej: Juan Pérez">
          </div>
          <div class="input-group">
            <label>Teléfono</label>
            <input type="tel" class="cell-inp minp-telefono" data-field="telefono" value="${esc(client.telefono)}" placeholder="Ej: 0981 123 456">
          </div>
          <div class="input-group">
            <label>Fecha Emisión</label>
            <input type="date" class="cell-inp minp-fecha" data-field="fechaEmision" value="${client.fechaEmision}">
          </div>
        </div>

        <div class="moroso-items-section">
          <table class="ventas-table morosos-table">
            <thead>
              <tr>
                <th class="th-vcant">Cant.</th>
                <th class="th-vdesc">Descripción</th>
                <th class="th-vprecio">P. U.</th>
                <th class="th-vtotal">Total</th>
                <th class="th-vdel"></th>
              </tr>
            </thead>
            <tbody>
              ${items.length === 0 
                ? `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #9CA3AF;">Agregá artículos a la cuenta.</td></tr>`
                : items.map(item => buildItemRow(item)).join('')
              }
            </tbody>
          </table>
          <button class="add-row-btn mt-2" data-action="add-item" type="button" style="padding: 8px 16px; font-size: 13px;">
            ＋ Agregar Artículo
          </button>
        </div>

        <div class="moroso-summary-section">
          <div class="moroso-totals">
            <div class="tot-row">
              <span>TOTAL</span>
              <strong>₲${fmt(total)}</strong>
            </div>
            <div class="tot-row sena-row">
              <span>Seña (Entrega)</span>
              <div class="precio-cell" style="justify-content: flex-end;">
                <span class="precio-prefix">₲</span>
                <input type="text" inputmode="numeric" class="cell-inp cell-num minp-sena" data-field="sena" value="${client.sena ? fmt(client.sena) : ''}" placeholder="0" style="width: 120px;">
              </div>
            </div>
            <div class="tot-row saldo-row">
              <span>SALDO</span>
              <strong class="saldo-valor">₲${fmt(saldo)}</strong>
            </div>
          </div>
          
          <div class="moroso-obs">
            <label>Observaciones</label>
            <textarea class="obs-textarea minp-obs" data-field="observaciones" placeholder="Escribí notas u observaciones...">${esc(client.observaciones)}</textarea>
          </div>
        </div>

      </div>
    `;
  }

  function buildItemRow(item) {
    const total = (Number(item.cantidad) || 0) * (Number(item.precioUnit) || 0);
    return `
      <tr class="moroso-item-row" data-item-id="${item.id}">
        <td class="td-vcant">
          <input class="cell-inp cell-num item-inp" type="text" inputmode="numeric" data-ifield="cantidad" value="${item.cantidad ? fmt(item.cantidad) : ''}" placeholder="0">
        </td>
        <td class="td-vdesc">
          <input class="cell-inp item-inp" type="text" data-ifield="descripcion" value="${esc(item.descripcion ?? '')}" placeholder="Descripción">
        </td>
        <td class="td-vprecio">
          <div class="precio-cell">
            <span class="precio-prefix">₲</span>
            <input class="cell-inp cell-num item-inp" type="text" inputmode="numeric" data-ifield="precioUnit" value="${item.precioUnit ? fmt(item.precioUnit) : ''}" placeholder="0">
          </div>
        </td>
        <td class="td-vtotal">
          <span class="mtotal-display">₲${fmt(total)}</span>
        </td>
        <td class="td-vdel">
          <button class="row-del" data-action="delete-item" data-item-id="${item.id}" type="button">🗑️</button>
        </td>
      </tr>
    `;
  }

  // ── EVENTOS ─────────────────────────────────────────────────────────────

  function setupEvents(container) {
    if (container.dataset.eventsAttached) return;
    container.dataset.eventsAttached = 'true';

    container.addEventListener('click', function(e) {
      // Nuevo cliente
      if (e.target.closest('[data-action="add-client"]')) {
        const d = loadData();
        const newId = uid();
        d.clients.push({
          id: newId,
          nombre: '',
          telefono: '',
          fechaEmision: today(),
          items: [],
          sena: '',
          observaciones: ''
        });
        saveData(d);
        currentClientId = newId;
        render();
        return;
      }

      // Seleccionar cliente
      const card = e.target.closest('[data-action="select-client"]');
      if (card) {
        currentClientId = card.dataset.id;
        render();
        return;
      }

      // Eliminar cliente
      if (e.target.closest('[data-action="delete-client"]')) {
        if (!confirm('¿Eliminar este cliente y todo su registro?')) return;
        const d = loadData();
        d.clients = d.clients.filter(c => c.id !== currentClientId);
        saveData(d);
        currentClientId = null;
        render();
        return;
      }

      // Agregar artículo
      if (e.target.closest('[data-action="add-item"]')) {
        const d = loadData();
        const client = d.clients.find(c => c.id === currentClientId);
        if (client) {
          if (!client.items) client.items = [];
          client.items.push({
            id: uid(),
            cantidad: '',
            descripcion: '',
            precioUnit: ''
          });
          saveData(d);
          render();
        }
        return;
      }

      // Eliminar artículo
      const delItemBtn = e.target.closest('[data-action="delete-item"]');
      if (delItemBtn) {
        const itemId = delItemBtn.dataset.itemId;
        const d = loadData();
        const client = d.clients.find(c => c.id === currentClientId);
        if (client && client.items) {
          client.items = client.items.filter(i => i.id !== itemId);
          saveData(d);
          render();
        }
        return;
      }
    });

    // Auto-guardar inputs (Delegación para `input`)
    container.addEventListener('input', function(e) {
      const d = loadData();
      const client = d.clients.find(c => c.id === currentClientId);
      if (!client) return;

      // Formateo visual en vivo para inputs numéricos
      let rawVal = e.target.value;
      if (e.target.classList.contains('cell-num')) {
        let numbersOnly = e.target.value.replace(/\D/g, '');
        e.target.value = numbersOnly ? fmt(numbersOnly) : '';
        rawVal = numbersOnly;
      }

      // Inputs del cliente (nombre, telefono, fecha, sena, obs)
      if (e.target.matches('.minp-nombre, .minp-telefono, .minp-fecha, .minp-sena, .minp-obs')) {
        const field = e.target.dataset.field;
        client[field] = e.target.classList.contains('cell-num')
          ? (rawVal === '' ? '' : parseFloat(rawVal))
          : e.target.value;
        saveData(d);
        // Reflejar cambios visuales sin re-render completo para no perder el foco
        if (field === 'nombre') {
           const sidebarCardName = container.querySelector(`.moroso-card[data-id="${client.id}"] strong`);
           if (sidebarCardName) sidebarCardName.textContent = client.nombre || 'Sin nombre';
        }
        if (field === 'fechaEmision') {
           const sidebarCardFecha = container.querySelector(`.moroso-card[data-id="${client.id}"] .moroso-fecha`);
           if (sidebarCardFecha) sidebarCardFecha.textContent = client.fechaEmision || '';
        }
        if (field === 'sena') {
           const total = calculateTotal(client.items);
           const sena = Number(client.sena) || 0;
           const saldo = total - sena;
           
           const saldoRow = container.querySelector('.saldo-valor');
           if (saldoRow) saldoRow.textContent = '₲' + fmt(saldo);
           
           const sidebarCard = container.querySelector(`.moroso-card[data-id="${client.id}"] .moroso-saldo`);
           if (sidebarCard) sidebarCard.textContent = `Saldo: ₲${fmt(saldo)}`;
        }
        return;
      }

      // Inputs de artículos
      if (e.target.matches('.item-inp')) {
        const row = e.target.closest('.moroso-item-row');
        const itemId = row.dataset.itemId;
        const item = client.items.find(i => i.id === itemId);
        if (item) {
          const field = e.target.dataset.ifield;
          item[field] = e.target.classList.contains('cell-num')
            ? (rawVal === '' ? '' : parseFloat(rawVal))
            : e.target.value;
          saveData(d);

          // Actualizar total visual de la fila
          if (field === 'cantidad' || field === 'precioUnit') {
            const rowTotal = (Number(item.cantidad)||0) * (Number(item.precioUnit)||0);
            row.querySelector('.mtotal-display').textContent = '₲' + fmt(rowTotal);
            
            // Actualizar total general y saldo
            const total = calculateTotal(client.items);
            const sena = Number(client.sena) || 0;
            const saldo = total - sena;
            
            const detailCard = container.querySelector('.moroso-detail-card');
            if(detailCard) {
               const totRow = detailCard.querySelector('.tot-row strong');
               const saldoRow = detailCard.querySelector('.saldo-valor');
               if(totRow) totRow.textContent = '₲' + fmt(total);
               if(saldoRow) saldoRow.textContent = '₲' + fmt(saldo);
            }

            // Actualizar en la sidebar
            const sidebarCard = container.querySelector(`.moroso-card[data-id="${client.id}"] .moroso-saldo`);
            if (sidebarCard) sidebarCard.textContent = `Saldo: ₲${fmt(saldo)}`;
          }
        }
        return;
      }
    });
  }

  // ── INIT ────────────────────────────────────────────────────────────────

  function init() {
    // Auto-limpieza de clientes vacíos
    const d = loadData();
    if (d && d.clients) {
      const initialCount = d.clients.length;
      d.clients = d.clients.filter(c => c.nombre && c.nombre.trim() !== '');
      if (d.clients.length !== initialCount) {
        saveData(d);
        if (currentClientId && !d.clients.find(c => c.id === currentClientId)) {
          currentClientId = null;
        }
      }
    }
    render();
  }

  return { init };
})();
