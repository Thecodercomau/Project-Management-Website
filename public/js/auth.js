(function () {
  const token = localStorage.getItem('token');
  const currentPage = window.location.pathname.split('/').pop();

  // Landing page: public, no redirects or auth wiring needed
  if (currentPage === '' || currentPage === 'index.html' || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
    return;
  }

  // Login/signup page: if already logged in, skip straight to the workspace
  if (currentPage === 'login.html') {
    if (token) window.location.href = 'dashboard.html';
    else initAuthPage();
    return;
  }

  // Protected pages: redirect to login if no token
  const protectedPages = ['dashboard.html', 'board.html', 'admin.html'];
  if (protectedPages.includes(currentPage) && !token) {
    window.location.href = 'login.html';
    return;
  }

  // Show user name in nav
  if (token) {
    API.me().then(data => {
      const el = document.getElementById('nav-user');
      if (el) el.textContent = data.user.name;
      const navRight = document.querySelector('.nav-right');
      if (navRight && data.user.isAdmin && !document.getElementById('admin-link')) {
        const adminLink = document.createElement('a');
        adminLink.href = 'admin.html';
        adminLink.id = 'admin-link';
        adminLink.className = 'btn-outline';
        adminLink.textContent = 'Admin';
        navRight.insertBefore(adminLink, document.getElementById('logout-btn'));
      }
    }).catch(() => {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    });
  }
})();

function initAuthPage() {
  const tabs = document.querySelectorAll('.tab');
  const forms = {
    login: document.getElementById('login-form'),
    signup: document.getElementById('signup-form'),
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.entries(forms).forEach(([key, form]) => {
        form.classList.toggle('active', key === tab.dataset.tab);
      });
    });
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    try {
      const data = await API.login(
        document.getElementById('login-email').value,
        document.getElementById('login-password').value
      );
      localStorage.setItem('token', data.token);
      window.location.href = data.user.isAdmin ? 'admin.html' : 'dashboard.html';
    } catch (err) {
      errEl.textContent = err.message;
    }
  });

  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('signup-error');
    errEl.textContent = '';
    try {
      const data = await API.signup(
        document.getElementById('signup-name').value,
        document.getElementById('signup-email').value,
        document.getElementById('signup-password').value
      );
      localStorage.setItem('token', data.token);
      window.location.href = data.user.isAdmin ? 'admin.html' : 'dashboard.html';
    } catch (err) {
      errEl.textContent = err.message;
    }
  });
}
