import { supabase } from '../supabase.js';

export async function checkAdmin() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();

  if (error || !data) return false;
  return data.is_admin === true;
}

export async function getStats() {
  const [users, projects, tasks, comments, files, banned] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('tasks').select('id', { count: 'exact', head: true }),
    supabase.from('comments').select('id', { count: 'exact', head: true }),
    supabase.from('files').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true)
  ]);

  return {
    users: users.count || 0,
    projects: projects.count || 0,
    tasks: tasks.count || 0,
    comments: comments.count || 0,
    files: files.count || 0,
    banned: banned.count || 0
  };
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading users:', error.message);
    return [];
  }
  return data || [];
}

export async function toggleUserBan(userId, currentlyBanned) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: !currentlyBanned })
    .eq('id', userId);

  if (error) {
    console.error('Error toggling ban:', error.message);
    return false;
  }
  return true;
}

export async function toggleUserAdmin(userId, currentlyAdmin) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: !currentlyAdmin })
    .eq('id', userId);

  if (error) {
    console.error('Error toggling admin:', error.message);
    return false;
  }
  return true;
}

export async function getAllProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading projects:', error.message);
    return [];
  }

  const withCounts = await Promise.all(
    (data || []).map(async (p) => {
      const { count } = await supabase
        .from('project_members')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', p.id);
      return { ...p, member_count: count || 0 };
    })
  );

  return withCounts;
}

export async function deleteProjectAsAdmin(projectId) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error.message);
    return false;
  }
  return true;
}

export async function getAllComments() {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error loading comments:', error.message);
    return [];
  }

  const withEmails = await Promise.all(
    (data || []).map(async (c) => {
      let email = c.user_id;
      try {
        const { data: ud } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', c.user_id)
          .single();
        if (ud) email = ud.email;
      } catch {}
      return { ...c, user_email: email };
    })
  );

  return withEmails;
}

export async function deleteCommentAsAdmin(commentId) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error.message);
    return false;
  }
  return true;
}

export async function broadcastNotification(message) {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id');

  if (!profiles) return false;

  const notifications = profiles.map(p => ({
    user_id: p.id,
    message,
    type: 'system'
  }));

  const { error } = await supabase
    .from('notifications')
    .insert(notifications);

  if (error) {
    console.error('Error broadcasting:', error.message);
    return false;
  }
  return true;
}
