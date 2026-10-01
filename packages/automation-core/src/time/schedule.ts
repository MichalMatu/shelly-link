import type { PulseCycleConfig } from '../actions/pulseCycle.js';

const DAILY_TIMESPEC_DAYS = 'SUN,MON,TUE,WED,THU,FRI,SAT';
const clockTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type DailyTimeAutomationConfig = {
  relayId: number;
  onTime: string;
  offTime: string;
  pulse?: PulseCycleConfig;
};

export interface DailyTimeWindow {
  startTime: string;
  endTime: string;
}

export const parseClockMinutes = (time: string): number | null => {
  const match = clockTimePattern.exec(time);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
};

export const dailyScheduleTimespec = (time: string): string => {
  const minutes = parseClockMinutes(time);
  if (minutes === null) {
    throw new Error(`Invalid clock time: ${time}.`);
  }
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `0 ${minute} ${hour} * * ${DAILY_TIMESPEC_DAYS}`;
};

const evaluateDailyTimeWindow = (
  window: DailyTimeWindow,
  clockTime: string,
  errorMessage: string
): boolean => {
  const current = parseClockMinutes(clockTime);
  const start = parseClockMinutes(window.startTime);
  const end = parseClockMinutes(window.endTime);
  if (current === null || start === null || end === null || start === end) {
    throw new Error(errorMessage);
  }

  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
};

export const isClockTimeInDailyWindow = (
  window: DailyTimeWindow,
  clockTime: string
): boolean =>
  evaluateDailyTimeWindow(window, clockTime, 'Cannot evaluate the daily time window.');

export const expectedRelayOnForClockTime = (
  config: DailyTimeAutomationConfig,
  localTime: string
): boolean =>
  evaluateDailyTimeWindow(
    { startTime: config.onTime, endTime: config.offTime },
    localTime.slice(0, 5),
    'Cannot evaluate the daily schedule clock state.'
  );
