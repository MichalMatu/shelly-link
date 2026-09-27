import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { PlugDetailTop } from './PlugDetailTop.js';

const renderTop = () =>
  render(
    <I18nProvider>
      <PlugDetailTop
        plug={{ name: 'Test plug', model: 'S3PL-00112EU' }}
        transport="bluetooth"
        tabs={['info', vi.fn()]}
      />
    </I18nProvider>
  );

describe('PlugDetailTop', () => {
  beforeEach(() => setLocalePreference('en'));
  afterEach(() => setLocalePreference('system'));

  it('keeps the tab strip first and never renders page-level back navigation', () => {
    const { container } = renderTop();

    expect(container.querySelector('.app-page-back-row')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('plug-detail-tabs');
    expect(container.children.item(1)).toHaveClass('installation-detail-identity');
    expect(screen.getByRole('heading', { name: 'Test plug' })).toBeVisible();
  });
});
