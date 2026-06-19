import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Button } from '../../components/ui';

export default function Notices() {
  const queryClient=useQueryClient();
  const [showForm,setShowForm]=useState(false);
  const {data,isLoading}=useQuery({queryKey:['notices'],queryFn:async()=>(await api.get('/notices')).data});
  const deleteMutation=useMutation({ mutationFn:id=>api.delete(`/notices/${id}`), onSuccess:()=>queryClient.invalidateQueries({queryKey:['notices']}) });

  return (
    <div>
      <PageHeader title="Notice Board" description="Post meeting notices, reminders and announcements."
        action={<Button onClick={()=>setShowForm(true)}><Plus size={15}/>New Notice</Button>}/>

      {isLoading&&<div className="empty-state">Loading…</div>}
      <div className="notice-list">
        {data?.map(n=>(
          <div key={n.id} className="card notice-card" style={{display:'flex',justifyContent:'space-between',gap:12}}>
            <div>
              <div className="notice-title">{n.title}</div>
              <div className="notice-body">{n.content}</div>
              <div className="notice-meta">{new Date(n.createdAt).toLocaleString('en-IN')}</div>
            </div>
            <button className="btn-icon shrink-0" style={{alignSelf:'flex-start'}} onClick={()=>{if(confirm('Delete?'))deleteMutation.mutate(n.id)}}><Trash2 size={15}/></button>
          </div>
        ))}
        {!isLoading&&!data?.length&&<div className="empty-state">No notices posted yet.</div>}
      </div>

      {showForm&&<NoticeForm onClose={()=>setShowForm(false)} queryClient={queryClient}/>}
    </div>
  );
}

function NoticeForm({onClose,queryClient}){
  const [title,setTitle]=useState('');
  const [content,setContent]=useState('');
  const mutation=useMutation({
    mutationFn:()=>api.post('/notices',{title,content}),
    onSuccess:()=>{ queryClient.invalidateQueries({queryKey:['notices']}); onClose(); },
  });
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}><X size={18}/></button>
        <div className="modal-title">New Notice</div>
        <form onSubmit={e=>{e.preventDefault();mutation.mutate();}} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="form-group"><label className="form-label">Title</label><input required className="form-input" value={title} onChange={e=>setTitle(e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Content</label><textarea required className="form-textarea" value={content} onChange={e=>setContent(e.target.value)}/></div>
          <div className="modal-actions"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending?'Posting…':'Post Notice'}</Button></div>
        </form>
      </div>
    </div>
  );
}
