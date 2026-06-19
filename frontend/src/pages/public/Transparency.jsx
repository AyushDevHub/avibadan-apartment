import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/client';

const COLORS = ['#c0703f','#c9972a','#5e9e72','#8a95a5','#7dba8f','#d98c5f'];

export default function Transparency() {
  const { data, isLoading } = useQuery({
    queryKey: ['transparency'],
    queryFn: async () => (await api.get('/public/transparency')).data,
  });

  const breakdown = data?.expenseBreakdown
    ? Object.entries(data.expenseBreakdown).map(([name, value]) => ({ name: name.replace('_',' '), value }))
    : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="trans-header">
        <div className="trans-header-inner">
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.85rem', color:'var(--text-muted)' }}>
            <ArrowLeft size={15} /> Home
          </Link>
          <span style={{ fontFamily:'Fraunces,serif', fontWeight:600, color:'var(--text-white)' }}>
            Transparency Register
          </span>
        </div>
      </header>

      <div className="trans-body">
        <p className="trans-intro">
          Updated automatically from the society's cash ledger. Every flat owner can see
          exactly where the maintenance fund stands and how it is spent.
        </p>

        {isLoading && <div className="empty-state">Loading…</div>}

        {data && (
          <>
            <div className="stat-grid cols-4">
              <div className="stat-card"><div className="stat-label">Total Fund</div><div className="stat-value">₹{Number(data.totalFund).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Cash in Hand</div><div className="stat-value sage">₹{Number(data.cashInHand).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">Bank Balance</div><div className="stat-value sage">₹{Number(data.bankBalance).toLocaleString('en-IN')}</div></div>
              <div className="stat-card"><div className="stat-label">This Month Collection</div><div className="stat-value gold">₹{Number(data.monthlyCollection).toLocaleString('en-IN')}</div></div>
            </div>

            <div className="chart-grid" style={{ marginTop:20 }}>
              <div className="card chart-box">
                <div className="card-title">This Month's Expenses</div>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'1.4rem', fontWeight:600, color:'var(--rust-light)', marginBottom:12 }}>
                  ₹{Number(data.monthlyExpense).toLocaleString('en-IN')}
                </div>
                {breakdown.length ? (
                  <div className="pie-wrap">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={breakdown} dataKey="value" nameKey="name" outerRadius={75} label={({name})=>name.slice(0,8)}>
                          {breakdown.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v=>`₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="empty-state">No expenses this month.</div>}
              </div>

              <div className="card chart-box">
                <div className="card-title">Largest Bills on Record</div>
                <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
                  <table>
                    <tbody>
                      {data.majorBills.map((b,i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight:500, color:'var(--text)' }}>{b.description}</div>
                            <div style={{ fontSize:'0.72rem', color:'var(--text-dim)' }}>{b.category.replace('_',' ')} · {new Date(b.date).toLocaleDateString('en-IN')}</div>
                          </td>
                          <td className="right mono" style={{ color:'var(--text-white)' }}>₹{Number(b.amount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
