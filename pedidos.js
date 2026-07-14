/**
 * TAMARAMA — Módulo de Nota de Pedido (Sistema Drag & Drop)
 * Editor visual: imagen SVG como fondo, campos arrastrables y redimensionables.
 */
const PedidosModule = (() => {
  'use strict';
  const KEY     = 'tamarama_pedidos_v2';
  const POS_KEY = 'tamarama_pedidos_pos_v2';

  // Generar posiciones por defecto
  const DEFAULT_POS = {
    nro:          { top:11.8, left:85,  w:10, h:3.5 },
    nombre:       { top:18.5, left:33.5,w:56, h:3   },
    telefono:     { top:22.8, left:19,  w:71, h:3   },
    fecha:        { top:27.2, left:16.5,w:73.5, h:3 },
    
    efectivo:     { top:82.1, left:25.5,w:2.5,h:2   },
    transferencia:{ top:82.1, left:38.7,w:2.5,h:2   },
    qr:           { top:82.1, left:52,  w:2.5,h:2   },
    total:        { top:82,   left:79,  w:15, h:4   },
  };

  // Generar las 10 filas de la tabla
  for (let i = 0; i < 10; i++) {
    const topY = 40.5 + (i * 3.69);
    DEFAULT_POS['cant'+i] = { top: topY, left: 5,   w:13.5, h: 3.5 };
    DEFAULT_POS['desc'+i] = { top: topY, left: 19.5,w:46,   h: 3.5 };
    DEFAULT_POS['puni'+i] = { top: topY, left: 67,  w:11,   h: 3.5 };
    DEFAULT_POS['tot'+i]  = { top: topY, left: 79.5,w:15,   h: 3.5 };
  }

  function loadPos() {
    try {
      const r = localStorage.getItem(POS_KEY);
      if (r) {
        const saved = JSON.parse(r);
        return {
          fields: {...DEFAULT_POS, ...(saved.fields||{})},
          custom: saved.custom || [],
          fontSize: saved.fontSize || 16,
        };
      }
    } catch(e){}
    return { fields: JSON.parse(JSON.stringify(DEFAULT_POS)), custom: [], fontSize: 16 };
  }
  function savePos(p) { localStorage.setItem(POS_KEY, JSON.stringify(p)); }

  function load() {
    try { const r = localStorage.getItem(KEY); if(r) return JSON.parse(r); } catch(e){}
    return { notas:[], next:1 };
  }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }
  function uid() { return 'np'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function esc(s) { return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(num) {
    if (isNaN(num)) return '0';
    return Number(num).toLocaleString('es-PY', { maximumFractionDigits: 0 });
  }
  function today() { return new Date().toISOString().split('T')[0]; }

  let current    = null;
  let designMode = false;
  let fontMode   = false;

  function init() {
    const c = document.getElementById('section-pedidos');
    if (c) render(c);
  }

  // ── RENDER PRINCIPAL ─────────────────────────────────────────────
  function render(c) {
    if (!c) c = document.getElementById('section-pedidos');
    if (!c) return;
    const d   = load();
    const pos = loadPos();
    
    if (!current && d.notas.length > 0) current = d.notas[d.notas.length-1].id;
    const n   = current ? d.notas.find(x => x.id === current) : null;
    const fs  = pos.fontSize;

    let rowsHTML = '';
    if (n) {
      for(let i=0; i<10; i++) {
        rowsHTML += renderStdField('cant'+i, 'Cant', n['cant'+i], pos.fields, fs, true);
        rowsHTML += renderStdField('desc'+i, 'Desc', n['desc'+i], pos.fields, fs, false);
        rowsHTML += renderStdField('puni'+i, 'P.Uni', n['puni'+i], pos.fields, fs, true);
        rowsHTML += renderStdField('tot'+i, 'Total', n['tot'+i], pos.fields, fs, true, true);
      }
    }

    c.innerHTML = `
<style>
  /* Scoped styles */
  .npw-handle-wrap { position:absolute; }
  .npw-inp-base {
    width:100%; height:100%; box-sizing:border-box;
    border:none; border-radius:0; outline:none;
    background:transparent; box-shadow:none;
    -webkit-appearance:none; appearance:none;
    font-family:Nunito,Arial,sans-serif;
    color:#111; padding:0 2%; display:block;
  }
  .npw-inp-base:focus { outline:none; box-shadow:none; }
  .npw-inp-base.num-align { text-align: right; }

  /* Borde en modo diseño */
  .design-on .npw-handle-wrap { cursor:move; }
  .design-on .npw-handle-wrap .npw-inp-base {
    background:rgba(237,233,254,0.55);
    border:2px dashed rgba(124,58,237,0.85) !important;
    border-radius:3px;
    pointer-events:none;
  }

  /* Handles de resize (esquinas) */
  .npw-rz {
    display:none;
    position:absolute;
    width:12px; height:12px;
    background:#7C3AED;
    border:2px solid #fff;
    border-radius:2px;
    z-index:30;
  }
  .design-on .npw-rz { display:block; cursor:nwse-resize; }
  .npw-rz-nw { top:-6px;    left:-6px;    cursor:nwse-resize; }
  .npw-rz-ne { top:-6px;    right:-6px;   cursor:nesw-resize; }
  .npw-rz-sw { bottom:-6px; left:-6px;    cursor:nesw-resize; }
  .npw-rz-se { bottom:-6px; right:-6px;   cursor:nwse-resize; }

  /* Botón borrar campo custom */
  .npw-del-custom {
    display:none;
    position:absolute;
    top:-11px; right:14px;
    width:18px; height:18px;
    background:#EF4444;
    color:#fff;
    border:none; border-radius:50%;
    font-size:11px; font-weight:700;
    cursor:pointer; z-index:31;
    line-height:18px; text-align:center;
  }
  .design-on .npw-del-custom { display:block; }

  /* Label del campo en modo diseño */
  .npw-field-label {
    display:none;
    position:absolute;
    top:-18px; left:0;
    font-size:9px; font-weight:700;
    color:#7C3AED; white-space:nowrap;
    background:rgba(237,233,254,0.9);
    padding:1px 4px; border-radius:2px;
    pointer-events:none;
    z-index:29;
  }
  .design-on .npw-field-label { display:block; }
</style>

<style media="print">
  body.printing-pedidos * { visibility: hidden; }
  body.printing-pedidos #np-hoja-print, 
  body.printing-pedidos #np-hoja-print * { visibility: visible; }
  
  body.printing-pedidos,
  body.printing-pedidos html,
  body.printing-pedidos .main-content,
  body.printing-pedidos .app-section,
  body.printing-pedidos #section-pedidos,
  body.printing-pedidos #section-pedidos > div,
  body.printing-pedidos #section-pedidos > div > div {
    display: block !important;
    position: static !important;
    height: auto !important;
    min-height: auto !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body.printing-pedidos aside,
  body.printing-pedidos .app-header,
  body.printing-pedidos .sidebar,
  body.printing-pedidos .no-print { display: none !important; }
  
  body.printing-pedidos #np-hoja-print {
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    box-shadow: none !important;
    page-break-inside: avoid;
  }
  
  body.printing-pedidos #npw-img {
    width: 100% !important;
    height: auto !important;
    display: block !important;
  }
  .npw-inp-base { background: transparent !important; border: none !important; }
  .no-print { display: none !important; }
</style>

<div style="display:flex;height:100%;min-height:100vh;background:#DCDCDC;font-family:Nunito,Arial,sans-serif;">

  <!-- PANEL LATERAL -->
  <aside style="width:230px;flex-shrink:0;background:#fff;border-right:1px solid #ddd;display:flex;flex-direction:column;" class="no-print">
    <div style="padding:14px 12px 10px;border-bottom:1px solid #eee;display:flex;flex-direction:column;gap:8px;">
      <p style="margin:0;font-size:13px;font-weight:800;color:#555;">📝 Notas de Pedido</p>
      <button id="npw-new" style="background:#E91E8C;color:#fff;border:none;border-radius:7px;padding:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;width:100%;">+ Nueva Nota</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:4px 0;">
      ${d.notas.length===0
        ? '<p style="color:#aaa;font-size:12px;padding:10px;">Sin notas aún.</p>'
        : d.notas.slice().reverse().map(x=>`
          <div class="npw-sitem" data-id="${x.id}" style="padding:9px 12px;border-bottom:1px solid #f5f5f5;cursor:pointer;background:${x.id===current?'#fce7f3':'#fff'};border-left:${x.id===current?'3px solid #E91E8C':'3px solid transparent'};">
            <b style="display:flex;justify-content:space-between;font-size:12px;color:#222;">
              <span>Nº${x.nro}</span>
              <span class="sitem-fecha" style="font-weight:normal;color:#777;font-size:10px;">${esc(x.fecha||'')}</span>
            </b>
            <span class="sitem-nombre" style="display:block;font-size:12px;color:#444;margin-top:1px;">${esc(x.nombre||'Sin nombre')}</span>
            <span class="sitem-total" style="display:block;font-size:13px;font-weight:700;color:#E91E8C;margin-top:4px;">₲${fmt(x.total)}</span>
          </div>`).join('')
      }
    </div>
  </aside>

  <!-- ÁREA PRINCIPAL -->
  <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;align-items:center;padding:16px 20px 50px;background:#DCDCDC;">

    ${n ? `
    <!-- TOOLBAR -->
    <div style="display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px;width:100%;max-width:700px;margin-bottom:8px;" class="no-print">
      
      <button id="npw-toggle-design"
        style="background:${designMode?'#7C3AED':'#6B7280'};color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
        ${designMode?'✅ Listo (salir del modo diseño)':'🎨 Modo Diseño'}
      </button>

      ${designMode ? `
      <button id="npw-add-box"
        style="background:#059669;color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
        ➕ Agregar cuadro
      </button>
      <button id="npw-reset-pos" style="background:#EF4444;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit;">↺ Resetear Layout</button>
      ` : ''}

      <button id="npw-toggle-fontmode" style="background:${fontMode?'#7C3AED':'#6B7280'};color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;font-family:inherit;">
        ${fontMode ? '✅ Guardar tamaños' : '🔤 Tamaños de letra'}
      </button>
      <button class="npw-del-nota" data-del="${n.id}" style="background:transparent;border:1px solid #ccc;border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;font-family:inherit;color:#555;">🗑️ Eliminar</button>
      <button id="npw-print" style="background:#E91E8C;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">🖨️ PDF</button>
    </div>

    ${designMode ? `
    <div style="background:#7C3AED;color:#fff;padding:7px 16px;border-radius:8px;margin-bottom:8px;font-size:11px;text-align:center;width:100%;max-width:700px;" class="no-print">
      🎨 Arrastrá los campos · Arrastrá las esquinas para cambiar el tamaño · Botón <b>➕</b> para agregar más cuadros
    </div>` : ''}

    <!-- CONTENEDOR DE LA HOJA -->
    <div id="np-hoja-print" class="${designMode?'design-on':''}" style="position:relative;width:100%;max-width:700px;box-shadow:0 3px 24px rgba(0,0,0,0.15);aspect-ratio:1055/1491;container-type:inline-size;background:#fff;">

      <img src="assets/nota_pedido_form.svg" id="npw-img"
           style="position:absolute;top:0;left:0;width:100%;height:100%;display:block;object-fit:contain;" draggable="false">

      <img src="assets/logo_header.jpeg" 
           style="position:absolute; top:3%; left:4.5%; width:45%; opacity:0.95; mix-blend-mode:multiply; pointer-events:none;" draggable="false">

      <!-- Campos estándar -->
      ${renderStdField('nro',      `Nº`,       n.nro,       pos.fields, fs, true)}
      ${renderStdField('nombre',   'Nombre',   n.nombre,    pos.fields, fs, false)}
      ${renderStdField('telefono', 'Teléfono', n.telefono,  pos.fields, fs, false)}
      ${renderStdField('fecha',    'Fecha',    n.fecha,     pos.fields, fs, false)}
      
      ${rowsHTML}

      ${renderStdField('total', 'TOTAL', n.total, pos.fields, fs, true, true)}

      <!-- Cuadrados de pago -->
      ${renderCheckBox('efectivo',     'Efectivo', n.efectivo, pos.fields)}
      ${renderCheckBox('transferencia','Transf',   n.transferencia, pos.fields)}
      ${renderCheckBox('qr',           'QR',       n.qr, pos.fields)}

      <!-- Campos custom (agregados por el usuario) -->
      ${pos.custom.map(cx => renderCustomField(cx, n, fs)).join('')}

    </div>
    ` : `<div style="margin-top:100px;text-align:center;color:#aaa;font-size:16px;line-height:2.5;" class="no-print">📋<br>Creá o seleccioná una Nota de Pedido</div>`}

  </div>
</div>`;

    bind(c, d);
  }

  // ── Renderiza un campo estándar ────────────────────────────────
  function renderStdField(pk, label, val, fields, globalFs, isNum, isBold) {
    const p = fields[pk] || DEFAULT_POS[pk] || {top:50,left:30,w:40,h:4};
    const fs = p.fs || globalFs || 16;
    const alignClass = isNum ? 'num-align' : '';
    const boldStyle = isBold ? 'font-weight:800; color:#fff;' : '';
    let dispVal = val;
    if (isNum && val) dispVal = (pk.startsWith('cant') || pk === 'nro') ? val : '₲' + fmt(val);
    
    return `
    <div class="npw-handle-wrap" data-pk="${pk}"
         style="top:${p.top}%;left:${p.left}%;width:${p.w}%;height:${p.h}%;">
      <span class="npw-field-label" style="display:${fontMode?'block':'none'}">${label}</span>
      <input class="npw-inp-base np-std-inp ${alignClass}" data-pk="${pk}"
             value="${esc(dispVal)}" ${pk === 'nro' ? 'readonly' : ''}
             style="font-size:calc(${fs} / 700 * 100cqw); ${boldStyle} ${fontMode?'border:1.5px dashed #7C3AED; background:rgba(237,233,254,0.4);':''}"
             ${designMode?'readonly':''}>
      ${fontMode ? `
      <div class="npw-fs-controls no-print" style="position:absolute;right:-45px;top:0;display:flex;gap:2px;background:#fff;border:1px solid #ddd;border-radius:4px;padding:2px;z-index:50;">
        <button class="npw-fs-btn" data-pk="${pk}" data-dir="-1" style="width:20px;height:20px;cursor:pointer;border:none;background:#eee;border-radius:2px;font-weight:bold;">-</button>
        <button class="npw-fs-btn" data-pk="${pk}" data-dir="1" style="width:20px;height:20px;cursor:pointer;border:none;background:#eee;border-radius:2px;font-weight:bold;">+</button>
      </div>` : ''}
      <div class="npw-rz npw-rz-nw" data-pk="${pk}" data-corner="nw"></div>
      <div class="npw-rz npw-rz-ne" data-pk="${pk}" data-corner="ne"></div>
      <div class="npw-rz npw-rz-sw" data-pk="${pk}" data-corner="sw"></div>
      <div class="npw-rz npw-rz-se" data-pk="${pk}" data-corner="se"></div>
    </div>`;
  }

  function renderCheckBox(pk, label, active, fields) {
    const p = fields[pk] || DEFAULT_POS[pk] || {top:50,left:60,w:3,h:2};
    return `
    <div class="npw-handle-wrap npw-toggle-box" data-pk="${pk}" data-toggle="${pk}"
         style="top:${p.top}%;left:${p.left}%;width:${p.w}%;height:${p.h}%;
                background:transparent; cursor:pointer;
                display:flex;align-items:center;justify-content:center;">
      <span class="npw-field-label">${label}</span>
      <span class="npw-check-icon" style="font-size:24px;font-weight:900;color:#000;pointer-events:none;">${active?'✔':''}</span>
      <div class="npw-rz npw-rz-nw" data-pk="${pk}" data-corner="nw"></div>
      <div class="npw-rz npw-rz-ne" data-pk="${pk}" data-corner="ne"></div>
      <div class="npw-rz npw-rz-sw" data-pk="${pk}" data-corner="sw"></div>
      <div class="npw-rz npw-rz-se" data-pk="${pk}" data-corner="se"></div>
    </div>`;
  }

  function renderCustomField(cx, n, globalFs) {
    const fs = cx.fs || globalFs || 16;
    const val = (n && n.customValues && n.customValues[cx.id]) || '';
    return `
    <div class="npw-handle-wrap" data-pk="${cx.id}" data-custom="1"
         style="top:${cx.top}%;left:${cx.left}%;width:${cx.w}%;height:${cx.h}%;">
      <span class="npw-field-label" style="display:${fontMode?'block':'none'}">Cuadro extra</span>
      <button class="npw-del-custom" data-custom-id="${cx.id}">✕</button>
      <input class="npw-inp-base np-custom-inp" data-custom-id="${cx.id}"
             value="${esc(val)}"
             style="font-size:calc(${fs} / 700 * 100cqw); ${fontMode?'border:1.5px dashed #7C3AED; background:rgba(237,233,254,0.4);':''}"
             ${designMode?'readonly':''}>
      ${fontMode ? `
      <div class="npw-fs-controls no-print" style="position:absolute;right:-45px;top:0;display:flex;gap:2px;background:#fff;border:1px solid #ddd;border-radius:4px;padding:2px;z-index:50;">
        <button class="npw-fs-btn" data-pk="${cx.id}" data-custom="1" data-dir="-1" style="width:20px;height:20px;cursor:pointer;border:none;background:#eee;border-radius:2px;font-weight:bold;">-</button>
        <button class="npw-fs-btn" data-pk="${cx.id}" data-custom="1" data-dir="1" style="width:20px;height:20px;cursor:pointer;border:none;background:#eee;border-radius:2px;font-weight:bold;">+</button>
      </div>` : ''}
      <div class="npw-rz npw-rz-nw" data-pk="${cx.id}" data-corner="nw"></div>
      <div class="npw-rz npw-rz-ne" data-pk="${cx.id}" data-corner="ne"></div>
      <div class="npw-rz npw-rz-sw" data-pk="${cx.id}" data-corner="sw"></div>
      <div class="npw-rz npw-rz-se" data-pk="${cx.id}" data-corner="se"></div>
    </div>`;
  }

  // ── EVENTOS ────────────────────────────────────────────────────
  function bind(c, d) {
    const container = c.querySelector('#np-hoja-print');

    // Nueva nota
    c.querySelector('#npw-new')?.addEventListener('click', () => {
      const dd = load();
      const n = { id:uid(), nro:dd.next++, nombre:'', telefono:'', fecha:today(),
        total:'', efectivo:false, transferencia:false, qr:false, customValues:{} };
      for(let i=0; i<10; i++) { n['cant'+i]=''; n['desc'+i]=''; n['puni'+i]=''; n['tot'+i]=''; }
      dd.notas.push(n); save(dd); current = n.id; render(c);
    });

    // Seleccionar nota
    c.querySelectorAll('.npw-sitem').forEach(el =>
      el.addEventListener('click', () => { current=el.dataset.id; render(c); }));

    // Eliminar nota
    c.querySelector('.npw-del-nota')?.addEventListener('click', () => {
      if (!confirm('¿Eliminar esta nota?')) return;
      const dd=load(); dd.notas=dd.notas.filter(x=>x.id!==current);
      save(dd); current=dd.notas.length?dd.notas[dd.notas.length-1].id:null; render(c);
    });

    // PDF
    c.querySelector('#npw-print')?.addEventListener('click', () => {
      window.scrollTo(0, 0);
      document.body.classList.add('printing-pedidos');
      setTimeout(() => {
        window.print();
        setTimeout(() => document.body.classList.remove('printing-pedidos'), 1000);
      }, 150);
    });

    // Toggle modo diseño
    c.querySelector('#npw-toggle-design')?.addEventListener('click', () => {
      designMode=!designMode; render(c);
    });

    // Toggle font mode
    c.querySelector('#npw-toggle-fontmode')?.addEventListener('click', () => {
      fontMode = !fontMode; render(c);
    });

    // Ajustar tamaño de letra individual
    c.querySelectorAll('.npw-fs-btn').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const pk = btn.dataset.pk;
        const dir = parseInt(btn.dataset.dir);
        const isCustom = btn.dataset.custom === '1';
        const p = loadPos();
        
        let entry;
        if (isCustom) entry = p.custom.find(x => x.id === pk);
        else {
          if (!p.fields[pk]) p.fields[pk] = {...DEFAULT_POS[pk]};
          entry = p.fields[pk];
        }

        if (entry) {
          entry.fs = Math.max(8, Math.min(48, (entry.fs || p.fontSize || 16) + dir));
          savePos(p);
          const wrap = c.querySelector(`.npw-handle-wrap[data-pk="${pk}"]`);
          if (wrap) {
            const inp = wrap.querySelector('.npw-inp-base');
            if (inp) inp.style.fontSize = `calc(${entry.fs} / 700 * 100cqw)`;
          }
        }
      })
    );

    // Resetear posiciones
    c.querySelector('#npw-reset-pos')?.addEventListener('click', () => {
      if (!confirm('¿Resetear todas las posiciones a los valores originales?')) return;
      localStorage.removeItem(POS_KEY); render(c);
    });

    // Agregar cuadro extra
    c.querySelector('#npw-add-box')?.addEventListener('click', () => {
      const p=loadPos();
      const newBox = { id:uid(), top:45, left:30, w:40, h:4 };
      p.custom.push(newBox); savePos(p); render(c);
    });

    // Borrar campo custom
    c.querySelectorAll('.npw-del-custom').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cid = btn.dataset.customId;
        const p=loadPos(); p.custom=p.custom.filter(x=>x.id!==cid);
        savePos(p); render(c);
      }));

    // Auto-guardar campos estándar
    c.querySelectorAll('.np-std-inp').forEach(inp =>
      inp.addEventListener('input', () => {
        if (designMode) return;
        const pk=inp.dataset.pk; const dd=load(); const n=dd.notas.find(x=>x.id===current);
        if (!n) return;
        
        let rawVal = inp.value.replace(/₲/g, '').replace(/\./g, '').trim();
        
        if (pk.startsWith('cant') || pk.startsWith('puni')) {
           n[pk] = rawVal;
           // Calcular total fila
           const idx = pk.replace(/\D/g, '');
           const cVal = Number(n['cant'+idx]) || 0;
           const pVal = Number(n['puni'+idx]) || 0;
           n['tot'+idx] = (cVal > 0 && pVal > 0) ? (cVal * pVal) : '';
           
           // Recalcular total general
           let grandTotal = 0;
           for(let i=0; i<10; i++) grandTotal += Number(n['tot'+i]) || 0;
           n.total = grandTotal > 0 ? grandTotal : '';
        } else if (!pk.startsWith('tot') && pk !== 'total') {
           n[pk] = inp.value;
        }

        save(dd);

        // Actualizar valores en vivo
        if (pk.startsWith('cant') || pk.startsWith('puni')) {
           render(c); // Re-render para actualizar cálculos visualmente
           return;
        }

        if (pk === 'nombre') {
          const sitem = c.querySelector(`.npw-sitem[data-id="${current}"]`);
          if (sitem) {
            const clSpan = sitem.querySelector('.sitem-nombre');
            if (clSpan) clSpan.textContent = inp.value || 'Sin nombre';
          }
        }
        if (pk === 'fecha') {
          const sitem = c.querySelector(`.npw-sitem[data-id="${current}"]`);
          if (sitem) {
            const feSpan = sitem.querySelector('.sitem-fecha');
            if (feSpan) feSpan.textContent = inp.value || '';
          }
        }
      }));

    // Auto-guardar campos custom
    c.querySelectorAll('.np-custom-inp').forEach(inp =>
      inp.addEventListener('input', () => {
        if (designMode) return;
        const cid=inp.dataset.customId; const dd=load(); const n=dd.notas.find(x=>x.id===current);
        if (n) { if(!n.customValues)n.customValues={}; n.customValues[cid]=inp.value; save(dd); }
      }));

    // Toggle pago
    c.querySelectorAll('.npw-toggle-box').forEach(el =>
      el.addEventListener('click', (e) => {
        if (designMode || e.target.classList.contains('npw-rz')) return;
        const k=el.dataset.toggle; const dd=load(); const n=dd.notas.find(x=>x.id===current);
        if (n) {
          n[k]=!n[k]; save(dd);
          const icon = el.querySelector('.npw-check-icon');
          if (icon) icon.textContent = n[k] ? '✔' : '';
        }
      }));

    // ── DRAG & RESIZE en modo diseño ────────────────────────────
    if (!designMode || !container) return;

    function getContRect() { return container.getBoundingClientRect(); }
    function pct(px, full) { return (px/full)*100; }
    function getEventPoint(e) { return e.type.startsWith('touch') ? e.touches[0] : e; }

    // Drag
    c.querySelectorAll('.npw-handle-wrap').forEach(wrap => {
      function startDrag(e) {
        if (e.target.classList.contains('npw-rz') || e.target.classList.contains('npw-del-custom') || e.target.classList.contains('npw-fs-btn')) return;
        if(e.type === 'mousedown') e.preventDefault();
        
        const pt = getEventPoint(e);
        const pk   = wrap.dataset.pk;
        const p    = loadPos();
        const rect = getContRect();
        const startX=pt.clientX, startY=pt.clientY;
        const entry = p.fields[pk] || p.custom.find(x=>x.id===pk);
        if (!entry) return;
        const startLeft=entry.left, startTop=entry.top;

        function onMove(ev) {
          const ept = getEventPoint(ev);
          const dx=pct(ept.clientX-startX, rect.width);
          const dy=pct(ept.clientY-startY, rect.height);
          entry.left=Math.max(0,Math.min(98-entry.w, startLeft+dx));
          entry.top =Math.max(0,Math.min(98-entry.h, startTop+dy));
          wrap.style.left=entry.left+'%';
          wrap.style.top =entry.top+'%';
        }
        function onUp() {
          document.removeEventListener('mousemove',onMove);
          document.removeEventListener('mouseup',onUp);
          document.removeEventListener('touchmove',onMove);
          document.removeEventListener('touchend',onUp);
          savePos(p);
        }
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
        document.addEventListener('touchmove',onMove, {passive:false});
        document.addEventListener('touchend',onUp);
      }
      wrap.addEventListener('mousedown', startDrag);
      wrap.addEventListener('touchstart', startDrag, {passive:false});
    });

    // Resize
    c.querySelectorAll('.npw-rz').forEach(handle => {
      function startResize(e) {
        if(e.type === 'mousedown') e.preventDefault();
        e.stopPropagation();
        const pt = getEventPoint(e);
        
        const pk     = handle.dataset.pk;
        const corner = handle.dataset.corner;
        const p      = loadPos();
        const rect   = getContRect();
        const entry  = p.fields[pk] || p.custom.find(x=>x.id===pk);
        if (!entry) return;
        const wrap = c.querySelector(`.npw-handle-wrap[data-pk="${pk}"]`);
        const startX=pt.clientX, startY=pt.clientY;
        const startW=entry.w, startH=entry.h, startLeft=entry.left, startTop=entry.top;

        function onMove(ev) {
          const ept = getEventPoint(ev);
          const dx=pct(ept.clientX-startX, rect.width);
          const dy=pct(ept.clientY-startY, rect.height);

          if (corner==='se') {
            entry.w = Math.max(2, startW+dx);
            entry.h = Math.max(1, startH+dy);
          } else if (corner==='sw') {
            const newW = Math.max(2, startW-dx);
            entry.left = startLeft+(startW-newW);
            entry.w    = newW;
            entry.h    = Math.max(1, startH+dy);
          } else if (corner==='ne') {
            entry.w = Math.max(2, startW+dx);
            const newH = Math.max(1, startH-dy);
            entry.top  = startTop+(startH-newH);
            entry.h    = newH;
          } else { // nw
            const newW = Math.max(2, startW-dx);
            const newH = Math.max(1, startH-dy);
            entry.left = startLeft+(startW-newW);
            entry.top  = startTop+(startH-newH);
            entry.w    = newW;
            entry.h    = newH;
          }
          if (wrap) {
            wrap.style.width = entry.w+'%';
            wrap.style.height= entry.h+'%';
            wrap.style.left  = entry.left+'%';
            wrap.style.top   = entry.top+'%';
          }
        }
        function onUp() {
          document.removeEventListener('mousemove',onMove);
          document.removeEventListener('mouseup',onUp);
          document.removeEventListener('touchmove',onMove);
          document.removeEventListener('touchend',onUp);
          savePos(p);
        }
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
        document.addEventListener('touchmove',onMove, {passive:false});
        document.addEventListener('touchend',onUp);
      }
      handle.addEventListener('mousedown', startResize);
      handle.addEventListener('touchstart', startResize, {passive:false});
    });
  }

  return { init };
})();
