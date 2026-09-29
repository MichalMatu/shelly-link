import {
  HISTORY_KVS_PREFIX,
  decodeHistoryKvsItems,
  type DecodedHistoryStore
} from '@lcl/automation-core';
import {
  ShellyKvsClient,
  type Result,
  type ShellyRpcTransport
} from '@lcl/shelly-client';

const HISTORY_KVS_MATCH = `${HISTORY_KVS_PREFIX}*`;

export const readClimateHistory = async (
  transport: ShellyRpcTransport
): Promise<Result<DecodedHistoryStore>> => {
  const response = await new ShellyKvsClient(transport).getAllMatching(HISTORY_KVS_MATCH);
  if (!response.ok) return response;

  return {
    ok: true,
    value: decodeHistoryKvsItems(
      response.value.map(({ key, value }) => ({ key, value }))
    )
  };
};
