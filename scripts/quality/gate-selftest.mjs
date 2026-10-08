import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  allowedPackageDependencies,
  defaultProductionModuleMaxLines,
  mobileProductionBaselines,
  sharedStylesheetBaselines
} from './architecture-baseline.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const repositoryGate = join(repositoryRoot, 'scripts/quality/repository-gate.mjs');
const featureGate = join(repositoryRoot, 'scripts/quality/feature-boundary-gate.mjs');
const uxGate = join(repositoryRoot, 'scripts/quality/ux-gate.mjs');
const performanceGate = join(repositoryRoot, 'scripts/quality/performance-budget.mjs');
const failures = [];
let passed = 0;

const writeFixture = async (root, relativePath, content = '') => {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
};

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const runGate = (gatePath, fixtureRoot, extraEnv = {}) =>
  spawnSync(process.execPath, [gatePath], {
    cwd: repositoryRoot,
    env: { ...process.env, LCL_QUALITY_ROOT: fixtureRoot, ...extraEnv },
    encoding: 'utf8'
  });

const executeCase = async ({
  name,
  gatePath,
  setup,
  expectedFailure,
  expectedOutput,
  env = {}
}) => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'lcl-quality-'));
  try {
    await setup(fixtureRoot);
    const result = runGate(gatePath, fixtureRoot, env);
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    if (expectedFailure) {
      if (result.status === 0) {
        failures.push(`${name}: gate unexpectedly passed`);
        return;
      }
      if (!output.includes(expectedFailure)) {
        failures.push(
          `${name}: gate failed without expected message ${JSON.stringify(expectedFailure)}\n${output}`
        );
        return;
      }
    } else if (result.status !== 0) {
      failures.push(`${name}: gate unexpectedly failed\n${output}`);
      return;
    }

    if (expectedOutput && !output.includes(expectedOutput)) {
      failures.push(
        `${name}: gate output missing ${JSON.stringify(expectedOutput)}\n${output}`
      );
      return;
    }

    passed += 1;
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
};

const setupFeatureFixture = async (root) => {
  await writeFixture(
    root,
    'apps/mobile/src/features/AGENTS.md',
    '# Public API\n# Feature isolation\n# Side-effect ownership\n'
  );
  for (const directory of ['screens', 'flows', 'components']) {
    await mkdir(join(root, 'apps/mobile/src', directory), { recursive: true });
  }
  await writeFixture(root, 'apps/mobile/src/theme/theme.css', '/* baseline */\n');
  await writeFixture(root, 'packages/ui/src/styles.css', '/* baseline */\n');
  await writeFixture(
    root,
    'packages/shelly-client/package.json',
    json({ name: '@lcl/shelly-client', exports: { '.': './src/index.ts' } })
  );
  await writeFixture(
    root,
    'apps/mobile/src/features/plugs/index.ts',
    'export const plugs = true;\n'
  );
};

