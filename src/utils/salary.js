const HOUR_MS = 60 * 60 * 1000;

const numberValue = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const pad2 = (value) => String(value).padStart(2, '0');

export function toDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getShiftDateKey(shift) {
  if (!shift) return '';
  if (shift.dateKey) return shift.dateKey;
  return toDateKey(shift.startTime ?? shift.endTime ?? shift.id);
}

export function getWorkDaysInMonth(dateLike = new Date(), workWeek = [1, 2, 3, 4, 5]) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const selectedDays = new Set(Array.isArray(workWeek) ? workWeek : [1, 2, 3, 4, 5]);
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  let count = 0;

  for (let day = 1; day <= lastDay; day += 1) {
    if (selectedDays.has(new Date(year, month, day).getDay())) count += 1;
  }
  return count;
}

export function getWorkingHoursInMonth(dateLike = new Date(), workWeek = [1, 2, 3, 4, 5], dailyWorkHours = 8) {
  return getWorkDaysInMonth(dateLike, workWeek) * numberValue(dailyWorkHours, 8);
}

export function getBaseHourlyRate(settings = {}, dateLike = new Date()) {
  const {
    salaryMode = 'monthly',
    monthlySalary = 0,
    hourlyRate = 0,
    workWeek = [1, 2, 3, 4, 5],
    dailyWorkHours = 8,
  } = settings;

  if (salaryMode === 'hourly') return numberValue(hourlyRate);
  const standardHours = getWorkingHoursInMonth(dateLike, workWeek, dailyWorkHours);
  return standardHours > 0 ? numberValue(monthlySalary) / standardHours : 0;
}

export function getShiftDurationMs(shift) {
  if (!shift) return 0;
  if (Number.isFinite(Number(shift.durationMs))) return Math.max(0, Number(shift.durationMs));
  if (!shift.startTime || !shift.endTime) return 0;
  return Math.max(0, Number(shift.endTime) - Number(shift.startTime) - Number(shift.pauseMs || 0));
}

export function calculateShiftSalary({ durationMs = 0, shiftStart = Date.now(), shiftType = 'work', isHoliday = false, settings = {} }) {
  const {
    dailyWorkHours = 8,
    workWeek = [1, 2, 3, 4, 5],
    overtimeRate = 1.5,
    weekendRate = 2,
    holidayRate = 3,
    leavePayRate = 1,
    sickPayRate = 0.8,
  } = settings;

  const baseHourly = getBaseHourlyRate(settings, shiftStart);
  const standardDailyHours = Math.max(0, numberValue(dailyWorkHours, 8));
  const type = isHoliday ? 'holiday' : (shiftType || 'work');
  const dayOfWeek = new Date(shiftStart).getDay();
  const isConfiguredWorkday = (Array.isArray(workWeek) ? workWeek : [1, 2, 3, 4, 5]).includes(dayOfWeek);

  if (type === 'rest' || type === 'absent') return { earned: 0, baseHourly, regularHours: 0, overtimeHours: 0 };
  if (type === 'leave') return { earned: standardDailyHours * baseHourly * numberValue(leavePayRate, 1), baseHourly, regularHours: standardDailyHours, overtimeHours: 0 };
  if (type === 'sick') return { earned: standardDailyHours * baseHourly * numberValue(sickPayRate, 0.8), baseHourly, regularHours: standardDailyHours, overtimeHours: 0 };

  const totalHours = Math.max(0, numberValue(durationMs) / HOUR_MS);
  if (type === 'holiday') return { earned: totalHours * baseHourly * numberValue(holidayRate, 3), baseHourly, regularHours: totalHours, overtimeHours: 0 };
  if (!isConfiguredWorkday) return { earned: totalHours * baseHourly * numberValue(weekendRate, 2), baseHourly, regularHours: totalHours, overtimeHours: 0 };

  const regularHours = Math.min(totalHours, standardDailyHours);
  const overtimeHours = Math.max(0, totalHours - standardDailyHours);
  const earned = (regularHours * baseHourly) + (overtimeHours * baseHourly * numberValue(overtimeRate, 1.5));
  return { earned, baseHourly, regularHours, overtimeHours };
}

