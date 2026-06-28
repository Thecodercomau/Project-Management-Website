const API = (() => {
  const BASE = window.location.protocol === 'file:' ? 'http://localhost:5000' : '';

  function getToken() {
    return localStorage.getItem('token');
  }

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const token = getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(`${BASE}${path}`, opts);
    } catch (err) {
      if (window.location.protocol === 'file:') {
        throw new Error('Start the server with npm start, then open http://localhost:5000 instead of this file.');
      }
      throw new Error('Cannot reach the server. Make sure npm start is running.');
    }

    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Server returned an invalid response.');
      }
    }

    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function download(path) {
    const token = getToken();
    if (!token) throw new Error('You must be logged in to download exports.');
    const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    // Use a hidden iframe so multiple downloads can be triggered without
    // navigating away from the current page.
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = url;
    document.body.appendChild(frame);
    setTimeout(() => frame.remove(), 10000);
  }

  return {
    // Auth
    signup: (name, email, password) => request('POST', '/api/auth/signup', { name, email, password }),
    login: (email, password) => request('POST', '/api/auth/login', { email, password }),
    me: () => request('GET', '/api/auth/me'),

    // Projects
    getProjects: () => request('GET', '/api/projects'),
    getProject: (id) => request('GET', `/api/projects/${id}`),
    createProject: (name, description) => request('POST', '/api/projects', { name, description }),
    updateProject: (id, data) => request('PUT', `/api/projects/${id}`, data),
    deleteProject: (id) => request('DELETE', `/api/projects/${id}`),

    // Tasks
    getTasks: (projectId) => request('GET', `/api/tasks/project/${projectId}`),
    createTask: (data) => request('POST', '/api/tasks', data),
    getTask: (id) => request('GET', `/api/tasks/${id}`),
    updateTask: (id, data) => request('PUT', `/api/tasks/${id}`, data),
    deleteTask: (id) => request('DELETE', `/api/tasks/${id}`),
    reorderTask: (id, status, order) => request('PUT', `/api/tasks/${id}/reorder`, { status, order }),

    // Admin
    adminSummary: () => request('GET', '/api/admin/summary'),
    downloadUsersCsv: () => download('/api/admin/export/users.csv'),
    downloadProjectsCsv: () => download('/api/admin/export/projects.csv'),
    downloadTasksCsv: () => download('/api/admin/export/tasks.csv'),
  };
})();