const setupRepositoryFixture = async (
  root,
  { prepush = 'pnpm quality:ux && pnpm quality:repo' } = {}
) => {
  await writeFixture(
    root,
    'AGENTS.md',
    '# Preimplementation architecture gate\nSee apps/mobile/AGENTS.md\n'
  );
  await writeFixture(
    root,
    'apps/mobile/AGENTS.md',
    '# Source organization\n# Mobile preimplementation gate\n'
  );
  await writeFixture(
    root,
    'packages/AGENTS.md',
    '# Package preimplementation gate\nSee packages/ui/AGENTS.md\n'
  );
  await writeFixture(root, 'packages/ui/AGENTS.md', '# @lcl/ui\nproduct-agnostic\n');
  await writeFixture(
    root,
    'scripts/quality/AGENTS.md',
    '# Gate design\n# Quality self-tests\n'
  );

  const version = '2.0.10';
  const releaseOverride = '${LCL_RELEASE_VERSION:-}';
  await writeFixture(
    root,
    'package.json',
    json({
      name: 'fixture-root',
      version,
      scripts: {
        prepush,
        'release:android': `fixture ${releaseOverride}`,
        'release:android:verify': `fixture ${releaseOverride}`
      }
    })
  );
  await writeFixture(
    root,
    'apps/mobile/package.json',
    json({ name: '@lcl/mobile', version })
  );
  await writeFixture(
    root,
    'apps/mobile/android/app/build.gradle',
    'versionName "2.0.10"\nversionCode 20010\n'
  );

  const packageDirectories = {
    '@lcl/automation-core': 'automation-core',
    '@lcl/ble-core': 'ble-core',
    '@lcl/design-tokens': 'design-tokens',
    '@lcl/device-profiles': 'device-profiles',
    '@lcl/diagnostics': 'diagnostics',
    '@lcl/script-generator': 'script-generator',
    '@lcl/shelly-client': 'shelly-client',
    '@lcl/ui': 'ui'
  };
  for (const [name, directory] of Object.entries(packageDirectories)) {
    const dependencies = Object.fromEntries(
      (allowedPackageDependencies[name] ?? []).map((dependency) => [
        dependency,
        'workspace:*'
      ])
    );
    await writeFixture(
      root,
      `packages/${directory}/package.json`,
      json({ name, version: '1.0.0', dependencies })
    );
    await writeFixture(root, `packages/${directory}/src/index.ts`, 'export {};\n');
  }

  await mkdir(join(root, 'apps/mobile/src/screens'), { recursive: true });
  await writeFixture(
    root,
    'apps/mobile/src/flows/hardware-setup/useHardwareSetupFlow.ts',
    'export const useHardwareSetupFlow = () => {\n  return {\n    ready: true,\n  };\n};\n'
  );

  for (const relativePath of [
    'apps/mobile/src/flows/hardware-setup/useShellyControlFlow.ts',
    'apps/mobile/src/flows/hardware-setup/useShellyBleDiscoveryFlow.ts',
    'apps/mobile/src/flows/hardware-setup/usePhoneSensorFlow.ts',
    'apps/mobile/src/screens/hardware-setup/pages/useShellySetupFeedback.ts',
    'apps/mobile/src/screens/hardware-setup/pages/useSensorSetupFeedback.ts',
    'apps/mobile/src/screens/hardware-setup/pages/useRuleSetupFeedback.ts',
    'apps/mobile/src/screens/hardware-setup/pages/RuleAdvancedSettingsInline.tsx',
    'apps/mobile/src/flows/hardware-setup/useShellySetupScanFlow.ts',
    'apps/mobile/src/flows/hardware-setup/useClimateAutomationInstallFlow.ts'
  ]) {
    await writeFixture(root, relativePath, 'export {};\n');
  }

  const pageContracts = {
    'apps/mobile/src/screens/hardware-setup/pages/ShellySetupPage.tsx': 'ShellySetupFlow',
    'apps/mobile/src/screens/hardware-setup/pages/ShellySetupPresentation.tsx':
      'ShellySetupFlow',
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx': 'SensorSetupFlow',
    'apps/mobile/src/screens/hardware-setup/pages/RuleSetupPage.tsx': 'RuleSetupFlow',
    'apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.tsx':
      'TimeScheduleSetupFlow'
  };
  for (const [relativePath, contract] of Object.entries(pageContracts)) {
    await writeFixture(
      root,
      relativePath,
      `type FixtureContract = ${contract};\nexport {};\n`
    );
  }
};

