import type { ReactNode } from 'react';
import './AutomationDetailLayout.css';

type AutomationDetailHierarchyProps = {
  children: ReactNode;
};

export const AutomationDetailHierarchy = ({
  children
}: AutomationDetailHierarchyProps) => (
  <div className="installation-detail-hierarchy">{children}</div>
);

type AutomationDetailSectionProps = {
  title: ReactNode;
  children: ReactNode;
};

export const AutomationDetailSection = ({
  title,
  children
}: AutomationDetailSectionProps) => (
  <section className="installation-detail-hierarchy__section">
    <h3 className="installation-detail-hierarchy__title">{title}</h3>
    {children}
  </section>
);
