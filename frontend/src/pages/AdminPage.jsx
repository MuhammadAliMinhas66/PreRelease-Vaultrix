// Admin Dashboard - restricted to ADMIN_EMAIL (see RequireAdmin.jsx and
// backend/src/middleware/requireAdmin.js). This is a tool for Vaultrix's
// own operator, not part of the regular product surface, so unlike every
// other page in this app it does NOT go through the i18n t() system -
// hardcoding English here avoids maintaining ~100 translation keys across
// 6 locales for a page exactly one person will ever see. If that stops
// being true, this should be revisited.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Laptop,
  Loader2,
  RefreshCw,
  Search,
  ShieldOff,
  Trash2,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader.jsx';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import { notify } from '../i18n/notifications.js';
import {
  getAdminOverview,
  listAdminUsers,
  getAdminUserDetail,
  updateAdminUser,
  deactivateAdminUser,
  reactivateAdminUser,
  deleteAdminUser,
  forceAdminPasswordReset,
  disableAdminUserMfa,
  revokeAdminUserSession,
  getAdminAuditLog,
} from '../services/adminService.js';

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return '—';
  }
};

// Admin-only tool, not localized (see the file header comment) - the
// backend's own plain-English message is shown as-is, same as every
// English-language message this controller already sends.
const onError = (error) => notify.error(error?.message || 'Something went wrong.');