const setupUxSegmentedControlFixture = async (root) => {
  await writeFixture(
    root,
    'packages/ui/src/primitives/SegmentedControl.tsx',
    'export const SegmentedControl = () => <div className="lcl-segmented-control" role="tablist"><button className="lcl-segmented-control__item" role="tab" /></div>;\n'
  );
  await writeFixture(
    root,
    'packages/ui/src/index.ts',
    "export * from './primitives/SegmentedControl.js';\n"
  );
  await writeFixture(
    root,
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    'export const Fixture = () => <IonSegment className="sensor-add-mode-segment" selectOnFocus={false} swipeGesture={false}><IonSegmentButton /></IonSegment>;\n'
  );
  await writeFixture(
    root,
    'apps/mobile/src/features/plugs/components/PlugAddPage.tsx',
    'export const Fixture = () => <IonSegment className="plug-add-mode-segment" selectOnFocus={false} swipeGesture={false}><IonSegmentButton /></IonSegment>;\n'
  );
  await writeFixture(
    root,
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    'export const Fixture = () => <SegmentedControl className="setup-top-nav" itemClassName="setup-top-nav__item" />;\n'
  );
  await writeFixture(
    root,
    'apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx',
    'export const Fixture = () => <div className="plug-detail-tabs lcl-segmented-control"><button className="lcl-segmented-control__item" /></div>;\n'
  );
};

const setupPerformanceFixture = async (root, { jsBytes }) => {
  await writeFixture(
    root,
    'scripts/quality/performance-budgets.json',
    json({
      version: 2,
      mobileDist: {
        baseline: {
          gitSha: 'fixture-baseline',
          totalJsBytes: 100,
          largestJsBytes: 100,
          totalCssBytes: 10,
          jsFileCount: 1
        },
        reviewGrowth: {
          totalJsBytes: 20,
          largestJsBytes: 20,
          totalCssBytes: 20,
          jsFileCount: 1
        },
        hardLimit: {
          totalJsBytes: 200,
          largestJsBytes: 200,
          totalCssBytes: 100,
          maxJsFiles: 4
        }
      },
      source: { minPollingIntervalMs: 1000 }
    })
  );
  await writeFixture(root, 'apps/mobile/dist/assets/app.js', 'x'.repeat(jsBytes));
  await writeFixture(root, 'apps/mobile/dist/assets/app.css', 'x'.repeat(10));
  await writeFixture(
    root,
    'apps/mobile/src/fixture.ts',
    'export const fixture = true;\n'
  );
};

await executeCase({
  name: 'performance/review threshold stays advisory',
  gatePath: performanceGate,
  setup: (root) => setupPerformanceFixture(root, { jsBytes: 150 }),
  expectedOutput: 'Performance review threshold exceeded:'
});

await executeCase({
  name: 'performance/hard ceiling fails closed',
  gatePath: performanceGate,
  setup: (root) => setupPerformanceFixture(root, { jsBytes: 201 }),
  expectedFailure: 'total JS 201 B exceeds hard limit 200 B'
});

await executeCase({
  name: 'ux/setup navigation uses shared segmented control',
  gatePath: uxGate,
  setup: setupUxSegmentedControlFixture,
  env: { LCL_UX_GATE_FOCUS: 'segmented-control' }
});

await executeCase({
  name: 'ux/setup navigation rejects rebuilt markup',
  gatePath: uxGate,
  setup: async (root) => {
    await setupUxSegmentedControlFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
      'export const Fixture = () => <nav className="setup-top-nav"><button className="setup-top-nav__item" /></nav>;\n'
    );
  },
  expectedFailure:
    'setup segmented navigation must reuse @lcl/ui SegmentedControl instead of rebuilding tablist markup',
  env: { LCL_UX_GATE_FOCUS: 'segmented-control' }
});

await executeCase({
  name: 'ux/Add Thermometer requires controlled Ionic segment',
  gatePath: uxGate,
  setup: async (root) => {
    await setupUxSegmentedControlFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
      'export const Fixture = () => <SegmentedControl className="shelly-add-tabs" itemClassName="shelly-add-tabs__tab" />;\n'
    );
  },
  expectedFailure:
    'Add Thermometer mode selection must use the controlled Ionic segment without focus/swipe side effects',
  env: { LCL_UX_GATE_FOCUS: 'segmented-control' }
});

