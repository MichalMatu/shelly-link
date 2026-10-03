from pathlib import Path

root = Path('.')

def read(path):
    return (root / path).read_text()

def write(path, text):
    p = root / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)

def replace_once(path, old, new):
    text = read(path)
    if text.count(old) != 1:
        raise SystemExit(f'{path}: expected one match, got {text.count(old)} for {old[:80]!r}')
    write(path, text.replace(old, new, 1))

write('apps/mobile/src/features/automations/data/timeAutomationRuntimeError.ts', '''export type TimeAutomationRuntimeErrorCode =
  | 'clock-unsynced'
  | 'schedule-slots'
  | 'native-schedule-conflict'
  | 'relay-state-unconfirmed'
  | 'schedule-pair-unconfirmed'
  | 'schedule-state-attention'
  | 'pause-unconfirmed'
  | 'resume-unconfirmed'
  | 'manual-relay-requires-paused'
  | 'update-unconfirmed'
  | 'delete-unconfirmed';

export class TimeAutomationRuntimeError extends Error {
  constructor(
    readonly code: TimeAutomationRuntimeErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'TimeAutomationRuntimeError';
  }
}

export const timeAutomationRuntimeError = (
  code: TimeAutomationRuntimeErrorCode,
  message: string
): TimeAutomationRuntimeError => new TimeAutomationRuntimeError(code, message);
''')

write('apps/mobile/src/features/automations/data/timeAutomationRelayControl.ts', '''import type { ShellyStatus } from '@lcl/shelly-client';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import {
  createTimeAutomationClients,
  type TimeAutomationClients
} from './timeAutomationClients.js';
import {
  requireStoredTimeAutomationDeviceIdentity,
  type OwnedTimeAutomationRuntimeInstallation
} from './timeAutomationIdentity.js';
import {
  readTimeAutomationRuntime,
  type TimeAutomationRuntimeSnapshot
} from './timeAutomationRuntimeState.js';
import { timeAutomationRuntimeError } from './timeAutomationRuntimeError.js';

export const setTimeAutomationRelayStateAndConfirm = async (
  clients: TimeAutomationClients,
  relayId: number,
  on: boolean
): Promise<ShellyStatus> => {
  unwrapShellyResult(
    on
      ? await clients.device.setRelayOn({ relayId })
      : await clients.device.setRelayOff({ relayId })
  );
  const status = unwrapShellyResult(await clients.device.getStatus());
  if (status.relayOn !== on) {
    throw timeAutomationRuntimeError(
      'relay-state-unconfirmed',
      `Shelly relay did not confirm ${on ? 'ON' : 'OFF'}.`
    );
  }
  return status;
};

export const setTimeAutomationManualRelay = async (
  installation: OwnedTimeAutomationRuntimeInstallation,
  on: boolean,
  clients = createTimeAutomationClients(installation.shelly.baseUrl)
): Promise<TimeAutomationRuntimeSnapshot> => {
  await requireStoredTimeAutomationDeviceIdentity(installation, clients);
  const before = await readTimeAutomationRuntime(installation, clients);
  if (before.scheduleState !== 'paused') {
    throw timeAutomationRuntimeError(
      'manual-relay-requires-paused',
      'Manual relay control requires a paused time automation.'
    );
  }
  await setTimeAutomationRelayStateAndConfirm(clients, installation.config.relayId, on);
  return readTimeAutomationRuntime(installation, clients);
};
''')

path = 'apps/mobile/src/features/automations/data/timeAutomationRuntime.ts'
text = read(path)
old_errors = '''export type TimeAutomationRuntimeErrorCode =
  | 'clock-unsynced'
  | 'schedule-slots'
  | 'native-schedule-conflict'
  | 'relay-state-unconfirmed'
  | 'schedule-pair-unconfirmed'
  | 'schedule-state-attention'
  | 'pause-unconfirmed'
  | 'resume-unconfirmed'
  | 'manual-relay-requires-paused'
  | 'update-unconfirmed'
  | 'delete-unconfirmed';

export class TimeAutomationRuntimeError extends Error {
  constructor(
    readonly code: TimeAutomationRuntimeErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'TimeAutomationRuntimeError';
  }
}

const runtimeError = (
  code: TimeAutomationRuntimeErrorCode,
  message: string
): TimeAutomationRuntimeError => new TimeAutomationRuntimeError(code, message);

'''
if text.count(old_errors) != 1:
    raise SystemExit('runtime error block not found')
