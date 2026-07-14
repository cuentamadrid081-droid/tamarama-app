/**
 * TAMARAMA — Módulo de Ventas
 * Registro de ventas con panel de estadísticas
 */

const VentasModule = (() => {
  'use strict';

  const STORAGE_KEY = 'tamarama_ventas_v1';
  let panelOpen = false;

  // Inyectar estilos para el autocompletado y botones de stock
  if (!document.getElementById('ventas-ac-styles')) {
    const style = document.createElement('style');
    style.id = 'ventas-ac-styles';
    style.textContent = `
      .autocomplete-list { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #E5E7EB; border-radius: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-height: 200px; overflow-y: auto; z-index: 100; list-style: none; padding: 0; margin: 4px 0 0 0; display: none; }
      .ac-item { padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #F3F4F6; display: flex; justify-content: space-between; font-size: 14px; color: #374151; transition: background 0.1s; }
      .ac-item:hover { background: #FDF2F8; color: #BE185D; }
      .ac-price { font-weight: 700; color: #EC4899; }
      
      .stock-btn { background: #3B82F6; color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap; }
      .stock-btn:hover { background: #2563EB; }
      .stock-badge { background: #DEF7EC; color: #03543F; border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 700; white-space: nowrap; display: inline-block; }
    `;
    document.head.appendChild(style);
  }

  // ── DATOS ───────────────────────────────────────────────────────────────

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { sales: [], observations: {} };
  }

  function saveData(d) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  }

  function uid() {
    return 'v' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
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

  function formatDateLabel(dateStr) {
    const parts = dateStr.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  }

  // ── LÓGICA DE AUTOCOMPLETADO ────────────────────────────────────────────

  function getStockItems() {
    try {
      const raw = localStorage.getItem('tamarama_stock_v1');
      if (raw) {
        const d = JSON.parse(raw);
        let items = [];
        (d.categories || []).forEach(c => items = items.concat(c.items || []));
        return items;
      }
    } catch(e) {}
    return [];
  }

  function showAutocomplete(input) {
    const term = input.value.trim().toLowerCase();
    
    let ac = document.getElementById('ventas-ac-dropdown');
    if (!ac) {
      ac = document.createElement('ul');
      ac.id = 'ventas-ac-dropdown';
      ac.className = 'autocomplete-list';
      document.body.appendChild(ac);
    }
    
    const row = input.closest('tr');
    if (row) ac.dataset.targetRowId = row.dataset.rowId;
    
    if (!term) {
      ac.style.display = 'none';
      return;
    }

    const stock = getStockItems();
    const matches = stock.filter(i => i.description && i.description.toLowerCase().includes(term));
    
    if (matches.length === 0) {
      ac.style.display = 'none';
      return;
    }
    
    ac.innerHTML = matches.map(m => `
      <li class="ac-item" data-desc="${esc(m.description)}" data-price="${m.price || 0}">
        ${esc(m.description)} <span class="ac-price">₲${fmt(m.price || 0)}</span>
      </li>
    `).join('');
    
    // Posicionar justo debajo del input
    const rect = input.getBoundingClientRect();
    ac.style.top = (rect.bottom + window.scrollY) + 'px';
    ac.style.left = (rect.left + window.scrollX) + 'px';
    ac.style.width = rect.width + 'px';
    ac.style.display = 'block';
  }

  // ── RENDER PRINCIPAL ────────────────────────────────────────────────────

  function render() {
    const container = document.getElementById('ventas-container');
    if (!container) return;

    const data = loadData();

    container.innerHTML = `
      <div class="ventas-layout">
        <!-- ZONA PRINCIPAL: TABLA -->
        <div class="ventas-main">
          <div class="section-topbar">
            <div>
              <h2 class="section-main-title">🛒 Registro de Ventas</h2>
              <p class="section-main-sub">Registrá cada venta del día</p>
            </div>
            <button class="add-row-btn" data-action="add-sale" type="button">
              ＋ Agregar venta
            </button>
          </div>

          <div class="table-wrap">
            <table class="ventas-table">
              <thead>
                <tr>
                  <th class="th-vcant">Cantidad</th>
                  <th class="th-vdesc">Descripción</th>
                  <th class="th-vprecio">P. Unitario</th>
                  <th class="th-vtotal">Total</th>
                  <th class="th-vfecha">Fecha</th>
                  <th class="th-vstock" style="width: 100px; text-align: center;">Stock</th>
                  <th class="th-vdel"></th>
                </tr>
              </thead>
              <tbody id="ventas-tbody">
                ${data.sales.length === 0
                  ? `<tr class="empty-row">
                       <td colspan="7">
                         <div class="compras-empty">
                           <span class="empty-icon" style="font-size:40px;">🛒</span>
                           <p>Todavía no hay ventas registradas.</p>
                           <p>Tocá <strong>＋ Agregar venta</strong> para comenzar.</p>
                         </div>
                       </td>
                     </tr>`
                  : data.sales.map(s => buildSaleRow(s)).join('')
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- FLECHA PARA ABRIR PANEL -->
        <button class="stats-toggle" data-action="toggle-panel" type="button"
                aria-label="Abrir estadísticas">
          <span class="stats-toggle-arrow ${panelOpen ? 'open' : ''}">❮</span>
        </button>

        <!-- PANEL LATERAL: ESTADÍSTICAS -->
        <aside class="ventas-panel ${panelOpen ? 'open' : ''}" id="ventas-panel">
          <div class="panel-header">
            <h3 class="panel-title">📊 Ventas</h3>
            <p class="panel-subtitle">Estadísticas de ventas</p>
          </div>
          <div class="panel-body" id="panel-body">
            ${buildStatsContent(data)}
          </div>
        </aside>
      </div>
    `;

    setupEvents(container);

    // Dibujar gráficos después de insertar HTML
    setTimeout(() => drawCharts(data), 50);
  }

  // ── FILA DE VENTA ───────────────────────────────────────────────────────

  function buildSaleRow(s) {
    const total = (Number(s.cantidad) || 0) * (Number(s.precioUnit) || 0);
    return `
      <tr class="ventas-row" data-row-id="${s.id}">
        <td class="td-vcant">
          <input class="cell-inp cell-num" type="text" data-field="cantidad"
                 value="${s.cantidad ? fmt(s.cantidad) : ''}" placeholder="0"
                 inputmode="numeric">
        </td>
        <td class="td-vdesc">
          <input class="cell-inp" type="text" data-field="descripcion"
                 value="${esc(s.descripcion ?? '')}" placeholder="Descripción" autocomplete="off">
        </td>
        <td class="td-vprecio">
          <div class="precio-cell">
            <span class="precio-prefix">₲</span>
            <input class="cell-inp cell-num precio-inp" type="text"
                   data-field="precioUnit"
                   value="${s.precioUnit ? fmt(s.precioUnit) : ''}" placeholder="0"
                   inputmode="numeric">
          </div>
        </td>
        <td class="td-vtotal">
          <span class="vtotal-display">₲${fmt(total)}</span>
        </td>
        <td class="td-vfecha">
          <input class="cell-inp cell-date" type="date" data-field="fecha"
                 value="${s.fecha ?? today()}">
        </td>
        <td class="td-vstock" style="text-align: center; vertical-align: middle;">
          ${s.stockDeducted
            ? `<span class="stock-badge">✅ Listo</span>`
            : `<button class="stock-btn" data-action="deduct-stock" data-row-id="${s.id}" type="button">📦 Descontar</button>`
          }
        </td>
        <td class="td-vdel">
          <button class="row-del" data-action="delete-sale"
                  data-row-id="${s.id}" type="button" aria-label="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
  }

  // ── PANEL DE ESTADÍSTICAS ───────────────────────────────────────────────

  function buildStatsContent(data) {
    const salesByDate = groupByDate(data.sales);
    const dates = Object.keys(salesByDate).sort().reverse();

    if (dates.length === 0) {
      return `
        <div class="stats-empty">
          <span style="font-size:36px;">📈</span>
          <p>Las estadísticas aparecerán cuando registres ventas.</p>
        </div>
      `;
    }

    return `
      <div class="stats-accordion">
        ${dates.map((date, idx) => {
          const daySales = salesByDate[date];
          const dayTotal = daySales.reduce((s, v) =>
            s + (Number(v.cantidad)||0) * (Number(v.precioUnit)||0), 0);
          const dayItems = daySales.reduce((s, v) => s + (Number(v.cantidad)||0), 0);
          const obs = data.observations?.[date] ?? '';
          const isToday = date === today();

          return `
            <div class="acc-section ${idx === 0 ? 'expanded' : ''}" data-date="${date}">
              <button class="acc-header" data-action="toggle-acc" data-date="${date}" type="button">
                <span class="acc-date-label">
                  ${isToday ? '🟢 ' : ''}${formatDateLabel(date)}
                </span>
                <span class="acc-summary">₲${fmt(dayTotal)}</span>
                <span class="acc-chevron">${idx === 0 ? '▾' : '▸'}</span>
              </button>
              <div class="acc-body" ${idx !== 0 ? 'style="display:none;"' : ''}>

                <!-- 1. Calcular ganancia -->
                <div class="stat-block">
                  <div class="stat-block-head">
                    <span class="stat-ico">💰</span> Ganancia del día
                  </div>
                  <div class="stat-block-body">
                    <div class="ganancia-row">
                      <span class="ganancia-label">Total vendido</span>
                      <span class="ganancia-val">₲${fmt(dayTotal)}</span>
                    </div>
                    <div class="ganancia-row">
                      <span class="ganancia-label">Artículos vendidos</span>
                      <span class="ganancia-val">${dayItems} uds.</span>
                    </div>
                    <div class="ganancia-row ganancia-highlight">
                      <span class="ganancia-label">Ganancia</span>
                      <span class="ganancia-val ganancia-total">₲${fmt(dayTotal)}</span>
                    </div>
                  </div>
                </div>

                <!-- 2. Gráfico de ventas -->
                <div class="stat-block">
                  <div class="stat-block-head">
                    <span class="stat-ico">📊</span> Gráfico de ventas
                  </div>
                  <div class="stat-block-body">
                    <canvas class="day-chart" data-chart-date="${date}"
                            width="280" height="160"></canvas>
                  </div>
                </div>

                <!-- 3. Total de ventas del día -->
                <div class="stat-block">
                  <div class="stat-block-head">
                    <span class="stat-ico">🧾</span> Detalle de ventas
                  </div>
                  <div class="stat-block-body">
                    <table class="detail-table">
                      <thead>
                        <tr>
                          <th>Descripción</th>
                          <th>Cant.</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${daySales.map(v => {
                          const t = (Number(v.cantidad)||0)*(Number(v.precioUnit)||0);
                          return `<tr>
                            <td>${esc(v.descripcion || '—')}</td>
                            <td class="txt-center">${v.cantidad || 0}</td>
                            <td class="txt-right">₲${fmt(t)}</td>
                          </tr>`;
                        }).join('')}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colspan="2" class="detail-foot-label">TOTAL DEL DÍA</td>
                          <td class="txt-right detail-foot-val">₲${fmt(dayTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <!-- Observaciones -->
                <div class="stat-block">
                  <div class="stat-block-head">
                    <span class="stat-ico">📝</span> Observaciones
                  </div>
                  <div class="stat-block-body">
                    <textarea class="obs-textarea" data-obs-date="${date}"
                              placeholder="Escribí notas u observaciones del día..."
                              rows="3">${esc(obs)}</textarea>
                  </div>
                </div>

              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function groupByDate(sales) {
    const groups = {};
    sales.forEach(s => {
      const date = s.fecha || today();
      if (!groups[date]) groups[date] = [];
      groups[date].push(s);
    });
    return groups;
  }

  // ── GRÁFICOS (Canvas) ──────────────────────────────────────────────────

  function drawCharts(data) {
    const salesByDate = groupByDate(data.sales);
    const canvases = document.querySelectorAll('.day-chart');

    canvases.forEach(canvas => {
      const date = canvas.dataset.chartDate;
      const daySales = salesByDate[date] || [];
      drawBarChart(canvas, daySales);
    });
  }

  function drawBarChart(canvas, sales) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 10, right: 10, bottom: 30, left: 10 };

    ctx.clearRect(0, 0, W, H);

    if (sales.length === 0) {
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '13px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sin datos', W/2, H/2);
      return;
    }

    // Preparar datos
    const items = sales.map(s => ({
      label: (s.descripcion || '?').substring(0, 10),
      value: (Number(s.cantidad)||0) * (Number(s.precioUnit)||0)
    }));

    const maxVal = Math.max(...items.map(i => i.value), 1);
    const barW = Math.min(40, (W - pad.left - pad.right) / items.length - 6);
    const chartH = H - pad.top - pad.bottom;
    const startX = pad.left + ((W - pad.left - pad.right) - items.length * (barW + 6)) / 2;

    // Colores degradado rosa
    const colors = ['#EC4899','#F472B6','#F9A8D4','#FB923C','#FBBF24','#2DD4BF','#C084FC'];

    items.forEach((item, i) => {
      const barH = (item.value / maxVal) * chartH;
      const x = startX + i * (barW + 6);
      const y = pad.top + chartH - barH;

      // Barra
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      roundRect(ctx, x, y, barW, barH, 4);
      ctx.fill();

      // Label
      ctx.fillStyle = '#6B7280';
      ctx.font = '9px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, x + barW/2, H - 4);

      // Valor arriba
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 9px Poppins, sans-serif';
      ctx.fillText('₲' + fmt(item.value), x + barW/2, y - 3);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, h/2, w/2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, 0);
    ctx.arcTo(x, y + h, x, y, 0);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ── EVENTOS ─────────────────────────────────────────────────────────────

  function setupEvents(container) {
    if (container.dataset.eventsAttached) return;
    container.dataset.eventsAttached = 'true';

    // Cerrar autocompletados si se hace clic fuera o Selección de ítem
    document.addEventListener('click', (e) => {
      // Selección de autocompletado
      const acItem = e.target.closest('.ac-item');
      if (acItem) {
        const ac = acItem.closest('.autocomplete-list');
        const rowId = ac.dataset.targetRowId;
        const row = document.querySelector(`.ventas-row[data-row-id="${rowId}"]`);
        
        if (row) {
          const descInp = row.querySelector('[data-field="descripcion"]');
          const priceInp = row.querySelector('[data-field="precioUnit"]');
          
          descInp.value = acItem.dataset.desc;
          if (priceInp && acItem.dataset.price > 0) {
             priceInp.value = fmt(acItem.dataset.price);
          }
          
          descInp.dispatchEvent(new Event('input', { bubbles: true }));
          if (priceInp) priceInp.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        ac.style.display = 'none';
        return;
      }
      
      if (!e.target.closest('.td-vdesc') && !e.target.closest('.autocomplete-list')) {
        document.querySelectorAll('.autocomplete-list').forEach(l => l.style.display = 'none');
      }
    });

    container.addEventListener('click', function(e) {

      // Agregar venta
      if (e.target.closest('[data-action="add-sale"]')) {
        const d = loadData();
        d.sales.push({
          id: uid(), cantidad: '', descripcion: '',
          precioUnit: '', fecha: today()
        });
        saveData(d);
        render();
        setTimeout(() => {
          const rows = document.querySelectorAll('.ventas-row');
          if (rows.length > 0) {
            rows[rows.length - 1].querySelector('.cell-inp')?.focus();
          }
        }, 50);
        return;
      }

      // Eliminar venta
      const delBtn = e.target.closest('[data-action="delete-sale"]');
      if (delBtn) {
        if (!confirm('¿Eliminar esta venta?')) return;
        const d = loadData();
        d.sales = d.sales.filter(s => s.id !== delBtn.dataset.rowId);
        saveData(d);
        render();
        return;
      }
      
      // Descontar de stock
      const deductBtn = e.target.closest('[data-action="deduct-stock"]');
      if (deductBtn) {
        const rowId = deductBtn.dataset.rowId;
        const d = loadData();
        const sale = d.sales.find(s => s.id === rowId);
        if (!sale) return;
        
        if (!sale.descripcion || !sale.cantidad || Number(sale.cantidad) <= 0) {
          alert('Asegurate de completar la descripción y cantidad de la venta primero.');
          return;
        }

        try {
          const rawStock = localStorage.getItem('tamarama_stock_v1');
          if (!rawStock) { alert('El inventario de stock está vacío.'); return; }
          
          let stockData = JSON.parse(rawStock);
          let found = false;
          let searchTerm = sale.descripcion.trim().toLowerCase();
          
          for (let cat of stockData.categories) {
            for (let item of cat.items) {
              if (item.description && item.description.toLowerCase() === searchTerm) {
                // Encontrado, restar del stock
                let qtyToDeduct = Number(sale.cantidad);
                item.quantity = Math.max(0, (Number(item.quantity) || 0) - qtyToDeduct);
                found = true;
                
                // Registrar movimiento
                if (typeof StockModule !== 'undefined' && StockModule.recordMovement) {
                  StockModule.recordMovement(item.id, item.description, cat.name, -qtyToDeduct, 'Venta');
                }
                break;
              }
            }
            if (found) break;
          }
          
          if (found) {
            localStorage.setItem('tamarama_stock_v1', JSON.stringify(stockData));
            sale.stockDeducted = true;
            saveData(d);
            render();
          } else {
            alert('No se encontró el producto exacto en el stock: "' + sale.descripcion + '"');
          }
        } catch(err) {
          console.error('Error al descontar stock', err);
          alert('Hubo un error al descontar del stock.');
        }
        return;
      }

      // Toggle panel
      if (e.target.closest('[data-action="toggle-panel"]')) {
        panelOpen = !panelOpen;
        render();
        return;
      }

      // Toggle accordion
      const accBtn = e.target.closest('[data-action="toggle-acc"]');
      if (accBtn) {
        const section = accBtn.closest('.acc-section');
        const body = section.querySelector('.acc-body');
        const chevron = accBtn.querySelector('.acc-chevron');
        const isVisible = body.style.display !== 'none';
        body.style.display = isVisible ? 'none' : 'block';
        chevron.textContent = isVisible ? '▸' : '▾';
        section.classList.toggle('expanded', !isVisible);

        // Re-dibujar gráfico al abrir
        if (!isVisible) {
          const data = loadData();
          setTimeout(() => drawCharts(data), 30);
        }
        return;
      }
    });

    // Auto-guardar inputs de la tabla
    container.addEventListener('input', function(e) {
      const input = e.target.closest('.cell-inp');
      if (input) {
        const row = input.closest('[data-row-id]');
        if (!row) return;

        const d = loadData();
        const sale = d.sales.find(s => s.id === row.dataset.rowId);
        if (!sale) return;

        const field = input.dataset.field;
        
        let rawVal = input.value;
        if (input.classList.contains('cell-num')) {
          let numbersOnly = input.value.replace(/\D/g, '');
          input.value = numbersOnly ? fmt(numbersOnly) : '';
          rawVal = numbersOnly;
        }

        sale[field] = input.classList.contains('cell-num')
          ? (rawVal === '' ? '' : parseFloat(rawVal))
          : input.value;
        saveData(d);

        // Actualizar total visual en la misma fila
        if (field === 'cantidad' || field === 'precioUnit') {
          const total = (Number(sale.cantidad)||0) * (Number(sale.precioUnit)||0);
          const totalEl = row.querySelector('.vtotal-display');
          if (totalEl) totalEl.textContent = '₲' + fmt(total);
        }
        
        // Autocompletado si es descripción
        if (field === 'descripcion') {
          showAutocomplete(input);
        }

        // Refrescar panel si está abierto
        if (panelOpen) {
          refreshPanel();
        }
        return;
      }

      // Observaciones
      const obsArea = e.target.closest('.obs-textarea');
      if (obsArea) {
        const d = loadData();
        if (!d.observations) d.observations = {};
        d.observations[obsArea.dataset.obsDate] = obsArea.value;
        saveData(d);
        return;
      }
    });
  }

  function refreshPanel() {
    const panelBody = document.getElementById('panel-body');
    if (!panelBody) return;
    const data = loadData();
    panelBody.innerHTML = buildStatsContent(data);
    setTimeout(() => drawCharts(data), 30);
  }

  // ── INIT ────────────────────────────────────────────────────────────────

  function init() {
    // Auto-limpieza de ventas vacías (borrador)
    const d = loadData();
    if (d && d.sales) {
      const initialCount = d.sales.length;
      d.sales = d.sales.filter(s => s.descripcion && s.descripcion.trim() !== '');
      if (d.sales.length !== initialCount) {
        saveData(d);
      }
    }
    panelOpen = false;
    render();
  }

  return { init };
})();