export function getShiftDetails(options = {}) {
  const legacyMode = options.contractType === 'zlecenie' ? 'hourly' : 'monthly';
  const settings = options.settings || {
    salaryMode: legacyMode,
    hourlyRate: options.hourlyRate,
    monthlySalary: options.monthlyRate,
    dailyWorkHours: 8,
    workWeek: [1, 2, 3, 4, 5],
    overtimeRate: 1.5,
    weekendRate: 2,
    holidayRate: 2,
    leavePayRate: 1,
    sickPayRate: 0.8,
  };
  const details = calculateShiftSalary({ durationMs: options.durationMs, shiftStart: options.shiftStart, shiftType: options.shiftType, isHoliday: options.isHoliday, settings });
  return {
    ...details,
    nettoHour: details.baseHourly,
    isHoliday: Boolean(options.isHoliday || options.shiftType === 'holiday'),
    isWeekend: !settings.workWeek?.includes?.(new Date(options.shiftStart || Date.now()).getDay()),
    isOvertime: details.overtimeHours > 0,
    overtimeMs: details.overtimeHours * HOUR_MS,
    nightMs: 0,
  };
}

export function getMonthSummary(shifts = [], dateLike = new Date(), settings = {}) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const monthPrefix = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
  const monthShifts = shifts.filter((shift) => getShiftDateKey(shift).startsWith(monthPrefix));
  const workedDateKeys = new Set();
  const paidLeaveDateKeys = new Set();
  let totalDurationMs = 0;
  let earned = 0;

  monthShifts.forEach((shift) => {
    const type = shift.shiftType || (shift.isHoliday ? 'holiday' : 'work');
    const durationMs = getShiftDurationMs(shift);
    const shiftStart = shift.startTime || new Date(`${getShiftDateKey(shift)}T12:00:00`).getTime();
    const details = calculateShiftSalary({ durationMs, shiftStart, shiftType: type, isHoliday: shift.isHoliday, settings });
    earned += details.earned;
    if ((type === 'work' || type === 'holiday') && durationMs > 0) {
      workedDateKeys.add(getShiftDateKey(shift));
      totalDurationMs += durationMs;
    } else if (type === 'leave' || type === 'sick') {
      paidLeaveDateKeys.add(getShiftDateKey(shift));
    }
  });

  const targetWorkDays = getWorkDaysInMonth(date, settings.workWeek);
  return {
    monthShifts,
    workedDays: workedDateKeys.size,
    paidLeaveDays: paidLeaveDateKeys.size,
    targetWorkDays,
    remainingWorkDays: Math.max(0, targetWorkDays - workedDateKeys.size - paidLeaveDateKeys.size),
    totalDurationMs,
    totalHours: totalDurationMs / HOUR_MS,
    earned,
    progress: targetWorkDays > 0 ? Math.min(1, (workedDateKeys.size + paidLeaveDateKeys.size) / targetWorkDays) : 0,
  };
}

export function getNextPayDate(payDay = 15, todayLike = new Date()) {
  const today = todayLike instanceof Date ? new Date(todayLike) : new Date(todayLike);
  today.setHours(0, 0, 0, 0);
  const normalizedPayDay = Math.max(1, Math.min(31, Math.trunc(numberValue(payDay, 15))));
  const makePayDate = (year, month) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(normalizedPayDay, lastDay));
  };
  let payDate = makePayDate(today.getFullYear(), today.getMonth());
  if (payDate < today) payDate = makePayDate(today.getFullYear(), today.getMonth() + 1);
  return payDate;
}

export function getDaysUntilPayday(payDay = 15, todayLike = new Date()) {
  const today = todayLike instanceof Date ? new Date(todayLike) : new Date(todayLike);
  today.setHours(0, 0, 0, 0);
  return Math.round((getNextPayDate(payDay, today).getTime() - today.getTime()) / (24 * HOUR_MS));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numberValue(value));
}
