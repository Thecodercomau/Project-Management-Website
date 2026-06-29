import { supabase } from '../supabase.js';

let notifications = [];
let unreadCount = 0;

export async function loadNotifications() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return;

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error loading notifications:', error.message);
    return;
  }

  notifications = data || [];
  unreadCount = notifications.filter(n => !n.read).length;
  renderNotificationBadge();
  renderNotificationList();
}

function renderNotificationBadge() {
  const badge = document.getElementById('notif-count');
  if (!badge) return;

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderNotificationList() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  if (notifications.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No notifications</p></div>';
    return;
  }

  const typeLabels = { task: 'notif-type-task', team: 'notif-type-team', system: 'notif-type-system' };

  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
      <div class="notif-message">${escapeHtml(n.message)}</div>
      <div class="notif-time">${new Date(n.created_at).toLocaleString()}</div>
      <span class="notif-type ${typeLabels[n.type] || typeLabels.system}">${n.type}</span>
    </div>
  `).join('');

  list.querySelectorAll('.notif-item.unread').forEach(item => {
    item.addEventListener('click', async () => {
      const id = item.dataset.id;
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      item.classList.remove('unread');
      unreadCount = Math.max(0, unreadCount - 1);
      renderNotificationBadge();
    });
  });
}

export function toggleNotifications() {
  const dropdown = document.getElementById('notif-dropdown');
  dropdown.classList.toggle('open');
}

export async function markAllRead() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return;

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userData.user.id)
    .eq('read', false);

  unreadCount = 0;
  renderNotificationBadge();
  renderNotificationList();
}

export function getUnreadCount() {
  return unreadCount;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
