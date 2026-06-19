import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, BookOpen, Megaphone } from 'lucide-react';
import api from '../../api/client';

export default function Home() {
  const { data } = useQuery({
    queryKey: ['public-home'],
    queryFn: async () => (await api.get('/public/home')).data,
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="pub-header">
        <div className="pub-header-inner">
          <div className="pub-brand">
            <Building2 size={20} color="var(--rust)" />
            <span className="pub-brand-name">AVIBADAN APARTMENT</span>
          </div>
          <div className="pub-nav">
            <Link to="/transparency" className="pub-nav-link">Finances</Link>
            <Link to="/login" className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
              Login
            </Link>
          </div>
        </div>
      </header>

      <section className="pub-hero ledger-lines">
        <div className="pub-hero-pre">Maintenance Register 2026</div>
        <h1 className="pub-hero-title">One ledger for every flat, every rupee, every notice.</h1>
        <p className="pub-hero-body">
          {data?.society?.address || '361/A, G.T. Road (S), Bataitala Bazar, Howrah'} — dues,
          payments, expenses and announcements for all {data?.society?.totalFlats || 9} units.
        </p>
      </section>

      <div className="pub-cards">
        <div className="card card-body">
          <div className="stat-label">Cash in Hand</div>
          <div className="stat-value">₹{Number(data?.fundStatus?.cashInHand || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="card card-body">
          <div className="stat-label">Bank Balance</div>
          <div className="stat-value">₹{Number(data?.fundStatus?.bankBalance || 0).toLocaleString('en-IN')}</div>
        </div>
        <Link to="/transparency" className="pub-cta-card" style={{ gridColumn: 'span 2' }}>
          <BookOpen size={18} color="var(--gold-light)" />
          <div className="pub-cta-card-title">Open the Transparency Register →</div>
          <div className="pub-cta-card-sub">Monthly collections, expenses and major bills</div>
        </Link>
      </div>

      <section className="pub-section">
        <div className="pub-section-title">
          <Megaphone size={18} color="var(--rust-light)" />
          Notice Board
        </div>
        <div className="notice-list">
          {data?.announcements?.length === 0 && (
            <div className="empty-state">No announcements posted yet.</div>
          )}
          {data?.announcements?.map(n => (
            <div key={n.id} className="card notice-card">
              <div className="notice-title">{n.title}</div>
              <div className="notice-body">{n.content}</div>
              <div className="notice-meta">{new Date(n.createdAt).toLocaleDateString('en-IN')}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
