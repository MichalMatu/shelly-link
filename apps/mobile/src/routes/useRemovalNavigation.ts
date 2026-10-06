import { useCallback } from 'react';
import {
  installedAutomationsUsingShelly,
  useInstalledAutomationStore
} from '../features/automations/index.js';
import type { AppRoute } from './appRouteModel.js';

export const useRemovalNavigation = (navigate: (route: AppRoute) => void) => {
  const installations = useInstalledAutomationStore((state) => state.installations);
  const removalBlockFor = useCallback(
    (physicalId: string) => {
      const usage = installedAutomationsUsingShelly(installations, physicalId)[0];
      return usage ? { installationId: usage.id, automationName: usage.name } : null;
    },
    [installations]
  );
  const openInstalledAutomation = useCallback(
    (installationId: string) => {
      const installation = installations.find(
        (candidate) => candidate.id === installationId
      );
      if (!installation) return;
      navigate({
        type: 'installation',
        installationId,
        section: installation.kind === 'time' ? 'thermometers' : 'plugs'
      });
    },
    [installations, navigate]
  );
  return { removalBlockFor, openInstalledAutomation };
};
