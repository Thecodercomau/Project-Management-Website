import { supabase } from '../supabase.js';
import { getCurrentProjectId } from './projects.js';

export async function loadTeam(projectId, currentUserId) {
  const pid = projectId || getCurrentProjectId();
  if (!pid) return;

  const { data, error } = await supabase
    .from('project_members')
    .select('id, user_id, role, created_at')
    .eq('project_id', pid);

  if (error) {
    console.error('Error loading team:', error.message);
    return;
  }

  await renderTeam(data, currentUserId, pid);
}

async function renderTeam(members, currentUserId, projectId) {
  const container = document.getElementById('team-list-panel');
  if (!container) return;

  const isOwner = members.some(m => m.user_id === currentUserId && m.role === 'owner');

  const withEmails = await Promise.all(
    members.map(async (m) => {
      let email = m.user_id;
      try {
        const { data: ud } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', m.user_id)
          .single();
        if (ud) email = ud.email;
      } catch {}
      return { ...m, email };
    })
  );

  container.innerHTML = `
    ${withEmails.map(m => `
      <div class="team-member" data-id="${m.id}">
        <div class="member-info">
          <div class="member-avatar">${(m.email[0] || '?').toUpperCase()}</div>
          <div>
            <div class="member-email">${escapeHtml(m.email)}</div>
            <span class="member-role">${m.role}</span>
          </div>
        </div>
        ${isOwner && m.role !== 'owner' ? `
          <button class="btn-icon remove-member" data-member-id="${m.id}" title="Remove">✕</button>
        ` : ''}
      </div>
    `).join('')}
    ${isOwner ? `
      <div class="invite-form" style="margin-top:0.8rem;">
        <input type="email" id="invite-email" placeholder="Email to invite...">
        <button class="btn btn-sm btn-primary" id="invite-btn">Invite</button>
      </div>
    ` : ''}
  `;

  document.querySelectorAll('.remove-member').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this member?')) return;
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', btn.dataset.memberId);
      if (!error) {
        await loadTeam(projectId, currentUserId);
        addNotification('Member removed');
      }
    });
  });

  const inviteBtn = document.getElementById('invite-btn');
  const inviteInput = document.getElementById('invite-email');
  if (inviteBtn && inviteInput) {
    const handleInvite = async () => {
      const email = inviteInput.value.trim();
      if (!email) return;

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email);

      if (profErr || !profiles || profiles.length === 0) {
        alert('User not found. They need to sign up first.');
        return;
      }

      const target = profiles[0];
      const exists = members.some(m => m.user_id === target.id);
      if (exists) {
        alert('User is already a member.');
        return;
      }

      const { error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: target.id, role: 'member' });

      if (error) {
        alert('Error inviting user: ' + error.message);
      } else {
        inviteInput.value = '';
        await loadTeam(projectId, currentUserId);
        addNotification('User invited to project');
      }
    };

    inviteBtn.addEventListener('click', handleInvite);
    inviteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleInvite();
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addNotification(message) {
  const event = new CustomEvent('app-notification', { detail: { message } });
  document.dispatchEvent(event);
}
