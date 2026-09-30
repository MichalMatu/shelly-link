export interface RelaySetAction {
  type: 'set';
  relayOn: boolean;
}

export interface RelayPulseAction {
  type: 'pulse';
  relayOn: boolean;
  durationMs: number;
}

export type RelayAction = RelaySetAction | RelayPulseAction;
