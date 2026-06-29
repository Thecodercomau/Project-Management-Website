import { supabase } from '../supabase.js';

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Logout error:', error.message);
  window.location.href = 'login.html';
}
