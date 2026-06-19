import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Badge, Button } from '../../components/ui';

const today=()=>new Date().toISOString().slice(0,10);

export default function Cashbook() {
  const queryClient=useQueryClient();
  const [month,setMonth]=useState('');
  const [showForm,setShowForm]=useState(false);
  const {data,isLoading}=useQuery({queryKey:['cashbook',month],queryFn:async()=>(await api.get('/cashbook',{params:{month}})).data});

  return (
    <div>
      <PageHeader title="Cashbook" description="Opening balance + collections − expenses = cash in hand."
        action={<Button onClick={()=>setShowForm(true)}><Plus size={15}/>Manual Entry</Button>}/>

      <div className="stat-grid cols-4" style={{marginBottom:20}}>
        <div className="stat-card"><div className="stat-label">Cash in Hand</div><div className="stat-value sage">₹{Number(data?.cashInHand||0).toLocaleString('en-IN')}</div></div>
        <div className="stat-card"><div className="stat-label">Opening (period)</div><div className="stat-value">₹{Number(data?.openingBalance||0).toLocaleString('en-IN')}</div></div>
        <div className="stat-card"><div className="stat-label">Collections</div><div className="stat-value sage">₹{Number(data?.totalIn||0).toLocaleString('en-IN')}</div></div>
        <div className="stat-card"><div className="stat-label">Expenses</div><div className="stat-value rust">₹{Number(data?.totalOut||0).toLocaleString('en-IN')}</div></div>
      </div>

      <div className="filter-bar" style={{marginBottom:16}}>
        <input type="month" className="form-input" value={month} onChange={e=>setMonth(e.target.value)}/>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Description</th><th className="right">Amount</th><th className="right">Balance</th></tr></thead>
          <tbody>
            {isLoading&&<tr><td colSpan={5} className="empty-state">Loading…</td></tr>}
            {data?.transactions?.map(t=>(
              <tr key={t.id}>
                <td style={{whiteSpace:'nowrap'}}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                <td><Badge tone={t.type==='IN'?'sage':'rust'}>{t.type}</Badge></td>
                <td style={{fontSize:'0.8rem'}}>{t.description}</td>
                <td className="right mono">{t.type==='IN'?'+':'-'}₹{Number(t.amount).toLocaleString('en-IN')}</td>
                <td className="right mono">₹{Number(t.balance).toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {!isLoading&&!data?.transactions?.length&&<tr><td colSpan={5} className="empty-state">No entries for this period.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm&&<ManualForm onClose={()=>setShowForm(false)} queryClient={queryClient}/>}
    </div>
  );
}

function ManualForm({onClose,queryClient}){
  const [date,setDate]=useState(today());
  const [type,setType]=useState('IN');
  const [amount,setAmount]=useState('');
  const [desc,setDesc]=useState('');
  const mutation=useMutation({
    mutationFn:()=>api.post('/cashbook/manual',{date,type,amount:Number(amount),description:desc}),
    onSuccess:()=>{ queryClient.invalidateQueries({queryKey:['cashbook']}); queryClient.invalidateQueries({queryKey:['admin-dashboard']}); onClose(); },
  });
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}><X size={18}/></button>
        <div className="modal-title">Manual Cash Entry</div>
        <form onSubmit={e=>{e.preventDefault();mutation.mutate();}} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Date</label><input type="date" required className="form-input" value={date} onChange={e=>setDate(e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={type} onChange={e=>setType(e.target.value)}><option value="IN">Cash In</option><option value="OUT">Cash Out</option></select></div>
          </div>
          <div className="form-group"><label className="form-label">Amount (₹)</label><input type="number" required className="form-input" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Description</label><input required className="form-input" value={desc} onChange={e=>setDesc(e.target.value)}/></div>
          <div className="modal-actions"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending?'Saving…':'Add Entry'}</Button></div>
        </form>
      </div>
    </div>
  );
}
