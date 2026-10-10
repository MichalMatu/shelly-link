import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../app/i18n.js';
import { AutomationHistorySection } from './AutomationHistorySection.js';
import { AutomationScriptDetailSection } from './AutomationScriptDetailSections.js';

describe('automation retry actions', () => {
  it('uses an Ionic retry control for History errors without changing the callback', () => {
    const onRetry = vi.fn();
    const { container } = render(
      <I18nProvider>
        <AutomationHistorySection
          error
          loading={false}
          profile="climate"
          records={[]}
          invalidRecordCount={0}
          onRetry={onRetry}
        />
      </I18nProvider>
    );
    const control = container.querySelector('ion-button');
    expect(control).not.toBeNull();
    expect(control).toHaveAttribute('fill', 'outline');
    fireEvent.click(control!);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('uses an Ionic retry control for Script errors without changing the callback', () => {
    const onRetry = vi.fn();
    const { container } = render(
      <AutomationScriptDetailSection
        attentionTitle="Notice"
        copyAriaLabel="Copy"
        copyLabel="Copy"
        error
        errorTitle="Error"
        loading={false}
        loadingLabel="Loading"
        previewLabel="Preview"
        retryLabel="Retry"
        onCopy={vi.fn()}
        onRetry={onRetry}
      />
    );
    const control = container.querySelector('ion-button');
    expect(control).not.toBeNull();
    expect(control).toHaveTextContent('Retry');
    fireEvent.click(control!);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
