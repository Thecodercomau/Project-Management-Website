import { supabase } from '../supabase.js';

const signupForm = document.getElementById('signup-form');
const errorMsg = document.getElementById('error-msg');

signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  errorMsg.classList.add('hidden');

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    errorMsg.textContent = error.message;
    errorMsg.classList.remove('hidden');
    return;
  }

  alert('Sign up successful! Check your email for confirmation. You can now log in.');
  window.location.href = 'login.html';
});
