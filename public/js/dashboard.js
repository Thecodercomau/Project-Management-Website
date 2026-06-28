(async function () {
  const grid = document.getElementById('projects-grid');
  const empty = document.getElementById('empty-state');
  const loading = document.getElementById('loading-projects');

  async function loadProjects() {
    loading.style.display = 'block';
    grid.innerHTML = '';
    empty.style.display = 'none';
    try {
      const projects = await API.getProjects();
      loading.style.display = 'none';
      if (projects.length === 0) {
        empty.style.display = 'block';
        return;
      }
      projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.description || 'No description')}</p>
          <div class="card-meta">Created ${new Date(p.createdAt).toLocaleDateString()}</div>
          <div class="card-actions">
            <button class="btn-small btn-outline view-board" data-id="${p._id}">Open Board</button>
            <button class="btn-small btn-outline edit-project" data-id="${p._id}">Edit</button>
            <button class="btn-small btn-danger delete-project" data-id="${p._id}">Delete</button>
          </div>
        `;
        card.querySelector('.view-board').addEventListener('click', (e) => {
          e.stopPropagation();
          window.location.href = `board.html?project=${p._id}`;
        });
        card.querySelector('.edit-project').addEventListener('click', (e) => {
          e.stopPropagation();
          openProjectModal(p);
        });
        card.querySelector('.delete-project').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`Delete "${p.name}"? This will also delete all tasks.`)) {
            await API.deleteProject(p._id);
            loadProjects();
          }
        });
        grid.appendChild(card);
      });
    } catch (err) {
      loading.style.display = 'none';
      empty.style.display = 'block';
      empty.innerHTML = `<p>Error loading projects: ${err.message}</p>`;
    }
  }

  // Project modal
  const modal = document.getElementById('project-modal');
  const form = document.getElementById('project-form');
  const modalTitle = document.getElementById('project-modal-title');
  const nameInput = document.getElementById('project-name');
  const descInput = document.getElementById('project-desc');
  const errEl = document.getElementById('project-error');
  let editingProject = null;

  function openProjectModal(project) {
    editingProject = project || null;
    modalTitle.textContent = project ? 'Edit Project' : 'New Project';
    nameInput.value = project ? project.name : '';
    descInput.value = project ? (project.description || '') : '';
    errEl.textContent = '';
    modal.classList.add('active');
  }

  document.getElementById('new-project-btn').addEventListener('click', () => openProjectModal(null));
  document.getElementById('project-cancel').addEventListener('click', () => modal.classList.remove('active'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    try {
      if (editingProject) {
        await API.updateProject(editingProject._id, { name: nameInput.value, description: descInput.value });
      } else {
        await API.createProject(nameInput.value, descInput.value);
      }
      modal.classList.remove('active');
      loadProjects();
    } catch (err) {
      errEl.textContent = err.message;
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  loadProjects();
})();
