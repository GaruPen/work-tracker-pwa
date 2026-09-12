import React, { useRef } from 'react';
import { CalendarClock, Download, RotateCcw, Trash2, Upload, WalletCards } from 'lucide-react';
import { formatCurrency } from '../utils/salary';

const WEEKDAYS = [
  { value: 1, label: '一' }, { value: 2, label: '二' }, { value: 3, label: '三' },
  { value: 4, label: '四' }, { value: 5, label: '五' }, { value: 6, label: '六' }, { value: 0, label: '日' },
];

export default function Settings({ settings, setters, shifts, setShifts }) {
  const fileInputRef = useRef(null);
  const {
    setSalaryMode, setMonthlySalary, setHourlyRate, setWorkWeek, setDailyWorkHours,
    setPayDay, setPayMonthOffset, setOvertimeRate, setWeekendRate, setHolidayRate,
  } = setters;

  const toggleWorkday = (day) => {
    const current = Array.isArray(settings.workWeek) ? settings.workWeek : [1, 2, 3, 4, 5];
    const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
    setWorkWeek(next.sort((a, b) => a - b));
  };

  const handleExport = () => {
    const payload = { version: 2, app: '工资打卡日历', exportedAt: new Date().toISOString(), settings, shifts };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `工资打卡日历_备份_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const applyImportedSettings = (incoming = {}) => {
    if (incoming.salaryMode) setSalaryMode(incoming.salaryMode);
    if (incoming.monthlySalary !== undefined) setMonthlySalary(String(incoming.monthlySalary));
    if (incoming.hourlyRate !== undefined) setHourlyRate(String(incoming.hourlyRate));
    if (Array.isArray(incoming.workWeek)) setWorkWeek(incoming.workWeek);
    if (incoming.dailyWorkHours !== undefined) setDailyWorkHours(String(incoming.dailyWorkHours));
    if (incoming.payDay !== undefined) setPayDay(String(incoming.payDay));
    if (incoming.payMonthOffset) setPayMonthOffset(incoming.payMonthOffset);
    if (incoming.overtimeRate !== undefined) setOvertimeRate(String(incoming.overtimeRate));
    if (incoming.weekendRate !== undefined) setWeekendRate(String(incoming.weekendRate));
    if (incoming.holidayRate !== undefined) setHolidayRate(String(incoming.holidayRate));
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const importedShifts = Array.isArray(parsed) ? parsed : parsed.shifts;
        if (!Array.isArray(importedShifts)) throw new Error('invalid');

        if (parsed.settings) {
          applyImportedSettings(parsed.settings);
        } else if (parsed && !Array.isArray(parsed)) {
          applyImportedSettings({
            salaryMode: parsed.contractType === 'zlecenie' ? 'hourly' : 'monthly',
            monthlySalary: parsed.monthlyRate,
            hourlyRate: parsed.hourlyRate,
          });
        }

        const shouldMerge = shifts.length > 0 && window.confirm('检测到现有记录。点“确定”合并数据，点“取消”则覆盖现有记录。');
        if (shouldMerge) {
          const merged = [...shifts, ...importedShifts].reduce((acc, item) => {
            if (!acc.some((existing) => existing.id === item.id)) acc.push(item);
            return acc;
          }, []);
          setShifts(merged.sort((a, b) => Number(b.startTime || b.id) - Number(a.startTime || a.id)));
        } else {
          setShifts([...importedShifts].sort((a, b) => Number(b.startTime || b.id) - Number(a.startTime || a.id)));
        }
        window.alert('导入完成');
      } catch (error) {
        console.error(error);
        window.alert('备份文件无法识别');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const clearRecords = () => {
    if (!shifts.length) return;
    if (window.confirm('确定清空全部打卡记录吗？工资设置会保留。')) setShifts([]);
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 pb-32">
      <div className="max-w-2xl mx-auto pt-4 space-y-5">
        <div className="px-1">
          <div className="text-zinc-600 text-xs tracking-widest mb-1">设置</div>
          <h1 className="text-2xl text-white font-light">工资与发薪规则</h1>
        </div>

        <Section icon={WalletCards} title="工资设置">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Toggle active={settings.salaryMode === 'monthly'} onClick={() => setSalaryMode('monthly')}>月薪</Toggle>
            <Toggle active={settings.salaryMode === 'hourly'} onClick={() => setSalaryMode('hourly')}>时薪</Toggle>
          </div>
          {settings.salaryMode === 'monthly' ? (
            <NumberField label="月薪（人民币）" value={settings.monthlySalary} onChange={setMonthlySalary} prefix="¥" />
          ) : (
            <NumberField label="时薪（人民币 / 小时）" value={settings.hourlyRate} onChange={setHourlyRate} prefix="¥" />
          )}
          <div className="text-xs text-zinc-600 mt-3">当前设置：{settings.salaryMode === 'monthly' ? `${formatCurrency(settings.monthlySalary)} / 月` : `${formatCurrency(settings.hourlyRate)} / 小时`}</div>
        </Section>

        <Section icon={CalendarClock} title="工作日与发薪日">
          <label className="block text-[10px] text-zinc-600 mb-2">每周工作日</label>
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {WEEKDAYS.map((day) => <Toggle key={day.value} active={settings.workWeek?.includes(day.value)} onClick={() => toggleWorkday(day.value)} compact>{day.label}</Toggle>)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="每天标准工时" value={settings.dailyWorkHours} onChange={setDailyWorkHours} suffix="小时" />
            <NumberField label="每月发薪日" value={settings.payDay} onChange={setPayDay} suffix="日" min="1" max="31" />
          </div>
          <label className="block text-[10px] text-zinc-600 mt-4 mb-2">发薪日对应工资</label>
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={settings.payMonthOffset === 'previous'} onClick={() => setPayMonthOffset('previous')}>发上月工资</Toggle>
            <Toggle active={settings.payMonthOffset === 'current'} onClick={() => setPayMonthOffset('current')}>发本月工资</Toggle>
          </div>
        </Section>

        <Section icon={RotateCcw} title="加班倍率">
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="工作日加班" value={settings.overtimeRate} onChange={setOvertimeRate} suffix="倍" step="0.1" />
            <NumberField label="休息日" value={settings.weekendRate} onChange={setWeekendRate} suffix="倍" step="0.1" />
            <NumberField label="法定节假日" value={settings.holidayRate} onChange={setHolidayRate} suffix="倍" step="0.1" />
          </div>
          <div className="text-[11px] leading-relaxed text-zinc-600 mt-3">这里只用于个人工资估算，不代替公司工资条、个税或社保核算。</div>
        </Section>

        <section>
          <div className="text-[10px] text-zinc-600 tracking-widest mb-2 ml-2">数据管理</div>
          <div className="rounded-[1.5rem] border border-white/[0.05] bg-zinc-900/50 overflow-hidden">
            <DataButton icon={Download} title="导出完整备份" description="工资设置 + 全部打卡记录" onClick={handleExport} />
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
            <DataButton icon={Upload} title="导入备份" description="兼容本版及原 WorkTracker 备份" onClick={() => fileInputRef.current?.click()} />
            <DataButton icon={Trash2} title="清空打卡记录" description={`当前 ${shifts.length} 条记录`} onClick={clearRecords} danger />
          </div>
        </section>

        <div className="text-center text-[10px] text-zinc-700 pb-4">工资打卡日历 V0.1 · 基于 WorkTracker PWA 改造</div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return <section className="rounded-[1.75rem] border border-white/[0.05] bg-zinc-900/55 p-5"><div className="flex items-center gap-2 text-sm text-zinc-300 mb-4"><Icon size={17} className="text-indigo-400" />{title}</div>{children}</section>;
}

function Toggle({ active, onClick, children, compact = false }) {
  return <button onClick={onClick} className={`${compact ? 'py-2.5 px-1' : 'py-3 px-2'} rounded-xl border text-xs font-medium transition-colors ${active ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-500 border-white/[0.05]'}`}>{children}</button>;
}

function NumberField({ label, value, onChange, prefix, suffix, min = '0', max, step = 'any' }) {
  return <label className="block"><span className="block text-[10px] text-zinc-600 mb-2">{label}</span><div className="flex items-center rounded-xl bg-zinc-950 border border-white/[0.05] px-3 focus-within:border-indigo-500/40">{prefix && <span className="text-zinc-500 text-sm mr-1">{prefix}</span>}<input type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent py-3 text-white text-sm outline-none min-w-0" />{suffix && <span className="text-zinc-600 text-[10px] whitespace-nowrap ml-1">{suffix}</span>}</div></label>;
}

function DataButton({ icon: Icon, title, description, onClick, danger = false }) {
  return <button onClick={onClick} className="w-full flex items-center gap-4 p-4 border-b border-white/[0.04] last:border-b-0 text-left hover:bg-white/[0.02]"><div className={`p-2.5 rounded-xl ${danger ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-300'}`}><Icon size={18} /></div><div><div className={`text-sm ${danger ? 'text-red-300' : 'text-zinc-200'}`}>{title}</div><div className="text-[11px] text-zinc-600 mt-0.5">{description}</div></div></button>;
}
