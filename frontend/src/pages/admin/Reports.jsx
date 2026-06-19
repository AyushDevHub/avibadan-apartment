import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Button } from '../../components/ui';

function defaultMonth(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

export default function Reports() {
  const [month,setMonth]=useState(defaultMonth());
  const [year,setYear]=useState(String(new Date().getFullYear()));

  const {data:monthly,isLoading:lm}=useQuery({queryKey:['report-monthly',month],queryFn:async()=>(await api.get('/reports/monthly',{params:{month}})).data,enabled:!!month});
  const {data:annual,isLoading:la}=useQuery({queryKey:['report-annual',year],queryFn:async()=>(await api.get('/reports/annual',{params:{year}})).data,enabled:!!year});

  async function downloadCsv(){
    const res=await api.get('/reports/export/monthly',{params:{month},responseType:'blob'});
    const url=URL.createObjectURL(new Blob([res.data]));
    const a=document.createElement('a'); a.href=url; a.download=`collections-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Reports" description="Monthly and annual financial reports." />

      <div className="card card-body" style={{marginBottom:20}}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="card-title" style={{marginBottom:0}}>Monthly Report</div>
          <div className="flex gap-2">
            <input type="month" className="form-input" value={month} onChange={e=>setMonth(e.target.value)} style={{maxWidth:150}}/>
            <Button variant="ghost" onClick={downloadCsv}><Download size={14}/>CSV</Button>
          </div>
        </div>
        {lm&&<div className="empty-state">Loading…</div>}
        {monthly&&(
          <>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-label">Collection</div><div className="stat-value sage">₹{Number(monthly.collection).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Expenses</div><div className="stat-value rust">₹{Number(monthly.expenseTotal).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Balance</div><div className={`stat-value ${monthly.balance>=0?'sage':'rust'}`}>₹{Number(monthly.balance).toLocaleString('en-IN')}</div></div>
            </div>
            <div className="card-title" style={{fontSize:'0.85rem',marginTop:16}}>Expense Breakdown</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Category</th><th className="right">Amount</th></tr></thead>
                <tbody>
                  {Object.entries(monthly.expenseByCategory).map(([cat,amt])=>(
                    <tr key={cat}><td>{cat.replace('_',' ')}</td><td className="right mono">₹{Number(amt).toLocaleString('en-IN')}</td></tr>
                  ))}
                  {!Object.keys(monthly.expenseByCategory).length&&<tr><td colSpan={2} className="empty-state">No expenses this month.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card card-body">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="card-title" style={{marginBottom:0}}>Annual Report</div>
          <input type="number" className="form-input" value={year} onChange={e=>setYear(e.target.value)} style={{maxWidth:110}}/>
        </div>
        {la&&<div className="empty-state">Loading…</div>}
        {annual&&(
          <>
            <div className="stat-grid cols-4">
              <div className="stat-card"><div className="stat-label">Total Collection</div><div className="stat-value sage">₹{Number(annual.totalCollection).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Total Expenses</div><div className="stat-value rust">₹{Number(annual.totalExpenses).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Pending Dues</div><div className="stat-value gold">₹{Number(annual.pendingDues).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Net Balance</div><div className={`stat-value ${annual.netBalance>=0?'sage':'rust'}`}>₹{Number(annual.netBalance).toLocaleString('en-IN')}</div></div>
            </div>
            <div className="table-wrap" style={{marginTop:16}}>
              <table>
                <thead><tr><th>Month</th><th className="right">Collection</th><th className="right">Expense</th><th className="right">Net</th></tr></thead>
                <tbody>
                  {annual.monthly.map(m=>(
                    <tr key={m.month}>
                      <td>{m.month}</td>
                      <td className="right mono">₹{Number(m.collection).toLocaleString('en-IN')}</td>
                      <td className="right mono">₹{Number(m.expense).toLocaleString('en-IN')}</td>
                      <td className="right mono">₹{Number(m.collection-m.expense).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
