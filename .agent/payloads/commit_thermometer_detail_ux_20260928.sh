#!/bin/sh
set -eu
git add \
  apps/mobile/src/routes/appRouteModel.ts \
  apps/mobile/src/routes/AppRoutes.tsx \
  apps/mobile/src/screens/AutomationDashboardScreen.tsx \
  apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx \
  apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx \
  apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.tsx \
  apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.test.tsx \
  apps/mobile/src/features/thermometers/components/SavedSensorCard.tsx \
  apps/mobile/src/features/thermometers/components/SavedSensorList.tsx \
  apps/mobile/src/features/thermometers/presentation/savedSensorCardPresentation.ts \
  apps/mobile/src/features/thermometers/index.ts \
  apps/mobile/src/__tests__/app-routes.test.tsx \
  apps/mobile/e2e/responsive.spec.ts \
  apps/mobile/e2e/visual-contract.ts \
  apps/mobile/e2e/responsive.spec.ts-snapshots/12-thermometers-dashboard-darwin.png \
  apps/mobile/e2e/responsive.spec.ts-snapshots/22-thermometer-detail-darwin.png \
  docs/UX_VISUAL_CONTRACT.md
git commit -m 'Add Thermometer detail settings'
