import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { PageHeader, Badge, statusTone } from '../../components/ui';

const STATUSES=['OPEN','IN_PROGRESS','RESOLVED'];

export default function Complaints() {
  const queryClient=useQueryClient();
  const [status,setStatus]=useState('');
  const {data,isLoading}=useQuery({queryKey:['complaints',status],queryFn:async()=>(await api.get('/complaints',{params:{status}})).data});
  const updateMutation=useMutation({
    mutationFn:({id,status})=>api.put(`/complaints/${id}/status`,{status}),
    onSuccess:()=>queryClient.invalidateQueries({queryKey:['complaints']}),
  });

  return (
    <div>
      <PageHeader title="Complaints" description="Resident-raised maintenance issues." />
      <div className="filter-bar">
        <select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All</option>{STATUSES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Flat</th><th>Category</th><th>Description</th><th>Status</th></tr></thead>
          <tbody>
            {isLoading&&<tr><td colSpan={5} className="empty-state">Loading…</td></tr>}
            {data?.map(c=>(
              <tr key={c.id}>
                <td style={{whiteSpace:'nowrap'}}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                <td>{c.flat.flatNumber}</td>
                <td><Badge tone="ink">{c.category}</Badge></td>
                <td style={{fontSize:'0.8rem'}}>{c.description}</td>
                <td>
                  <select className="form-select" style={{fontSize:'0.78rem',padding:'4px 28px 4px 8px'}} value={c.status} onChange={e=>updateMutation.mutate({id:c.id,status:e.target.value})}>
                    {STATUSES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!isLoading&&!data?.length&&<tr><td colSpan={5} className="empty-state">No complaints raised.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
