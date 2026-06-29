import { supabase } from '../supabase.js';

let currentProjectId = null;

export function getCurrentProjectId() {
  return currentProjectId;
}

export function setCurrentProjectId(id) {
  currentProjectId = id;
}

export async function loadProjects() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  const { data, error } = await supabase
    .from('project_members')
    .select('project_id, role, projects(id, name, description, created_at)')
    .eq('user_id', userData.user.id);

  if (error) {
    console.error('Error loading projects:', error.message);
    return [];
  }

  return data.map(m => ({
    id: m.projects.id,
    name: m.projects.name,
    description: m.projects.description,
    role: m.role,
    created_at: m.projects.created_at
  }));
}

export async function createProject(name, description = '') {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({ name, description })
    .select()
    .single();

  if (projErr) {
    console.error('Error creating project:', projErr.message);
    return null;
  }

  const { error: memberErr } = await supabase
    .from('project_members')
    .insert({ project_id: project.id, user_id: userData.user.id, role: 'owner' });

  if (memberErr) {
    console.error('Error adding owner:', memberErr.message);
    return null;
  }

  return project;
}

export async function updateProject(id, updates) {
  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating project:', error.message);
    return false;
  }
  return true;
}

export function renderProjects(projects) {
  const list = document.getElementById('project-list');
  if (!list) return;

  if (projects.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>No projects yet</p></div>`;
    return;
  }

  list.innerHTML = projects.map(p => `
    <li class="project-item ${p.id === currentProjectId ? 'active' : ''}" data-id="${p.id}">
      <span class="project-name">${escapeHtml(p.name)}</span>
      <span class="project-count">${p.role}</span>
    </li>
  `).join('');

  list.querySelectorAll('.project-item').forEach(item => {
    item.addEventListener('click', () => {
      setCurrentProjectId(item.dataset.id);
      document.querySelectorAll('.project-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      if (window.appEvents?.onProjectChange) {
        window.appEvents.onProjectChange(item.dataset.id);
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
