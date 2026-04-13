import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LuArrowRightLeft,
  LuSearch,
  LuCalendarDays,
  LuUser,
  LuBadgeDollarSign,
} from 'react-icons/lu';
import api from '../lib/api.js';
import { Spinner, EmptyState, Pagination, Badge } from '../components/ui/index.jsx';

const ACCOUNT_TYPE_COLOR = {
  ADMIN:    '#2563EB',
  DOKAN:    '#7C3AED',
  DOKHT:    '#DB2777',
  QICHIKAR: '#D97706',
};

const BADGE_V = {
  ADMIN:    'teal',
  DOKAN:    'gold',
  DOKHT:    'red',
  QICHIKAR: 'amber',
};

function formatMoney(v) {
  return `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AllTransactions() {
  const { t }                   = useTranslation();
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, search, typeFilter],
    queryFn:  () =>
      api
        .get('/transactions', {
          params: { page, limit: 20, search, accountType: typeFilter },
        })
        .then((r) => r.data),
  });

  const transactions = data?.data || [];
  const totalAmount  = transactions.reduce((s, tx) => s + (tx.amount || 0), 0);

  const ACCOUNT_TYPES = ['ADMIN', 'DOKAN', 'DOKHT', 'QICHIKAR'];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24, flexWrap: 'wrap', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#2563EB18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <LuArrowRightLeft size={19} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>{t('transaction.allTitle')}</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>{t('transaction.allSubtitle')}</p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Account-type filter */}
          <select
            className="inp"
            style={{ height: 36, paddingRight: 10, fontSize: 13 }}
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="">{t('transaction.allTypes')}</option>
            {ACCOUNT_TYPES.map((at) => (
              <option key={at} value={at}>{at}</option>
            ))}
          </select>

          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <LuSearch
              size={13}
              style={{ position: 'absolute', left: 10, color: 'var(--text3)', pointerEvents: 'none' }}
            />
            <input
              className="inp"
              style={{ paddingLeft: 32, width: 200, height: 36 }}
              placeholder={t('transaction.searchPlaceholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: t('transaction.totalTransactions'),
            value: data?.total ?? 0,
            Icon:  LuArrowRightLeft,
            color: '#2563EB',
          },
          {
            label:  t('transaction.totalAmount'),
            value:  formatMoney(totalAmount),
            Icon:   LuBadgeDollarSign,
            color:  '#16a34a',
            isText: true,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 9,
                background: s.color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <s.Icon size={16} style={{ color: s.color }} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{s.label}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <Spinner />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {[
                      '#',
                      t('transaction.userName'),
                      t('transaction.accountType'),
                      t('transaction.amount'),
                      t('transaction.transactionDate'),
                      t('transaction.note'),
                      t('transaction.createdBy'),
                      t('common.date'),
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: '11px 16px', textAlign: 'left',
                          fontSize: 12, fontWeight: 600, color: 'var(--text3)',
                          borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          message={t('common.noData')}
                          Icon={LuArrowRightLeft}
                        />
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, i) => (
                      <tr
                        key={tx.id}
                        style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        {/* Row # */}
                        <td style={{ padding: '12px 16px', color: 'var(--text3)', fontSize: 12 }}>
                          {(page - 1) * 20 + i + 1}
                        </td>

                        {/* User */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 30, height: 30, borderRadius: '50%',
                                background: (ACCOUNT_TYPE_COLOR[tx.user?.accountType] || '#888') + '20',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <LuUser size={13} style={{ color: ACCOUNT_TYPE_COLOR[tx.user?.accountType] || '#888' }} />
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 13 }}>{tx.user?.name}</p>
                              <p style={{ fontSize: 11, color: 'var(--text3)' }}>{tx.user?.phoneNumber}</p>
                            </div>
                          </div>
                        </td>

                        {/* Account type */}
                        <td style={{ padding: '12px 16px' }}>
                          <Badge v={BADGE_V[tx.accountType] || 'gold'}>{tx.accountType}</Badge>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, color: '#16a34a' }}>
                          {formatMoney(tx.amount)}
                        </td>

                        {/* Transaction date */}
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text2)' }}>
                            <LuCalendarDays size={12} />
                            {formatDate(tx.transactionDate)}
                          </div>
                        </td>

                        {/* Note */}
                        <td
                          style={{
                            padding: '12px 16px', fontSize: 12, color: 'var(--text3)',
                            maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                          title={tx.note || ''}
                        >
                          {tx.note || '—'}
                        </td>

                        {/* Created by */}
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)' }}>
                          {tx.createdBy?.name || '—'}
                        </td>

                        {/* Created at */}
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)' }}>
                          {formatDate(tx.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '10px 20px 16px' }}>
              <Pagination
                page={page}
                total={data?.total || 0}
                limit={20}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
