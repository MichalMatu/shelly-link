import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { TimeOperationalStatusSummary } from './TimeOperationalStatusSummary.js';

const config = { relayId: 0, onTime: '08:00', offTime: '20:00' };

const renderSummary = (props: {
  localTime: string | null;
  relayOn: boolean | null;
  state: 'loading' | 'offline' | 'attention' | 'running' | 'paused';
}) => {
  render(
    <I18nProvider>
      <TimeOperationalStatusSummary config={config} {...props} />
    </I18nProvider>
  );
  return screen.getByLabelText('Current state');
};

describe('TimeOperationalStatusSummary', () => {
  beforeEach(() => setLocalePreference('en'));
  afterEach(() => setLocalePreference('system'));

  it('derives AUTO requested output from the Shelly clock and existing schedule domain helper', () => {
    const summary = renderSummary({
      localTime: '12:30',
      relayOn: false,
      state: 'running'
    });
    expect(
      within(summary).getByText('Automation output').nextElementSibling
    ).toHaveTextContent('ON');
    expect(
      within(summary).getByText('Actual relay').nextElementSibling
    ).toHaveTextContent('OFF');
    expect(summary).toHaveTextContent('Automation reasonSchedule');
  });

  it('does not invent an automation request while the native schedule is paused', () => {
    const summary = renderSummary({ localTime: '12:30', relayOn: true, state: 'paused' });
    expect(
      within(summary).getByText('Automation output').nextElementSibling
    ).toHaveTextContent('—');
    expect(summary).toHaveTextContent('Actual relayON');
    expect(summary).toHaveTextContent('Automation reasonManual control');
  });
});
