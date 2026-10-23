import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Home, Wallet, Users, Receipt, Wifi } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';
import { useFormat } from '../i18n/useFormat.js';

const bars = [10, 18, 13, 24, 16, 28];

function useDemo() {
  const { t } = useTranslation();
  const f = useFormat();
  return {
    t,
    f,
    num: (value) => f.formatNumber(value),
    money: (value, options) => f.formatMoney(value, options),
    day: (monthIndex, dayOfMonth) => f.formatDate(new Date(2026, monthIndex, dayOfMonth)),
    month: (monthIndex) => f.formatMonth(new Date(2026, monthIndex, 1)),
  };
}

function OverviewCard() {
  const { t, f, num, money } = useDemo();

  return (
    <div className="flex h-full flex-col">
      <CardHeader icon={Home} label={t('v.overview')} />
      <div className="mt-2.5 rounded-lg bg-white p-2">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[7px] uppercase tracking-wide text-black/45">{t('v.totalBalance')}</span>
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] font-medium text-emerald-600">
            {f.formatNumber(0.042, {
              style: 'percent',
              signDisplay: 'always',
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </span>
        </div>
        <p className="mt-1 whitespace-nowrap text-[13px] font-semibold text-ink">{money(148240, { decimals: 2 })}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-md border border-white/10 bg-white/[0.06] p-1.5">
          <Wallet className="h-2.5 w-2.5 text-white/50" />
          <p className="mt-1 text-[7px] text-white/45">{t('v.loans')}</p>
          <p className="whitespace-nowrap text-[9px] font-medium text-white/85">{money(12000)}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.06] p-1.5">
          <Users className="h-2.5 w-2.5 text-white/50" />
          <p className="mt-1 text-[7px] text-white/45">{t('v.committees')}</p>
          <p className="text-[9px] font-medium text-white/85">{t('v.active', { count: num(3) })}</p>
        </div>
      </div>
      <div className="mt-2 flex h-10 flex-1 items-end gap-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-1.5">
        {bars.map((height, index) => (
          <motion.div
            key={index}
            className="w-full rounded-sm bg-white/35"
            initial={{ height: 0 }}
            animate={{ height }}
            transition={{ duration: 0.6, delay: 0.15 + index * 0.06, ease: 'easeOut' }}
          />
        ))}
      </div>
    </div>
  );
}

function LoansCard() {
  const { t, money } = useDemo();
  const rows = [
    { name: 'Ahmed Raza', note: t('v.youLent'), amount: money(8000), positive: true },
    { name: 'Sara Khan', note: t('v.youOwe'), amount: money(4200), positive: false },
  ];

  return (
    <div className="flex h-full flex-col">
      <CardHeader icon={Wallet} label={t('v.loans')} />
      <div className="mt-2.5 flex flex-col gap-1.5">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between gap-1 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1.5"
          >
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[7px] font-medium text-white/70">
                {row.name.charAt(0)}
              </div>
              <div>
                <p className="text-[8.5px] font-medium text-white/85">{row.name}</p>
                <p className="text-[7px] text-white/40">{row.note}</p>
              </div>
            </div>
            <span
              className={`whitespace-nowrap text-[9px] font-medium ${row.positive ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              {row.amount}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[7px] text-white/45">
        {t('v.repayNote')}
      </div>
    </div>
  );
}

function CommitteesCard() {
  const { t, num } = useDemo();
  const rows = [
    { name: t('v.familyCommittee'), progress: 60, note: t('v.roundsOf', { done: num(6), total: num(10) }) },
    { name: t('v.officeCommittee'), progress: 30, note: t('v.roundsOf', { done: num(3), total: num(10) }) },
  ];

  return (
    <div className="flex h-full flex-col">
      <CardHeader icon={Users} label={t('v.committees')} />
      <div className="mt-2.5 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.name} className="rounded-md border border-white/10 bg-white/[0.05] p-2">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[8.5px] font-medium text-white/85">{row.name}</p>
              <p className="text-[7px] text-white/40">{row.note}</p>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-white/60"
                initial={{ width: 0 }}
                animate={{ width: `${row.progress}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BillsCard() {
  const { t, num, money } = useDemo();
  const rows = [
    { name: t('v.electricityBill'), note: t('v.splitWays', { count: num(3) }), amount: money(6000) },
    { name: t('v.internet'), note: t('v.splitWays', { count: num(3) }), amount: money(3000) },
  ];

  return (
    <div className="flex h-full flex-col">
      <CardHeader icon={Receipt} label={t('v.thisMonth')} />
      <div className="mt-2.5 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1.5 text-[8px] font-medium text-white/85">
        {t('v.oweTo', { name: 'Bilal', amount: money(2400) })}
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between gap-1 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1.5"
          >
            <div>
              <p className="text-[8.5px] font-medium text-white/85">{row.name}</p>
              <p className="text-[7px] text-white/40">{row.note}</p>
            </div>
            <span className="whitespace-nowrap text-[9px] font-medium text-white/80">{row.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBarIcons() {
  return (
    <div className="flex items-center gap-1">
      <svg width="13" height="9" viewBox="0 0 13 9" fill="none" className="text-white/90">
        <rect x="0" y="5.3" width="2.1" height="3.7" rx="0.5" fill="currentColor" />
        <rect x="3.2" y="3.6" width="2.1" height="5.4" rx="0.5" fill="currentColor" />
        <rect x="6.4" y="1.9" width="2.1" height="7.1" rx="0.5" fill="currentColor" />
        <rect x="9.6" y="0" width="2.1" height="9" rx="0.5" fill="currentColor" />
      </svg>
      <span className="text-[7.5px] font-semibold tracking-tight text-white/90">5G</span>
      <Wifi className="h-2.5 w-2.5 text-white/90" strokeWidth={2.5} />
      <span className="relative ml-0.5 flex h-[9px] w-[19px] items-center rounded-[3px] border border-white/60 pl-[1.5px]">
        <span className="block h-[5.5px] w-[13px] rounded-[1px] bg-white/90" />
        <span className="absolute -right-[2.5px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r-sm bg-white/60" />
      </span>
    </div>
  );
}

function CardHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5 px-0.5">
      <Icon className="h-3 w-3 text-white/60" />
      <span className="text-[8px] font-semibold uppercase tracking-wide text-white/60">
        {label}
      </span>
    </div>
  );
}

const screens = [
  { Component: OverviewCard },
  { Component: LoansCard },
  { Component: CommitteesCard },
  { Component: BillsCard },
];

function PhoneScreen({ index }) {
  const ActiveCard = screens[index].Component;
  const { f } = useDemo();

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-[#101015] to-[#0a0a0d] p-3">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-medium text-white/85">{f.formatTime(new Date(2026, 8, 28, 9, 41))}</span>
        <StatusBarIcons />
      </div>

      <div className="mt-2.5 flex items-center justify-between px-0.5">
        <span className="text-[9px] font-semibold tracking-wide text-white/60">VAULTRIX</span>
        <div className="h-3 w-3 rounded-full bg-white/20" />
      </div>

      <div className="relative mt-3 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="h-full text-[10px]"
          >
            <ActiveCard />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-1 pt-1.5">
        {screens.map((_, dotIndex) => (
          <span
            key={dotIndex}
            className={`h-1 rounded-full transition-all duration-300 ${
              dotIndex === index ? 'w-4 bg-white/70' : 'w-1 bg-white/25'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const callouts = ['v.callout1', 'v.callout2', 'v.callout3', 'v.callout4'];

const SCREEN_DURATION = 2800;
const OPEN_MS = 7200;
const CLOSED_MS = 1100;

const STAGE_W = 660;
const STAGE_H = 560;
const PHONE_W = 248;
const PHONE_H = 424;
const PHONE_LEFT = (STAGE_W - PHONE_W) / 2;
const PHONE_TOP = 68;
const CENTER_X = STAGE_W / 2;
const CENTER_Y = PHONE_TOP + PHONE_H / 2;

const CARD_W = 176;
const CARD_H = 152;
const GAP = 16;
const RIGHT_EDGE = PHONE_LEFT + PHONE_W + GAP;
const LEFT_EDGE = PHONE_LEFT - GAP - CARD_W;

// How far each page is swung open, in degrees. Right pages open wider than left ones.
const RIGHT_TURN = 20;
const LEFT_TURN = 16;

const TOOLTIP_TOP = 74;

function PageShell({ title, meta, children }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-gradient-to-br from-white to-[#e8e8ec] p-3.5 text-ink shadow-[0_22px_46px_-14px_rgba(0,0,0,0.75)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-ink/70">{title}</span>
        {meta && <span className="whitespace-nowrap text-[10px] text-ink/45">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function Line({ label, value, valueClass = 'font-medium', size = 'text-[11px]', className = 'mt-1.5' }) {
  return (
    <div className={`${className} flex items-center justify-between gap-2 ${size}`}>
      <span className="text-ink/50">{label}</span>
      <span className={`whitespace-nowrap tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function LoansPage() {
  const { t, num, money } = useDemo();
  const rows = [
    { name: 'Ahmed Raza', note: t('v.youLent'), amount: money(8000), tone: 'text-emerald-700' },
    { name: 'Sara Khan', note: t('v.youOwe'), amount: money(4200), tone: 'text-amber-700' },
  ];

  return (
    <PageShell title={t('v.loans')} meta={t('v.openCount', { count: num(2) })}>
      <div className="mt-3 flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-medium text-white">
                {row.name.charAt(0)}
              </span>
              <div>
                <p className="whitespace-nowrap text-[11.5px] font-medium leading-tight">{row.name}</p>
                <p className="text-[10px] text-ink/45">{row.note}</p>
              </div>
            </div>
            <span className={`whitespace-nowrap text-[12.5px] font-semibold tabular-nums ${row.tone}`}>{row.amount}</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-ink/10 pt-2 text-[11px]">
        <span className="text-ink/50">{t('v.netPosition')}</span>
        <span className="whitespace-nowrap font-semibold tabular-nums">{money(3800, { signed: true })}</span>
      </div>
    </PageShell>
  );
}

function CommitteePage() {
  const { t, num, money, day } = useDemo();

  return (
    <PageShell title={t('v.committee')} meta={t('v.roundOf', { round: num(6), total: num(10) })}>
      <p className="mt-3 text-[14px] font-semibold leading-tight">{t('v.familyCommittee')}</p>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full w-[60%] rounded-full bg-ink" />
      </div>
      <Line className="mt-3" label={t('v.paidSoFar')} value={money(60000)} valueClass="font-semibold" />
      <Line label={t('v.nextPayout')} value={`${day(10, 12)}, Hina`} valueClass="font-medium" />
    </PageShell>
  );
}

function RentPage() {
  const { t, num, money } = useDemo();

  return (
    <PageShell title={t('v.rentSplit', { count: num(3) })}>
      <p className="mt-2.5 text-[10.5px] text-ink/50">{t('v.yourShare')}</p>
      <p className="whitespace-nowrap text-[23px] font-semibold leading-tight tabular-nums">{money(15000)}</p>
      <Line className="mt-2.5" label={t('v.baseRent')} value={money(12000)} />
      <Line label={t('v.utilities')} value={money(3000)} />
    </PageShell>
  );
}

function SalaryPage() {
  const { t, money, month } = useDemo();

  return (
    <PageShell title={t('v.salaryMonth', { month: month(8) })}>
      <Line className="mt-3" size="text-[11.5px]" label={t('v.gross')} value={money(150000)} />
      <Line size="text-[11.5px]" label={t('v.tax')} value={money(-12500)} valueClass="font-medium text-amber-700" />
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-ink/10 pt-2 text-[13px]">
        <span className="font-medium">{t('v.net')}</span>
        <span className="whitespace-nowrap font-semibold tabular-nums">{money(137500)}</span>
      </div>
      <p className="mt-2 whitespace-nowrap text-[10.5px] text-ink/45">{t('v.fixedExpenses', { amount: money(62000) })}</p>
    </PageShell>
  );
}

function BillsPage() {
  const { t, num, money, day } = useDemo();
  const rows = [
    { name: t('v.electricity'), note: t('v.dueDate', { date: day(9, 8) }), amount: money(6000) },
    { name: t('v.internet'), note: t('v.paidForYou', { name: 'Bilal' }), amount: money(1000) },
  ];

  return (
    <PageShell title={t('v.bills')} meta={t('v.pendingCount', { count: num(2) })}>
      <div className="mt-3 flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11.5px] font-medium leading-tight">{row.name}</p>
              <p className="text-[10px] text-ink/45">{row.note}</p>
            </div>
            <span className="whitespace-nowrap text-[12.5px] font-semibold tabular-nums">{row.amount}</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-ink/10 pt-2 text-[11px]">
        <span className="text-ink/50">{t('v.totalDue')}</span>
        <span className="whitespace-nowrap font-semibold tabular-nums">{money(7000)}</span>
      </div>
    </PageShell>
  );
}

function SplitPage() {
  const { t, money } = useDemo();

  return (
    <PageShell title={t('v.groupSplit')} meta={t('v.tripName')}>
      <p className="mt-2.5 text-[10.5px] text-ink/50">{t('v.othersOweYou')}</p>
      <p className="whitespace-nowrap text-[23px] font-semibold leading-tight tabular-nums text-emerald-700">
        {money(8000)}
      </p>
      <Line className="mt-2.5" label={t('v.youPaid')} value={money(12000)} />
      <Line label={t('v.yourShare')} value={money(4000)} />
    </PageShell>
  );
}

function BudgetPage() {
  const { t, money, month } = useDemo();
  const rows = [
    { name: t('v.groceries'), text: t('v.spentOf', { spent: money(18400), limit: money(25000) }), pct: 74 },
    { name: t('v.transport'), text: t('v.spentOf', { spent: money(7200), limit: money(12000) }), pct: 60 },
  ];

  return (
    <PageShell title={t('v.budget')} meta={month(9)}>
      <div className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.name}>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11.5px] font-medium">{row.name}</span>
              <span className="whitespace-nowrap text-[10px] tabular-nums text-ink/50">{row.text}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-ink" style={{ width: `${row.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function GoalPage() {
  const { t, f, money } = useDemo();

  return (
    <PageShell title={t('v.savingsGoal')} meta={f.formatPercent(0.52)}>
      <p className="mt-3 text-[14px] font-semibold leading-tight">{t('v.emergencyFund')}</p>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full w-[52%] rounded-full bg-ink" />
      </div>
      <Line className="mt-3" label={t('v.saved')} value={money(104000)} valueClass="font-semibold" />
      <Line label={t('v.target')} value={money(200000)} />
    </PageShell>
  );
}

function AccountsPage() {
  const { t, num, money } = useDemo();
  const rows = [
    { name: t('v.cash'), amount: money(18240) },
    { name: t('v.bank'), amount: money(112000) },
    { name: t('v.wallet'), amount: money(18000) },
  ];

  return (
    <PageShell title={t('v.accounts')} meta={t('v.accountsCount', { count: num(3) })}>
      <div className="mt-3 flex flex-col gap-1.5">
        {rows.map((row) => (
          <Line key={row.name} className="" size="text-[11.5px]" label={row.name} value={row.amount} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-ink/10 pt-2 text-[13px]">
        <span className="font-medium">{t('v.total')}</span>
        <span className="whitespace-nowrap font-semibold tabular-nums">{money(148240)}</span>
      </div>
    </PageShell>
  );
}

function RecurringPage() {
  const { t, money, day } = useDemo();
  const rows = [
    { name: t('v.rent'), date: day(9, 1), amount: money(15000) },
    { name: t('v.gym'), date: day(9, 3), amount: money(3500) },
    { name: t('v.phonePlan'), date: day(9, 5), amount: money(1200) },
  ];

  return (
    <PageShell title={t('v.recurring')} meta={t('v.next7Days')}>
      <div className="mt-3 flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center gap-2 text-[11.5px]">
            <span className="flex-1 whitespace-nowrap font-medium">{row.name}</span>
            <span className="whitespace-nowrap text-[10px] text-ink/45">{row.date}</span>
            <span className="min-w-[3rem] whitespace-nowrap text-right font-semibold tabular-nums">{row.amount}</span>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function TenantRentPage() {
  const { t, money, day } = useDemo();

  return (
    <PageShell title={t('v.rentTenant')}>
      <p className="mt-2.5 text-[10.5px] text-ink/50">{t('v.oweLandlord')}</p>
      <p className="whitespace-nowrap text-[23px] font-semibold leading-tight tabular-nums text-amber-700">
        {money(15000)}
      </p>
      <Line className="mt-2.5" label={t('v.dueOn')} value={day(9, 1)} valueClass="font-medium" />
      <Line label={t('v.lastPaid')} value={day(8, 1)} valueClass="font-medium" />
    </PageShell>
  );
}

function SpendingPage() {
  const { t, f, money, month } = useDemo();
  const bars = [10, 16, 13, 22, 15, 20];

  return (
    <PageShell title={t('v.spending')} meta={t('v.thisMonth')}>
      <p className="mt-2.5 whitespace-nowrap text-[23px] font-semibold leading-tight tabular-nums">{money(84300)}</p>
      <div className="mt-2 flex h-7 items-end gap-1.5">
        {bars.map((height, i) => (
          <div key={i} className="w-full rounded-sm bg-ink/70" style={{ height }} />
        ))}
      </div>
      <p className="mt-2 text-[10.5px] text-emerald-700">
        {t('v.downFrom', { percent: f.formatPercent(0.06), month: month(7) })}
      </p>
    </PageShell>
  );
}

const slots = [
  { side: 'left', top: 110 },
  { side: 'right', top: 200 },
  { side: 'left', top: 306 },
  { side: 'right', top: 376 },
];

const pageSets = [
  [LoansPage, CommitteePage, RentPage, SalaryPage],
  [BillsPage, SplitPage, BudgetPage, GoalPage],
  [AccountsPage, RecurringPage, TenantRentPage, SpendingPage],
];

const SHRUNK = 0.3;

function pageVariants(reduce) {
  return {
    hidden: (c) => ({
      x: c.hiddenX,
      y: c.hiddenY,
      scale: SHRUNK,
      opacity: 0,
      rotateY: 0,
      rotateZ: 0,
      transition: reduce
        ? { duration: 0 }
        : { duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: c.outDelay },
    }),
    show: (c) => ({
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      rotateY: c.turn,
      rotateZ: c.tilt,
      transition: reduce
        ? { duration: 0 }
        : {
            duration: 1.05,
            ease: [0.22, 1, 0.36, 1],
            delay: c.inDelay,
            opacity: { duration: 0.4, delay: c.inDelay },
          },
    }),
  };
}

function FlyingPage({ slot, Page, order, open, reduce, variants }) {
  const { side, top } = slot;
  const isRight = side === 'right';
  const left = isRight ? RIGHT_EDGE : LEFT_EDGE;
  const originX = isRight ? 0 : 1;

  const custom = {
    hiddenX: CENTER_X - left - originX * CARD_W - (0.5 - originX) * CARD_W * SHRUNK,
    hiddenY: CENTER_Y - top - CARD_H / 2,
    turn: isRight ? -RIGHT_TURN : LEFT_TURN,
    tilt: 0,
    inDelay: order * 0.16,
    outDelay: (slots.length - 1 - order) * 0.07,
  };

  return (
    <motion.div
      className="absolute z-30"
      style={{ left, top, width: CARD_W, height: CARD_H, originX, originY: 0.5 }}
      variants={variants}
      custom={custom}
      initial={reduce ? 'show' : 'hidden'}
      animate={open ? 'show' : 'hidden'}
    >
      <motion.div
        className="h-full w-full"
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 4 + order * 0.7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Page />
      </motion.div>
    </motion.div>
  );
}

function Callout({ index }) {
  const { t } = useTranslation();

  return (
    <>
      <span
        className="absolute left-full z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.18)]"
        style={{ top: TOOLTIP_TOP }}
      />
      <div
        className="pointer-events-none absolute left-full z-20 flex -translate-y-1/2 items-center"
        style={{ top: TOOLTIP_TOP }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            className="flex items-center"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <span className="h-px w-7 bg-white/35" />
            <p className="w-[148px] rounded-lg border border-white/15 bg-white/[0.07] px-3 py-2 text-[12px] leading-snug text-white">
              {t(callouts[index])}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function useFitScale(ref) {
  const [scale, setScale] = useState(0.8);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      if (!width || !height) return;
      setScale(Math.min(1, width / STAGE_W, height / STAGE_H));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return scale;
}

function AuthVisual() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(0);
  const wrapRef = useRef(null);
  const scale = useFitScale(wrapRef);
  const variants = pageVariants(reduce);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % screens.length);
    }, SCREEN_DURATION);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (reduce) {
      setOpen(true);
      return undefined;
    }

    let timer;
    const openPhase = () => {
      setOpen(true);
      timer = setTimeout(closePhase, OPEN_MS);
    };
    const closePhase = () => {
      setOpen(false);
      timer = setTimeout(() => {
        setGroup((prev) => (prev + 1) % pageSets.length);
        openPhase();
      }, CLOSED_MS);
    };
    timer = setTimeout(openPhase, 500);
    return () => clearTimeout(timer);
  }, [reduce]);

  return (
    <div ref={wrapRef} className="relative min-h-[420px] flex-1">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          perspective: 1800,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <motion.div
          className="absolute z-10"
          style={{ left: PHONE_LEFT, top: PHONE_TOP, width: PHONE_W, height: PHONE_H }}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: [0, -6, 0], scale: 1 }}
          transition={{
            opacity: { duration: 0.5 },
            scale: { duration: 0.5 },
            y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
          }}
        >
          <motion.div
            className="absolute inset-0 -z-10 rounded-[3rem] bg-white/[0.08] blur-2xl"
            animate={reduce ? undefined : { opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative h-full w-full rounded-[3rem] border-[3px] border-[#48484f] bg-gradient-to-b from-[#2c2c31] to-[#19191c] p-[3px] shadow-2xl">
            <span className="absolute -left-[3px] top-[68px] h-4 w-[3px] rounded-l-sm bg-[#5a5a62]" />
            <span className="absolute -left-[3px] top-[92px] h-9 w-[3px] rounded-l-sm bg-[#5a5a62]" />
            <span className="absolute -left-[3px] top-[132px] h-9 w-[3px] rounded-l-sm bg-[#5a5a62]" />
            <span className="absolute -right-[3px] top-[100px] h-12 w-[3px] rounded-r-sm bg-[#5a5a62]" />

            <div className="relative h-full w-full overflow-hidden rounded-[2.7rem] border border-black/60 bg-black">
              <div className="absolute left-1/2 top-2 z-30 flex h-[18px] w-[64px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
              </div>

              <div className="relative z-0 h-full w-full overflow-hidden rounded-[2.4rem]">
                <PhoneScreen index={index} />
              </div>
            </div>
          </div>

          <Callout index={index} />
        </motion.div>

        {pageSets[group].map((Page, order) => (
          <FlyingPage
            key={`${group}-${order}`}
            slot={slots[order]}
            Page={Page}
            order={order}
            open={open}
            reduce={reduce}
            variants={variants}
          />
        ))}
      </div>
    </div>
  );
}

export default AuthVisual;
