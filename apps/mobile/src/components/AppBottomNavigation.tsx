import { IconPlug, IconSettings, IconTemperature } from '@tabler/icons-react';
import { useTranslation } from '../app/i18n.js';
import './AppBottomNavigation.css';

export type AppNavigationSection = 'plugs' | 'thermometers';

type AppBottomNavigationProps = {
  activeSection: AppNavigationSection | 'settings';
  onOpenPlugs(): void;
  onOpenThermometers(): void;
  onOpenSettings?: () => void;
};

export const AppBottomNavigation = ({
  activeSection,
  onOpenPlugs,
  onOpenThermometers,
  onOpenSettings
}: AppBottomNavigationProps) => {
  const { t } = useTranslation();

  return (
    <nav
      className="dashboard-bottom-nav app-bottom-nav"
      aria-label={t('dashboard.systemsLabel')}
    >
      <button
        className="dashboard-bottom-nav__item app-bottom-nav__item"
        type="button"
        data-dashboard-section="plugs"
        aria-current={activeSection === 'plugs' ? 'page' : undefined}
        onClick={onOpenPlugs}
      >
        <IconPlug
          className="dashboard-nav__icon app-bottom-nav__icon"
          aria-hidden="true"
        />
        <span>{t('dashboard.climateTab')}</span>
      </button>
      <button
        className="dashboard-bottom-nav__item app-bottom-nav__item"
        type="button"
        data-dashboard-section="thermometers"
        aria-current={activeSection === 'thermometers' ? 'page' : undefined}
        onClick={onOpenThermometers}
      >
        <IconTemperature
          className="dashboard-nav__icon app-bottom-nav__icon"
          aria-hidden="true"
        />
        <span>{t('dashboard.timeTab')}</span>
      </button>
      <button
        className="dashboard-bottom-nav__item app-bottom-nav__item"
        type="button"
        data-dashboard-section="settings"
        aria-current={activeSection === 'settings' ? 'page' : undefined}
        disabled={!onOpenSettings && activeSection !== 'settings'}
        onClick={() => onOpenSettings?.()}
      >
        <IconSettings
          className="dashboard-nav__icon app-bottom-nav__icon"
          aria-hidden="true"
        />
        <span>{t('dashboard.settingsTab')}</span>
      </button>
    </nav>
  );
};
