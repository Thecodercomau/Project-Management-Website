(async function () {
  const errorEl = document.getElementById('admin-error');
  const statusEl = document.getElementById('admin-status');
  let statusTimer = null;

  function showError(message) {
    errorEl.textContent = message;
  }

  function showStatus(message) {
    errorEl.textContent = '';
    statusEl.textContent = message;
    statusEl.classList.add('visible');
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => statusEl.classList.remove('visible'), 4000);
  }

  try {
    const { user } = await API.me();
    if (!user.isAdmin) {
      window.location.href = 'dashboard.html';
      return;
    }

    const summary = await API.adminSummary();
    document.getElementById('admin-users').textContent = summary.users;
    document.getElementById('admin-projects').textContent = summary.projects;
    document.getElementById('admin-tasks').textContent = summary.tasks;
  } catch (err) {
    showError(err.message);
    return;
  }

  function wireDownload(buttonId, fn, label) {
    document.getElementById(buttonId).addEventListener('click', () => {
      try {
        fn();
        showStatus(`${label} download started — check your browser downloads.`);
      } catch (err) {
        showError(err.message);
      }
    });
  }

  wireDownload('download-users', () => API.downloadUsersCsv(), 'Users CSV');
  wireDownload('download-projects', () => API.downloadProjectsCsv(), 'Projects CSV');
  wireDownload('download-tasks', () => API.downloadTasksCsv(), 'Tasks CSV');

  document.getElementById('download-all').addEventListener('click', () => {
    try {
      API.downloadUsersCsv();
      API.downloadProjectsCsv();
      API.downloadTasksCsv();
      showStatus('All three CSV downloads started — check your browser downloads.');
    } catch (err) {
      showError(err.message);
    }
  });
})();
