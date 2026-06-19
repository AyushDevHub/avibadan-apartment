export function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatCard({ label, value, accent = 'ink', sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${accent}`}>
        ₹{Number(value || 0).toLocaleString('en-IN')}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-desc">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = 'ink' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function statusTone(status) {
  switch (status) {
    case 'PAID': case 'RESOLVED': case 'ACTIVE': return 'sage';
    case 'PARTIAL': case 'IN_PROGRESS': return 'gold';
    case 'UNPAID': case 'OPEN': return 'rust';
    default: return 'ink';
  }
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const map = { primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost' };
  return (
    <button className={`btn ${map[variant] || 'btn-primary'} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input(props) {
  return <input {...props} className={`form-input ${props.className || ''}`} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`form-select ${props.className || ''}`}>
      {children}
    </select>
  );
}

export function Th({ children, right }) {
  return <th className={right ? 'right' : ''}>{children}</th>;
}

export function Td({ children, right, mono }) {
  let cls = '';
  if (right) cls += ' right';
  if (mono) cls += ' mono';
  return <td className={cls.trim()}>{children}</td>;
}
