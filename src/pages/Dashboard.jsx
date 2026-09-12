import React from 'react';
import { CalendarClock, Coffee, Pause, Play, Square, WalletCards } from 'lucide-react';
import { calculateShiftSalary, formatCurrency, getDaysUntilPayday, getMonthSummary, getNextPayDate } from '../utils/salary';

const formatDuration = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const formatPayDate = (date) => `${date.getMonth() + 1}月${date.getDate()}日`;

export default function Dashboard({ activeShift, startShift, stopShift, togglePause, elapsed, shifts, settings }) {
  const now = new Date();
  const summary = getMonthSummary(shifts, now, settings);
  const activeEarned = activeShift
    ? calculateShiftSalary({ durationMs: elapsed, shiftStart: activeShift.startTime, shiftType: 'work', settings }).earned
    : 0;
  const payday = getNextPayDate(settings.payDay, now);
  const daysUntilPayday = getDaysUntilPayday(settings.payDay, now);
  const progressPercent = Math.round(summary.progress * 100);
  const salaryPeriod = settings.payMonthOffset === 'previous' ? '发放上月工资' : '发放本月工资';

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 pb-32">
      <div className="max-w-2xl mx-auto pt-4 space-y-4">
        <div className="flex items-end justify-between px-1">
          <div>
            <div className="text-zinc-500 text-xs tracking-widest mb-1">工资打卡日历</div>
            <h1 className="text-2xl font-light text-white">{now.getMonth() + 1}月工作进度</h1>
          </div>
          <div className="text-right text-xs text-zinc-500">
            {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日
          </div>
        </div>

        <section className="rounded-[2rem] border border-white/[0.06] bg-zinc-900/60 p-5 overflow-hidden relative">
          <div className="absolute -top-16 -right-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2"><WalletCards size={15} /> 本月已赚</div>
            <div className="text-4xl sm:text-5xl font-light tracking-tight text-white">{formatCurrency(summary.earned + activeEarned)}</div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Stat label="已上班" value={`${summary.workedDays} 天`} />
              <Stat label="累计工时" value={`${summary.totalHours.toFixed(1)} h`} />
              <Stat label="剩余工作日" value={`${summary.remainingWorkDays} 天`} />
            </div>
            <div className="mt-5">
              <div className="flex justify-between text-[11px] text-zinc-500 mb-2">
                <span>本月进度</span><span>{summary.workedDays + summary.paidLeaveDays} / {summary.targetWorkDays} 天 · {progressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-950 overflow-hidden border border-white/[0.04]">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.5rem] border border-white/[0.06] bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-3"><CalendarClock size={16} /> 下次发薪</div>
            <div className="text-xl text-white font-medium">{formatPayDate(payday)}</div>
            <div className="text-sm text-indigo-300 mt-1">还有 {daysUntilPayday} 天</div>
            <div className="text-[10px] text-zinc-600 mt-2">{salaryPeriod}</div>
          </div>
          <div className="rounded-[1.5rem] border border-white/[0.06] bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-3"><Coffee size={16} /> 计薪方式</div>
            <div className="text-xl text-white font-medium">{settings.salaryMode === 'monthly' ? '月薪' : '时薪'}</div>
            <div className="text-sm text-zinc-400 mt-1">
              {settings.salaryMode === 'monthly' ? formatCurrency(settings.monthlySalary) : `${formatCurrency(settings.hourlyRate)} / 小时`}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/[0.06] bg-[#0b0b0d] p-5 text-center">
          <div className="text-[11px] tracking-[0.25em] text-zinc-600 mb-3">今日实时打卡</div>
          <div className="font-mono text-4xl sm:text-5xl text-white tracking-tight">{formatDuration(elapsed)}</div>
          {activeShift && <div className="text-emerald-400 mt-2 text-sm">当前累计 {formatCurrency(activeEarned)}</div>}

          {!activeShift ? (
            <button onClick={startShift} className="mt-6 w-full py-4 rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
              <Play size={19} fill="currentColor" /> 开始上班
            </button>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={togglePause} className="py-4 rounded-2xl bg-zinc-800 text-white font-medium flex items-center justify-center gap-2 border border-white/[0.06]">
                {activeShift.isPaused ? <Play size={18} /> : <Pause size={18} />}
                {activeShift.isPaused ? '继续' : '暂停'}
              </button>
              <button onClick={stopShift} className="py-4 rounded-2xl bg-red-500/15 text-red-300 font-medium flex items-center justify-center gap-2 border border-red-500/20">
                <Square size={17} fill="currentColor" /> 下班
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-black/30 border border-white/[0.04] p-3 text-center">
      <div className="text-lg font-medium text-zinc-100">{value}</div>
      <div className="text-[10px] text-zinc-600 mt-1">{label}</div>
    </div>
  );
}
