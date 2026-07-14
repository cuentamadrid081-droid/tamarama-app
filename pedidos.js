/**
 * TAMARAMA — Módulo de Nota de Pedido
 * Generador de notas con formato de papel, exportable a PDF (impresión) y con historial.
 */

const PedidosModule = (() => {
  'use strict';

  const STORAGE_KEY = 'tamarama_pedidos_v1';
  let currentPedidoId = null;

  // Inyectar CSS directo para asegurar que se vea (salta el caché)
  if (!document.getElementById('tamarama-pink-styles')) {
    const style = document.createElement('style');
    style.id = 'tamarama-pink-styles';
    style.textContent = `
      .hoja-datos { background: #FDF2F8 !important; border: 1px solid #FBCFE8 !important; border-radius: 8px !important; padding: 20px !important; margin-bottom: 25px !important; }
      .dato-row label { font-weight: 700 !important; color: #831843 !important; }
      .dato-row .hinp { background: white !important; border: 1px solid #FBCFE8 !important; border-radius: 6px !important; padding: 8px 12px !important; }
      .hoja-table { border-collapse: separate !important; border-spacing: 0 !important; border: 1px solid #FBCFE8 !important; border-radius: 8px !important; overflow: hidden !important; }
      .hoja-table th { background: #FCE7F3 !important; color: #BE185D !important; padding: 12px 10px !important; text-transform: uppercase !important; font-weight: 800 !important; }
      .hoja-table td { border-bottom: 1px solid #FBCFE8 !important; background: white !important; }
      .hoja-footer { background: #FDF2F8 !important; border: 1px solid #FBCFE8 !important; border-radius: 8px !important; padding: 25px !important; }
      .forma-pago { background: white !important; border: 1px solid #FBCFE8 !important; border-radius: 6px !important; padding: 10px 15px !important; }
      .forma-pago label { font-weight: 700 !important; color: #831843 !important; }
      .total-box { background: #EC4899 !important; color: white !important; border-radius: 8px !important; box-shadow: 0 4px 12px rgba(236,72,153,0.3) !important; padding: 15px 30px !important; }
      .firma-line { border-top: 1px dashed #9CA3AF !important; }
      
      /* HISTORIAL (Sidebar) Burbujas */
      .pedido-card { background: white !important; border: 1px solid #E5E7EB !important; border-radius: 8px !important; padding: 12px 15px !important; margin-bottom: 12px !important; cursor: pointer !important; transition: all 0.2s !important; }
      .pedido-card:hover { background: #FDF2F8 !important; border-color: #FBCFE8 !important; transform: translateY(-2px) !important; box-shadow: 0 4px 10px rgba(236,72,153,0.1) !important; }
      .pedido-card.selected { background: #FCE7F3 !important; border-color: #EC4899 !important; border-left: 5px solid #EC4899 !important; }
      .pcard-top { display: flex !important; justify-content: space-between !important; margin-bottom: 5px !important; color: #831843 !important; font-size: 13px !important; }
      .pcard-mid { font-weight: 600 !important; color: #111827 !important; margin-bottom: 5px !important; font-size: 15px !important; }
      .pcard-bot { font-size: 14px !important; color: #EC4899 !important; font-weight: 700 !important; }
      .pside-list { padding-top: 15px !important; }
      
      /* REGLAS DE IMPRESIÓN PARA SAFARI/IPAD */
      @media print {
        body.printing-pedidos * { visibility: hidden; }
        body.printing-pedidos #hoja-print,
        body.printing-pedidos #hoja-print * { visibility: visible; }
        
        /* Romper todos los contenedores elásticos para que tome toda la hoja */
        body.printing-pedidos,
        body.printing-pedidos html,
        body.printing-pedidos .main-content,
        body.printing-pedidos .app-section,
        body.printing-pedidos #section-pedidos,
        body.printing-pedidos .pedidos-layout,
        body.printing-pedidos .pedidos-main {
          display: block !important;
          position: static !important;
          height: auto !important;
          min-height: auto !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Ocultar barra superior, menú y botones */
        body.printing-pedidos .app-header,
        body.printing-pedidos .sidebar,
        body.printing-pedidos .pedidos-sidebar,
        body.printing-pedidos .no-print {
          display: none !important;
        }
        
        /* Acomodar la nota arriba a la izquierda */
        body.printing-pedidos #hoja-print {
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Forzar colores en la impresión */
        body.printing-pedidos #hoja-print {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── DATOS ───────────────────────────────────────────────────────────────

  function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { notas: [] };
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function today() {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function fmt(num) {
    if (isNaN(num)) return '0';
    return Number(num).toLocaleString('es-PY', { maximumFractionDigits: 0 });
  }

  // ── RENDER ──────────────────────────────────────────────────────────────

  function render() {
    const container = document.getElementById('section-pedidos');
    if (!container) return;

    const data = loadData();

    if (!currentPedidoId && data.notas.length > 0) {
      currentPedidoId = data.notas[0].id;
    }

    // Ordenar notas de más reciente a más antigua
    const sortedNotas = [...data.notas].sort((a, b) => b.nro - a.nro);

    container.innerHTML = `
      <div class="pedidos-layout">
        <!-- BARRA LATERAL: HISTORIAL -->
        <aside class="pedidos-sidebar no-print">
          <div class="pside-header">
            <h3>📝 Historial</h3>
            <button class="btn-primary" data-action="new-pedido">+ Nueva</button>
          </div>
          <div class="pside-list">
            ${sortedNotas.length === 0 ? '<p class="empty-msg">No hay notas guardadas.</p>' : ''}
            ${sortedNotas.map(n => buildSidebarCard(n)).join('')}
          </div>
        </aside>

        <!-- ÁREA PRINCIPAL: LA NOTA (HOJA) -->
        <main class="pedidos-main">
          ${currentPedidoId ? buildNotaSheet(data.notas.find(n => n.id === currentPedidoId)) : '<div class="empty-state no-print">Seleccioná o creá una nota de pedido</div>'}
        </main>
      </div>
    `;

    setupEvents(container);
  }

  function buildSidebarCard(n) {
    const isSelected = n.id === currentPedidoId ? 'selected' : '';
    const total = calculateTotal(n.items);
    return `
      <div class="pedido-card ${isSelected}" data-action="select-pedido" data-id="${n.id}">
        <div class="pcard-top">
          <strong>Nro. ${String(n.nro).padStart(4, '0')}</strong>
          <span class="pcard-fecha">${n.fecha || ''}</span>
        </div>
        <div class="pcard-mid">${esc(n.nombre) || 'Sin nombre'}</div>
        <div class="pcard-bot">Total: ₲${fmt(total)}</div>
      </div>
    `;
  }

  function buildNotaSheet(n) {
    if (!n) return '';
    const total = calculateTotal(n.items);

    return `
      <div class="nota-toolbar no-print">
        <button class="btn-outline row-del" data-action="delete-pedido" style="width: auto; padding: 4px 12px; margin-right: auto; font-size: 14px;">🗑️ Eliminar</button>
        <button class="btn-primary" data-action="print-pdf">🖨️ Guardar PDF</button>
      </div>

      <div class="hoja-pedido" id="hoja-print">
        <!-- CABECERA -->
        <div class="hoja-header" style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 15px;">
          <!-- MEMBRETE BANNER (Solo impresión) -->
          <div class="hoja-logo-box print-only" style="display: none; flex: 0 0 60%; text-align: left;">
            <img src="assets/logo_header.jpeg" alt="Membrete Tamarama" style="width: 100%; max-width: 420px; height: auto; object-fit: contain; mix-blend-mode: multiply;">
          </div>
          
          <div class="hoja-title-box" style="margin-left: auto; text-align: right; display: flex; flex-direction: column; justify-content: flex-end;">
            <h1 class="hoja-title" style="font-size: 26px; font-weight: 900; text-transform: uppercase; margin: 0 0 15px 0;">Nota de Pedido</h1>
            <div class="hoja-nro" style="font-size: 18px; display: flex; justify-content: flex-end; align-items: center; gap: 15px;">
              <span style="font-weight: 600;">Nro.</span>
              <input type="number" class="hinp hinp-nro" data-field="nro" value="${n.nro || ''}" style="width: 80px; font-weight: 800; font-size: 22px; text-align: right; border: none; border-bottom: 1px solid #ccc; background: transparent;">
            </div>
          </div>
        </div>

        <!-- DATOS DEL CLIENTE -->
        <div class="hoja-datos">
          <div class="dato-row">
            <label>Nombre o Razón Social:</label>
            <input type="text" class="hinp pinp-field" data-field="nombre" value="${esc(n.nombre)}">
          </div>
          <div class="dato-row">
            <label>Teléfono:</label>
            <input type="text" class="hinp pinp-field" data-field="telefono" value="${esc(n.telefono)}">
          </div>
          <div class="dato-row">
            <label>Fecha:</label>
            <input type="date" class="hinp pinp-field" data-field="fecha" value="${n.fecha}">
          </div>
        </div>

        <h3 class="detalles-title">Detalles</h3>

        <!-- TABLA -->
        <table class="hoja-table">
          <thead>
            <tr>
              <th style="width: 15%">Cant.</th>
              <th style="width: 45%">Descripción</th>
              <th style="width: 20%">P. Uni.</th>
              <th style="width: 20%">Total</th>
              <th class="no-print" style="width: 40px"></th>
            </tr>
          </thead>
          <tbody>
            ${n.items.map(item => buildItemRow(item)).join('')}
          </tbody>
        </table>
        
        <div class="add-item-box no-print">
          <button class="btn-outline" data-action="add-item">+ Agregar fila</button>
        </div>

        <!-- FOOTER DE LA HOJA -->
        <div class="hoja-footer" style="display: flex; flex-direction: column; margin-top: 20px;">
          
          <!-- FILA SUPERIOR: PAGO Y TOTAL -->
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 30px;">
            <div class="forma-pago" style="margin-bottom: 0;">
              <label>Forma de Pago:</label>
              <label class="cb-label"><input type="checkbox" class="cb-pago" data-field="pEfectivo" ${n.pEfectivo ? 'checked' : ''}> Efectivo</label>
              <label class="cb-label"><input type="checkbox" class="cb-pago" data-field="pTransf" ${n.pTransf ? 'checked' : ''}> Transf.</label>
              <label class="cb-label"><input type="checkbox" class="cb-pago" data-field="pQR" ${n.pQR ? 'checked' : ''}> QR</label>
            </div>

            <div class="total-box" style="width: auto; min-width: 200px; padding: 15px 30px;">
              <span>TOTAL</span>
              <strong class="hoja-total-valor">₲${fmt(total)}</strong>
            </div>
          </div>

          <!-- FILA INFERIOR: FIRMAS (Una al lado de la otra) -->
          <div class="firmas-area" style="display: flex; flex-direction: row !important; width: 100%; justify-content: space-around; margin-top: 80px;">
            <div class="firma-box" style="flex: 0 0 35%;">
              <div class="firma-line"></div>
              <span>Firma del Cliente</span>
            </div>
            <div class="firma-box" style="flex: 0 0 35%;">
              <img class="sello-pagado-img print-only" src="assets/sello_pagado.png" alt="Sello Pagado" style="display: none; position: absolute; top: -85px; left: 50%; transform: translateX(-50%) rotate(-10deg); width: 130px; height: auto; z-index: 10;">
              <div class="firma-line" style="position: relative; z-index: 5;"></div>
              <span>Firma de Propietario</span>
            </div>
          </div>
          
        </div>
      </div>
    `;
  }

  function buildItemRow(item) {
    const total = (Number(item.cantidad) || 0) * (Number(item.precioUnit) || 0);
    return `
      <tr class="hrow" data-item-id="${item.id}">
        <td>
          <input class="cell-inp cell-num item-inp" type="text" inputmode="numeric" data-ifield="cantidad" value="${item.cantidad ? fmt(item.cantidad) : ''}">
        </td>
        <td>
          <input class="cell-inp item-inp" type="text" data-ifield="descripcion" value="${esc(item.descripcion)}">
        </td>
        <td>
          <div class="precio-cell">
            <span class="precio-prefix">₲</span>
            <input class="cell-inp cell-num item-inp" type="text" inputmode="numeric" data-ifield="precioUnit" value="${item.precioUnit ? fmt(item.precioUnit) : ''}">
          </div>
        </td>
        <td class="htotal">
          ₲${fmt(total)}
        </td>
        <td class="no-print" style="text-align:center;">
          <button class="row-del" data-action="delete-item" data-item-id="${item.id}" type="button" style="width: 28px; height: 28px; padding:0; display:flex; justify-content:center; align-items:center;">×</button>
        </td>
      </tr>
    `;
  }

  function calculateTotal(items) {
    if (!items || !items.length) return 0;
    return items.reduce((acc, it) => acc + ((Number(it.cantidad)||0) * (Number(it.precioUnit)||0)), 0);
  }

  // ── EVENTOS ─────────────────────────────────────────────────────────────

  function setupEvents(container) {
    if (container.dataset.eventsAttached) return;
    container.dataset.eventsAttached = 'true';

    container.addEventListener('click', function(e) {
      // Nueva Nota
      if (e.target.closest('[data-action="new-pedido"]')) {
        const d = loadData();
        const newId = uid();
        
        // Auto-incrementar Nro
        let maxNro = 0;
        d.notas.forEach(n => {
           if(Number(n.nro) > maxNro) maxNro = Number(n.nro);
        });

        d.notas.push({
          id: newId,
          nro: maxNro + 1,
          nombre: '',
          telefono: '',
          fecha: today(),
          items: [],
          pEfectivo: false,
          pTransf: false,
          pQR: false
        });
        saveData(d);
        currentPedidoId = newId;
        render();
        return;
      }

      // Seleccionar Nota
      const card = e.target.closest('[data-action="select-pedido"]');
      if (card) {
        currentPedidoId = card.dataset.id;
        render();
        return;
      }

      // Eliminar Nota
      if (e.target.closest('[data-action="delete-pedido"]')) {
        if (!confirm('¿Eliminar esta Nota de Pedido?')) return;
        const d = loadData();
        d.notas = d.notas.filter(n => n.id !== currentPedidoId);
        saveData(d);
        currentPedidoId = null;
        render();
        return;
      }

      // Añadir fila
      if (e.target.closest('[data-action="add-item"]')) {
        const d = loadData();
        const nota = d.notas.find(n => n.id === currentPedidoId);
        if (nota) {
          nota.items.push({ id: uid(), cantidad: '', descripcion: '', precioUnit: '' });
          saveData(d);
          render();
        }
        return;
      }

      // Eliminar fila
      const delBtn = e.target.closest('[data-action="delete-item"]');
      if (delBtn) {
        const d = loadData();
        const nota = d.notas.find(n => n.id === currentPedidoId);
        if (nota) {
          nota.items = nota.items.filter(i => i.id !== delBtn.dataset.itemId);
          saveData(d);
          render();
        }
        return;
      }

      // Guardar PDF (Imprimir)
      if (e.target.closest('[data-action="print-pdf"]')) {
        window.scrollTo(0, 0);
        document.body.classList.add('printing-pedidos');
        setTimeout(() => {
          window.print();
          setTimeout(() => document.body.classList.remove('printing-pedidos'), 1000);
        }, 150);
        return;
      }
    });

    // Auto-guardar y Formatear
    container.addEventListener('input', function(e) {
      const d = loadData();
      const nota = d.notas.find(n => n.id === currentPedidoId);
      if (!nota) return;

      // Checkboxes (forma de pago)
      if (e.target.matches('.cb-pago')) {
        const field = e.target.dataset.field;
        nota[field] = e.target.checked;
        saveData(d);
        return;
      }

      let rawVal = e.target.value;
      
      // Formato numérico visual
      if (e.target.classList.contains('cell-num')) {
        let numbersOnly = e.target.value.replace(/\D/g, '');
        e.target.value = numbersOnly ? fmt(numbersOnly) : '';
        rawVal = numbersOnly;
      }

      // Campos de la Nota (nombre, telefono, fecha, nro)
      if (e.target.matches('.pinp-field, .hinp-nro')) {
        const field = e.target.dataset.field;
        nota[field] = (field === 'nro') ? (rawVal === '' ? '' : parseInt(rawVal, 10)) : e.target.value;
        saveData(d);
        
        // Actualizaciones DOM en vivo sin render para no perder foco
        if (field === 'nombre') {
           const scard = container.querySelector(`.pedido-card[data-id="${nota.id}"] .pcard-mid`);
           if (scard) scard.textContent = nota.nombre || 'Sin nombre';
        }
        if (field === 'fecha') {
           const scardF = container.querySelector(`.pedido-card[data-id="${nota.id}"] .pcard-fecha`);
           if (scardF) scardF.textContent = nota.fecha || '';
        }
        if (field === 'nro') {
           const scardN = container.querySelector(`.pedido-card[data-id="${nota.id}"] strong`);
           if (scardN) scardN.textContent = `Nro. ${String(nota.nro).padStart(4, '0')}`;
        }
        return;
      }

      // Campos de Artículos
      if (e.target.matches('.item-inp')) {
        const row = e.target.closest('.hrow');
        const itemId = row.dataset.itemId;
        const item = nota.items.find(i => i.id === itemId);
        
        if (item) {
          const field = e.target.dataset.ifield;
          item[field] = e.target.classList.contains('cell-num')
            ? (rawVal === '' ? '' : parseFloat(rawVal))
            : e.target.value;
          saveData(d);

          // Actualizar total visual
          if (field === 'cantidad' || field === 'precioUnit') {
            const rTot = (Number(item.cantidad)||0) * (Number(item.precioUnit)||0);
            const totalEl = row.querySelector('.htotal');
            if (totalEl) totalEl.textContent = '₲' + fmt(rTot);
            
            // Actualizar total general
            const totalGeneral = calculateTotal(nota.items);
            const hojaTotal = container.querySelector('.hoja-total-valor');
            if (hojaTotal) hojaTotal.textContent = '₲' + fmt(totalGeneral);
            
            const pcard = container.querySelector(`.pedido-card[data-id="${nota.id}"] .pcard-bot`);
            if (pcard) pcard.textContent = 'Total: ₲' + fmt(totalGeneral);
          }
        }
      }
    });
  }

  // ── INIT ────────────────────────────────────────────────────────────────

  function init() {
    const data = loadData();
    // Auto-limpieza: eliminar notas vacías (borradores descartados)
    const initLen = data.notas.length;
    data.notas = data.notas.filter(n => n.nombre?.trim() || n.telefono?.trim() || n.items.length > 0);
    if (data.notas.length !== initLen) {
      saveData(data);
      if (currentPedidoId && !data.notas.find(n => n.id === currentPedidoId)) {
        currentPedidoId = null;
      }
    }
    render();
  }

  return { init };
})();
