import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Trash2, X } from 'lucide-react';
import { calculateShiftSalary, formatCurrency, getMonthSummary, getShiftDateKey, toDateKey } from '../utils/salary';

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const STATUS_OPTIONS = [
  { value: 'work', label: '上班', badge: '班', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' },
  { value: 'holiday', label: '节假日上班', badge: '节', className: 'bg-orange-500/15 text-orange-300 border-orange-500/20' },
  { value: 'rest', label: '休息', badge: '休', className: 'bg-zinc-500/10 text-zinc-500 border-zinc-700' },
  { value: 'leave', label: '请假', badge: '假', className: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
  { value: 'sick', label: '病假', badge: '病', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20' },
  { value: 'absent', label: '缺勤', badge: '缺', className: 'bg-red-500/15 text-red-300 border-red-500/20' },
];

const statusMeta = (type) => STATUS_OPTIONS.find((item) => item.value === type) || STATUS_OPTIONS[0];
const pad2 = (value) => String(value).padStart(2, '0');
const timeString = (timestamp, fallback) => {
  if (!timestamp) return fallback;
  const date = new Date(timestamp);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};
const makeTimestamp = (dateKey, time) => new Date(`${dateKey}T${time}:00`).getTime();

export default function Calendar({ shifts, setShifts, settings }) {
  const today = new Date();
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [form, setForm] = useState(null);

  const shiftsByDate = useMemo(() => {
    const map = new Map();
    shifts.forEach((shift) => {
      const key = getShiftDateKey(shift);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(shift);
    });
    return map;
  }, [shifts]);

  const summary = getMonthSummary(shifts, monthDate, settings);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((leading + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - leading + 1;
    return day >= 1 && day <= daysInMonth ? new Date(year, month, day) : null;
  });

  const openDay = (date) => {
    const key = toDateKey(date);
    const record = (shiftsByDate.get(key) || [])[0];
    setSelectedDateKey(key);
    setForm({
      status: record?.shiftType || (record?.isHoliday ? 'holiday' : (record ? 'work' : (settings.workWeek?.includes(date.getDay()) ? 'work' : 'rest'))),
      start: timeString(record?.startTime, '09:00'),
      end: timeString(record?.endTime, '18:00'),
      breakMinutes: String(Math.round((record?.pauseMs || 3600000) / 60000)),
      note: record?.note || '',
    });
  };

  const closeEditor = () => {
    setSelectedDateKey(null);
    setForm(null);
  };

  const saveDay = () => {
    if (!selectedDateKey || !form) return;
    const status = form.status;
    const isTimed = status === 'work' || status === 'holiday';
    let startTime = new Date(`${selectedDateKey}T12:00:00`).getTime();
    let endTime = startTime;
    let pauseMs = 0;
    let durationMs = 0;

    if (isTimed) {
      startTime = makeTimestamp(selectedDateKey, form.start);
      endTime = makeTimestamp(selectedDateKey, form.end);
      if (endTime <= startTime) endTime += 86400000;
      pauseMs = Math.max(0, Number.parseFloat(form.breakMinutes || '0') || 0) * 60000;
      durationMs = Math.max(0, endTime - startTime - pauseMs);
    }

    const { earned } = calculateShiftSalary({ durationMs, shiftStart: startTime, shiftType: status, isHoliday: status === 'holiday', settings });
    const existing = (shiftsByDate.get(selectedDateKey) || [])[0];
    const record = {
      id: existing?.id || Date.now(),
      dateKey: selectedDateKey,
      startTime,
      endTime,
      durationMs,
      pauseMs,
      earned,
      shiftType: status,
      isHoliday: status === 'holiday',
      note: form.note.trim(),
      source: 'calendar',
    };
    const remaining = shifts.filter((item) => getShiftDateKey(item) !== selectedDateKey);
    setShifts([record, ...remaining].sort((a, b) => Number(b.startTime || b.id) - Number(a.startTime || a.id)));
    closeEditor();
  };

  const deleteDay = () => {
    setShifts(shifts.filter((item) => getShiftDateKey(item) !== selectedDateKey));
    closeEditor();
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-3 sm:px-6 pb-32">
      <div className="max-w-2xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-4 px-1">
          <button onClick={() => setMonthDate(new Date(year, month - 1, 1))} className="p-2.5 rounded-xl bg-zinc-900 border border-white/[0.05] text-zinc-400"><ChevronLeft size={20} /></button>
          <div className="text-center"><h1 className="text-xl text-white font-medium">{year}年{month + 1}月</h1><div className="text-[11px] text-zinc-600 mt-1">点击日期补打卡或修改状态</div></div>
          <button onClick={() => setMonthDate(new Date(year, month + 1, 1))} className="p-2.5 rounded-xl bg-zinc-900 border border-white/[0.05] text-zinc-400"><ChevronRight size={20} /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Summary label="已上班" value={`${summary.workedDays} 天`} />
          <Summary label="工时" value={`${summary.totalHours.toFixed(1)} h`} />
          <Summary label="已赚" value={formatCurrency(summary.earned)} small />
        </div>

        <div className="rounded-[1.75rem] bg-zinc-900/45 border border-white/[0.05] p-2 sm:p-3">
          <div className="grid grid-cols-7 mb-1">{DAY_LABELS.map((day) => <div key={day} className="text-center text-[10px] text-zinc-600 py-2">{day}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="aspect-[0.78]" />;
              const key = toDateKey(date);
              const records = shiftsByDate.get(key) || [];
              const type = records[0]?.shiftType || (records[0]?.isHoliday ? 'holiday' : null);
              const meta = type ? statusMeta(type) : null;
              const isToday = key === toDateKey(today);
              const dayEarned = records.reduce((sum, item) => sum + calculateShiftSalary({ durationMs: item.durationMs || 0, shiftStart: item.startTime, shiftType: item.shiftType || 'work', isHoliday: item.isHoliday, settings }).earned, 0);
              return (
                <button key={key} onClick={() => openDay(date)} className={`aspect-[0.78] min-h-[58px] rounded-xl border p-1 flex flex-col items-center justify-between ${isToday ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/[0.04] bg-black/25'}`}>
                  <span className={`text-xs ${isToday ? 'text-indigo-300 font-semibold' : 'text-zinc-300'}`}>{date.getDate()}</span>
                  {meta ? <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${meta.className}`}>{meta.badge}</span> : <span className="w-6 h-6" />}
                  <span className="text-[8px] text-zinc-600 truncate w-full text-center">{dayEarned > 0 ? `¥${Math.round(dayEarned)}` : ' '}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDateKey && form && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
          <div className="w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto no-scrollbar rounded-t-[2rem] sm:rounded-[2rem] border border-white/10 bg-[#101012] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-5"><div><div className="text-lg text-white font-medium">{selectedDateKey.replaceAll('-', ' / ')}</div><div className="text-xs text-zinc-600 mt-1">当天只保留一条汇总记录</div></div><button onClick={closeEditor} className="p-2 rounded-full bg-zinc-900 text-zinc-500"><X size={18} /></button></div>
            <div className="grid grid-cols-3 gap-2 mb-5">{STATUS_OPTIONS.map((item) => <button key={item.value} onClick={() => setForm({ ...form, status: item.value })} className={`py-3 rounded-xl border text-xs ${form.status === item.value ? item.className : 'border-white/[0.05] bg-zinc-950 text-zinc-500'}`}>{item.label}</button>)}</div>
            {(form.status === 'work' || form.status === 'holiday') && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Field label="上班时间"><input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="w-full rounded-xl bg-zinc-950 border border-white/[0.05] px-3 py-3 text-white text-sm outline-none" /></Field>
                <Field label="下班时间"><input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="w-full rounded-xl bg-zinc-950 border border-white/[0.05] px-3 py-3 text-white text-sm outline-none" /></Field>
                <Field label="休息分钟"><input type="number" min="0" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })} className="w-full rounded-xl bg-zinc-950 border border-white/[0.05] px-3 py-3 text-white text-sm outline-none" /></Field>
                <div className="rounded-2xl bg-zinc-950 border border-white/[0.05] p-3 flex items-center gap-2 text-zinc-500 text-xs"><Clock3 size={16} /> 跨午夜自动处理</div>
              </div>
            )}
            <Field label="备注"><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows="2" className="w-full rounded-xl bg-zinc-950 border border-white/[0.05] px-3 py-3 text-white text-sm outline-none resize-none" /></Field>
            <div className="grid grid-cols-[1fr_3fr] gap-3 mt-5"><button onClick={deleteDay} className="py-3.5 rounded-2xl border border-red-500/15 bg-red-500/10 text-red-400 flex items-center justify-center"><Trash2 size={18} /></button><button onClick={saveDay} className="py-3.5 rounded-2xl bg-white text-black font-semibold">保存当天记录</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, small = false }) {
  return <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.05] px-3 py-3 text-center"><div className={`${small ? 'text-sm' : 'text-lg'} text-white font-medium truncate`}>{value}</div><div className="text-[9px] text-zinc-600 mt-1">{label}</div></div>;
}
function Field({ label, children }) {
  return <label className="block"><span className="block text-[10px] text-zinc-600 mb-2 ml-1">{label}</span>{children}</label>;
}
