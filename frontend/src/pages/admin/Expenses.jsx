import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Badge, Button } from '../../components/ui';

const CATS=['ELECTRICITY','WATER','CLEANER_SALARY','SECURITY_SALARY','REPAIRS','LIFT_MAINTENANCE','GARDENING','MISCELLANEOUS'];
const today=()=>new Date().toISOString().slice(0,10);

export default function Expenses() {
  const queryClient = useQueryClient();
  const [filters,setFilters]=useState({month:'',category:''});
  const [showForm,setShowForm]=useState(false);

  const {data,isLoading}=useQuery({queryKey:['expenses',filters],queryFn:async()=>(await api.get('/expenses',{params:filters})).data});
  const deleteMutation=useMutation({
    mutationFn: id=>api.delete(`/expenses/${id}`),
    onSuccess:()=>{ queryClient.invalidateQueries({queryKey:['expenses']}); queryClient.invalidateQueries({queryKey:['admin-dashboard']}); },
  });

  const total=data?.reduce((s,e)=>s+e.amount,0)||0;

  return (
    <div>
      <PageHeader title="Expenses" description="Society expenses by category."
        action={<Button onClick={()=>setShowForm(true)}><Plus size={15}/>Add Expense</Button>} />

      <div className="filter-bar">
        <input type="month" className="form-input" value={filters.month} onChange={e=>setFilters({...filters,month:e.target.value})}/>
        <select className="form-select" value={filters.category} onChange={e=>setFilters({...filters,category:e.target.value})}>
          <option value="">All categories</option>
          {CATS.map(c=><option key={c} value={c}>{c.replace('_',' ')}</option>)}
        </select>
        <span style={{marginLeft:'auto',fontSize:'0.82rem',color:'var(--text-muted)'}}>Total: <span className="mono" style={{color:'var(--rust-light)',fontWeight:600}}>₹{total.toLocaleString('en-IN')}</span></span>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th className="right">Amount</th><th className="right">Del</th></tr></thead>
          <tbody>
            {isLoading&&<tr><td colSpan={5} className="empty-state">Loading…</td></tr>}
            {data?.map(e=>(
              <tr key={e.id}>
                <td style={{whiteSpace:'nowrap'}}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                <td><Badge tone="ink">{e.category.replace('_',' ')}</Badge></td>
                <td>{e.description}</td>
                <td className="right mono">₹{Number(e.amount).toLocaleString('en-IN')}</td>
                <td className="right"><button className="btn-icon" onClick={()=>{if(confirm('Delete?'))deleteMutation.mutate(e.id)}}><Trash2 size={14}/></button></td>
              </tr>
            ))}
            {!isLoading&&!data?.length&&<tr><td colSpan={5} className="empty-state">No expenses found.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm&&<ExpenseForm onClose={()=>setShowForm(false)} queryClient={queryClient}/>}
    </div>
  );
}

function ExpenseForm({onClose,queryClient}){
  const [cat,setCat]=useState(CATS[0]);
  const [amount,setAmount]=useState('');
  const [date,setDate]=useState(today());
  const [desc,setDesc]=useState('');
  const mutation=useMutation({
    mutationFn:()=>api.post('/expenses',{category:cat,amount:Number(amount),date,description:desc}),
    onSuccess:()=>{ queryClient.invalidateQueries({queryKey:['expenses']}); queryClient.invalidateQueries({queryKey:['admin-dashboard']}); onClose(); },
  });
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}><X size={18}/></button>
        <div className="modal-title">Add Expense</div>
        <form onSubmit={e=>{e.preventDefault();mutation.mutate();}} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={cat} onChange={e=>setCat(e.target.value)}>{CATS.map(c=><option key={c} value={c}>{c.replace('_',' ')}</option>)}</select></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Amount (₹)</label><input type="number" required className="form-input" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Date</label><input type="date" required className="form-input" value={date} onChange={e=>setDate(e.target.value)}/></div>
          </div>
          <div className="form-group"><label className="form-label">Description</label><input required className="form-input" value={desc} onChange={e=>setDesc(e.target.value)}/></div>
          <div className="modal-actions"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending?'Saving…':'Save Expense'}</Button></div>
        </form>
      </div>
    </div>
  );
}
