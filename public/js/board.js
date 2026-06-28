(async function () {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('project');
  if (!projectId) {
    window.location.href = 'dashboard.html';
    return;
  }

  const projectNameEl = document.getElementById('board-project-name');
  const loadingEl = document.getElementById('loading-board');
  let currentProject = null;
  let allTasks = [];
  let allUsers = [];

  // Load project
  try {
    currentProject = await API.getProject(projectId);
    projectNameEl.textContent = currentProject.name;
    document.title = `${currentProject.name} - Project Tracker`;
  } catch (err) {
    loadingEl.textContent = 'Failed to load project.';
    return;
  }

  const lists = {
    todo: document.getElementById('list-todo'),
    'in-progress': document.getElementById('list-in-progress'),
    done: document.getElementById('list-done'),
  };

  const counts = {
    todo: document.getElementById('count-todo'),
    'in-progress': document.getElementById('count-in-progress'),
    done: document.getElementById('count-done'),
  };

  // Drag state
  let draggedTask = null;

  async function loadTasks() {
    loadingEl.style.display = 'block';
    try {
      allTasks = await API.getTasks(projectId);
      // Collect users from assignees
      const userMap = {};
      allTasks.forEach(t => {
        if (t.assignee && t.assignee._id) userMap[t.assignee._id] = t.assignee;
      });
      allUsers = Object.values(userMap);

      renderBoard();
      loadingEl.style.display = 'none';
    } catch (err) {
      loadingEl.textContent = 'Failed to load tasks: ' + err.message;
    }
  }

  function renderBoard() {
    ['todo', 'in-progress', 'done'].forEach(status => {
      const statusTasks = allTasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
      const list = lists[status];
      list.innerHTML = '';
      counts[status].textContent = statusTasks.length;

      statusTasks.forEach(task => {
        const card = createTaskCard(task);
        list.appendChild(card);
      });
    });
  }

  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task._id;

    const priorityClass = `priority-${task.priority}`;
    const dueStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';

    card.innerHTML = `
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-meta">
        <span class="${priorityClass}">${task.priority}</span>
        ${dueStr ? `<span>📅 ${dueStr}</span>` : ''}
        ${task.assignee ? `<span>👤 ${escapeHtml(task.assignee.name)}</span>` : ''}
      </div>
    `;

    // View task on click
    card.addEventListener('click', (e) => {
      if (!draggedTask) openViewModal(task);
    });

    // Drag events
    card.addEventListener('dragstart', () => {
      draggedTask = task._id;
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedTask = null;
      document.querySelectorAll('.task-list').forEach(el => el.classList.remove('drag-over'));
    });

    return card;
  }

  // Set up drop zones
  Object.entries(lists).forEach(([status, list]) => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      list.classList.add('drag-over');
    });

    list.addEventListener('dragleave', () => {
      list.classList.remove('drag-over');
    });

    list.addEventListener('drop', async (e) => {
      e.preventDefault();
      list.classList.remove('drag-over');
      if (!draggedTask) return;

      const taskId = draggedTask;
      const task = allTasks.find(t => t._id === taskId);
      if (!task || task.status === status) return;

      const tasksInColumn = allTasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
      const newOrder = tasksInColumn.length;

      try {
        await API.reorderTask(taskId, status, newOrder);
        task.status = status;
        task.order = newOrder;
        renderBoard();
      } catch (err) {
        console.error('Reorder failed:', err);
      }
    });
  });

  // Make columns themselves droppable (in case list is empty)
  document.querySelectorAll('.column').forEach(col => {
    col.addEventListener('dragover', (e) => e.preventDefault());
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      const status = col.dataset.status;
      const list = lists[status];
      list.classList.remove('drag-over');
      if (!draggedTask) return;

      const taskId = draggedTask;
      const task = allTasks.find(t => t._id === taskId);
      if (!task || task.status === status) return;

      const tasksInColumn = allTasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
      const newOrder = tasksInColumn.length;

      try {
        await API.reorderTask(taskId, status, newOrder);
        task.status = status;
        task.order = newOrder;
        renderBoard();
      } catch (err) {
        console.error('Reorder failed:', err);
      }
    });
  });

  // Task modal
  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');
  const taskModalTitle = document.getElementById('task-modal-title');
  const taskIdInput = document.getElementById('task-id');
  const taskTitleInput = document.getElementById('task-title');
  const taskDescInput = document.getElementById('task-desc');
  const taskPriorityInput = document.getElementById('task-priority');
  const taskDueInput = document.getElementById('task-due');
  const taskAssigneeInput = document.getElementById('task-assignee');
  const taskErrEl = document.getElementById('task-error');
  let editingTask = null;

  function openTaskModal(task) {
    editingTask = task || null;
    taskModalTitle.textContent = task ? 'Edit Task' : 'New Task';
    taskIdInput.value = task ? task._id : '';
    taskTitleInput.value = task ? task.title : '';
    taskDescInput.value = task ? (task.description || '') : '';
    taskPriorityInput.value = task ? task.priority : 'medium';
    taskDueInput.value = task && task.dueDate ? task.dueDate.split('T')[0] : '';
    taskAssigneeInput.value = task && task.assignee ? task.assignee.email : '';
    taskErrEl.textContent = '';
    taskModal.classList.add('active');
  }

  document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal(null));
  document.getElementById('task-cancel').addEventListener('click', () => taskModal.classList.remove('active'));

  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    taskErrEl.textContent = '';
    let assigneeId = null;

    // Look up assignee by email
    const assigneeEmail = taskAssigneeInput.value.trim();
    if (assigneeEmail) {
      // We can search through loaded users, or just pass email to backend
      // For simplicity, we'll try to find in allUsers or just leave null
      const found = allUsers.find(u => u.email === assigneeEmail);
      if (found) assigneeId = found._id;
    }

    const payload = {
      title: taskTitleInput.value,
      description: taskDescInput.value,
      priority: taskPriorityInput.value,
      dueDate: taskDueInput.value || null,
      assignee: assigneeId,
      project: projectId,
    };

    try {
      if (editingTask) {
        const updated = await API.updateTask(editingTask._id, payload);
        const idx = allTasks.findIndex(t => t._id === editingTask._id);
        if (idx !== -1) allTasks[idx] = updated;
      } else {
        payload.status = 'todo';
        const created = await API.createTask(payload);
        allTasks.push(created);
      }
      taskModal.classList.remove('active');
      renderBoard();
    } catch (err) {
      taskErrEl.textContent = err.message;
    }
  });

  // View modal
  const viewModal = document.getElementById('view-modal');
  const viewTitle = document.getElementById('view-title');
  const viewStatus = document.getElementById('view-status');
  const viewPriority = document.getElementById('view-priority');
  const viewDue = document.getElementById('view-due');
  const viewAssignee = document.getElementById('view-assignee');
  const viewDesc = document.getElementById('view-desc');
  let viewingTask = null;

  function openViewModal(task) {
    viewingTask = task;
    viewTitle.textContent = task.title;
    viewStatus.textContent = task.status.replace('-', ' ');
    viewStatus.className = `badge badge-${task.status}`;
    viewPriority.textContent = task.priority;
    viewPriority.className = `badge badge-${task.priority}`;
    viewDue.textContent = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
    viewAssignee.textContent = task.assignee ? `${task.assignee.name} (${task.assignee.email})` : 'Unassigned';
    viewDesc.textContent = task.description || 'No description';
    viewModal.classList.add('active');
  }

  document.getElementById('view-close').addEventListener('click', () => viewModal.classList.remove('active'));
  document.getElementById('edit-task-btn').addEventListener('click', () => {
    viewModal.classList.remove('active');
    openTaskModal(viewingTask);
  });
  document.getElementById('delete-task-btn').addEventListener('click', async () => {
    if (confirm('Delete this task?')) {
      try {
        await API.deleteTask(viewingTask._id);
        allTasks = allTasks.filter(t => t._id !== viewingTask._id);
        viewModal.classList.remove('active');
        renderBoard();
      } catch (err) {
        alert('Delete failed: ' + err.message);
      }
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  loadTasks();
})();
