import { supabase } from '../supabase.js';
import { getCurrentProjectId } from './projects.js';

export async function loadTasks(projectId) {
  const pid = projectId || getCurrentProjectId();
  if (!pid) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', pid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading tasks:', error.message);
    return [];
  }

  return data;
}

export async function createTask(projectId, title) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const pid = projectId || getCurrentProjectId();
  if (!pid) return null;

  const { data, error } = await supabase
    .from('tasks')
    .insert({ project_id: pid, user_id: userData.user.id, title, status: 'todo' })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error.message);
    return null;
  }

  return data;
}

export async function updateTaskStatus(taskId, status) {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId);

  if (error) {
    console.error('Error updating task status:', error.message);
    return false;
  }
  return true;
}

export async function updateTask(taskId, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error.message);
    return null;
  }
  return data;
}

export async function deleteTask(taskId) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error.message);
    return false;
  }
  return true;
}
