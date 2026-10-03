import type { ReactNode } from 'react';

export type AutomationDashboardConfigurationItem = {
  id: string;
  label: string;
  value: string;
};

type AutomationDashboardBodyProps = {
  ariaLabel: string;
  status: ReactNode;
  configuration: readonly AutomationDashboardConfigurationItem[];
  controls: ReactNode;
};

export const AutomationDashboardBody = ({
  ariaLabel,
  status,
  configuration,
  controls
}: AutomationDashboardBodyProps) => (
  <section className="automation-card__status-first-body" aria-label={ariaLabel}>
    <div className="automation-card__live-status">{status}</div>
    <div className="automation-card__configuration">
      <dl className="automation-card__configuration-values">
        {configuration.map((item) => (
          <div key={item.id}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="automation-card__configuration-control">{controls}</div>
    </div>
  </section>
);
