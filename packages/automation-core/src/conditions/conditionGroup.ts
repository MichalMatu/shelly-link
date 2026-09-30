export type ConditionGroupOperator = 'and' | 'or';

export interface ConditionGroup<TCondition> {
  operator: ConditionGroupOperator;
  conditions: readonly TCondition[];
}

export const evaluateConditionGroup = <TCondition>(
  group: ConditionGroup<TCondition>,
  evaluateCondition: (condition: TCondition) => boolean
): boolean => {
  if (group.conditions.length === 0) {
    throw new Error('Cannot evaluate an empty condition group.');
  }

  return group.operator === 'and'
    ? group.conditions.every(evaluateCondition)
    : group.conditions.some(evaluateCondition);
};
