/**
 * ============================================================================
 * GESTOR DE PROYECTOS - TABLERO KANBAN (JavaScript Vanilla)
 * ============================================================================
 * Lógica completa para la gestión de tareas, edición interactiva en popup,
 * persistencia en LocalStorage y funcionalidad de Drag & Drop nativo.
 */

// Clave para almacenar las tareas en el LocalStorage
const STORAGE_KEY = 'kanban_tasks_app';

// Identificadores de las columnas fijas
const COLUMNS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  DONE: 'done'
};

// Tareas predeterminadas de ejemplo con contexto de proyecto moderno
const DEFAULT_TASKS = [
  {
    id: 'task-1',
    title: 'Definir paleta de diseño dark & glassmorphism',
    desc: 'Seleccionar armonía de colores negros, azules eléctricos y acentos violeta.',
    column: 'done',
    createdAt: new Date(Date.now() - 86400000 * 2).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  },
  {
    id: 'task-2',
    title: 'Implementar edición interactiva en popup',
    desc: 'Permitir visualizar y modificar los detalles de cualquier tarea haciendo clic en la tarjeta.',
    column: 'in-progress',
    createdAt: new Date(Date.now() - 86400000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  },
  {
    id: 'task-3',
    title: 'Optimizar experiencia móvil y responsive',
    desc: 'Comprobar transiciones y adaptabilidad de columnas en pantallas pequeñas.',
    column: 'pending',
    createdAt: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }
];

// Estado global de las tareas
let tasks = [];

// Control de arrastre (Drag & Drop)
let draggedTaskId = null;
let isDragging = false;

/* ----------------------------------------------------------------------------
   Referencias al DOM
   ---------------------------------------------------------------------------- */
const listPending = document.getElementById('list-pending');
const listInProgress = document.getElementById('list-in-progress');
const listDone = document.getElementById('list-done');

const countPending = document.getElementById('count-pending');
const countInProgress = document.getElementById('count-in-progress');
const countDone = document.getElementById('count-done');

// Modal de detalles y creación
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');
const taskColumnSelect = document.getElementById('task-column-select');
const modalTag = document.getElementById('modal-tag');
const taskModalTitle = document.getElementById('task-modal-title');
const btnSubmitTask = document.getElementById('btn-submit-task');
const btnModalDelete = document.getElementById('btn-modal-delete');

const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');

// Modal de confirmación para limpiar tablero
const confirmModal = document.getElementById('confirm-modal');
const btnClearBoard = document.getElementById('btn-clear-board');
const btnCloseConfirm = document.getElementById('btn-close-confirm');
const btnCancelConfirm = document.getElementById('btn-cancel-confirm');
const btnConfirmClear = document.getElementById('btn-confirm-clear');

/* ----------------------------------------------------------------------------
   1. Persistencia con LocalStorage
   ---------------------------------------------------------------------------- */

/**
 * Carga las tareas desde el LocalStorage. Si no existen, carga las de ejemplo.
 */
function loadTasks() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      tasks = JSON.parse(rawData);
    } else {
      tasks = [...DEFAULT_TASKS];
      saveTasks();
    }
  } catch (error) {
    console.error('Error al leer de LocalStorage:', error);
    tasks = [];
  }
}

/**
 * Guarda las tareas actuales en LocalStorage.
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error al guardar en LocalStorage:', error);
  }
}

/* ----------------------------------------------------------------------------
   2. Renderizado del Tablero
   ---------------------------------------------------------------------------- */

/**
 * Renderiza todas las columnas y sus contadores.
 */
function renderBoard() {
  listPending.innerHTML = '';
  listInProgress.innerHTML = '';
  listDone.innerHTML = '';

  const pendingTasks = tasks.filter(t => t.column === COLUMNS.PENDING);
  const inProgressTasks = tasks.filter(t => t.column === COLUMNS.IN_PROGRESS);
  const doneTasks = tasks.filter(t => t.column === COLUMNS.DONE);

  countPending.textContent = pendingTasks.length;
  countInProgress.textContent = inProgressTasks.length;
  countDone.textContent = doneTasks.length;

  renderTaskList(listPending, pendingTasks, 'Sin tareas pendientes');
  renderTaskList(listInProgress, inProgressTasks, 'Sin tareas en progreso');
  renderTaskList(listDone, doneTasks, 'Sin tareas completadas');
}

