import { evaluateConditionGroup, isClockTimeInDailyWindow } from '../index.js';

type TestCondition =
  | { kind: 'flag'; value: boolean; label: string }
  | {
      kind: 'window';
      startTime: string;
      endTime: string;
      clockTime: string;
      label: string;
    };

const evaluateTestCondition = (condition: TestCondition): boolean =>
  condition.kind === 'flag'
    ? condition.value
    : isClockTimeInDailyWindow(
        { startTime: condition.startTime, endTime: condition.endTime },
        condition.clockTime
      );

describe('evaluateConditionGroup', () => {
  it('requires every condition for AND', () => {
    expect(
      evaluateConditionGroup(
        {
          operator: 'and',
          conditions: [
            { kind: 'flag', value: true, label: 'enabled' },
            {
              kind: 'window',
              startTime: '08:00',
              endTime: '18:00',
              clockTime: '12:30',
              label: 'daytime'
            }
          ] satisfies TestCondition[]
        },
        evaluateTestCondition
      )
    ).toBe(true);
  });

  it('accepts any matching condition for OR', () => {
    expect(
      evaluateConditionGroup(
        {
          operator: 'or',
          conditions: [
            { kind: 'flag', value: false, label: 'disabled' },
            { kind: 'flag', value: true, label: 'override' }
          ] satisfies TestCondition[]
        },
        evaluateTestCondition
      )
    ).toBe(true);
  });

  it('short-circuits AND after the first false condition', () => {
    const visited: string[] = [];
    const result = evaluateConditionGroup(
      {
        operator: 'and',
        conditions: [
          { kind: 'flag', value: true, label: 'first' },
          { kind: 'flag', value: false, label: 'second' },
          { kind: 'flag', value: true, label: 'third' }
        ] satisfies TestCondition[]
      },
      (condition) => {
        visited.push(condition.label);
        return evaluateTestCondition(condition);
      }
    );

    expect(result).toBe(false);
    expect(visited).toEqual(['first', 'second']);
  });

  it('short-circuits OR after the first true condition', () => {
    const visited: string[] = [];
    const result = evaluateConditionGroup(
      {
        operator: 'or',
        conditions: [
          { kind: 'flag', value: false, label: 'first' },
          { kind: 'flag', value: true, label: 'second' },
          { kind: 'flag', value: true, label: 'third' }
        ] satisfies TestCondition[]
      },
      (condition) => {
        visited.push(condition.label);
        return evaluateTestCondition(condition);
      }
    );

    expect(result).toBe(true);
    expect(visited).toEqual(['first', 'second']);
  });

  it('rejects an empty group instead of inventing identity semantics', () => {
    expect(() =>
      evaluateConditionGroup<TestCondition>(
        { operator: 'and', conditions: [] },
        evaluateTestCondition
      )
    ).toThrow('Cannot evaluate an empty condition group.');
  });
});
