import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../api/client';
import { PageHeader, Badge } from '../../components/ui';

const TT_STYLE = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:'0.78rem' };

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Society-wide financial snapshot." />
      {isLoading && <div className="empty-state">Loading…</div>}
      {data && (
        <>
          <div className="stat-grid cols-4">
            <div className="stat-card"><div className="stat-label">Cash in Hand</div><div className="stat-value sage">₹{Number(data.cashInHand).toLocaleString('en-IN')}</div></div>
            <div className="stat-card"><div className="stat-label">Bank Balance</div><div className="stat-value sage">₹{Number(data.bankBalance).toLocaleString('en-IN')}</div></div>
            <div className="stat-card"><div className="stat-label">Total Due</div><div className="stat-value rust">₹{Number(data.totalDue).toLocaleString('en-IN')}</div></div>
            <div className="stat-card"><div className="stat-label">Monthly Collection</div><div className="stat-value gold">₹{Number(data.monthlyCollection).toLocaleString('en-IN')}</div></div>
            <div className="stat-card"><div className="stat-label">Monthly Expense</div><div className="stat-value rust">₹{Number(data.monthlyExpense).toLocaleString('en-IN')}</div></div>
            <div className="stat-card"><div className="stat-label">Pending Bills</div><div className="stat-value">{data.pendingBills}</div><div className="stat-sub">bills not fully paid</div></div>
          </div>

          <div className="chart-grid" style={{ marginBottom:24 }}>
            <div className="card chart-box">
              <div className="card-title">Income vs Expense — 12 months</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.incomeVsExpense}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize:10, fill:'var(--text-muted)' }} tickFormatter={m=>m.slice(5)} />
                  <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} />
                  <Tooltip formatter={v=>`₹${Number(v).toLocaleString('en-IN')}`} contentStyle={TT_STYLE} />
                  <Line type="monotone" dataKey="income" stroke="var(--sage)" strokeWidth={2} name="Income" dot={false} />
                  <Line type="monotone" dataKey="expense" stroke="var(--rust)" strokeWidth={2} name="Expense" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card chart-box">
              <div className="card-title">Due Distribution by Flat</div>
              {data.dueDistribution.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.dueDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="flatNumber" tick={{ fontSize:10, fill:'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} />
                    <Tooltip formatter={v=>`₹${Number(v).toLocaleString('en-IN')}`} contentStyle={TT_STYLE} />
                    <Bar dataKey="due" fill="var(--rust)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty-state">No outstanding dues.</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="card-title">Recent Transactions</div>
            </div>
            <div className="table-wrap" style={{ borderTop:'1px solid var(--border)', borderRadius:0 }}>
              <table>
                <thead><tr><th>Date</th><th>Description</th><th className="right">Amount</th><th className="right">Balance</th></tr></thead>
                <tbody>
                  {data.recentTransactions.map((t,i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace:'nowrap' }}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                      <td>{t.description}</td>
                      <td className="right"><Badge tone={t.type==='IN'?'sage':'rust'}>{t.type==='IN'?'+':'-'}₹{Number(t.amount).toLocaleString('en-IN')}</Badge></td>
                      <td className="right mono">₹{Number(t.balance).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