await executeCase({
  name: 'ux/Add Plug requires controlled Ionic segment',
  gatePath: uxGate,
  setup: async (root) => {
    await setupUxSegmentedControlFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/features/plugs/components/PlugAddPage.tsx',
      'export const Fixture = () => <SegmentedControl className="shelly-add-tabs" itemClassName="shelly-add-tabs__tab" />;\n'
    );
  },
  expectedFailure:
    'Add Plug mode selection must use the controlled Ionic segment without focus/swipe side effects',
  env: { LCL_UX_GATE_FOCUS: 'segmented-control' }
});

await executeCase({
  name: 'feature/legal feature',
  gatePath: featureGate,
  setup: setupFeatureFixture
});

await executeCase({
  name: 'feature/cross-feature deep import',
  gatePath: featureGate,
  setup: async (root) => {
    await setupFeatureFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/features/thermometers/index.ts',
      'export const thermometers = true;\n'
    );
    await writeFixture(
      root,
      'apps/mobile/src/features/thermometers/data/private.ts',
      'export const privateValue = true;\n'
    );
    await writeFixture(
      root,
      'apps/mobile/src/features/plugs/data/crossFeature.ts',
      "import '../../thermometers/data/private';\nexport {};\n"
    );
  },
  expectedFailure: 'private cross-feature import is forbidden'
});

await executeCase({
  name: 'feature/public feature dependency requires review',
  gatePath: featureGate,
  setup: async (root) => {
    await setupFeatureFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/features/thermometers/index.ts',
      'export const thermometers = true;\n'
    );
    await writeFixture(
      root,
      'apps/mobile/src/features/plugs/data/crossFeature.ts',
      "import '../../thermometers';\nexport {};\n"
    );
  },
  expectedFailure: 'must not depend on feature thermometers by default'
});

await executeCase({
  name: 'feature/package deep import',
  gatePath: featureGate,
  setup: async (root) => {
    await setupFeatureFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/features/plugs/data/deepImport.ts',
      "import '@lcl/shelly-client/src/model';\nexport {};\n"
    );
  },
  expectedFailure: 'deep import bypasses @lcl/shelly-client public API'
});

await executeCase({
  name: 'feature/presentation side effect',
  gatePath: featureGate,
  setup: async (root) => {
    await setupFeatureFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/features/plugs/screens/PlugScreen.tsx',
      "export const load = () => fetch('/fixture');\n"
    );
  },
  expectedFailure: 'presentation must not call fetch directly'
});

await executeCase({
  name: 'feature/legacy root growth',
  gatePath: featureGate,
  setup: async (root) => {
    await setupFeatureFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/screens/NewFeatureScreen.tsx',
      'export const NewFeatureScreen = () => null;\n'
    );
  },
  expectedFailure: 'new product modules are closed in legacy screens/flows/components'
});

await executeCase({
  name: 'feature/nested legacy growth',
  gatePath: featureGate,
  setup: async (root) => {
    await setupFeatureFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/screens/new-feature/NewFeatureScreen.tsx',
      'export const NewFeatureScreen = () => null;\n'
    );
  },
  expectedFailure: 'new product modules are closed in legacy screens/flows/components'
});

await executeCase({
  name: 'feature/catch-all name',
  gatePath: featureGate,
  setup: async (root) => {
    await setupFeatureFixture(root);
    await writeFixture(root, 'apps/mobile/src/features/common/index.ts', 'export {};\n');
  },
  expectedFailure: 'catch-all feature names are forbidden'
});

await executeCase({
  name: 'feature/wildcard public API',
  gatePath: featureGate,
  setup: async (root) => {
    await setupFeatureFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/features/plugs/index.ts',
      "export * from './data/value';\n"
    );
    await writeFixture(
      root,
      'apps/mobile/src/features/plugs/data/value.ts',
      'export const value = true;\n'
    );
  },
  expectedFailure: 'wildcard exports are forbidden in feature public APIs'
});

