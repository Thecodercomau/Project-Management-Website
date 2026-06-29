import { supabase } from '../supabase.js';

const BUCKET = 'project-files';

export async function loadFiles(taskId, currentUserId) {
  if (!taskId) return;

  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading files:', error.message);
    return;
  }

  renderFiles(data, currentUserId, taskId);
  setupUploadForm(taskId, currentUserId);
}

function renderFiles(files, currentUserId, taskId) {
  const container = document.getElementById('file-list');
  if (!container) return;

  if (files.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No files uploaded</p></div>';
    return;
  }

  container.innerHTML = files.map(f => `
    <div class="file-item">
      <div class="file-info">
        <span class="file-icon">📄</span>
        <span class="file-name">${escapeHtml(f.file_name)}</span>
      </div>
      <div class="file-actions">
        <a href="${f.file_url}" target="_blank" class="btn-icon" title="Download" download>⬇</a>
        ${f.user_id === currentUserId ? `
          <button class="btn-icon delete-file" data-id="${f.id}" title="Delete">✕</button>
        ` : ''}
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.delete-file').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this file?')) return;

      const file = files.find(f => f.id === btn.dataset.id);
      if (file) {
        const filePath = file.file_url.split('/').pop();
        await supabase.storage.from(BUCKET).remove([filePath]);
      }

      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', btn.dataset.id);

      if (!error) {
        await loadFiles(taskId, currentUserId);
      }
    });
  });
}

function setupUploadForm(taskId, currentUserId) {
  const input = document.getElementById('file-input');
  const uploadBtn = document.getElementById('file-upload-btn');
  if (!input || !uploadBtn) return;

  uploadBtn.addEventListener('click', async () => {
    const file = input.files[0];
    if (!file) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const filePath = `${taskId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file);

    if (uploadError) {
      alert('Upload error: ' + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from('files')
      .insert({
        task_id: taskId,
        user_id: userData.user.id,
        file_name: file.name,
        file_url: urlData.publicUrl
      });

    if (dbError) {
      alert('Database error: ' + dbError.message);
      return;
    }

    input.value = '';
    await loadFiles(taskId, currentUserId);
  });
}

export { renderFiles };

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