text = text.replace(old_errors, '', 1)
old_relay = '''const setRelayStateAndConfirm = async (
  clients: TimeAutomationClients,
  relayId: number,
  on: boolean
): Promise<ShellyStatus> => {
  unwrapShellyResult(
    on
      ? await clients.device.setRelayOn({ relayId })
      : await clients.device.setRelayOff({ relayId })
  );
  const status = unwrapShellyResult(await clients.device.getStatus());
  if (status.relayOn !== on) {
    throw runtimeError(
      'relay-state-unconfirmed',
      `Shelly relay did not confirm ${on ? 'ON' : 'OFF'}.`
    );
  }
  return status;
};

'''
if text.count(old_relay) != 1:
    raise SystemExit('relay helper block not found')
text = text.replace(old_relay, '', 1)
old_manual = '''export const setTimeAutomationManualRelay = async (
  installation: OwnedTimeAutomationRuntimeInstallation,
  on: boolean,
  clients = createTimeAutomationClients(installation.shelly.baseUrl)
): Promise<TimeAutomationRuntimeSnapshot> => {
  await requireStoredTimeAutomationDeviceIdentity(installation, clients);
  const before = await readTimeAutomationRuntime(installation, clients);
  if (before.scheduleState !== 'paused') {
    throw runtimeError(
      'manual-relay-requires-paused',
      'Manual relay control requires a paused time automation.'
    );
  }
  await setRelayStateAndConfirm(clients, installation.config.relayId, on);
  return readTimeAutomationRuntime(installation, clients);
};

'''
if text.count(old_manual) != 1:
    raise SystemExit('manual control block not found')
text = text.replace(old_manual, '', 1)
text = text.replace('setRelayStateAndConfirm(', 'setTimeAutomationRelayStateAndConfirm(')
anchor = "import {\n  createTimeAutomationClients,\n  type TimeAutomationClients\n} from './timeAutomationClients.js';\n"
if text.count(anchor) != 1:
    raise SystemExit('clients import anchor not found')
text = text.replace(anchor, anchor + "import { setTimeAutomationRelayStateAndConfirm } from './timeAutomationRelayControl.js';\nimport { timeAutomationRuntimeError as runtimeError } from './timeAutomationRuntimeError.js';\n", 1)
write(path, text)

replace_once(
    'apps/mobile/src/features/automations/index.ts',
    '''export {
  deleteTimeAutomation,
  installDailyTimeAutomation,
  pauseTimeAutomation,
  resumeTimeAutomation,
  setTimeAutomationManualRelay,
  TimeAutomationRuntimeError,
  updateDailyTimeAutomation
} from './data/timeAutomationRuntime.js';
''',
    '''export {
  deleteTimeAutomation,
  installDailyTimeAutomation,
  pauseTimeAutomation,
  resumeTimeAutomation,
  updateDailyTimeAutomation
} from './data/timeAutomationRuntime.js';
export { setTimeAutomationManualRelay } from './data/timeAutomationRelayControl.js';
export { TimeAutomationRuntimeError } from './data/timeAutomationRuntimeError.js';
'''
)

replace_once(
    'apps/mobile/src/features/automations/data/timeAutomationRuntime.test.ts',
    '''  pauseTimeAutomation,
  resumeTimeAutomation,
  setTimeAutomationManualRelay,
  updateDailyTimeAutomation
} from './timeAutomationRuntime.js';
''',
    '''  pauseTimeAutomation,
  resumeTimeAutomation,
  updateDailyTimeAutomation
} from './timeAutomationRuntime.js';
import { setTimeAutomationManualRelay } from './timeAutomationRelayControl.js';
'''
)

print('Extracted Time runtime error/relay boundaries')
