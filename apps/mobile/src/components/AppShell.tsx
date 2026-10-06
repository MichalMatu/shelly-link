import type { ReactNode } from 'react';
import { AppBottomNavigation, type AppNavigationSection } from './AppBottomNavigation.js';
import { APP_TOAST_HOST_ID } from './AppToastViewport.js';

type AppShellProps = {
  activeSection: AppNavigationSection | 'settings';
  children: ReactNode;
  onOpenPlugs(): void;
  onOpenThermometers(): void;
  onOpenSettings(): void;
};

export const AppShell = ({
  activeSection,
  children,
  onOpenPlugs,
  onOpenThermometers,
  onOpenSettings
}: AppShellProps) => (
  <div className="app-root-shell app-bottom-nav-shell">
    <div className="app-root-shell__content">{children}</div>
    <div className="app-toast-host" id={APP_TOAST_HOST_ID} />
    <AppBottomNavigation
      activeSection={activeSection}
      onOpenPlugs={onOpenPlugs}
      onOpenThermometers={onOpenThermometers}
      onOpenSettings={onOpenSettings}
    />
  </div>
);
