import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { LuSearch, LuPlus, LuPencil, LuTrash2, LuUsers, LuPhone } from 'react-icons/lu';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { getApiErrorMessage } from '../lib/feedback.js';
import { formatDateLocale } from '../lib/locale.js';
import { PageHeader, Spinner, Pagination, Modal, ConfirmDeleteModal, Field, Card, EmptyState } from '../components/ui/index.jsx';

export default function Customers({ openCreate = false }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(openCreate);
  const [editing, setEditing] = useState(null);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState(null);

  const schema = useMemo(() => z.object({
    firstName: z.string().min(1, t('customersPage.required')),
    phoneNumber: z.string().min(7, t('customersPage.minDigits')),
  }), [t]);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => api.get('/customers', { params: { page, limit: 20, search } }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const saveMut = useMutation({
    mutationFn: (body) => (editing ? api.put(`/customers/${editing.id}`, body) : api.post('/customers', body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setModal(false);
      reset();
      setEditing(null);
      toast.success(editing ? t('customersPage.updated') : t('customersPage.created'));
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t('customersPage.saveFailed'))),
  });

  const delMut = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success(t('customersPage.deleted'));
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t('customersPage.deleteFailed'))),
  });

  const openEdit = (customer) => {
    setEditing(customer);
    reset({ firstName: customer.firstName, phoneNumber: customer.phoneNumber });
    setModal(true);
  };

  const openCreateModal = () => {
    setEditing(null);
    reset({});
    setModal(true);
  };

  return (
    <div className="page">
      <PageHeader
        title={t('customersPage.title')}
        subtitle={data ? t('customersPage.registered', { count: data.total }) : ''}
        action={(
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <LuSearch size={13} style={{ position: 'absolute', left: 11, color: 'var(--text3)', pointerEvents: 'none' }} />
              <input
                className="inp"
                style={{ paddingLeft: 32, width: 180, height: 36 }}
                placeholder={t('customersPage.searchPlaceholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <button className="btn btn-gold" onClick={openCreateModal}><LuPlus size={15} /> {t('customersPage.addCustomer')}</button>
          </div>
        )}
      />

      <Card noPad>
        {isLoading ? <Spinner /> : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>{['Bill #', t('common.customer'), t('common.phone'), t('orders.titleAll'), t('customersPage.since'), t('common.actions')].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {!data?.data?.length ? (
                    <tr><td colSpan={6}><EmptyState message={t('customersPage.noCustomersYet')} Icon={LuUsers} /></td></tr>
                  ) : data.data.map((c) => (
                    <tr key={c.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>#{c.billNumber}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {c.firstName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{c.firstName}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text2)', fontSize: 13 }}>
                          <LuPhone size={12} />{c.phoneNumber}
                        </div>
                      </td>
                      <td>
                        <span style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                          {t('customersPage.ordersCount', { count: c._count.orders })}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDateLocale(c.createdAt, i18n.resolvedLanguage || i18n.language)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => openEdit(c)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border2)', borderRadius: 5, padding: '4px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                          >
                            <LuPencil size={12} /> {t('customersPage.edit')}
                          </button>
                          <button
                            onClick={() => {
                              setDeleteCustomerTarget({
                                id: c.id,
                                name: c.firstName,
                                billNumber: c.billNumber,
                              });
                            }}
                            style={{ background: '#FFF1F2', color: '#BE123C', border: 'none', borderRadius: 5, padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <LuTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 20px 16px' }}>
              <Pagination page={page} total={data?.total || 0} limit={20} onChange={setPage} />
            </div>
          </>
        )}
      </Card>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? t('customersPage.modalEdit') : t('customersPage.modalNew')}>
        <form onSubmit={handleSubmit((formData) => saveMut.mutate(formData))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('customersPage.firstName')} error={errors.firstName?.message} required>
            <input {...register('firstName')} className={`inp${errors.firstName ? ' err' : ''}`} placeholder="Ahmad" />
          </Field>
          <Field label={t('customersPage.phoneNumber')} error={errors.phoneNumber?.message} required>
            <div className="iw">
              <LuPhone size={13} className="ico" />
              <input {...register('phoneNumber')} className={`inp${errors.phoneNumber ? ' err' : ''}`} style={{ paddingLeft: 36 }} placeholder="0700000001" />
            </div>
          </Field>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={() => setModal(false)} className="btn btn-outline" style={{ flex: 1 }}>{t('customersPage.cancel')}</button>
            <button type="submit" className="btn btn-gold" style={{ flex: 1 }} disabled={saveMut.isPending}>
              {saveMut.isPending ? t('customersPage.saving') : t('customersPage.save')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={!!deleteCustomerTarget}
        onClose={() => setDeleteCustomerTarget(null)}
        onConfirm={() => {
          if (!deleteCustomerTarget) return;
          delMut.mutate(deleteCustomerTarget.id, {
            onSettled: () => setDeleteCustomerTarget(null),
          });
        }}
        title={t('customersPage.deleteTitle', { defaultValue: t('common.delete') })}
        message={t('customersPage.deleteConfirmDetail', {
          name: deleteCustomerTarget?.name || '-',
          defaultValue: 'Delete this customer and related records permanently? This action cannot be undone.',
        })}
        itemName={
          deleteCustomerTarget
            ? `#${deleteCustomerTarget.billNumber ?? '-'} ${deleteCustomerTarget.name || ''}`.trim()
            : ''
        }
        isPending={delMut.isPending}
      />
    </div>
  );
}
