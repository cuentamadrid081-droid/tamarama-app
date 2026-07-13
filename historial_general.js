/**
 * TAMARAMA — Historial General
 * Vista centralizada de historiales reales y reportes.
 */

const HistorialGeneral = (() => {
  'use strict';

  let currentView = 'dashboard'; // 'dashboard', 'ventas', 'stock', 'compras', 'arqueo', 'pedidos'

  // Inyectar CSS dinámico para las tarjetas y reportes
  if (!document.getElementById('historial-general-styles')) {
    const style = document.createElement('style');
    style.id = 'historial-general-styles';
    style.textContent = `
      .hg-container {
        padding: 40px;
        max-width: 1200px;
        margin: 0 auto;
      }
      .hg-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #FBCFE8;
        padding-bottom: 10px;
        margin-bottom: 30px;
      }
      .hg-title {
        font-family: 'Poppins', sans-serif;
        font-size: 28px;
        color: #831843;
        margin: 0;
      }
      .btn-volver {
        background: white;
        border: 2px solid #FBCFE8;
        color: #831843;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-volver:hover {
        background: #FDF2F8;
        border-color: #EC4899;
      }
      
      /* Dashboard Grid */
      .hg-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 30px;
      }
      .hg-card {
        background: white;
        border: 2px solid #FBCFE8;
        border-radius: 16px;
        padding: 40px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 6px rgba(236,72,153,0.05);
      }
      .hg-card:hover {
        background: #FDF2F8;
        border-color: #EC4899;
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(236,72,153,0.15);
      }
      .hg-icon { font-size: 54px; margin-bottom: 20px; }
      .hg-label { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 20px; color: #111827; }

      /* Reportes Tabla */
      .hg-report {
        background: white;
        border-radius: 16px;
        border: 1px solid #FBCFE8;
        padding: 20px;
        box-shadow: 0 4px 10px rgba(236,72,153,0.05);
      }
      .hg-filters {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
        background: #FDF2F8;
        padding: 15px;
        border-radius: 8px;
        align-items: center;
      }
      .hg-filters label { font-weight: bold; color: #831843; }
      .hg-filters input { 
        padding: 8px; 
        border: 1px solid #FBCFE8; 
        border-radius: 6px; 
        outline: none;
      }
      .hg-table {
        width: 100%;
        border-collapse: collapse;
      }
      .hg-table th {
        background: #FCE7F3;
        color: #BE185D;
        padding: 12px;
        text-align: left;
        font-weight: bold;
      }
      .hg-table td {
        padding: 12px;
        border-bottom: 1px solid #FCE7F3;
      }
      .empty-msg {
        text-align: center;
        color: #9CA3AF;
        padding: 40px;
        font-size: 16px;
      }
      .total-row {
        background: #FDF2F8;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }

  // Utilidades
  function fmt(num) { return Number(num).toLocaleString('es-PY'); }
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- CARGA DE DATOS ---
  function getVentas() {
    try { const r = localStorage.getItem('tamarama_ventas_v1'); if(r) return JSON.parse(r).sales || []; } catch(e){}
    return [];
  }
  function getCompras() {
    try { const r = localStorage.getItem('tamarama_compras_v1'); if(r) return JSON.parse(r).purchases || []; } catch(e){}
    return [];
  }
  function getArqueos() {
    try { const r = localStorage.getItem('tamarama_arqueo_v1'); if(r) return JSON.parse(r).registros || []; } catch(e){}
    return [];
  }
  function getPedidos() {
    try { const r = localStorage.getItem('tamarama_pedidos_v1'); if(r) return JSON.parse(r).notas || []; } catch(e){}
    return [];
  }

  // --- VISTAS ---

  function renderDashboard() {
    return `
      <div class="hg-header">
        <h2 class="hg-title">- Historial General</h2>
      </div>
      <div class="hg-grid">
        <div class="hg-card" data-target="ventas">
          <span class="hg-icon">🛒</span>
          <span class="hg-label">Ventas</span>
        </div>
        <div class="hg-card" data-target="stock">
          <span class="hg-icon">📦</span>
          <span class="hg-label">Stock</span>
        </div>
        <div class="hg-card" data-target="compras">
          <span class="hg-icon">🛍️</span>
          <span class="hg-label">Compras</span>
        </div>
        <div class="hg-card" data-target="arqueo">
          <span class="hg-icon">💰</span>
          <span class="hg-label">Arqueo</span>
        </div>
        <div class="hg-card" data-target="pedidos">
          <span class="hg-icon">📄</span>
          <span class="hg-label">Nota de Pedido</span>
        </div>
      </div>
    `;
  }

  function renderReportVentas() {
    const ventas = getVentas().sort((a,b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    let totalGeneral = 0;
    
    let html = `
      <div class="hg-header">
        <h2 class="hg-title">🛒 Reporte de Ventas</h2>
        <button class="btn-volver" id="btn-volver">← Volver al Menú</button>
      </div>
      <div class="hg-report">
        <div class="hg-filters">
          <label>Filtro por venir...</label>
        </div>
        <table class="hg-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (ventas.length === 0) {
      html += '<tr><td colspan="3" class="empty-msg">No hay ventas registradas.</td></tr>';
    } else {
      ventas.forEach(v => {
        const fechaStr = v.fecha || 'Sin fecha';
        let desc = '';
        const qty = Number(v.cantidad) || 0;
        const price = Number(v.precioUnit) || 0;
        const sub = qty * price;
        
        desc = v.descripcion || 'Venta sin descripción';
        
        totalGeneral += sub;
        
        html += `
          <tr>
            <td>${fechaStr}</td>
            <td>${qty}x ${esc(desc)}</td>
            <td>₲${fmt(sub)}</td>
          </tr>
        `;
      });
      html += `
          <tr class="total-row">
            <td colspan="2" style="text-align: right;">TOTAL ACUMULADO:</td>
            <td>₲${fmt(totalGeneral)}</td>
          </tr>
      `;
    }

    html += `</tbody></table></div>`;
    return html;
  }

  function renderReportCompras() {
    const compras = getCompras().sort((a,b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    let html = `
      <div class="hg-header">
        <h2 class="hg-title">🛍️ Reporte de Compras</h2>
        <button class="btn-volver" id="btn-volver">← Volver al Menú</button>
      </div>
      <div class="hg-report">
        <table class="hg-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor/Desc</th>
              <th>Estado</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    if (compras.length === 0) {
      html += '<tr><td colspan="4" class="empty-msg">No hay compras registradas.</td></tr>';
    } else {
      compras.forEach(c => {
        const fechaStr = c.fecha || 'Sin fecha';
        const proveedorStr = c.proveedor || '';
        const descStr = c.descripcion || '';
        const pagado = false; // Compras.js no guarda "isPaid" por defecto
        html += `
          <tr>
            <td>${fechaStr}</td>
            <td>${esc(proveedorStr)} - ${esc(descStr)}</td>
            <td><span style="color:gray">-</span></td>
            <td>₲${fmt(c.precioTotal || 0)}</td>
          </tr>
        `;
      });
    }
    html += `</tbody></table></div>`;
    return html;
  }

  function renderReportArqueo() {
    const arqueos = getArqueos().sort((a,b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    let html = `
      <div class="hg-header">
        <h2 class="hg-title">💰 Historial de Arqueos</h2>
        <button class="btn-volver" id="btn-volver">← Volver al Menú</button>
      </div>
      <div class="hg-report">
        <table class="hg-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Total Sistema</th>
              <th>Total Real</th>
              <th>Diferencia</th>
            </tr>
          </thead>
          <tbody>
    `;
    if (arqueos.length === 0) {
      html += '<tr><td colspan="4" class="empty-msg">No hay arqueos registrados.</td></tr>';
    } else {
      arqueos.forEach(a => {
        const fechaStr = a.fecha || 'Sin fecha';
        const difColor = a.diferencia < 0 ? 'red' : (a.diferencia > 0 ? 'green' : 'black');
        html += `
          <tr>
            <td>${fechaStr}</td>
            <td>₲${fmt(a.totalSistema)}</td>
            <td>₲${fmt(a.totalCaja)}</td>
            <td style="color:${difColor}; font-weight:bold;">₲${fmt(a.diferencia)}</td>
          </tr>
        `;
      });
    }
    html += `</tbody></table></div>`;
    return html;
  }

  function renderReportPedidos() {
    const pedidos = getPedidos().sort((a,b) => b.nro - a.nro);
    let html = `
      <div class="hg-header">
        <h2 class="hg-title">📄 Historial de Notas de Pedido</h2>
        <button class="btn-volver" id="btn-volver">← Volver al Menú</button>
      </div>
      <div class="hg-report">
        <table class="hg-table">
          <thead>
            <tr>
              <th>Nro.</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    if (pedidos.length === 0) {
      html += '<tr><td colspan="4" class="empty-msg">No hay notas registradas.</td></tr>';
    } else {
      pedidos.forEach(p => {
        const total = (p.items || []).reduce((acc, it) => acc + ((Number(it.cantidad) || 0) * (Number(it.precioUnit) || 0)), 0);
        html += `
          <tr>
            <td>${String(p.nro).padStart(4, '0')}</td>
            <td>${esc(p.fecha)}</td>
            <td>${esc(p.nombre) || 'Sin nombre'}</td>
            <td>₲${fmt(total)}</td>
          </tr>
        `;
      });
    }
    html += `</tbody></table></div>`;
    return html;
  }

  function getStockMovs() {
    try { const r = localStorage.getItem('tamarama_stock_mov_v1'); if(r) return JSON.parse(r) || []; } catch(e){}
    return [];
  }

  function renderReportStock() {
    const movs = getStockMovs().sort((a,b) => b.timestamp - a.timestamp);
    let html = `
      <div class="hg-header">
        <h2 class="hg-title">📦 Historial de Stock (Movimientos)</h2>
        <button class="btn-volver" id="btn-volver">← Volver al Menú</button>
      </div>
      <div class="hg-report">
        <table class="hg-table">
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Producto (Categoría)</th>
              <th>Movimiento</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
    `;
    if (movs.length === 0) {
      html += '<tr><td colspan="4" class="empty-msg">No hay movimientos de stock registrados desde la activación del historial.</td></tr>';
    } else {
      movs.forEach(m => {
        const d = new Date(m.timestamp);
        const fechaStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
        const movColor = m.qtyChange > 0 ? 'green' : (m.qtyChange < 0 ? 'red' : 'black');
        const qtyPrefix = m.qtyChange > 0 ? '+' : '';
        html += `
          <tr>
            <td>${fechaStr}</td>
            <td>${esc(m.itemName)} <small style="color:gray;">(${esc(m.catName)})</small></td>
            <td style="color:${movColor}; font-weight:bold;">${qtyPrefix}${m.qtyChange}</td>
            <td>${esc(m.typeDesc)}</td>
          </tr>
        `;
      });
    }
    html += `</tbody></table></div>`;
    return html;
  }

  // --- CONTROLADOR CENTRAL ---

  function render() {
    const container = document.getElementById('section-historial');
    if (!container) return;

    let content = '';
    switch(currentView) {
      case 'ventas': content = renderReportVentas(); break;
      case 'compras': content = renderReportCompras(); break;
      case 'arqueo': content = renderReportArqueo(); break;
      case 'pedidos': content = renderReportPedidos(); break;
      case 'stock': content = renderReportStock(); break;
      default: content = renderDashboard(); break;
    }

    container.innerHTML = `<div class="hg-container">${content}</div>`;
    setupEvents(container);
  }

  function setupEvents(container) {
    // Eventos Dashboard
    if (currentView === 'dashboard') {
      const cards = container.querySelectorAll('.hg-card');
      cards.forEach(card => {
        card.addEventListener('click', (e) => {
          currentView = e.currentTarget.dataset.target;
          render();
        });
      });
    } else {
      // Evento Volver
      const btn = container.querySelector('#btn-volver');
      if (btn) {
        btn.addEventListener('click', () => {
          currentView = 'dashboard';
          render();
        });
      }
    }
  }

  function init() {
    currentView = 'dashboard'; // Al abrir el tab, siempre mostrar grid
    render();
  }

  return { init, refresh: render };
})();
