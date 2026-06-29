import { supabase } from '../supabase.js';

let userEmailCache = {};

async function getUserEmail(userId) {
  if (userEmailCache[userId]) return userEmailCache[userId];
  try {
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    if (data) {
      userEmailCache[userId] = data.email;
      return data.email;
    }
  } catch {}
  return userId.substring(0, 8) + '...';
}

export async function loadComments(taskId, currentUserId) {
  if (!taskId) return;

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading comments:', error.message);
    return;
  }

  await renderComments(data, currentUserId, taskId);
  setupCommentForm(taskId, currentUserId);
}

async function renderComments(comments, currentUserId, taskId) {
  const container = document.getElementById('comment-list');
  if (!container) return;

  if (comments.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No comments yet</p></div>';
    return;
  }

  const withEmails = await Promise.all(
    comments.map(async (c) => ({
      ...c,
      userEmail: await getUserEmail(c.user_id)
    }))
  );

  container.innerHTML = withEmails.map(c => `
    <div class="comment-item">
      <div class="comment-header">
        <span class="comment-user">${escapeHtml(c.userEmail)}</span>
        <div>
          <span class="comment-time">${new Date(c.created_at).toLocaleString()}</span>
          ${c.user_id === currentUserId ? `
            <button class="delete-comment" data-id="${c.id}" title="Delete">✕</button>
          ` : ''}
        </div>
      </div>
      <div class="comment-content">${escapeHtml(c.content)}</div>
    </div>
  `).join('');

  document.querySelectorAll('.delete-comment').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', btn.dataset.id);
      if (!error) {
        await loadComments(taskId, currentUserId);
      }
    });
  });
}

function setupCommentForm(taskId, currentUserId) {
  const input = document.getElementById('comment-input');
  const submit = document.getElementById('comment-submit');
  if (!input || !submit) return;

  const handler = async () => {
    const content = input.value.trim();
    if (!content) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { error } = await supabase
      .from('comments')
      .insert({ task_id: taskId, user_id: userData.user.id, content });

    if (!error) {
      input.value = '';
      await loadComments(taskId, currentUserId);
    }
  };

  submit.addEventListener('click', handler);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handler();
  });
}

export { renderComments };

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
