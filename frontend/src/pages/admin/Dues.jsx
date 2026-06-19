import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Badge } from '../../components/ui';

export default function Dues() {
  const { data, isLoading } = useQuery({ queryKey:['dues'], queryFn: async()=>(await api.get('/dues')).data });
  return (
    <div>
      <PageHeader title="Dues Dashboard" description="Outstanding maintenance dues, flat by flat." />
      <div className="stat-grid" style={{marginBottom:24}}>
        <div className="stat-card"><div className="stat-label">Total Outstanding</div><div className="stat-value rust">₹{Number(data?.totalOutstanding||0).toLocaleString('en-IN')}</div></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Flat</th><th>Owner</th><th className="right">Current Month</th><th className="right">Previous</th><th className="right">Total Due</th></tr></thead>
          <tbody>
            {isLoading&&<tr><td colSpan={5} className="empty-state">Loading…</td></tr>}
            {data?.flats?.map(f=>(
              <tr key={f.flatId}>
                <td><Link to={`/admin/residents/${f.flatId}`} className="table-link" style={{fontWeight:500}}>{f.flatNumber}</Link></td>
                <td>{f.ownerName}</td>
                <td className="right mono">₹{Number(f.currentMonthDue).toLocaleString('en-IN')}</td>
                <td className="right mono">₹{Number(f.previousDue).toLocaleString('en-IN')}</td>
                <td className="right">{f.totalDue>0?<Badge tone="rust">₹{f.totalDue.toLocaleString('en-IN')}</Badge>:<Badge tone="sage">Settled</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
