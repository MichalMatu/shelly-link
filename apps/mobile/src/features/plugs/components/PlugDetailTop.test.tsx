import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { PlugDetailTop } from './PlugDetailTop.js';

const renderTop = () =>
  render(
    <I18nProvider>
      <PlugDetailTop tabs={['info', vi.fn()]} />
    </I18nProvider>
  );

describe('PlugDetailTop', () => {
  beforeEach(() => setLocalePreference('en'));
  afterEach(() => setLocalePreference('system'));

  it('renders only the tab strip without a separate identity section', () => {
    const { container } = renderTop();

    expect(container.querySelector('.app-page-back-row')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('plug-detail-tabs');
    expect(container.children).toHaveLength(1);
    expect(
      container.querySelector('.installation-detail-identity')
    ).not.toBeInTheDocument();
  });
});
