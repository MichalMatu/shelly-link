import type { ReactNode } from 'react';

export type SegmentedControlOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  title?: string;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string = string> = {
  value: T;
  options: readonly SegmentedControlOption<T>[];
  ariaLabel: string;
  className?: string;
  itemClassName?: string;
  onChange(value: T): void;
};

const withSharedClass = (localClassName: string | undefined, sharedClassName: string) =>
  [localClassName, sharedClassName].filter(Boolean).join(' ');

export const SegmentedControl = <T extends string>({
  value,
  options,
  ariaLabel,
  className,
  itemClassName,
  onChange
}: SegmentedControlProps<T>) => (
  <div
    className={withSharedClass(className, 'lcl-segmented-control')}
    role="tablist"
    aria-label={ariaLabel}
  >
    {options.map((option) => (
      <button
        key={option.value}
        className={withSharedClass(itemClassName, 'lcl-segmented-control__item')}
        type="button"
        role="tab"
        aria-selected={value === option.value}
        disabled={option.disabled}
        title={option.title}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);
