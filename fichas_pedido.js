/**
 * TAMARAMA — Fichas de Pedido
 * Editor visual: imagen como fondo, campos arrastrables y redimensionables.
 */
const FichasPedidoModule = (() => {
  'use strict';
  const KEY     = 'tamarama_fichas_pedido_v1';
  const POS_KEY = 'tamarama_fichas_pos_v1';

  const DEFAULT_POS = {
    nro:          { top:7.8,  left:63,  w:31, h:3.5 },
    cliente:      { top:15.5, left:12,  w:84, h:3   },
    telefono:     { top:20.5, left:12,  w:84, h:3   },
    fechaEntrega: { top:25.5, left:22,  w:74, h:3   },
    fechaEmision: { top:30.5, left:22,  w:74, h:3   },
    linea0:       { top:40.5, left:3,   w:94, h:3   },
    linea1:       { top:45.5, left:3,   w:94, h:3   },
    linea2:       { top:50.5, left:3,   w:94, h:3   },
    linea3:       { top:55.5, left:3,   w:94, h:3   },
    linea4:       { top:60.5, left:3,   w:94, h:3   },
    linea5:       { top:65.5, left:3,   w:94, h:3   },
    total:        { top:75.5, left:8,   w:44, h:3   },
    saldo:        { top:80.5, left:8,   w:44, h:3   },
    anticipo:     { top:85.5, left:8,   w:44, h:3   },
    efectivo:     { top:73.5, left:60,  w:8,  h:5   },
    transferencia:{ top:80.5, left:60,  w:8,  h:5   },
    lineaFinal0:  { top:92,   left:3,   w:94, h:3   },
    lineaFinal1:  { top:95.5, left:3,   w:94, h:3   },
    lineaFinal2:  { top:99,   left:3,   w:94, h:3   },
  };

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
    return { fields: {...DEFAULT_POS}, custom: [], fontSize: 16 };
  }
  function savePos(p) { localStorage.setItem(POS_KEY, JSON.stringify(p)); }

  function load() {
    try { const r = localStorage.getItem(KEY); if(r) return JSON.parse(r); } catch(e){}
    return { fichas:[], next:1 };
  }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }
  function uid() { return 'fp'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function esc(s) { return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  let current    = null;
  let designMode = false;
  let fontMode   = false;

  function init() {
    const c = document.getElementById('fichas-pedido-container');
    if (c) render(c);
  }

  // ── RENDER PRINCIPAL ─────────────────────────────────────────────
  function render(c) {
    if (!c) c = document.getElementById('fichas-pedido-container');
    if (!c) return;
    const d   = load();
    const pos = loadPos();
    const f   = current ? d.fichas.find(x => x.id === current) : null;
    const fs  = pos.fontSize;

    c.innerHTML = `
<style>
  /* Scoped styles */
  .fpw-handle-wrap { position:absolute; }
  .fpw-inp-base {
    width:100%; height:100%; box-sizing:border-box;
    border:none; border-radius:0; outline:none;
    background:transparent; box-shadow:none;
    -webkit-appearance:none; appearance:none;
    font-family:Nunito,Arial,sans-serif;
    color:#111; padding:0 2%; display:block;
  }
  .fpw-inp-base:focus { outline:none; box-shadow:none; }

  /* Borde en modo diseño */
  .design-on .fpw-handle-wrap { cursor:move; }
  .design-on .fpw-handle-wrap .fpw-inp-base {
    background:rgba(237,233,254,0.55);
    border:2px dashed rgba(124,58,237,0.85) !important;
    border-radius:3px;
    pointer-events:none;
  }

  /* Handles de resize (esquinas) */
  .fpw-rz {
    display:none;
    position:absolute;
    width:12px; height:12px;
    background:#7C3AED;
    border:2px solid #fff;
    border-radius:2px;
    z-index:30;
  }
  .design-on .fpw-rz { display:block; cursor:nwse-resize; }
  .fpw-rz-nw { top:-6px;    left:-6px;    cursor:nwse-resize; }
  .fpw-rz-ne { top:-6px;    right:-6px;   cursor:nesw-resize; }
  .fpw-rz-sw { bottom:-6px; left:-6px;    cursor:nesw-resize; }
  .fpw-rz-se { bottom:-6px; right:-6px;   cursor:nwse-resize; }

  /* Botón borrar campo custom */
  .fpw-del-custom {
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
  .design-on .fpw-del-custom { display:block; }

  /* Label del campo en modo diseño */
  .fpw-field-label {
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
  .design-on .fpw-field-label { display:block; }
</style>

<style media="print">
  /* 1. Ocultar todo lo demás en la página */
  body.printing-fichas * {
    visibility: hidden;
  }
  
  /* 2. Hacer visible solo la ficha y su contenido */
  body.printing-fichas #fp-hoja-print, 
  body.printing-fichas #fp-hoja-print * {
    visibility: visible;
  }
  
  /* 3. Desactivar Flexbox y Scroll en TODOS los contenedores padres (Solución para iPad/Safari) */
  body.printing-fichas,
  body.printing-fichas html,
  body.printing-fichas #fichas-pedido-container,
  body.printing-fichas #fichas-pedido-container > div,
  body.printing-fichas #fichas-pedido-container > div > div {
    display: block !important;
    position: static !important;
    height: auto !important;
    min-height: auto !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* 4. Ocultar completamente la barra lateral y botones para que la hoja suba al tope */
  body.printing-fichas aside,
  body.printing-fichas .no-print {
    display: none !important;
  }
  
  /* 5. Posicionar la ficha de forma natural (no absolute, Safari lo odia) */
  body.printing-fichas #fp-hoja-print {
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
  
  /* Asegurar que la imagen ocupe todo el ancho */
  body.printing-fichas #fpw-img {
    width: 100% !important;
    height: auto !important;
    display: block !important;
  }

  /* Asegurar que los inputs no tengan bordes ni fondos */
  .fpw-inp-base {
    background: transparent !important;
    border: none !important;
  }
  
  /* Ocultar los controles de fuente en impresión por las dudas */
  .no-print {
    display: none !important;
  }
</style>

<div style="display:flex;height:100%;min-height:100vh;background:#DCDCDC;font-family:Nunito,Arial,sans-serif;">

  <!-- PANEL LATERAL -->
  <aside style="width:215px;flex-shrink:0;background:#fff;border-right:1px solid #ddd;display:flex;flex-direction:column;" class="no-print">
    <div style="padding:14px 12px 10px;border-bottom:1px solid #eee;display:flex;flex-direction:column;gap:8px;">
      <p style="margin:0;font-size:13px;font-weight:800;color:#555;">📋 Fichas de Pedido</p>
      <button id="fpw-new" style="background:#E91E8C;color:#fff;border:none;border-radius:7px;padding:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;width:100%;">+ Nueva Ficha</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:4px 0;">
      ${d.fichas.length===0
        ? '<p style="color:#aaa;font-size:12px;padding:10px;">Sin fichas aún.</p>'
        : d.fichas.slice().reverse().map(x=>`
          <div class="fpw-sitem" data-id="${x.id}" style="padding:9px 12px;border-bottom:1px solid #f5f5f5;cursor:pointer;background:${x.id===current?'#fce7f3':'#fff'};border-left:${x.id===current?'3px solid #E91E8C':'3px solid transparent'};">
            <b style="display:flex;justify-content:space-between;font-size:12px;color:#222;">
              <span>Ficha Nº${x.nro}</span>
              <span class="sitem-fecha" style="font-weight:normal;color:#777;font-size:10px;">${esc(x.fechaEmision||'')}</span>
            </b>
            <span class="sitem-cliente" style="display:block;font-size:12px;color:#444;margin-top:1px;">${esc(x.cliente||'Sin nombre')}</span>
          </div>`).join('')
      }
    </div>
    <div style="padding:10px;border-top:1px solid #eee;text-align:center;">
      <button id="fpw-reset-all" style="background:transparent;border:none;color:#ef4444;font-size:11px;font-weight:700;cursor:pointer;text-decoration:underline;">Borrar todo y reiniciar contador</button>
    </div>
  </aside>

  <!-- ÁREA PRINCIPAL -->
  <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;align-items:center;padding:16px 20px 50px;background:#DCDCDC;">

    ${f ? `
    <!-- TOOLBAR -->
    <div style="display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px;width:100%;max-width:700px;margin-bottom:8px;" class="no-print">
      
      <button id="fpw-toggle-design"
        style="background:${designMode?'#7C3AED':'#6B7280'};color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
        ${designMode?'✅ Listo (salir del modo diseño)':'🎨 Modo Diseño'}
      </button>

      ${designMode ? `
      <button id="fpw-add-box"
        style="background:#059669;color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
        ➕ Agregar cuadro extra
      </button>
      <button id="fpw-reset-pos" style="background:#EF4444;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit;">↺ Resetear Layout</button>
      ` : ''}

      <button id="fpw-toggle-fontmode" style="background:${fontMode?'#7C3AED':'#6B7280'};color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;font-family:inherit;">
        ${fontMode ? '✅ Guardar tamaños' : '🔤 Ajustar tamaños de letra'}
      </button>
      <button class="fpw-del-ficha" data-del="${f.id}" style="background:transparent;border:1px solid #ccc;border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;font-family:inherit;color:#555;">🗑️ Eliminar ficha</button>
      <button id="fpw-print" style="background:#E91E8C;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">🖨️ PDF</button>
    </div>

    ${designMode ? `
    <div style="background:#7C3AED;color:#fff;padding:7px 16px;border-radius:8px;margin-bottom:8px;font-size:11px;text-align:center;width:100%;max-width:700px;" class="no-print">
      🎨 Arrastrá los campos · Arrastrá las esquinas para cambiar el tamaño · Botón <b>➕</b> para agregar más cuadros
    </div>` : ''}

    <!-- CONTENEDOR DE LA HOJA (imagen + overlay) -->
    <div id="fp-hoja-print" class="${designMode?'design-on':''}" style="position:relative;width:100%;max-width:700px;box-shadow:0 3px 24px rgba(0,0,0,0.15);">

      <img src="assets/ficha_form.jpeg" id="fpw-img"
           style="width:100%;height:auto;display:block;" draggable="false">

      <!-- Campos estándar -->
      ${renderStdField('nro',          `Nº`, `${f.nro}`,              pos.fields, fs, false)}
      ${renderStdField('cliente',      'CLIENTE',      f.cliente||'',      pos.fields, fs, false)}
      ${renderStdField('telefono',     'Teléfono',     f.telefono||'',     pos.fields, fs, false)}
      ${renderStdField('fechaEntrega', 'Fecha Entrega',f.fechaEntrega||'', pos.fields, fs, false)}
      ${renderStdField('fechaEmision', 'Fecha Emisión',f.fechaEmision||'', pos.fields, fs, false)}
      ${renderStdField('linea0',       'Línea 1',      (f.lineas&&f.lineas[0])||'', pos.fields, fs, false)}
      ${renderStdField('linea1',       'Línea 2',      (f.lineas&&f.lineas[1])||'', pos.fields, fs, false)}
      ${renderStdField('linea2',       'Línea 3',      (f.lineas&&f.lineas[2])||'', pos.fields, fs, false)}
      ${renderStdField('linea3',       'Línea 4',      (f.lineas&&f.lineas[3])||'', pos.fields, fs, false)}
      ${renderStdField('linea4',       'Línea 5',      (f.lineas&&f.lineas[4])||'', pos.fields, fs, false)}
      ${renderStdField('linea5',       'Línea 6',      (f.lineas&&f.lineas[5])||'', pos.fields, fs, false)}
      ${renderStdField('total',        'TOTAL',        f.total||'',        pos.fields, fs, false)}
      ${renderStdField('saldo',        'SALDO',        f.saldo||'',        pos.fields, fs, false)}
      ${renderStdField('anticipo',     'ANTICIPO',     f.anticipo||'',     pos.fields, fs, false)}

      <!-- Líneas finales (debajo de observación) -->
      ${renderStdField('lineaFinal0',  'Línea final 1',(f.lineasFinal&&f.lineasFinal[0])||'', pos.fields, fs, false)}
      ${renderStdField('lineaFinal1',  'Línea final 2',(f.lineasFinal&&f.lineasFinal[1])||'', pos.fields, fs, false)}
      ${renderStdField('lineaFinal2',  'Línea final 3',(f.lineasFinal&&f.lineasFinal[2])||'', pos.fields, fs, false)}

      <!-- Cuadrados de pago -->
      ${renderCheckBox('efectivo',     'EFECTIVO',     f.efectivo,     pos.fields)}
      ${renderCheckBox('transferencia','TRANSFERENCIA',f.transferencia, pos.fields)}

      <!-- Campos custom (agregados por el usuario) -->
      ${pos.custom.map(cx => renderCustomField(cx, f, fs)).join('')}

    </div><!-- /fp-hoja-print -->
    ` : `<div style="margin-top:100px;text-align:center;color:#aaa;font-size:16px;line-height:2.5;" class="no-print">📋<br>Creá o seleccioná una ficha</div>`}

  </div>
</div>`;

    bind(c, d);
  }

  // ── Renderiza un campo estándar ────────────────────────────────
  function renderStdField(pk, label, val, fields, globalFs, isReadonly) {
    const p = fields[pk] || DEFAULT_POS[pk] || {top:50,left:30,w:40,h:4};
    const fs = p.fs || globalFs || 16;
    return `
    <div class="fpw-handle-wrap" data-pk="${pk}"
         style="top:${p.top}%;left:${p.left}%;width:${p.w}%;height:${p.h}%;">
      <span class="fpw-field-label" style="display:${fontMode?'block':'none'}">${label}</span>
      <input class="fpw-inp-base fp-std-inp" data-pk="${pk}"
             value="${esc(val)}"
             style="font-size:${fs}px; ${fontMode?'border:1.5px dashed #7C3AED; background:rgba(237,233,254,0.4);':''}"
             ${designMode?'readonly':''}>
      ${fontMode ? `
      <div class="fpw-fs-controls no-print" style="position:absolute;right:-45px;top:0;display:flex;gap:2px;background:#fff;border:1px solid #ddd;border-radius:4px;padding:2px;z-index:50;">
        <button class="fpw-fs-btn" data-pk="${pk}" data-dir="-1" style="width:20px;height:20px;cursor:pointer;border:none;background:#eee;border-radius:2px;font-weight:bold;">-</button>
        <button class="fpw-fs-btn" data-pk="${pk}" data-dir="1" style="width:20px;height:20px;cursor:pointer;border:none;background:#eee;border-radius:2px;font-weight:bold;">+</button>
      </div>` : ''}
      <div class="fpw-rz fpw-rz-nw" data-pk="${pk}" data-corner="nw"></div>
      <div class="fpw-rz fpw-rz-ne" data-pk="${pk}" data-corner="ne"></div>
      <div class="fpw-rz fpw-rz-sw" data-pk="${pk}" data-corner="sw"></div>
      <div class="fpw-rz fpw-rz-se" data-pk="${pk}" data-corner="se"></div>
    </div>`;
  }

  function renderCheckBox(pk, label, active, fields) {
    const p = fields[pk] || DEFAULT_POS[pk] || {top:50,left:60,w:8,h:5};
    return `
    <div class="fpw-handle-wrap fpw-toggle-box" data-pk="${pk}" data-toggle="${pk}"
         style="top:${p.top}%;left:${p.left}%;width:${p.w}%;height:${p.h}%;
                background:transparent;
                cursor:pointer;
                display:flex;align-items:center;justify-content:center;">
      <span class="fpw-field-label">${label}</span>
      <span class="fpw-check-icon" style="font-size:36px;font-weight:900;color:#000;pointer-events:none;">${active?'✔':''}</span>
      <div class="fpw-rz fpw-rz-nw" data-pk="${pk}" data-corner="nw"></div>
      <div class="fpw-rz fpw-rz-ne" data-pk="${pk}" data-corner="ne"></div>
      <div class="fpw-rz fpw-rz-sw" data-pk="${pk}" data-corner="sw"></div>
      <div class="fpw-rz fpw-rz-se" data-pk="${pk}" data-corner="se"></div>
    </div>`;
  }

  function renderCustomField(cx, f, globalFs) {
    const fs = cx.fs || globalFs || 16;
    const val = (f && f.customValues && f.customValues[cx.id]) || '';
    return `
    <div class="fpw-handle-wrap" data-pk="${cx.id}" data-custom="1"
         style="top:${cx.top}%;left:${cx.left}%;width:${cx.w}%;height:${cx.h}%;">
      <span class="fpw-field-label" style="display:${fontMode?'block':'none'}">Cuadro extra</span>
      <button class="fpw-del-custom" data-custom-id="${cx.id}">✕</button>
      <input class="fpw-inp-base fp-custom-inp" data-custom-id="${cx.id}"
             value="${esc(val)}"
             style="font-size:${fs}px; ${fontMode?'border:1.5px dashed #7C3AED; background:rgba(237,233,254,0.4);':''}"
             ${designMode?'readonly':''}>
      ${fontMode ? `
      <div class="fpw-fs-controls no-print" style="position:absolute;right:-45px;top:0;display:flex;gap:2px;background:#fff;border:1px solid #ddd;border-radius:4px;padding:2px;z-index:50;">
        <button class="fpw-fs-btn" data-pk="${cx.id}" data-custom="1" data-dir="-1" style="width:20px;height:20px;cursor:pointer;border:none;background:#eee;border-radius:2px;font-weight:bold;">-</button>
        <button class="fpw-fs-btn" data-pk="${cx.id}" data-custom="1" data-dir="1" style="width:20px;height:20px;cursor:pointer;border:none;background:#eee;border-radius:2px;font-weight:bold;">+</button>
      </div>` : ''}
      <div class="fpw-rz fpw-rz-nw" data-pk="${cx.id}" data-corner="nw"></div>
      <div class="fpw-rz fpw-rz-ne" data-pk="${cx.id}" data-corner="ne"></div>
      <div class="fpw-rz fpw-rz-sw" data-pk="${cx.id}" data-corner="sw"></div>
      <div class="fpw-rz fpw-rz-se" data-pk="${cx.id}" data-corner="se"></div>
    </div>`;
  }

  // ── EVENTOS ────────────────────────────────────────────────────
  function bind(c, d) {
    const container = c.querySelector('#fp-hoja-print');

    // Nueva ficha
    c.querySelector('#fpw-new')?.addEventListener('click', () => {
      const dd = load();
      const f = { id:uid(), nro:dd.next++, cliente:'', telefono:'', fechaEntrega:'',
        lineas:['','','','','',''], total:'', saldo:'', anticipo:'',
        efectivo:false, transferencia:false, customValues:{} };
      dd.fichas.push(f); save(dd); current = f.id; render(c);
    });

    // Seleccionar ficha
    c.querySelectorAll('.fpw-sitem').forEach(el =>
      el.addEventListener('click', () => { current=el.dataset.id; render(c); }));

    // Eliminar ficha
    c.querySelector('.fpw-del-ficha')?.addEventListener('click', () => {
      if (!confirm('¿Eliminar esta ficha?')) return;
      const dd=load(); dd.fichas=dd.fichas.filter(x=>x.id!==current);
      save(dd); current=dd.fichas.length?dd.fichas[dd.fichas.length-1].id:null; render(c);
    });

    // PDF
    c.querySelector('#fpw-print')?.addEventListener('click', () => {
      document.body.classList.add('printing-fichas');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-fichas'), 1000);
    });

    // Toggle modo diseño
    c.querySelector('#fpw-toggle-design')?.addEventListener('click', () => {
      designMode=!designMode; render(c);
    });

    // Toggle font mode
    c.querySelector('#fpw-toggle-fontmode')?.addEventListener('click', () => {
      fontMode = !fontMode; render(c);
    });

    // Ajustar tamaño de letra individual
    c.querySelectorAll('.fpw-fs-btn').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const pk = btn.dataset.pk;
        const dir = parseInt(btn.dataset.dir);
        const isCustom = btn.dataset.custom === '1';
        const p = loadPos();
        
        let entry;
        if (isCustom) {
          entry = p.custom.find(x => x.id === pk);
        } else {
          if (!p.fields[pk]) p.fields[pk] = {...DEFAULT_POS[pk]};
          entry = p.fields[pk];
        }

        if (entry) {
          entry.fs = Math.max(8, Math.min(48, (entry.fs || p.fontSize || 16) + dir));
          savePos(p);
          
          // Actualizar en vivo sin renderizar todo
          const wrap = c.querySelector(`.fpw-handle-wrap[data-pk="${pk}"]`);
          if (wrap) {
            const inp = wrap.querySelector('.fpw-inp-base');
            if (inp) inp.style.fontSize = entry.fs + 'px';
          }
        }
      })
    );

    // Resetear posiciones
    c.querySelector('#fpw-reset-pos')?.addEventListener('click', () => {
      if (!confirm('¿Resetear todas las posiciones a los valores originales?')) return;
      localStorage.removeItem(POS_KEY); render(c);
    });

    // Resetear TODAS las fichas (Reiniciar contador)
    c.querySelector('#fpw-reset-all')?.addEventListener('click', () => {
      if (!confirm('¡ATENCIÓN! Esto va a eliminar todas las fichas creadas y reiniciar el contador a 1. ¿Estás seguro?')) return;
      localStorage.removeItem(KEY); current = null; render(c);
    });

    // Agregar cuadro extra
    c.querySelector('#fpw-add-box')?.addEventListener('click', () => {
      const p=loadPos();
      const newBox = { id:uid(), top:45, left:30, w:40, h:4 };
      p.custom.push(newBox); savePos(p); render(c);
    });

    // Borrar campo custom
    c.querySelectorAll('.fpw-del-custom').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cid = btn.dataset.customId;
        const p=loadPos(); p.custom=p.custom.filter(x=>x.id!==cid);
        savePos(p); render(c);
      }));

    // Auto-guardar campos estándar
    c.querySelectorAll('.fp-std-inp').forEach(inp =>
      inp.addEventListener('input', () => {
        if (designMode) return;
        const pk=inp.dataset.pk; const dd=load(); const f=dd.fichas.find(x=>x.id===current);
        if (!f) return;
        if (pk.startsWith('linea')) {
          if (pk.startsWith('lineaFinal')) {
            const i=parseInt(pk.slice(10));
            if(!f.lineasFinal)f.lineasFinal=[...Array(3)].map(()=>'');
            f.lineasFinal[i]=inp.value;
          } else {
            const i=parseInt(pk.slice(5));
            if(!f.lineas)f.lineas=[...Array(6)].map(()=>'');
            f.lineas[i]=inp.value;
          }
        } else { f[pk]=inp.value; }
        save(dd);

        if (pk === 'cliente' || pk === 'fechaEmision') {
          const sitem = c.querySelector(`.fpw-sitem[data-id="${current}"]`);
          if (sitem) {
            if (pk === 'cliente') {
              const clSpan = sitem.querySelector('.sitem-cliente');
              if (clSpan) clSpan.textContent = inp.value || 'Sin nombre';
            }
            if (pk === 'fechaEmision') {
              const feSpan = sitem.querySelector('.sitem-fecha');
              if (feSpan) feSpan.textContent = inp.value || '';
            }
          }
        }
      }));

    // Auto-guardar campos custom
    c.querySelectorAll('.fp-custom-inp').forEach(inp =>
      inp.addEventListener('input', () => {
        if (designMode) return;
        const cid=inp.dataset.customId; const dd=load(); const f=dd.fichas.find(x=>x.id===current);
        if (f) { if(!f.customValues)f.customValues={}; f.customValues[cid]=inp.value; save(dd); }
      }));

    // Toggle pago
    c.querySelectorAll('.fpw-toggle-box').forEach(el =>
      el.addEventListener('click', (e) => {
        if (designMode || e.target.classList.contains('fpw-rz')) return;
        const k=el.dataset.toggle; const dd=load(); const f=dd.fichas.find(x=>x.id===current);
        if (f) {
          f[k]=!f[k]; save(dd);
          const icon = el.querySelector('.fpw-check-icon');
          if (icon) icon.textContent = f[k] ? '✔' : '';
        }
      }));

    // ── DRAG & RESIZE en modo diseño ────────────────────────────
    if (!designMode || !container) return;

    // Helper: obtener rect del contenedor
    function getContRect() { return container.getBoundingClientRect(); }
    function pct(px, full) { return (px/full)*100; }

    // Drag (mover campo completo)
    c.querySelectorAll('.fpw-handle-wrap').forEach(wrap => {
      wrap.addEventListener('mousedown', (e) => {
        // Si el clic fue en una esquina de resize, no mover
        if (e.target.classList.contains('fpw-rz')) return;
        if (e.target.classList.contains('fpw-del-custom')) return;
        e.preventDefault();
        const pk   = wrap.dataset.pk;
        const p    = loadPos();
        const rect = getContRect();
        const startX=e.clientX, startY=e.clientY;
        const entry = p.fields[pk] || p.custom.find(x=>x.id===pk);
        if (!entry) return;
        const startLeft=entry.left, startTop=entry.top;

        function onMove(ev) {
          const dx=pct(ev.clientX-startX, rect.width);
          const dy=pct(ev.clientY-startY, rect.height);
          entry.left=Math.max(0,Math.min(98-entry.w, startLeft+dx));
          entry.top =Math.max(0,Math.min(98-entry.h, startTop+dy));
          wrap.style.left=entry.left+'%';
          wrap.style.top =entry.top+'%';
        }
        function onUp() {
          document.removeEventListener('mousemove',onMove);
          document.removeEventListener('mouseup',onUp);
          savePos(p);
        }
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
      });
    });

    // Resize (arrastrar esquinas)
    c.querySelectorAll('.fpw-rz').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const pk     = handle.dataset.pk;
        const corner = handle.dataset.corner; // nw, ne, sw, se
        const p      = loadPos();
        const rect   = getContRect();
        const entry  = p.fields[pk] || p.custom.find(x=>x.id===pk);
        if (!entry) return;
        const wrap = c.querySelector(`.fpw-handle-wrap[data-pk="${pk}"]`);
        const startX=e.clientX, startY=e.clientY;
        const startW=entry.w, startH=entry.h, startLeft=entry.left, startTop=entry.top;

        function onMove(ev) {
          const dx=pct(ev.clientX-startX, rect.width);
          const dy=pct(ev.clientY-startY, rect.height);

          if (corner==='se') {
            entry.w = Math.max(5, startW+dx);
            entry.h = Math.max(2, startH+dy);
          } else if (corner==='sw') {
            const newW = Math.max(5, startW-dx);
            entry.left = startLeft+(startW-newW);
            entry.w    = newW;
            entry.h    = Math.max(2, startH+dy);
          } else if (corner==='ne') {
            entry.w = Math.max(5, startW+dx);
            const newH = Math.max(2, startH-dy);
            entry.top  = startTop+(startH-newH);
            entry.h    = newH;
          } else { // nw
            const newW = Math.max(5, startW-dx);
            const newH = Math.max(2, startH-dy);
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
          savePos(p);
        }
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
      });
    });
  }

  return { init };
})();
