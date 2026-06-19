import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Badge, Button } from '../../components/ui';

function curMonth(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

export default function Staff() {
  const queryClient=useQueryClient();
  const [showForm,setShowForm]=useState(false);
  const {data,isLoading}=useQuery({queryKey:['staff'],queryFn:async()=>(await api.get('/staff')).data});
  const payMutation=useMutation({
    mutationFn:({id,amount})=>api.post(`/staff/${id}/pay`,{month:curMonth(),amount}),
    onSuccess:()=>{ queryClient.invalidateQueries({queryKey:['staff']}); queryClient.invalidateQueries({queryKey:['admin-dashboard']}); },
  });

  return (
    <div>
      <PageHeader title="Staff" description="Society staff and salary tracking."
        action={<Button onClick={()=>setShowForm(true)}><Plus size={15}/>Add Staff</Button>} />

      {isLoading&&<div className="empty-state">Loading…</div>}
      {data?.map(s=>{
        const thisMonth=s.salaryPayments.find(p=>p.month===curMonth());
        return (
          <div key={s.id} className="card staff-card">
            <div className="staff-header">
              <div>
                <div className="staff-name">{s.name}</div>
                <div className="staff-role">{s.role} · Joined {new Date(s.joiningDate).toLocaleDateString('en-IN')}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span className="staff-salary mono">₹{Number(s.salary).toLocaleString('en-IN')}/mo</span>
                {thisMonth?.status==='PAID'
                  ? <Badge tone="sage">Paid {curMonth()}</Badge>
                  : <Button onClick={()=>payMutation.mutate({id:s.id,amount:s.salary})} disabled={payMutation.isPending}>Mark Paid</Button>
                }
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Month</th><th className="right">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {s.salaryPayments.slice(0,6).map(p=>(
                    <tr key={p.id}>
                      <td>{p.month}</td>
                      <td className="right mono">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                      <td><Badge tone={p.status==='PAID'?'sage':'rust'}>{p.status}</Badge></td>
                    </tr>
                  ))}
                  {!s.salaryPayments.length&&<tr><td colSpan={3} className="empty">No salary records yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {showForm&&<StaffForm onClose={()=>setShowForm(false)} queryClient={queryClient}/>}
    </div>
  );
}

function StaffForm({onClose,queryClient}){
  const [name,setName]=useState('');
  const [role,setRole]=useState('');
  const [salary,setSalary]=useState('');
  const [joined,setJoined]=useState(new Date().toISOString().slice(0,10));
  const mutation=useMutation({
    mutationFn:()=>api.post('/staff',{name,role,salary:Number(salary),joiningDate:joined}),
    onSuccess:()=>{ queryClient.invalidateQueries({queryKey:['staff']}); onClose(); },
  });
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}><X size={18}/></button>
        <div className="modal-title">Add Staff Member</div>
        <form onSubmit={e=>{e.preventDefault();mutation.mutate();}} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="form-group"><label className="form-label">Name</label><input required className="form-input" value={name} onChange={e=>setName(e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Role</label><input required className="form-input" value={role} onChange={e=>setRole(e.target.value)} placeholder="Guard, Cleaner…"/></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Monthly Salary (₹)</label><input type="number" required className="form-input" value={salary} onChange={e=>setSalary(e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Joining Date</label><input type="date" required className="form-input" value={joined} onChange={e=>setJoined(e.target.value)}/></div>
          </div>
          <div className="modal-actions"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending?'Saving…':'Save'}</Button></div>
        </form>
      </div>
    </div>
  );
}
