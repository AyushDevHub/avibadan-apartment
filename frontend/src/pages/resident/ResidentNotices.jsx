import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { PageHeader } from '../../components/ui';

export default function ResidentNotices() {
  const { data, isLoading } = useQuery({ queryKey:['notices'], queryFn: async()=>(await api.get('/notices')).data });
  return (
    <div>
      <PageHeader title="Notice Board" description="Announcements and reminders from management." />
      <div className="notice-list">
        {isLoading&&<div className="empty-state">Loading…</div>}
        {data?.map(n=>(
          <div key={n.id} className="card notice-card">
            <div className="notice-title">{n.title}</div>
            <div className="notice-body">{n.content}</div>
            <div className="notice-meta">{new Date(n.createdAt).toLocaleString('en-IN')}</div>
          </div>
        ))}
        {!isLoading&&!data?.length&&<div className="empty-state">No notices posted yet.</div>}
      </div>
    </div>
  );
}
