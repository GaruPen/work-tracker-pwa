import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIndexedDB } from './services/db';
import { calculateShiftSalary, toDateKey } from './utils/salary';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import BottomNav from './components/BottomNav';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [shifts, setShifts, shiftsLoaded] = useIndexedDB('shifts', []);
  const [activeShift, setActiveShift, shiftLoaded] = useIndexedDB('activeShift', null);
  const [elapsed, setElapsed] = useState(0);

  const [salaryMode, setSalaryMode, salaryModeLoaded] = useIndexedDB('salaryMode', 'monthly');
  const [monthlySalary, setMonthlySalary, monthlyLoaded] = useIndexedDB('monthlySalary', '8000');
  const [hourlyRate, setHourlyRate, hourlyLoaded] = useIndexedDB('salaryHourlyRate', '45');
  const [workWeek, setWorkWeek, workWeekLoaded] = useIndexedDB('workWeek', [1, 2, 3, 4, 5]);
  const [dailyWorkHours, setDailyWorkHours, hoursLoaded] = useIndexedDB('dailyWorkHours', '8');
  const [payDay, setPayDay, payDayLoaded] = useIndexedDB('payDay', '15');
  const [payMonthOffset, setPayMonthOffset, payOffsetLoaded] = useIndexedDB('payMonthOffset', 'previous');
  const [overtimeRate, setOvertimeRate, overtimeLoaded] = useIndexedDB('overtimeRate', '1.5');
  const [weekendRate, setWeekendRate, weekendLoaded] = useIndexedDB('weekendRate', '2');
  const [holidayRate, setHolidayRate, holidayLoaded] = useIndexedDB('holidayRate', '3');

  const settings = {
    salaryMode,
    monthlySalary,
    hourlyRate,
    workWeek,
    dailyWorkHours,
    payDay,
    payMonthOffset,
    overtimeRate,
    weekendRate,
    holidayRate,
    leavePayRate: 1,
    sickPayRate: 0.8,
  };

  const setters = {
    setSalaryMode,
    setMonthlySalary,
    setHourlyRate,
    setWorkWeek,
    setDailyWorkHours,
    setPayDay,
    setPayMonthOffset,
    setOvertimeRate,
    setWeekendRate,
    setHolidayRate,
  };

  const isAppReady = [
    shiftsLoaded,
    shiftLoaded,
    salaryModeLoaded,
    monthlyLoaded,
    hourlyLoaded,
    workWeekLoaded,
    hoursLoaded,
    payDayLoaded,
    payOffsetLoaded,
    overtimeLoaded,
    weekendLoaded,
    holidayLoaded,
  ].every(Boolean);

  useEffect(() => {
    let interval;
    if (activeShift) {
      const calculateElapsed = () => {
        const now = Date.now();
        let pauseTime = activeShift.totalPauseTime || 0;
        if (activeShift.isPaused && activeShift.pauseStartTime) {
          pauseTime += now - activeShift.pauseStartTime;
        }
        setElapsed(Math.max(0, now - activeShift.startTime - pauseTime));
      };
      calculateElapsed();
      interval = window.setInterval(calculateElapsed, 1000);
    } else {
      setElapsed(0);
    }
    return () => window.clearInterval(interval);
  }, [activeShift]);

  const startShift = () => {
    setActiveShift({
      startTime: Date.now(),
      isPaused: false,
      totalPauseTime: 0,
      pauseStartTime: null,
    });
  };

  const togglePause = () => {
    if (!activeShift) return;
    const now = Date.now();
    if (activeShift.isPaused) {
      setActiveShift({
        ...activeShift,
        isPaused: false,
        totalPauseTime: (activeShift.totalPauseTime || 0) + (now - activeShift.pauseStartTime),
        pauseStartTime: null,
      });
    } else {
      setActiveShift({ ...activeShift, isPaused: true, pauseStartTime: now });
    }
  };

  const stopShift = () => {
    if (!activeShift) return;
    const endTime = Date.now();
    let pauseMs = activeShift.totalPauseTime || 0;
    if (activeShift.isPaused && activeShift.pauseStartTime) pauseMs += endTime - activeShift.pauseStartTime;
    const durationMs = Math.max(0, endTime - activeShift.startTime - pauseMs);
    const { earned } = calculateShiftSalary({ durationMs, shiftStart: activeShift.startTime, shiftType: 'work', settings });

    const newShift = {
      id: Date.now(),
      dateKey: toDateKey(activeShift.startTime),
      startTime: activeShift.startTime,
      endTime,
      durationMs,
      pauseMs,
      earned,
      shiftType: 'work',
      note: '',
      source: 'timer',
    };

    setShifts([newShift, ...shifts]);
    setActiveShift(null);
  };

  if (!isAppReady) {
    return (
      <div className="h-[100dvh] w-full bg-[#030303] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#030303] text-gray-100 flex flex-col font-sans overflow-hidden pt-[max(1rem,env(safe-area-inset-top))]">
      <main className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/[0.02] via-[#030303] to-[#030303]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="h-full w-full absolute inset-0"
          >
            {activeTab === 'dashboard' && (
              <Dashboard
                activeShift={activeShift}
                startShift={startShift}
                stopShift={stopShift}
                togglePause={togglePause}
                elapsed={elapsed}
                shifts={shifts}
                settings={settings}
              />
            )}
            {activeTab === 'calendar' && <Calendar shifts={shifts} setShifts={setShifts} settings={settings} />}
            {activeTab === 'settings' && (
              <Settings settings={settings} setters={setters} shifts={shifts} setShifts={setShifts} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
