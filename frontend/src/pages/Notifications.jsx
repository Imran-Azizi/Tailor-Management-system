import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LuBell, LuCheck, LuTrash2, LuTriangleAlert, LuCheckCheck } from 'react-icons/lu';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { getApiErrorMessage } from '../lib/feedback.js';
import { PageHeader, Spinner, EmptyState } from '../components/ui/index.jsx';

export default function Notifications() {
  const qc = useQueryClient();
  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30_000,
  });

  const readMut = useMutation({
    mutationFn: id => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['notifications'] });
      qc.invalidateQueries({ queryKey:['notifs-count'] });
    },
    onError: error => toast.error(getApiErrorMessage(error, 'Unable to mark notification as read.')),
  });
  const readAllMut = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['notifications'] });
      qc.invalidateQueries({ queryKey:['notifs-count'] });
      toast.success('All notifications marked as read.');
    },
    onError: error => toast.error(getApiErrorMessage(error, 'Unable to mark all notifications as read.')),
  });
  const delMut = useMutation({
    mutationFn: id => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['notifications'] });
      toast.success('Notification deleted.');
    },
    onError: error => toast.error(getApiErrorMessage(error, 'Unable to delete notification.')),
  });

  const unread = notifs.filter(n => !n.isRead).length;

  return (
    <div className="page">
      <PageHeader title="Notifications" subtitle={`${unread} unread`}
        action={unread > 0 && (
          <button onClick={() => readAllMut.mutate()} className="btn btn-outline btn-sm" style={{ display:'flex', alignItems:'center', gap:5 }}>
            <LuCheckCheck size={13} /> Mark all read
          </button>
        )}
      />

      {isLoading ? <Spinner /> : !notifs.length ? (
        <div className="card" style={{ padding:40 }}><EmptyState message="No notifications" Icon={LuBell} /></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {notifs.map(n => (
            <div key={n.id} className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'flex-start', gap:14, borderLeft: !n.isRead ? '3px solid var(--primary)' : '3px solid transparent' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:n.isRead?'var(--surface2)':'var(--primary-100)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <LuTriangleAlert size={16} style={{ color:n.isRead?'var(--text3)':'var(--primary)' }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                  {!n.isRead && <span style={{ width:7, height:7, background:'var(--primary)', borderRadius:'50%', flexShrink:0 }} />}
                  <span style={{ fontSize:13, fontWeight:600 }}>
                    {n.order?.customer?.firstName}
                    {n.order?.customer?.billNumber && (
                      <span style={{ fontFamily:'monospace', fontWeight:400, color:'var(--primary)', marginLeft:6 }}>#{n.order.customer.billNumber}</span>
                    )}
                  </span>
                </div>
                <p style={{ fontSize:13, lineHeight:1.5 }}>{n.message}</p>
                <div style={{ display:'flex', gap:14, marginTop:5, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>Created: {new Date(n.createdAt).toLocaleString()}</span>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>Next: {new Date(n.nextAlert).toLocaleString()}</span>
                  {n.expiresAt && <span style={{ fontSize:11, color:'#DC2626' }}>Expires: {new Date(n.expiresAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {!n.isRead && (
                  <button onClick={() => readMut.mutate(n.id)} className="btn btn-outline btn-sm" style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <LuCheck size={12} /> Read
                  </button>
                )}
                <button onClick={() => delMut.mutate(n.id)}
                  style={{ background:'#FFF1F2', color:'#BE123C', border:'none', borderRadius:5, padding:'4px 8px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                  <LuTrash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
