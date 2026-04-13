import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LuShoppingBag, LuDollarSign, LuSquareCheck, LuClock, LuTriangleAlert, LuCalendar, LuTrendingUp, LuBanknote } from 'react-icons/lu';
import api from '../lib/api.js';
import { StatCard, Spinner, PageHeader, Card } from '../components/ui/index.jsx';

const TC = { OUTFIT:'#2563EB', WASKAT:'#0891B2', KORTY:'#7C3AED', YAKHANQAQ:'#DC2626' };
const TV = { OUTFIT:'gold', WASKAT:'teal', KORTY:'amber', YAKHANQAQ:'red' };

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 14px', boxShadow:'var(--sh-lg)', fontSize:12 }}>
      <p style={{ fontWeight:600, marginBottom:4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color:p.color }}>{p.name}: <strong>{typeof p.value==='number'?'$'+p.value.toLocaleString():p.value}</strong></p>)}
    </div>
  );
};

export default function Dashboard() {
  const { data:d, isLoading } = useQuery({ queryKey:['analytics'], queryFn:()=>api.get('/analytics/dashboard').then(r=>r.data), refetchInterval:60_000 });
  if (isLoading) return <div className="page"><Spinner /></div>;

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle={new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})} />

      <div className="g-stats" style={{ marginBottom:20 }}>
        <StatCard label="کل فرمایشات"  value={d.totalOrders}  Icon={LuShoppingBag} accent="#2563EB" sub={`Today: ${d.todayOrders} · Month: ${d.monthOrders}`} />
        <StatCard label="مقدار پول"       value={`$${d.totalRevenue.toLocaleString()}`}  Icon={LuDollarSign} accent="#16A34A" sub={`Year: ${d.yearOrders} orders`} />
        <StatCard label="Collected"     value={`$${d.totalPaid.toLocaleString()}`}     Icon={LuBanknote}   accent="#0891B2" sub={`Discount: $${d.totalDiscount.toLocaleString()}`} />
        <StatCard label="Outstanding"   value={`$${d.totalRemaining.toLocaleString()}`} Icon={LuTrendingUp} accent="#DC2626" sub="Remaining balance" />
        <StatCard label="Completed"     value={d.completedOrders} Icon={LuSquareCheck} accent="#16A34A" />
        <StatCard label="Pending"       value={d.pendingOrders}   Icon={LuClock}       accent="#2563EB" />
        <StatCard label="Emergency"     value={d.emergencyOrders} Icon={LuTriangleAlert} accent="#DC2626" sub="Active" />
        <StatCard label="This Year"     value={d.yearOrders}      Icon={LuCalendar}    accent="#7C3AED" />
      </div>

      <div className="g-charts" style={{ marginBottom:20 }}>
        <Card title="Revenue Trend — Last 6 Months">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.monthlyRevenue} margin={{top:4,right:4,bottom:0,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{fontSize:11,fill:'var(--text3)'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:11,fill:'var(--text3)'}} axisLine={false} tickLine={false} width={46} />
              <Tooltip content={<Tip />} />
              <Legend wrapperStyle={{fontSize:12,color:'var(--text2)'}} />
              <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="paid"    stroke="#0891B2" strokeWidth={2}   dot={false} name="Collected" strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Orders by Type">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={d.ordersByType.map(o=>({name:o.type,value:o.count}))} cx="50%" cy="50%" outerRadius={78} innerRadius={38} dataKey="value" paddingAngle={3}>
                {d.ordersByType.map((o,i)=><Cell key={i} fill={TC[o.type]||'#2563EB'} />)}
              </Pie>
              <Tooltip formatter={(v,n)=>[`${v} orders`,n]} />
              <Legend wrapperStyle={{fontSize:11}} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Monthly Order Volume" style={{ marginBottom:20 }}>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={d.monthlyRevenue} barSize={20} margin={{top:4,right:4,bottom:0,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{fontSize:11,fill:'var(--text3)'}} axisLine={false} tickLine={false} />
            <YAxis tick={{fontSize:11,fill:'var(--text3)'}} axisLine={false} tickLine={false} width={30} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563EB" radius={[4,4,0,0]} name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Recent Orders" noPad>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr>{['Bill #','Customer','Type','Amount','Paid','Status','Date'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {d.recentOrders.map(o=>(
                <tr key={o.id}>
                  <td><span style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:'var(--primary)'}}>#{o.customer.billNumber}</span></td>
                  <td><span style={{fontWeight:500}}>{o.customer.firstName}</span></td>
                  <td><span className={`badge bg-${TV[o.type]||'gold'}`}>{o.type}</span></td>
                  <td style={{fontWeight:500}}>${o.totalPrice.toLocaleString()}</td>
                  <td style={{color:'#16A34A',fontWeight:500}}>${o.paidAmount.toLocaleString()}</td>
                  <td>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {o.isEmergency&&<span className="badge bg-red">🚨</span>}
                      <span className={`badge ${o.isCompleted?'bg-green':'bg-amber'}`}>{o.isCompleted?'Done':'Pending'}</span>
                    </div>
                  </td>
                  <td style={{fontSize:12,color:'var(--text3)'}}>{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
