export type TimeAutomationRuntimeErrorCode =
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
