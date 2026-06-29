import { supabase } from '../supabase.js';
import { getCurrentProjectId } from './projects.js';
import { loadTasks, createTask, updateTaskStatus, deleteTask } from './tasks.js';
import { loadComments, renderComments } from './comments.js';
import { loadFiles, renderFiles } from './files.js';
import { loadTeam } from './teams.js';

const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' }
];

let currentTaskId = null;
let tasks = [];

export function getCurrentTaskId() {
  return currentTaskId;
}

export async function renderKanban() {
  const pid = getCurrentProjectId();
  if (!pid) return;

  tasks = await loadTasks(pid);
  renderBoard();
}

function renderBoard() {
  const container = document.getElementById('kanban-container');
  if (!container) return;

  container.innerHTML = COLUMNS.map(col => {
    const colTasks = tasks.filter(t => t.status === col.id);
    return `
      <div class="kanban-column" data-status="${col.id}">
        <div class="kanban-column-header">
          <span>${col.label}</span>
          <span class="count">${colTasks.length}</span>
        </div>
        <div class="kanban-column-body" data-status="${col.id}">
          ${colTasks.map(task => renderTaskCard(task)).join('')}
        </div>
        <div class="add-task-form">
          <input type="text" placeholder="Add a task..." data-col="${col.id}">
          <button data-col="${col.id}">Add</button>
        </div>
      </div>
    `;
  }).join('');

  setupDragAndDrop();
  setupAddTaskForms();
}

function renderTaskCard(task) {
  const statusColors = { todo: 'status-todo', in_progress: 'status-in_progress', done: 'status-done' };
  const statusLabels = { todo: 'Todo', in_progress: 'In Progress', done: 'Done' };
  const statusClass = statusColors[task.status] || 'status-todo';

  return `
    <div class="kanban-card" draggable="true" data-id="${task.id}" data-status="${task.status}">
      <div class="card-title">${escapeHtml(task.title)}</div>
      <div class="card-meta">
        <span class="${statusClass}" style="font-size:0.65rem;padding:0.1rem 0.4rem;border-radius:4px;">${statusLabels[task.status]}</span>
        <div class="card-actions">
          <button class="view-btn" data-id="${task.id}" title="Open task">👁</button>
          <button class="delete-btn" data-id="${task.id}" title="Delete task">✕</button>
        </div>
      </div>
    </div>
  `;
}

function setupDragAndDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const bodies = document.querySelectorAll('.kanban-column-body');

  cards.forEach(card => {
    card.addEventListener('dragstart', () => {
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      bodies.forEach(b => b.classList.remove('drag-over'));
    });
  });

  bodies.forEach(body => {
    body.addEventListener('dragover', e => {
      e.preventDefault();
      body.classList.add('drag-over');
    });
    body.addEventListener('dragleave', () => {
      body.classList.remove('drag-over');
    });
    body.addEventListener('drop', async e => {
      e.preventDefault();
      body.classList.remove('drag-over');
      const dragging = document.querySelector('.kanban-card.dragging');
      if (!dragging) return;

      const taskId = dragging.dataset.id;
      const newStatus = body.dataset.status;
      const oldStatus = dragging.dataset.status;

      if (newStatus === oldStatus) return;

      const success = await updateTaskStatus(taskId, newStatus);
      if (success) {
        dragging.dataset.status = newStatus;
        await renderKanban();
        addNotification(`Task moved to ${newStatus.replace('_', ' ')}`);
      }
    });
  });

  // View task
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => openTaskDetail(btn.dataset.id));
  });

  // Delete task
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this task?')) return;
      const success = await deleteTask(btn.dataset.id);
      if (success) {
        if (currentTaskId === btn.dataset.id) closeTaskDetail();
        await renderKanban();
        addNotification('Task deleted');
      }
    });
  });
}

function setupAddTaskForms() {
  document.querySelectorAll('.add-task-form button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const col = btn.dataset.col;
      const input = document.querySelector(`.add-task-form input[data-col="${col}"]`);
      const title = input.value.trim();
      if (!title) return;

      const task = await createTask(getCurrentProjectId(), title);
      if (task) {
        input.value = '';
        await renderKanban();
        addNotification('New task created');
      }
    });
  });

  document.querySelectorAll('.add-task-form input').forEach(input => {
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const col = input.dataset.col;
        const title = input.value.trim();
        if (!title) return;

        const task = await createTask(getCurrentProjectId(), title);
        if (task) {
          input.value = '';
          await renderKanban();
          addNotification('New task created');
        }
      }
    });
  });
}

export async function openTaskDetail(taskId) {
  currentTaskId = taskId;
  const panel = document.getElementById('right-panel');
  panel.classList.add('open');

  const { data: userData } = await supabase.auth.getUser();

  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const statusLabels = { todo: 'Todo', in_progress: 'In Progress', done: 'Done' };
  const statusColors = { todo: 'status-todo', in_progress: 'status-in_progress', done: 'status-done' };

  const body = document.getElementById('panel-body');
  body.innerHTML = `
    <div class="task-detail-title">${escapeHtml(task.title)}</div>
    <div>
      <span class="task-detail-status ${statusColors[task.status]}">${statusLabels[task.status]}</span>
    </div>
    <div class="task-detail-meta">Created ${new Date(task.created_at).toLocaleDateString()}</div>

    <div class="section">
      <div class="section-title">Comments</div>
      <div id="comment-list" class="comment-list"></div>
      <div class="comment-form">
        <input type="text" id="comment-input" placeholder="Write a comment...">
        <button class="btn btn-sm btn-primary" id="comment-submit">Send</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Files</div>
      <div id="file-list" class="file-list"></div>
      <div class="upload-form">
        <input type="file" id="file-input">
        <button class="btn btn-sm btn-secondary" id="file-upload-btn">Upload</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Team</div>
      <div id="team-list-panel" class="team-list"></div>
    </div>
  `;

  await loadComments(taskId, userData?.user?.id);
  await loadFiles(taskId, userData?.user?.id);
  await loadTeam(getCurrentProjectId(), userData?.user?.id);
}

export function closeTaskDetail() {
  currentTaskId = null;
  const panel = document.getElementById('right-panel');
  panel.classList.remove('open');
}

function addNotification(message) {
  const event = new CustomEvent('app-notification', { detail: { message } });
  document.dispatchEvent(event);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
