import { LuInbox } from 'react-icons/lu';

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="page-hd">
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {action && <div style={{ flexShrink:0 }}>{action}</div>}
  </div>
);

export const StatCard = ({ label, value, sub, Icon, accent = '#2563EB' }) => (
  <div className="stat-card">
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:11.5, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>{label}</p>
        <p style={{ fontSize:24, fontWeight:700, color:accent, letterSpacing:'-.02em', lineHeight:1 }}>{value}</p>
        {sub && <p style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>{sub}</p>}
      </div>
      {Icon && (
        <div style={{ width:40, height:40, borderRadius:10, background:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={20} style={{ color:accent }} />
        </div>
      )}
    </div>
  </div>
);

export const Spinner = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 0' }}>
    <div style={{ width:28, height:28, border:'2.5px solid var(--border)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

export const EmptyState = ({ message = 'No data found', Icon: I = LuInbox }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'52px 24px', gap:10, color:'var(--text3)' }}>
    <I size={34} style={{ opacity:.4 }} />
    <p style={{ fontSize:14 }}>{message}</p>
  </div>
);

const BV = { gold:'bg-gold', teal:'bg-teal', red:'bg-red', green:'bg-green', amber:'bg-amber', gray:'bg-gray' };
export const Badge = ({ children, v = 'gold' }) => <span className={`badge ${BV[v] || 'bg-gold'}`}>{children}</span>;

export const Modal = ({ open, onClose, title, children, maxW = 480 }) => {
  if (!open) return null;
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: maxW }}>
        <div className="modal-hd">
          <h2>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:22, lineHeight:1 }}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export const Card = ({ title, action, children, noPad, style }) => (
  <div className="card" style={style}>
    {(title || action) && (
      <div className="card-hd">
        {title && <h3>{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    <div className={noPad ? '' : 'card-body'}>{children}</div>
  </div>
);

export const Field = ({ label, error, children, required, hint }) => (
  <div>
    {label && <label className={`lbl${required ? ' lbl-r' : ''}`}>{label}</label>}
    {children}
    {hint  && <p style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{hint}</p>}
    {error && <p className="err-msg">{error}</p>}
  </div>
);

export const Pagination = ({ page, total, limit, onChange }) => {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)', flexWrap:'wrap', gap:10 }}>
      <span style={{ fontSize:13, color:'var(--text3)' }}>Page {page} of {pages} · {total} total</span>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onChange(page - 1)} disabled={page <= 1}  className="btn btn-outline btn-sm">← Prev</button>
        <button onClick={() => onChange(page + 1)} disabled={page >= pages} className="btn btn-outline btn-sm">Next →</button>
      </div>
    </div>
  );
};

export const ProgBar = ({ value, max }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct >= 90 ? '#DC2626' : pct >= 70 ? '#F59E0B' : '#16A34A';
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text3)', marginBottom:5 }}>
        <span>{value} / {max} orders</span>
        <span style={{ fontWeight:600, color }}>{pct}%</span>
      </div>
      <div className="prog-track"><div className="prog-fill" style={{ width:`${pct}%`, background:color }} /></div>
    </div>
  );
};