function Pill({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-black/5 text-ink',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

function SectionCard({ title, subtitle, children, actions }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-xs text-muted">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// --- Overview -------------------------------------------------------------

function OverviewSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getAdminOverview();
        if (!cancelled) setData(result);
      } catch (error) {
        if (!cancelled) onError(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const stats = [
    { label: 'Total users', value: data.overview.totalUsers },
    { label: 'Active', value: data.overview.activeUsers },
    { label: 'Deactivated', value: data.overview.deactivatedUsers },
    { label: 'Online now', value: data.overview.onlineNow },
    { label: 'Signups today', value: data.overview.signupsToday },
    { label: 'Signups this week', value: data.overview.signupsThisWeek },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-white px-4 py-3.5">
            <p className="text-2xl font-semibold text-ink">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Recent signups">
        {data.recentSignups.length === 0 ? (
          <p className="text-sm text-muted">No signups yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.recentSignups.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{u.name}</p>
                  <p className="truncate text-xs text-muted">{u.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Pill>{u.authProvider === 'google' ? 'Google' : 'Password'}</Pill>
                  <span className="text-xs text-muted">{formatDateTime(u.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

// --- User detail panel -------------------------------------------------------------

function UserDetailPanel({ userId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', country: '', currency: '', language: '' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminUserDetail(userId);
      setDetail(data);
      setForm({
        name: data.user.name || '',
        country: data.user.country || '',
        currency: data.user.currency || '',
        language: data.user.language || '',
      });
    } catch (error) {
      onError(error);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const run = async (key, action, confirmMessage) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(key);
    try {
      await action();
      notify.success('Done.');
      await load();
      onChanged?.();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(null);
    }
  };

  const saveEdits = async (event) => {
    event.preventDefault();
    setBusy('save');
    try {
      await updateAdminUser(userId, form);
      notify.success('Updated.');
      setEditing(false);
      await load();
      onChanged?.();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-ink">User detail</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading || !detail ? (
          <div className="flex flex-1 items-center justify-center text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="flex items-center gap-3">
              {detail.user.avatarUrl ? (
                <img src={detail.user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-sm font-medium text-white">
                  {(detail.user.name || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{detail.user.name}</p>
                <p className="truncate text-xs text-muted">{detail.user.email}</p>
              </div>
              <div className="ms-auto flex flex-col items-end gap-1">
                <Pill tone={detail.user.isActive ? 'green' : 'red'}>{detail.user.isActive ? 'Active' : 'Deactivated'}</Pill>
                {detail.user.isOnline && <Pill tone="amber">Online</Pill>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted">Sign-in method</p><p className="mt-0.5 font-medium text-ink">{detail.user.authProvider === 'google' ? 'Google' : 'Password'}{detail.user.googleLinked ? ' (Google linked)' : ''}</p></div>
              <div><p className="text-muted">2-step verification</p><p className="mt-0.5 font-medium text-ink">{detail.user.mfaEnabled ? 'On' : 'Off'}</p></div>
              <div><p className="text-muted">Country</p><p className="mt-0.5 font-medium text-ink">{detail.user.country || '—'}</p></div>
              <div><p className="text-muted">Currency</p><p className="mt-0.5 font-medium text-ink">{detail.user.currency || '—'}</p></div>
              <div><p className="text-muted">Language</p><p className="mt-0.5 font-medium text-ink">{detail.user.language || '—'}</p></div>
              <div><p className="text-muted">Joined</p><p className="mt-0.5 font-medium text-ink">{formatDateTime(detail.user.createdAt)}</p></div>
              <div><p className="text-muted">Last login</p><p className="mt-0.5 font-medium text-ink">{formatDateTime(detail.user.lastLoginAt)}</p></div>
              <div><p className="text-muted">Onboarding</p><p className="mt-0.5 font-medium text-ink">{detail.user.onboardingCompleted ? 'Completed' : 'Not finished'}</p></div>
            </div>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Preferences</h3>
                {!editing && (
                  <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-accent hover:underline">
                    Edit
                  </button>
                )}
              </div>
              {editing ? (
                <form onSubmit={saveEdits} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                  <FormField label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  <div className="grid grid-cols-3 gap-2">
                    <FormField label="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))} placeholder="PK" />
                    <FormField label="Currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="PKR" />
                    <FormField label="Language" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} placeholder="en" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" loading={busy === 'save'} loadingLabel="Saving…">Save</Button>
                    <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted hover:text-ink">Cancel</button>
                  </div>
                </form>
              ) : null}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Actions</h3>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy === 'mfa' || !detail.user.mfaEnabled}
                  onClick={() => run('mfa', () => disableAdminUserMfa(userId), 'Turn off 2-step verification for this account? They will be signed out everywhere.')}
                  className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-start text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"
                >
                  <ShieldOff className="h-4 w-4 shrink-0" /> Turn off 2-step verification
                </button>
                <button
                  type="button"
                  disabled={busy === 'reset' || !detail.user.hasPassword}
                  onClick={() => run('reset', () => forceAdminPasswordReset(userId), "Email this user a password reset code?")}
                  className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-start text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"
                >
                  <KeyRound className="h-4 w-4 shrink-0" /> Send password reset code
                </button>
                {detail.user.isActive ? (
                  <button
                    type="button"
                    disabled={busy === 'deactivate'}
                    onClick={() => run('deactivate', () => deactivateAdminUser(userId), 'Deactivate this account? They will be signed out and unable to log back in until reactivated.')}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-start text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                  >
                    <Ban className="h-4 w-4 shrink-0" /> Deactivate account
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === 'reactivate'}
                    onClick={() => run('reactivate', () => reactivateAdminUser(userId))}
                    className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-start text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" /> Reactivate account
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy === 'delete'}
                  onClick={() =>
                    run('delete', async () => {
                      await deleteAdminUser(userId);
                      onClose();
                    }, `Permanently delete ${detail.user.email}? This cannot be undone.`)
                  }
                  className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-start text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4 shrink-0" /> Delete account permanently
                </button>
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Laptop className="h-3.5 w-3.5" /> Sessions ({detail.sessions.length})
              </h3>
              {detail.sessions.length === 0 ? (
                <p className="text-sm text-muted">Not signed in anywhere.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                  {detail.sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{session.device}</p>
                        <p className="truncate text-xs text-muted">{session.ip} · last used {formatDateTime(session.lastUsedAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => run(`session-${session.id}`, () => revokeAdminUserSession(userId, session.id))}
                        disabled={busy === `session-${session.id}`}
                        className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                      >
                        Sign out
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent activity</h3>
              {detail.events.length === 0 ? (
                <p className="text-sm text-muted">No recorded activity.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                  {detail.events.slice(0, 15).map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs">
                      <span className="font-mono text-ink">{event.event}</span>
                      <span className="shrink-0 text-muted">{formatDateTime(event.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Users list -------------------------------------------------------------

function UsersSection() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await listAdminUsers({ page, search, status });
      setData(result);
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <SectionCard
      title="Users"
      actions={
        <button type="button" onClick={load} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink hover:bg-surface">
          <RefreshCw className="h-4 w-4" />
        </button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-border py-2.5 ps-9 pe-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-ink"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
          <option value="online">Online now</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !data || data.users.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No users match.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs uppercase tracking-wide text-muted">
                <th className="py-2 text-start font-medium">User</th>
                <th className="py-2 text-start font-medium">Status</th>
                <th className="py-2 text-start font-medium">Joined</th>
                <th className="py-2 text-start font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.users.map((u) => (
                <tr key={u.id} onClick={() => setSelectedId(u.id)} className="cursor-pointer hover:bg-surface">
                  <td className="py-2.5">
                    <p className="font-medium text-ink">{u.name}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Pill tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Deactivated'}</Pill>
                      {u.isOnline && <Pill tone="amber">Online</Pill>}
                    </div>
                  </td>
                  <td className="py-2.5 text-xs text-muted">{formatDateTime(u.createdAt)}</td>
                  <td className="py-2.5 text-xs text-muted">{formatDateTime(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      {selectedId && (
        <UserDetailPanel userId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />
      )}
    </SectionCard>
  );
}

// --- Audit log -------------------------------------------------------------

function AuditLogSection() {
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await getAdminAuditLog({ page, event: eventFilter });
        if (!cancelled) setData(result);
      } catch (error) {
        if (!cancelled) onError(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, eventFilter]);

  return (
    <SectionCard title="Signup & security audit log" subtitle="Every logged security event, newest first.">
      {data?.eventTypes?.length > 0 && (
        <select
          value={eventFilter}
          onChange={(e) => {
            setEventFilter(e.target.value);
            setPage(1);
          }}
          className="mb-4 rounded-lg border border-border px-3 py-2.5 text-sm text-ink"
        >
          <option value="">All event types</option>
          {data.eventTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !data || data.events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No events recorded.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {data.events.map((event) => (
            <li key={event.id} className="flex flex-col gap-0.5 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-ink">{event.event}</span>
                <span className="shrink-0 text-xs text-muted">{formatDateTime(event.createdAt)}</span>
              </div>
              <p className="text-xs text-muted">
                {event.ip || '—'} {event.path ? `· ${event.path}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </SectionCard>
  );
}

// --- Page shell -------------------------------------------------------------

const SECTIONS = [
  { id: 'overview', label: 'Overview', Component: OverviewSection },
  { id: 'users', label: 'Users', Component: UsersSection },
  { id: 'audit', label: 'Audit log', Component: AuditLogSection },
];

function AdminPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState('overview');
  const ActiveComponent = useMemo(() => SECTIONS.find((s) => s.id === active)?.Component || OverviewSection, [active]);

  return (
    <div className="min-h-screen bg-surface">
      <DashboardHeader />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-ink hover:bg-black/[0.03]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
              <UsersIcon className="h-5 w-5" /> Admin Dashboard
            </h1>
            <p className="text-sm text-muted">Operator-only tools. Not part of the regular Vaultrix product.</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-white p-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActive(section.id)}
              className={`whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition ${
                active === section.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <ActiveComponent />
      </div>
    </div>
  );
}

export default AdminPage;
