import { supabase } from '../supabase.js';

const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  errorMsg.classList.add('hidden');

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorMsg.textContent = error.message;
    errorMsg.classList.remove('hidden');
    return;
  }

  window.location.href = 'dashboard.html';
});
