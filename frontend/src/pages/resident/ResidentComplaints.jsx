import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Badge, statusTone, Button } from '../../components/ui';

const CATS=['PLUMBING','ELECTRICITY','LIFT','CLEANING','SECURITY','OTHER'];

export default function ResidentComplaints() {
  const queryClient=useQueryClient();
  const [showForm,setShowForm]=useState(false);
  const {data,isLoading}=useQuery({queryKey:['complaints'],queryFn:async()=>(await api.get('/complaints')).data});

  return (
    <div>
      <PageHeader title="Complaints" description="Raise issues with plumbing, lift, electricity and more."
        action={<Button onClick={()=>setShowForm(true)}><Plus size={15}/>Raise Complaint</Button>}/>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Status</th></tr></thead>
          <tbody>
            {isLoading&&<tr><td colSpan={4} className="empty-state">Loading…</td></tr>}
            {data?.map(c=>(
              <tr key={c.id}>
                <td style={{whiteSpace:'nowrap'}}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                <td><Badge tone="ink">{c.category}</Badge></td>
                <td style={{fontSize:'0.82rem'}}>{c.description}</td>
                <td><Badge tone={statusTone(c.status)}>{c.status.replace('_',' ')}</Badge></td>
              </tr>
            ))}
            {!isLoading&&!data?.length&&<tr><td colSpan={4} className="empty-state">You haven't raised any complaints yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm&&<ComplaintForm onClose={()=>setShowForm(false)} queryClient={queryClient}/>}
    </div>
  );
}

function ComplaintForm({onClose,queryClient}){
  const [category,setCategory]=useState(CATS[0]);
  const [description,setDescription]=useState('');
  const mutation=useMutation({
    mutationFn:()=>api.post('/complaints',{category,description}),
    onSuccess:()=>{ queryClient.invalidateQueries({queryKey:['complaints']}); onClose(); },
  });
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}><X size={18}/></button>
        <div className="modal-title">Raise Complaint</div>
        <form onSubmit={e=>{e.preventDefault();mutation.mutate();}} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={category} onChange={e=>setCategory(e.target.value)}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Description</label><textarea required className="form-textarea" value={description} onChange={e=>setDescription(e.target.value)}/></div>
          <div className="modal-actions"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending?'Submitting…':'Submit Complaint'}</Button></div>
        </form>
      </div>
    </div>
  );
}
