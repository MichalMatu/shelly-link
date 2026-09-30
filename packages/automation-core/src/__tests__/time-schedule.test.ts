import { describe, expect, it } from 'vitest';
import {
  dailyScheduleTimespec,
  expectedRelayOnForClockTime,
  isClockTimeInDailyWindow,
  parseClockMinutes
} from '../time/schedule.js';

describe('daily time automation domain', () => {
  it('builds a Shelly six-field daily cron without leading zeroes', () => {
    expect(dailyScheduleTimespec('08:03')).toBe('0 3 8 * * SUN,MON,TUE,WED,THU,FRI,SAT');
  });

  it('evaluates same-day and overnight ON windows', () => {
    expect(
      expectedRelayOnForClockTime(
        { relayId: 0, onTime: '08:00', offTime: '20:00' },
        '12:30'
      )
    ).toBe(true);
    expect(
      expectedRelayOnForClockTime(
        { relayId: 0, onTime: '20:00', offTime: '08:00' },
        '23:15'
      )
    ).toBe(true);
    expect(
      expectedRelayOnForClockTime(
        { relayId: 0, onTime: '20:00', offTime: '08:00' },
        '12:00'
      )
    ).toBe(false);
  });

  it('evaluates a reusable same-day window as start-inclusive and end-exclusive', () => {
    const window = { startTime: '08:00', endTime: '20:00' };

    expect(isClockTimeInDailyWindow(window, '07:59')).toBe(false);
    expect(isClockTimeInDailyWindow(window, '08:00')).toBe(true);
    expect(isClockTimeInDailyWindow(window, '19:59')).toBe(true);
    expect(isClockTimeInDailyWindow(window, '20:00')).toBe(false);
  });

  it('evaluates a reusable overnight window across midnight', () => {
    const window = { startTime: '20:00', endTime: '08:00' };

    expect(isClockTimeInDailyWindow(window, '19:59')).toBe(false);
    expect(isClockTimeInDailyWindow(window, '20:00')).toBe(true);
    expect(isClockTimeInDailyWindow(window, '23:59')).toBe(true);
    expect(isClockTimeInDailyWindow(window, '00:00')).toBe(true);
    expect(isClockTimeInDailyWindow(window, '07:59')).toBe(true);
    expect(isClockTimeInDailyWindow(window, '08:00')).toBe(false);
  });

  it('rejects malformed clock text at the pure domain boundary', () => {
    expect(parseClockMinutes('24:00')).toBeNull();
    expect(() => dailyScheduleTimespec('bad')).toThrow('Invalid clock time');
  });

  it('rejects invalid or ambiguous reusable windows', () => {
    expect(() =>
      isClockTimeInDailyWindow({ startTime: 'bad', endTime: '20:00' }, '12:00')
    ).toThrow('Cannot evaluate the daily time window.');
    expect(() =>
      isClockTimeInDailyWindow({ startTime: '08:00', endTime: 'bad' }, '12:00')
    ).toThrow('Cannot evaluate the daily time window.');
    expect(() =>
      isClockTimeInDailyWindow({ startTime: '08:00', endTime: '20:00' }, 'bad')
    ).toThrow('Cannot evaluate the daily time window.');
    expect(() =>
      isClockTimeInDailyWindow({ startTime: '08:00', endTime: '20:00' }, '12:00:00')
    ).toThrow('Cannot evaluate the daily time window.');
    expect(() =>
      isClockTimeInDailyWindow({ startTime: '08:00', endTime: '08:00' }, '12:00')
    ).toThrow('Cannot evaluate the daily time window.');
  });

  it('rejects invalid or ambiguous clocks when evaluating relay state', () => {
    expect(() =>
      expectedRelayOnForClockTime(
        { relayId: 0, onTime: '08:00', offTime: '20:00' },
        'bad'
      )
    ).toThrow('Cannot evaluate the daily schedule clock state.');
    expect(() =>
      expectedRelayOnForClockTime(
        { relayId: 0, onTime: 'bad', offTime: '20:00' },
        '12:00'
      )
    ).toThrow('Cannot evaluate the daily schedule clock state.');
    expect(() =>
      expectedRelayOnForClockTime(
        { relayId: 0, onTime: '08:00', offTime: 'bad' },
        '12:00'
      )
    ).toThrow('Cannot evaluate the daily schedule clock state.');
    expect(() =>
      expectedRelayOnForClockTime(
        { relayId: 0, onTime: '08:00', offTime: '08:00' },
        '12:00'
      )
    ).toThrow('Cannot evaluate the daily schedule clock state.');
  });

  it('keeps overnight schedules ON before the morning OFF boundary', () => {
    expect(
      expectedRelayOnForClockTime(
        { relayId: 0, onTime: '20:00', offTime: '08:00' },
        '06:30'
      )
    ).toBe(true);
    expect(
      expectedRelayOnForClockTime(
        { relayId: 0, onTime: '08:00', offTime: '20:00' },
        '07:30'
      )
    ).toBe(false);
    expect(
      expectedRelayOnForClockTime(
        { relayId: 0, onTime: '08:00', offTime: '20:00' },
        '21:00'
      )
    ).toBe(false);
  });
});
