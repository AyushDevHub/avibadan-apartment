import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Badge, Button } from '../../components/ui';

const today=()=>new Date().toISOString().slice(0,10);

export default function BankLedger() {
  const queryClient=useQueryClient();
  const [showForm,setShowForm]=useState(false);
  const {data,isLoading}=useQuery({queryKey:['bank'],queryFn:async()=>(await api.get('/bank')).data});

  return (
    <div>
      <PageHeader title="Bank Ledger" description="Deposits, withdrawals and running balance."
        action={<Button onClick={()=>setShowForm(true)}><Plus size={15}/>Add Entry</Button>}/>

      <div className="stat-grid" style={{marginBottom:20}}>
        <div className="stat-card"><div className="stat-label">Bank Balance</div><div className="stat-value sage">₹{Number(data?.bankBalance||0).toLocaleString('en-IN')}</div></div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Description</th><th className="right">Amount</th><th className="right">Balance</th></tr></thead>
          <tbody>
            {isLoading&&<tr><td colSpan={5} className="empty-state">Loading…</td></tr>}
            {data?.transactions?.map(t=>(
              <tr key={t.id}>
                <td style={{whiteSpace:'nowrap'}}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                <td><Badge tone={t.type==='DEPOSIT'?'sage':'rust'}>{t.type}</Badge></td>
                <td>{t.description}</td>
                <td className="right mono">{t.type==='DEPOSIT'?'+':'-'}₹{Number(t.amount).toLocaleString('en-IN')}</td>
                <td className="right mono">₹{Number(t.balance).toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {!isLoading&&!data?.transactions?.length&&<tr><td colSpan={5} className="empty-state">No bank transactions. Society currently operates on cash.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm&&<BankForm onClose={()=>setShowForm(false)} queryClient={queryClient}/>}
    </div>
  );
}

function BankForm({onClose,queryClient}){
  const [date,setDate]=useState(today());
  const [type,setType]=useState('DEPOSIT');
  const [amount,setAmount]=useState('');
  const [desc,setDesc]=useState('');
  const mutation=useMutation({
    mutationFn:()=>api.post('/bank',{date,type,amount:Number(amount),description:desc}),
    onSuccess:()=>{ queryClient.invalidateQueries({queryKey:['bank']}); queryClient.invalidateQueries({queryKey:['admin-dashboard']}); onClose(); },
  });
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}><X size={18}/></button>
        <div className="modal-title">Bank Transaction</div>
        <form onSubmit={e=>{e.preventDefault();mutation.mutate();}} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Date</label><input type="date" required className="form-input" value={date} onChange={e=>setDate(e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={type} onChange={e=>setType(e.target.value)}><option value="DEPOSIT">Deposit</option><option value="WITHDRAWAL">Withdrawal</option><option value="TRANSFER">Transfer</option></select></div>
          </div>
          <div className="form-group"><label className="form-label">Amount (₹)</label><input type="number" required className="form-input" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Description</label><input required className="form-input" value={desc} onChange={e=>setDesc(e.target.value)}/></div>
          <div className="modal-actions"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending?'Saving…':'Add Entry'}</Button></div>
        </form>
      </div>
    </div>
  );
}
