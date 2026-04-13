import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LuSearch, LuPlus, LuPencil, LuTrash2, LuUsers, LuPhone } from 'react-icons/lu';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { getApiErrorMessage } from '../lib/feedback.js';
import { PageHeader, Spinner, Pagination, Modal, Field, Card, EmptyState } from '../components/ui/index.jsx';

const schema = z.object({
  firstName:   z.string().min(1, 'Required'),
  phoneNumber: z.string().min(7, 'Min 7 digits'),
});

export default function Customers({ openCreate = false }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(openCreate);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => api.get('/customers', { params: { page, limit:20, search } }).then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const saveMut = useMutation({
    mutationFn: b => editing ? api.put(`/customers/${editing.id}`, b) : api.post('/customers', b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['customers'] });
      setModal(false);
      reset();
      setEditing(null);
      toast.success(editing ? 'Customer updated.' : 'Customer created.');
    },
    onError: error => toast.error(getApiErrorMessage(error, 'Unable to save customer.')),
  });
  const delMut = useMutation({
    mutationFn: id => api.delete(`/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['customers'] });
      toast.success('Customer deleted.');
    },
    onError: error => toast.error(getApiErrorMessage(error, 'Unable to delete customer.')),
  });

  const openEdit        = c => { setEditing(c); reset({ firstName:c.firstName, phoneNumber:c.phoneNumber }); setModal(true); };
  const openCreateModal = ()  => { setEditing(null); reset({}); setModal(true); };

  return (
    <div className="page">
      <PageHeader title="Customers" subtitle={data ? `${data.total} registered` : ''}
        action={
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
              <LuSearch size={13} style={{ position:'absolute', left:11, color:'var(--text3)', pointerEvents:'none' }} />
              <input className="inp" style={{ paddingLeft:32, width:180, height:36 }} placeholder="Search…"
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <button className="btn btn-gold" onClick={openCreateModal}><LuPlus size={15} /> Add Customer</button>
          </div>
        }
      />

      <Card noPad>
        {isLoading ? <Spinner /> : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr>{['Bill #','Customer','Phone','Orders','Since','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {!data?.data?.length ? (
                    <tr><td colSpan={6}><EmptyState message="No customers yet" Icon={LuUsers} /></td></tr>
                  ) : data.data.map(c => (
                    <tr key={c.id}>
                      <td><span style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:'var(--primary)'}}>#{c.billNumber}</span></td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:32,height:32,borderRadius:'50%',background:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:13,flexShrink:0}}>
                            {c.firstName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{fontWeight:500}}>{c.firstName}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:5,color:'var(--text2)',fontSize:13}}>
                          <LuPhone size={12} />{c.phoneNumber}
                        </div>
                      </td>
                      <td>
                        <span style={{background:'var(--primary-100)',color:'var(--primary-800)',fontSize:12,fontWeight:600,padding:'2px 8px',borderRadius:99}}>
                          {c._count.orders} orders
                        </span>
                      </td>
                      <td style={{fontSize:12,color:'var(--text3)'}}>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={() => openEdit(c)}
                            style={{display:'flex',alignItems:'center',gap:4,background:'var(--surface2)',color:'var(--text2)',border:'1px solid var(--border2)',borderRadius:5,padding:'4px 9px',cursor:'pointer',fontSize:12,fontWeight:500}}>
                            <LuPencil size={12} /> Edit
                          </button>
                          <button onClick={() => { if (confirm('Delete?')) delMut.mutate(c.id); }}
                            style={{background:'#FFF1F2',color:'#BE123C',border:'none',borderRadius:5,padding:'4px 7px',cursor:'pointer',display:'flex',alignItems:'center'}}>
                            <LuTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'0 20px 16px' }}>
              <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
            </div>
          </>
        )}
      </Card>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Edit Customer' : 'New Customer'}>
        <form onSubmit={handleSubmit(d => saveMut.mutate(d))} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="First Name" error={errors.firstName?.message} required>
            <input {...register('firstName')} className={`inp${errors.firstName?' err':''}`} placeholder="Ahmad" />
          </Field>
          <Field label="Phone Number" error={errors.phoneNumber?.message} required>
            <div className="iw">
              <LuPhone size={13} className="ico" />
              <input {...register('phoneNumber')} className={`inp${errors.phoneNumber?' err':''}`} style={{paddingLeft:36}} placeholder="0700000001" />
            </div>
          </Field>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button type="button" onClick={() => setModal(false)} className="btn btn-outline" style={{ flex:1 }}>Cancel</button>
            <button type="submit" className="btn btn-gold" style={{ flex:1 }} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
