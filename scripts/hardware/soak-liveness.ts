export type SoakLivenessSummary = {
  scriptNotRunningSamples: number;
  deviceReboots: number;
  firstDeviceUptimeSec?: number | undefined;
  lastDeviceUptimeSec?: number | undefined;
  maxEndpointOutageMs: number;
  maxDiagOutageMs: number;
  maxScriptNotRunningMs: number;
  maxConsecutiveFailedSamples: number;
  maxConsecutiveScriptNotRunningSamples: number;
};

export type SoakLivenessState = {
  lastDeviceUptimeSec?: number | undefined;
  endpointOutageStartedAtMs?: number | undefined;
  diagOutageStartedAtMs?: number | undefined;
  scriptNotRunningStartedAtMs?: number | undefined;
  consecutiveFailedSamples: number;
  consecutiveScriptNotRunningSamples: number;
};

type SoakLivenessSample = {
  sampledAtMs: number;
  sampleOk: boolean;
  diagOk: boolean;
  scriptRunning?: boolean | undefined;
  deviceUptimeSec?: number | undefined;
};

const REBOOT_UPTIME_TOLERANCE_SEC = 2;

export const createSoakLivenessSummary = (): SoakLivenessSummary => ({
  scriptNotRunningSamples: 0,
  deviceReboots: 0,
  maxEndpointOutageMs: 0,
  maxDiagOutageMs: 0,
  maxScriptNotRunningMs: 0,
  maxConsecutiveFailedSamples: 0,
  maxConsecutiveScriptNotRunningSamples: 0
});

export const createSoakLivenessState = (): SoakLivenessState => ({
  consecutiveFailedSamples: 0,
  consecutiveScriptNotRunningSamples: 0
});

const updateOpenWindow = (
  currentMaxMs: number,
  startedAtMs: number | undefined,
  sampledAtMs: number
): number =>
  startedAtMs === undefined
    ? currentMaxMs
    : Math.max(currentMaxMs, sampledAtMs - startedAtMs);

export const updateSoakLiveness = (
  summary: SoakLivenessSummary,
  state: SoakLivenessState,
  sample: SoakLivenessSample
): void => {
  const { sampledAtMs, deviceUptimeSec } = sample;

  if (deviceUptimeSec !== undefined) {
    summary.firstDeviceUptimeSec ??= deviceUptimeSec;
    if (
      state.lastDeviceUptimeSec !== undefined &&
      deviceUptimeSec + REBOOT_UPTIME_TOLERANCE_SEC < state.lastDeviceUptimeSec
    ) {
      summary.deviceReboots += 1;
    }
    state.lastDeviceUptimeSec = deviceUptimeSec;
    summary.lastDeviceUptimeSec = deviceUptimeSec;
  }

  if (sample.sampleOk) {
    summary.maxEndpointOutageMs = updateOpenWindow(
      summary.maxEndpointOutageMs,
      state.endpointOutageStartedAtMs,
      sampledAtMs
    );
    state.endpointOutageStartedAtMs = undefined;
    state.consecutiveFailedSamples = 0;
  } else {
    state.endpointOutageStartedAtMs ??= sampledAtMs;
    state.consecutiveFailedSamples += 1;
    summary.maxConsecutiveFailedSamples = Math.max(
      summary.maxConsecutiveFailedSamples,
      state.consecutiveFailedSamples
    );
    summary.maxEndpointOutageMs = updateOpenWindow(
      summary.maxEndpointOutageMs,
      state.endpointOutageStartedAtMs,
      sampledAtMs
    );
  }

  if (sample.diagOk) {
    summary.maxDiagOutageMs = updateOpenWindow(
      summary.maxDiagOutageMs,
      state.diagOutageStartedAtMs,
      sampledAtMs
    );
    state.diagOutageStartedAtMs = undefined;
  } else {
    state.diagOutageStartedAtMs ??= sampledAtMs;
    summary.maxDiagOutageMs = updateOpenWindow(
      summary.maxDiagOutageMs,
      state.diagOutageStartedAtMs,
      sampledAtMs
    );
  }

  if (sample.scriptRunning === false) {
    summary.scriptNotRunningSamples += 1;
    state.scriptNotRunningStartedAtMs ??= sampledAtMs;
    state.consecutiveScriptNotRunningSamples += 1;
    summary.maxConsecutiveScriptNotRunningSamples = Math.max(
      summary.maxConsecutiveScriptNotRunningSamples,
      state.consecutiveScriptNotRunningSamples
    );
    summary.maxScriptNotRunningMs = updateOpenWindow(
      summary.maxScriptNotRunningMs,
      state.scriptNotRunningStartedAtMs,
      sampledAtMs
    );
  } else if (sample.scriptRunning === true) {
    summary.maxScriptNotRunningMs = updateOpenWindow(
      summary.maxScriptNotRunningMs,
      state.scriptNotRunningStartedAtMs,
      sampledAtMs
    );
    state.scriptNotRunningStartedAtMs = undefined;
    state.consecutiveScriptNotRunningSamples = 0;
  }
};

export const finalizeSoakLiveness = (
  summary: SoakLivenessSummary,
  state: SoakLivenessState,
  finishedAtMs: number
): void => {
  summary.maxEndpointOutageMs = updateOpenWindow(
    summary.maxEndpointOutageMs,
    state.endpointOutageStartedAtMs,
    finishedAtMs
  );
  summary.maxDiagOutageMs = updateOpenWindow(
    summary.maxDiagOutageMs,
    state.diagOutageStartedAtMs,
    finishedAtMs
  );
  summary.maxScriptNotRunningMs = updateOpenWindow(
    summary.maxScriptNotRunningMs,
    state.scriptNotRunningStartedAtMs,
    finishedAtMs
  );
};
