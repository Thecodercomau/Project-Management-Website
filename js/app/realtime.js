import { supabase } from '../supabase.js';
import { getCurrentProjectId } from './projects.js';
import { renderKanban } from './kanban.js';
import { loadNotifications } from './notifications.js';

let channels = [];

export function subscribeToRealtime() {
  unsubscribeAll();

  const tasksChannel = supabase.channel('tasks-changes');
  tasksChannel
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => {
        const pid = getCurrentProjectId();
        if (!pid) return;

        const taskProjectId = payload.new?.project_id || payload.old?.project_id;
        if (taskProjectId === pid) {
          renderKanban();
        }
      }
    )
    .subscribe();

  channels.push(tasksChannel);

  const commentsChannel = supabase.channel('comments-changes');
  commentsChannel
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'comments' },
      (payload) => {
        const panel = document.getElementById('right-panel');
        if (panel?.classList.contains('open')) {
          dispatchRecommentEvent();
        }
      }
    )
    .subscribe();

  channels.push(commentsChannel);

  const notifChannel = supabase.channel('notifications-changes');
  notifChannel
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      async (payload) => {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user && payload.new.user_id === userData.user.id) {
          await loadNotifications();
        }
      }
    )
    .subscribe();

  channels.push(notifChannel);
}

function dispatchRecommentEvent() {
  const event = new CustomEvent('reload-task-detail');
  document.dispatchEvent(event);
}

export function unsubscribeAll() {
  channels.forEach(ch => supabase.removeChannel(ch));
  channels = [];
}
