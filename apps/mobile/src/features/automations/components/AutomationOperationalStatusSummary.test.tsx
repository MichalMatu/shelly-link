import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { AutomationOperationalStatusSummary } from './AutomationOperationalStatusSummary.js';

const renderSummary = (compact = false) => {
  render(
    <I18nProvider>
      <AutomationOperationalStatusSummary
        ariaLabel="Operational status"
        requestedOutput="ON"
        finalOutput="OFF"
        reason="Sensor stale"
        leadingRows={[{ id: 'status', label: 'Status', value: 'Current' }]}
        detailRows={[{ id: 'phase', label: 'Phase', value: 'ON' }]}
        extendedRows={[{ id: 'fault', label: 'Automation fault', value: 'None' }]}
        compact={compact}
      />
    </I18nProvider>
  );
  return screen.getByLabelText('Operational status');
};

describe('AutomationOperationalStatusSummary', () => {
  beforeEach(() => setLocalePreference('en'));
  afterEach(() => setLocalePreference('system'));

  it('keeps requested output, final relay and reason in one shared status language', () => {
    const summary = renderSummary();
    expect(within(summary).getByText('Automation output')).toBeInTheDocument();
    expect(within(summary).getByText('Actual relay')).toBeInTheDocument();
    expect(within(summary).getByText('Automation reason')).toBeInTheDocument();
    expect(summary).toHaveTextContent('StatusCurrent');
    expect(summary).toHaveTextContent('PhaseON');
    expect(summary).toHaveTextContent('Automation faultNone');
  });

  it('keeps compact status focused on the primary operational rows', () => {
    const summary = renderSummary(true);
    expect(summary).toHaveTextContent('Automation outputON');
    expect(summary).toHaveTextContent('Actual relayOFF');
    expect(summary).toHaveTextContent('Automation reasonSensor stale');
    expect(summary).not.toHaveTextContent('Automation fault');
  });
});
