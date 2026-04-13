import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { LuPlus, LuPencil, LuTrash2, LuArchive, LuPackageOpen, LuX } from 'react-icons/lu';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { getApiErrorMessage } from '../lib/feedback.js';
import { PageHeader, Spinner, EmptyState, Modal, Field, Card, ProgBar } from '../components/ui/index.jsx';

const TC = { OUTFIT:'#2563EB', WASKAT:'#0891B2', KORTY:'#7C3AED', YAKHANQAQ:'#DC2626' };
const TV = { OUTFIT:'gold', WASKAT:'teal', KORTY:'amber', YAKHANQAQ:'red' };

function AssignModal({ box, onClose }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: boxData, refetch } = useQuery({ queryKey:['box-detail', box.id], queryFn:()=>api.get(`/boxes/${box.id}`).then(r=>r.data) });
  const { data: ordersData } = useQuery({
    queryKey: ['orders-for-box', box.id, search],
    queryFn: () => api.get('/orders', { params:{ status:'pending', type:box.boxType, limit:50, search } }).then(r=>r.data),
  });

  const assignMut = useMutation({
    mutationFn: ({ orderId, boxId }) => api.post(`/boxes/${boxId}/assign`, { orderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['box-detail', box.id] });
      qc.invalidateQueries({ queryKey:['boxes'] });
      qc.invalidateQueries({ queryKey:['orders-for-box', box.id] });
      refetch();
      toast.success('Order assigned to box.');
    },
    onError: error => toast.error(getApiErrorMessage(error, 'Unable to assign order to box.')),
  });
  const removeMut = useMutation({
    mutationFn: orderId => api.post(`/boxes/${box.id}/assign`, { orderId, boxId: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['box-detail', box.id] });
      qc.invalidateQueries({ queryKey:['boxes'] });
      refetch();
      toast.success('Order removed from box.');
    },
    onError: error => toast.error(getApiErrorMessage(error, 'Unable to remove order from box.')),
  });

  const assigned   = boxData?.orders || [];
  const unassigned = (ordersData?.data || []).filter(o => o.boxId !== box.id);

  return (
    <div>
      <ProgBar value={assigned.length} max={box.capacity} />
      <div style={{ height:14 }} />

      {/* Assigned */}
      <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
        In this box ({assigned.length})
      </p>
      {!assigned.length ? (
        <p style={{ fontSize:13, color:'var(--text3)', fontStyle:'italic', marginBottom:16 }}>No orders assigned yet</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto', marginBottom:16 }}>
          {assigned.map(o => (
            <div key={o.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'var(--surface2)', borderRadius:8, gap:8 }}>
              <div style={{ minWidth:0 }}>
                <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:600, color:'var(--primary)', marginRight:6 }}>#{o.customer?.billNumber}</span>
                <span style={{ fontSize:13, fontWeight:500 }}>{o.customer?.firstName}</span>
              </div>
              <button onClick={() => removeMut.mutate(o.id)} disabled={removeMut.isPending}
                style={{ background:'#FFF1F2', color:'#BE123C', border:'none', borderRadius:5, padding:'3px 6px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                <LuX size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ height:1, background:'var(--border)', margin:'12px 0' }} />

      {/* Assign */}
      {assigned.length < box.capacity ? (
        <div>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
            Add {box.boxType} Orders
          </p>
          <input className="inp" style={{ marginBottom:10, height:36 }} placeholder="Search by customer…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
            {!unassigned.length ? (
              <p style={{ fontSize:13, color:'var(--text3)', fontStyle:'italic' }}>No pending {box.boxType} orders available</p>
            ) : unassigned.map(o => (
              <div key={o.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, gap:8 }}>
                <div>
                  <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:600, color:'var(--primary)', marginRight:6 }}>#{o.customer?.billNumber}</span>
                  <span style={{ fontSize:13, fontWeight:500 }}>{o.customer?.firstName}</span>
                  <span style={{ fontSize:12, color:'var(--text3)', marginLeft:8 }}>${o.totalPrice}</span>
                </div>
                <button onClick={() => assignMut.mutate({ orderId:o.id, boxId:box.id })} disabled={assignMut.isPending}
                  className="btn btn-gold btn-sm"><LuPlus size={12} /> Assign</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="info-box ib-gold">Box is at full capacity.</div>
      )}

      <div style={{ marginTop:20 }}>
        <button onClick={onClose} className="btn btn-outline" style={{ width:'100%' }}>Close</button>
      </div>
    </div>
  );
}

export default function Boxes() {
  const qc = useQueryClient();
  const [modal, setModal]       = useState(false);
  const [assignBox, setAssignBox] = useState(null);
  const [editing, setEditing]   = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: boxes, isLoading } = useQuery({ queryKey:['boxes'], queryFn:()=>api.get('/boxes').then(r=>r.data) });

  const saveMut = useMutation({
    mutationFn: b => editing
      ? api.put(`/boxes/${editing.id}`, { ...b, capacity:Number(b.capacity) })
      : api.post('/boxes', { ...b, capacity:Number(b.capacity) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['boxes'] });
      setModal(false);
      reset();
      setEditing(null);
      toast.success(editing ? 'Box updated.' : 'Box created.');
    },
    onError: error => toast.error(getApiErrorMessage(error, 'Unable to save box.')),
  });
  const delMut = useMutation({
    mutationFn: id => api.delete(`/boxes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['boxes'] });
      toast.success('Box deleted.');
    },
    onError: error => toast.error(getApiErrorMessage(error, 'Unable to delete box.')),
  });

  return (
    <div className="page">
      <PageHeader title="Box Management" subtitle={`${boxes?.length || 0} boxes`}
        action={<button className="btn btn-gold" onClick={() => { setEditing(null); reset({}); setModal(true); }}><LuPlus size={15} /> New Box</button>}
      />

      {isLoading ? <Spinner /> : !boxes?.length ? (
        <Card><EmptyState message="No boxes yet" Icon={LuArchive} /></Card>
      ) : (
        <div className="g-boxes">
          {boxes.map(box => {
            const used   = box._count?.orders || 0;
            const accent = TC[box.boxType] || '#2563EB';
            return (
              <div key={box.id} className="card" style={{ overflow:'hidden', cursor:'default', transition:'box-shadow .2s,transform .2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow='var(--sh-md)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow=''; e.currentTarget.style.transform=''; }}>
                <div style={{ height:3, background:accent }} />
                <div style={{ padding:18 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:38, height:38, borderRadius:9, background:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <LuArchive size={18} style={{ color:accent }} />
                      </div>
                      <div>
                        <p style={{ fontWeight:700, fontSize:15 }}>{box.boxName}</p>
                        <span className={`badge bg-${TV[box.boxType]||'gold'}`} style={{ fontSize:11 }}>{box.boxType}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={() => { setEditing(box); reset({ boxName:box.boxName, boxType:box.boxType, capacity:box.capacity }); setModal(true); }}
                        className="btn btn-icon" style={{ width:30, height:30 }}><LuPencil size={13} /></button>
                      <button onClick={() => { if (confirm('Delete?')) delMut.mutate(box.id); }}
                        style={{ background:'#FFF1F2', color:'#BE123C', border:'none', borderRadius:5, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <LuTrash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <ProgBar value={used} max={box.capacity} />

                  <button onClick={() => setAssignBox(box)} className="btn btn-outline" style={{ width:'100%', marginTop:14, gap:6 }}>
                    <LuPackageOpen size={14} /> Manage Orders
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Box */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Edit Box' : 'New Box'}>
        <form onSubmit={handleSubmit(d => saveMut.mutate(d))} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Box Name" error={errors.boxName?.message} required>
            <input {...register('boxName', { required:'Required' })} className="inp" placeholder="e.g. Box A1" />
          </Field>
          <Field label="Box Type" error={errors.boxType?.message} required>
            <select {...register('boxType', { required:'Required' })} className="inp">
              <option value="">Select type…</option>
              {['OUTFIT','WASKAT','KORTY','YAKHANQAQ'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Capacity" required>
            <input type="text" inputMode="numeric" {...register('capacity', { required:'Required' })} className="inp" placeholder="50" />
          </Field>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button type="button" onClick={() => setModal(false)} className="btn btn-outline" style={{ flex:1 }}>Cancel</button>
            <button type="submit" className="btn btn-gold" style={{ flex:1 }} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : 'Save Box'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Orders Modal */}
      <Modal open={!!assignBox} onClose={() => setAssignBox(null)} title={assignBox ? `${assignBox.boxName} — Manage Orders` : ''} maxW={520}>
        {assignBox && <AssignModal box={assignBox} onClose={() => setAssignBox(null)} />}
      </Modal>
    </div>
  );
}