await executeCase({
  name: 'feature/shared stylesheet growth',
  gatePath: featureGate,
  setup: async (root) => {
    await setupFeatureFixture(root);
    const maxLines = sharedStylesheetBaselines['apps/mobile/src/theme/theme.css'];
    await writeFixture(
      root,
      'apps/mobile/src/theme/theme.css',
      Array.from({ length: maxLines + 1 }, () => '.fixture {}').join('\n')
    );
  },
  expectedFailure: 'shared stylesheet exceeds'
});

await executeCase({
  name: 'repository/legal baseline',
  gatePath: repositoryGate,
  setup: setupRepositoryFixture
});

await executeCase({
  name: 'repository/prepush stays fast policy gate',
  gatePath: repositoryGate,
  setup: (root) => setupRepositoryFixture(root, { prepush: 'pnpm check' }),
  expectedFailure:
    'prepush must stay a fast policy gate; full verification belongs to check/check:full and CI'
});

await executeCase({
  name: 'repository/quality agent contract required',
  gatePath: repositoryGate,
  setup: async (root) => {
    await setupRepositoryFixture(root);
    await rm(join(root, 'scripts/quality/AGENTS.md'));
  },
  expectedFailure: 'required hierarchical agent contract is missing'
});

await executeCase({
  name: 'repository/package dependency direction',
  gatePath: repositoryGate,
  setup: async (root) => {
    await setupRepositoryFixture(root);
    await writeFixture(
      root,
      'packages/ui/package.json',
      json({
        name: '@lcl/ui',
        version: '1.0.0',
        dependencies: {
          '@lcl/design-tokens': 'workspace:*',
          '@lcl/shelly-client': 'workspace:*'
        }
      })
    );
  },
  expectedFailure: '@lcl/ui must not depend on @lcl/shelly-client'
});

await executeCase({
  name: 'repository/package imports app',
  gatePath: repositoryGate,
  setup: async (root) => {
    await setupRepositoryFixture(root);
    await writeFixture(
      root,
      'packages/diagnostics/src/bad.ts',
      "import '../../../apps/mobile/src/main';\nexport {};\n"
    );
  },
  expectedFailure: 'package source must not import application code'
});

await executeCase({
  name: 'repository/screen owns fetch',
  gatePath: repositoryGate,
  setup: async (root) => {
    await setupRepositoryFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/screens/BadScreen.tsx',
      "export const load = () => fetch('/fixture');\n"
    );
  },
  expectedFailure: 'screen must not call fetch directly'
});

await executeCase({
  name: 'repository/default production growth',
  gatePath: repositoryGate,
  setup: async (root) => {
    await setupRepositoryFixture(root);
    await writeFixture(
      root,
      'apps/mobile/src/flows/TooBig.ts',
      Array.from(
        { length: defaultProductionModuleMaxLines + 1 },
        () => 'export {};'
      ).join('\n')
    );
  },
  expectedFailure: `production mobile module exceeds ${defaultProductionModuleMaxLines} lines`
});

const protectedMobileHotspot = Object.entries(mobileProductionBaselines)[0];
if (!protectedMobileHotspot) {
  throw new Error('Expected at least one protected mobile production baseline.');
}
const [protectedMobileHotspotPath, protectedMobileHotspotMaxLines] =
  protectedMobileHotspot;

await executeCase({
  name: 'repository/protected hotspot growth',
  gatePath: repositoryGate,
  setup: async (root) => {
    await setupRepositoryFixture(root);
    await writeFixture(
      root,
      protectedMobileHotspotPath,
      Array.from({ length: protectedMobileHotspotMaxLines + 1 }, () => 'export {};').join(
        '\n'
      )
    );
  },
  expectedFailure: `production mobile module exceeds ${protectedMobileHotspotMaxLines} lines`
});

if (failures.length > 0) {
  console.error('Quality gate self-test failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Quality gate self-test passed (${passed} cases).`);
}