/**
 * Renderiza la lista de tareas dentro de un contenedor específico.
 */
function renderTaskList(container, taskList, emptyText) {
  if (taskList.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'empty-state';
    emptyEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
      <span class="empty-state-text">${emptyText}</span>
    `;
    container.appendChild(emptyEl);
    return;
  }

  taskList.forEach(task => {
    const card = createTaskCardElement(task);
    container.appendChild(card);
  });
}

/**
 * Genera el elemento HTML de la tarjeta y asocia sus eventos (click para editar, drag & drop, eliminar).
 */
function createTaskCardElement(task) {
  const card = document.createElement('article');
  card.className = 'task-card';
  card.setAttribute('draggable', 'true');
  card.setAttribute('data-id', task.id);

  // Icono para eliminar
  const deleteIconSvg = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;

  // Icono de calendario
  const calendarIconSvg = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  `;

  card.innerHTML = `
    <div class="task-card-header">
      <h4 class="task-card-title">${escapeHTML(task.title)}</h4>
      <button class="btn-delete-task" title="Eliminar tarea" aria-label="Eliminar tarea">
        ${deleteIconSvg}
      </button>
    </div>
    ${task.desc ? `<p class="task-card-desc">${escapeHTML(task.desc)}</p>` : ''}
    <div class="task-card-footer">
      <span class="task-date">
        ${calendarIconSvg}
        ${task.createdAt || 'Reciente'}
      </span>
      <span class="task-click-hint">Editar ↗</span>
    </div>
  `;

  // 1. Click en la tarjeta para abrir el popup de detalles editables
  card.addEventListener('click', () => {
    // Si se acaba de terminar un arrastre, evitamos abrir el modal
    if (isDragging) return;
    openTaskModalForEdit(task.id);
  });

  // 2. Click en el botón de eliminar de la tarjeta (evita disparar el click de la tarjeta)
  const btnDelete = card.querySelector('.btn-delete-task');
  btnDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task.id);
  });

  // 3. Eventos Drag & Drop
  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragend', handleDragEnd);

  return card;
}

/* ----------------------------------------------------------------------------
   3. Drag & Drop (HTML5 Nativo)
   ---------------------------------------------------------------------------- */

function handleDragStart(e) {
  isDragging = true;
  draggedTaskId = this.getAttribute('data-id');
  this.classList.add('dragging');

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedTaskId);
}

function handleDragEnd() {
  this.classList.remove('dragging');
  draggedTaskId = null;

  // Pequeño retardo para evitar que el evento 'click' se dispare al soltar la tarjeta
  setTimeout(() => {
    isDragging = false;
  }, 120);

  document.querySelectorAll('.task-list').forEach(list => {
    list.classList.remove('drag-over');
  });
}

function setupDropZones() {
  const taskLists = [listPending, listInProgress, listDone];

  taskLists.forEach(listContainer => {
    listContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      listContainer.classList.add('drag-over');
    });

    listContainer.addEventListener('dragleave', (e) => {
      if (!listContainer.contains(e.relatedTarget)) {
        listContainer.classList.remove('drag-over');
      }
    });

    listContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      listContainer.classList.remove('drag-over');

      const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
      if (!taskId) return;

      const targetColumn = listContainer.closest('.kanban-column').getAttribute('data-column');
      moveTaskToColumn(taskId, targetColumn);
    });
  });
}

function moveTaskToColumn(taskId, newColumn) {
  const task = tasks.find(t => t.id === taskId);
  if (task && task.column !== newColumn) {
    task.column = newColumn;
    saveTasks();
    renderBoard();
  }
}

/* ----------------------------------------------------------------------------
   4. Gestión de Tareas (CRUD y Modales)
   ---------------------------------------------------------------------------- */

/**
 * Abre el popup en modo "Nueva Tarea".
 */
