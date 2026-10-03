#!/bin/sh
set -eu
for name in \
  thermometer_detail_ux_20260928.py \
  thermometer_detail_ux_i18n_fix_20260928.py \
  thermometer_detail_ux_type_fix_20260928.py \
  thermometer_detail_ux_feature_boundary_20260928.py \
  thermometer_detail_ux_landmark_fix_20260928.py \
  thermometer_detail_ux_budget_fix_20260928.py \
  thermometer_detail_ux_saved_list_fix_20260928.py \
  thermometer_detail_ux_e2e_order_fix_20260928.py
do
  git show "origin/agent-control:.agent/payloads/$name" > "/tmp/$name"
  python3 "/tmp/$name"
done
pnpm exec prettier --write \
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
  docs/UX_VISUAL_CONTRACT.md
