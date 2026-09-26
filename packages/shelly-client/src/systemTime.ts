import { RPC_METHODS, type Result, type ShellyRpcTransport } from './model.js';
import { validationError } from './rpc/errors.js';

const normalizeUnixTimeSeconds = (unixTimeSec: number): Result<number> => {
  if (!Number.isFinite(unixTimeSec) || unixTimeSec < 0) {
    return {
      ok: false,
      error: validationError(`Invalid Shelly system time: ${unixTimeSec}.`)
    };
  }

  return { ok: true, value: Math.trunc(unixTimeSec * 1000) / 1000 };
};

export const setShellySystemTime = async (
  transport: ShellyRpcTransport,
  unixTimeSec: number
): Promise<Result<null>> => {
  const normalizedTime = normalizeUnixTimeSeconds(unixTimeSec);
  if (!normalizedTime.ok) return normalizedTime;

  return transport.call<null>({
    method: RPC_METHODS.SysSetTime,
    params: { unixtime: normalizedTime.value }
  });
};