function openTaskModalForCreate() {
  taskForm.reset();
  taskIdInput.value = '';
  modalTag.textContent = 'NUEVA TAREA';
  taskModalTitle.textContent = 'Crear Tarea';
  btnSubmitTask.textContent = 'Crear Tarea';
  btnModalDelete.style.display = 'none';

  taskModal.classList.add('active');
  setTimeout(() => taskTitleInput.focus(), 100);
}

/**
 * Abre el popup en modo "Editar Tarea" cargando los detalles de la tarjeta seleccionada.
 * @param {string} taskId - ID de la tarea a editar.
 */
function openTaskModalForEdit(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // Rellenar campos del formulario con los datos existentes
  taskIdInput.value = task.id;
  taskTitleInput.value = task.title;
  taskDescInput.value = task.desc || '';
  taskColumnSelect.value = task.column;

  modalTag.textContent = 'DETALLES EDITABLES';
  taskModalTitle.textContent = 'Editar Tarea';
  btnSubmitTask.textContent = 'Guardar Cambios';
  btnModalDelete.style.display = 'inline-flex';

  taskModal.classList.add('active');
  setTimeout(() => taskTitleInput.focus(), 100);
}

/**
 * Cierra el modal de tareas.
 */
function closeTaskModal() {
  taskModal.classList.remove('active');
}

/**
 * Guarda o actualiza una tarea según el estado del formulario.
 */
function handleSaveTask(e) {
  e.preventDefault();

  const id = taskIdInput.value;
  const title = taskTitleInput.value.trim();
  const desc = taskDescInput.value.trim();
  const column = taskColumnSelect.value;

  if (!title) return;

  if (id) {
    // Modo Edición: Actualizar tarea existente
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      tasks[taskIndex].title = title;
      tasks[taskIndex].desc = desc;
      tasks[taskIndex].column = column;
    }
  } else {
    // Modo Creación: Añadir nueva tarea
    const newTask = {
      id: 'task-' + Date.now(),
      title: title,
      desc: desc,
      column: column,
      createdAt: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    };
    tasks.unshift(newTask);
  }

  saveTasks();
  renderBoard();
  closeTaskModal();
}

/**
 * Elimina una tarea por su ID.
 */
function deleteTask(taskId) {
  tasks = tasks.filter(t => t.id !== taskId);
  saveTasks();
  renderBoard();
}

/**
 * Limpia todo el tablero.
 */
function clearAllTasks() {
  tasks = [];
  saveTasks();
  renderBoard();
}

/* ----------------------------------------------------------------------------
   5. Modales Secundarios y Utilidades
   ---------------------------------------------------------------------------- */

function openConfirmModal() {
  confirmModal.classList.add('active');
}

function closeConfirmModal() {
  confirmModal.classList.remove('active');
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ----------------------------------------------------------------------------
   6. Inicialización de la Aplicación
   ---------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Carga inicial y listeners de drag & drop
  loadTasks();
  renderBoard();
  setupDropZones();

  // Botón principal de "+ Nueva Tarea" en cabecera
  btnOpenModal.addEventListener('click', openTaskModalForCreate);

  // Formulario y cierre de modal
  taskForm.addEventListener('submit', handleSaveTask);
  btnCloseModal.addEventListener('click', closeTaskModal);
  btnCancelModal.addEventListener('click', closeTaskModal);

  // Botón de eliminar dentro del modal de edición
  btnModalDelete.addEventListener('click', () => {
    const id = taskIdInput.value;
    if (id) {
      deleteTask(id);
      closeTaskModal();
    }
  });

  // Cerrar modal al pulsar fuera de la caja
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeTaskModal();
  });

  // Modal para limpiar todo el tablero
  btnClearBoard.addEventListener('click', openConfirmModal);
  btnCloseConfirm.addEventListener('click', closeConfirmModal);
  btnCancelConfirm.addEventListener('click', closeConfirmModal);

  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) closeConfirmModal();
  });

  btnConfirmClear.addEventListener('click', () => {
    clearAllTasks();
    closeConfirmModal();
  });

  // Accesibilidad: Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTaskModal();
      closeConfirmModal();
    }
  });
});
