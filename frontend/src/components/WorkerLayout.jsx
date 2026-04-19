import { useRef, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LuScissors, LuBell, LuLogOut, LuUser, LuCheck,
  LuSun, LuMoon, LuLanguages, LuChevronDown, LuX,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../lib/api.js';
import { formatUserNotificationMessage } from '../lib/notifications.js';
import { NotificationText } from './ui/index.jsx';

const ROLE_CONFIG = {
  DOKHT: { color: '#DB2777', labelKey: 'workerLayout.dokhtPanel' },
  QICHIKAR: { color: '#D97706', labelKey: 'workerLayout.qichikarPanel' },
};

function useOutside(ref, fn) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) fn(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, fn]);
}

function WorkerNotifDropdown({ roleColor, onClose }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || 'en';

  const { data: notifs = [] } = useQuery({
    queryKey: ['worker-notifs-dropdown'],
    queryFn: () => api.get('/users/me/notifications', { params: { unread: true } }).then((r) => r.data),
  });

  const readAllMut = useMutation({
    mutationFn: () => api.patch('/users/me/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-notifs-dropdown'] });
      qc.invalidateQueries({ queryKey: ['worker-notifs-count'] });
      qc.invalidateQueries({ queryKey: ['worker-panel-notifs'] });
    },
  });

  const readOneMut = useMutation({
    mutationFn: (id) => api.patch(`/users/me/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker-notifs-dropdown'] });
      qc.invalidateQueries({ queryKey: ['worker-notifs-count'] });
      qc.invalidateQueries({ queryKey: ['worker-panel-notifs'] });
    },
  });

  return (
    <div style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--sh-lg)', width: 340, zIndex: 300 }}>
      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>{t('workerLayout.notifications')}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {notifs.length > 0 && (
            <button
              onClick={() => readAllMut.mutate()}
              disabled={readAllMut.isPending}
              style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none' }}
            >
              {t('workerLayout.markAllRead')}
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
            <LuX size={14} />
          </button>
        </div>
      </div>

      {notifs.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
          {t('workerLayout.noNewAssignments')}
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {notifs.slice(0, 10).map((n) => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
              <LuBell size={13} style={{ color: roleColor, flexShrink: 0, marginTop: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <NotificationText language={language} style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text1)' }}>
                  {formatUserNotificationMessage(n, t, language)}
                </NotificationText>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                  {new Date(n.createdAt).toLocaleString(i18n.resolvedLanguage || i18n.language || 'en')}
                </p>
              </div>
              <button
                onClick={() => readOneMut.mutate(n.id)}
                title={t('navbar.markAsRead')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: '3px 4px', borderRadius: 4, flexShrink: 0 }}
              >
                <LuCheck size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LangMenu({ onClose }) {
  const { i18n, t } = useTranslation();
  const langs = [
    { code: 'en', label: t('common.english'), flag: 'EN' },
    { code: 'dari', label: t('common.dari'), flag: 'DR' },
    { code: 'pashto', label: t('common.pashto'), flag: 'PS' },
  ];
  const current = i18n.resolvedLanguage || 'en';

  return (
    <div style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--sh-md)', minWidth: 150, zIndex: 300 }}>
      {langs.map((l) => (
        <div
          key={l.code}
          onClick={() => { i18n.changeLanguage(l.code); localStorage.setItem('lang', l.code); onClose(); }}
          style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: current === l.code ? 'var(--primary)' : 'var(--text1)', fontWeight: current === l.code ? 600 : 400 }}
        >
          <span style={{ fontSize: 11, fontWeight: 800 }}>{l.flag}</span>
          {l.label}
          {current === l.code && <LuCheck size={12} style={{ marginLeft: 'auto' }} />}
        </div>
      ))}
    </div>
  );
}

function UserMenu({ roleColor, onClose }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/login');
  };

  return (
    <div style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--sh-lg)', width: 210, zIndex: 300 }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{user?.name}</p>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{user?.phoneNumber}</p>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: roleColor + '18', color: roleColor, marginTop: 6, display: 'inline-block' }}>
          {user?.accountType}
        </span>
      </div>
      <div
        onClick={handleLogout}
        style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 500 }}
      >
        <LuLogOut size={14} />
        <span>{t('workerLayout.logout')}</span>
      </div>
    </div>
  );
}

export default function WorkerLayout() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const { i18n, t } = useTranslation();

  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const notifRef = useRef();
  const langRef = useRef();
  const userRef = useRef();

  useOutside(notifRef, () => setNotifOpen(false));
  useOutside(langRef, () => setLangOpen(false));
  useOutside(userRef, () => setUserOpen(false));

  const cfg = ROLE_CONFIG[user?.accountType] || ROLE_CONFIG.QICHIKAR;
  const { color: roleColor, labelKey } = cfg;
  const roleLabel = t(labelKey);

  const { data: unreadNotifs = [] } = useQuery({
    queryKey: ['worker-notifs-count'],
    queryFn: () => api.get('/users/me/notifications', { params: { unread: true } }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const currentLang = (i18n.resolvedLanguage || 'en').slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LuScissors size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1, color: 'var(--text1)' }}>
              {t('workerLayout.tailorSystem')}
            </p>
            <p style={{ fontSize: 11, color: roleColor, fontWeight: 600 }}>{roleLabel}</p>
          </div>
        </div>

        <div style={{ position: 'relative' }} ref={langRef}>
          <button onClick={() => { setLangOpen((o) => !o); setNotifOpen(false); setUserOpen(false); }} style={btnStyle}>
            <LuLanguages size={14} />
            <span style={{ fontWeight: 700, fontSize: 12 }}>{currentLang}</span>
          </button>
          {langOpen && <LangMenu onClose={() => setLangOpen(false)} />}
        </div>

        <button onClick={toggle} style={btnStyle}>
          {dark ? <LuSun size={15} /> : <LuMoon size={15} />}
        </button>

        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((o) => !o); setLangOpen(false); setUserOpen(false); }}
            style={{ ...btnStyle, position: 'relative' }}
          >
            <LuBell size={17} />
            {unreadNotifs.length > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 99, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
              </span>
            )}
          </button>
          {notifOpen && <WorkerNotifDropdown roleColor={roleColor} onClose={() => setNotifOpen(false)} />}
        </div>

        <div style={{ position: 'relative' }} ref={userRef}>
          <button
            onClick={() => { setUserOpen((o) => !o); setNotifOpen(false); setLangOpen(false); }}
            style={{ ...btnStyle, gap: 7, padding: '5px 10px' }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: roleColor + '28', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LuUser size={14} style={{ color: roleColor }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text1)' }}>
              {user?.name}
            </span>
            <LuChevronDown size={12} style={{ color: 'var(--text3)' }} />
          </button>
          {userOpen && <UserMenu roleColor={roleColor} onClose={() => setUserOpen(false)} />}
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1140, width: '100%', margin: '0 auto', padding: '28px 20px' }}>
        <Outlet />
      </main>
    </div>
  );
}

const btnStyle = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '7px 10px',
  cursor: 'pointer',
  color: 'var(--text2)',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};
