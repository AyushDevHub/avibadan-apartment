import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Badge, statusTone, Button } from '../../components/ui';

function defaultMonth(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

export default function MaintenanceBills() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState('');
  const [showGen, setShowGen] = useState(false);
  const [genMonth, setGenMonth] = useState(defaultMonth());
  const [genDue, setGenDue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey:['bills',month,status],
    queryFn: async()=>(await api.get('/maintenance-bills',{params:{month,status}})).data,
  });

  const genMutation = useMutation({
    mutationFn: ()=>api.post('/maintenance-bills/generate',{month:genMonth,dueDate:genDue}),
    onSuccess: res=>{ queryClient.invalidateQueries({queryKey:['bills']}); setShowGen(false); alert(`Generated ${res.data.createdCount} bill(s) for ${genMonth}`); },
  });
  const waiveMutation = useMutation({
    mutationFn: id=>api.put(`/maintenance-bills/${id}/waive`,{}),
    onSuccess: ()=>queryClient.invalidateQueries({queryKey:['bills']}),
  });

  return (
    <div>
      <PageHeader title="Maintenance Bills" description="Generate and manage monthly bills for all flats."
        action={<Button onClick={()=>setShowGen(true)}><Plus size={15}/>Generate</Button>} />

      <div className="filter-bar">
        <input type="month" className="form-input" value={month} onChange={e=>setMonth(e.target.value)} />
        <select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="PAID">Paid</option><option value="PARTIAL">Partial</option>
          <option value="UNPAID">Unpaid</option><option value="WAIVED">Waived</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Flat</th><th>Owner</th><th>Month</th><th className="right">Amount</th><th>Due Date</th><th>Status</th><th className="right">Action</th></tr></thead>
          <tbody>
            {isLoading&&<tr><td colSpan={7} className="empty-state">Loading…</td></tr>}
            {data?.map(b=>(
              <tr key={b.id}>
                <td style={{fontWeight:500}}>{b.flat.flatNumber}</td>
                <td>{b.flat.ownerName}</td>
                <td>{b.month}</td>
                <td className="right mono">₹{Number(b.amount).toLocaleString('en-IN')}</td>
                <td>{new Date(b.dueDate).toLocaleDateString('en-IN')}</td>
                <td><Badge tone={statusTone(b.status)}>{b.status}</Badge></td>
                <td className="right">
                  {b.status!=='PAID'&&b.status!=='WAIVED'&&(
                    <button style={{fontSize:'0.75rem',color:'var(--text-muted)'}} onClick={()=>{if(confirm('Waive this bill?'))waiveMutation.mutate(b.id)}}>Waive</button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading&&!data?.length&&<tr><td colSpan={7} className="empty-state">No bills found.</td></tr>}
          </tbody>
        </table>
      </div>

      {showGen&&(
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close" onClick={()=>setShowGen(false)}><X size={18}/></button>
            <div className="modal-title">Generate Maintenance Bills</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div className="form-group"><label className="form-label">Month</label><input type="month" className="form-input" value={genMonth} onChange={e=>setGenMonth(e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Due Date</label><input type="date" className="form-input" value={genDue} onChange={e=>setGenDue(e.target.value)}/></div>
              <p style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>Creates bills for every active flat using their current monthly rate.</p>
              <div className="modal-actions"><Button onClick={()=>genMutation.mutate()} disabled={!genDue||genMutation.isPending}>{genMutation.isPending?'Generating…':'Generate for all flats'}</Button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
