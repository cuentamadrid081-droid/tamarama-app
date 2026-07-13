// =============================================
// TAMARAMA — App Principal
// =============================================

document.addEventListener('DOMContentLoaded', () => {

  // --- Referencias DOM ---
  const menuToggleBtn  = document.getElementById('menu-toggle-btn');
  const sidebar        = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const sidebarCloseBtn= document.getElementById('sidebar-close-btn');
  const navItems       = document.querySelectorAll('.nav-item[data-section]');
  const sections       = document.querySelectorAll('.app-section');
  const headerDate     = document.getElementById('header-date');

  // --- Fecha en el encabezado ---
  function updateDate() {
    const now = new Date();
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const dia    = dias[now.getDay()];
    const numero = now.getDate();
    const mes    = meses[now.getMonth()];
    const anio   = now.getFullYear();
    headerDate.innerHTML = `${dia} ${numero}<br>${mes} ${anio}`;
  }
  updateDate();
  setInterval(updateDate, 60000); // actualiza cada minuto

  // --- Abrir / cerrar menú lateral ---
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('visible');
    menuToggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // evita scroll detrás
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
    menuToggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  menuToggleBtn.addEventListener('click', openSidebar);
  sidebarCloseBtn.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // --- Navegación entre secciones ---
  // Módulos ya inicializados (para no re-inicializar)
  const initializedModules = new Set();

  function activateSection(sectionId) {
    // Ocultar todas las secciones
    sections.forEach(sec => sec.classList.remove('active'));
    // Mostrar la sección seleccionada
    const target = document.getElementById('section-' + sectionId);
    if (target) target.classList.add('active');

    // Actualizar ítem activo en el menú
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionId);
    });

    // Inicializar módulos la primera vez que se abre cada sección
    if (!initializedModules.has(sectionId)) {
      initializedModules.add(sectionId);
      if (sectionId === 'ventas'  && typeof VentasModule  !== 'undefined') {
        VentasModule.init();
      }
      if (sectionId === 'stock'   && typeof StockModule   !== 'undefined') {
        StockModule.init();
      }
      if (sectionId === 'compras' && typeof ComprasModule !== 'undefined') {
        ComprasModule.init();
      }
      if (sectionId === 'morosos' && typeof MorososModule !== 'undefined') {
        MorososModule.init();
      }
      if (sectionId === 'pedidos' && typeof PedidosModule !== 'undefined') {
        PedidosModule.init();
      }
      if (sectionId === 'historial' && typeof HistorialGeneral !== 'undefined') {
        HistorialGeneral.init();
      }
      if (sectionId === 'fichas-pedido' && typeof FichasPedidoModule !== 'undefined') {
        FichasPedidoModule.init();
      }
    } else {
      // Si ya está inicializado, forzar un refresco (especialmente útil para Historial)
      if (sectionId === 'historial' && typeof HistorialGeneral !== 'undefined' && typeof HistorialGeneral.refresh === 'function') {
        HistorialGeneral.refresh();
      }
    }

    // Cerrar el menú después de seleccionar
    closeSidebar();
  }

  // Ventas es la sección activa por defecto, inicializar al cargar
  if (typeof VentasModule !== 'undefined') {
    initializedModules.add('ventas');
    VentasModule.init();
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      activateSection(item.dataset.section);
    });
  });

  // Activar "Ventas" por defecto
  activateSection('ventas');

});
