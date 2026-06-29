import { supabase } from '../supabase.js';

export async function requireAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    window.location.href = 'login.html';
    return null;
  }

  return session;
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (!session) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  if (error || !data?.is_admin) {
    window.location.href = 'dashboard.html';
    return false;
  }

  return true;
}
