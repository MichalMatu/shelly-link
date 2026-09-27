import { z } from 'zod';
import { RPC_METHODS, type Result, type ShellyRpcTransport } from './model.js';
import { validationError } from './rpc/errors.js';

const listMethodsResponseSchema = z.object({ methods: z.array(z.string()) });
const firmwareVersionSchema = z
  .object({
    version: z.string(),
    build_id: z.string().optional(),
    nsteps: z.number().int().nonnegative().optional()
  })
  .passthrough();
const firmwareCheckResponseSchema = z
  .object({
    stable: firmwareVersionSchema.optional(),
    beta: firmwareVersionSchema.optional(),
    alt: z.record(z.string(), z.unknown()).optional()
  })
  .passthrough();

export type ShellyFirmwareVersion = z.infer<typeof firmwareVersionSchema>;
export type ShellyFirmwareCheckResult = z.infer<typeof firmwareCheckResponseSchema>;
export type ShellyFirmwareReadResult =
  | { supported: false }
  | {
      supported: true;
      canUpdate: boolean;
      updates: ShellyFirmwareCheckResult;
    };

const parseResponse = <T>(response: Result<unknown>, schema: z.ZodType<T>): Result<T> => {
  if (!response.ok) return response;
  const parsed = schema.safeParse(response.value);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: validationError(parsed.error.message) };
};

const methodKey = (method: string): string => method.toLowerCase();

const hasMethod = (methods: readonly string[], method: string): boolean => {
  const target = methodKey(method);
  return methods.some((candidate) => methodKey(candidate) === target);
};

export class RpcShellyFirmwareClient {
  constructor(private readonly transport: ShellyRpcTransport) {}

  private async listMethods(): Promise<Result<string[]>> {
    const response = parseResponse(
      await this.transport.call<unknown>({ method: RPC_METHODS.ShellyListMethods }),
      listMethodsResponseSchema
    );
    return response.ok ? { ok: true, value: response.value.methods } : response;
  }

  async read(): Promise<Result<ShellyFirmwareReadResult>> {
    const methods = await this.listMethods();
    if (!methods.ok) return methods;
    if (!hasMethod(methods.value, RPC_METHODS.ShellyCheckForUpdate)) {
      return { ok: true, value: { supported: false } };
    }

    const updates = parseResponse(
      await this.transport.call<unknown>({ method: RPC_METHODS.ShellyCheckForUpdate }),
      firmwareCheckResponseSchema
    );
    if (!updates.ok) return updates;

    return {
      ok: true,
      value: {
        supported: true,
        canUpdate: hasMethod(methods.value, RPC_METHODS.ShellyUpdate),
        updates: updates.value
      }
    };
  }

  async updateStable(): Promise<Result<null>> {
    const methods = await this.listMethods();
    if (!methods.ok) return methods;
    if (!hasMethod(methods.value, RPC_METHODS.ShellyUpdate)) {
      return {
        ok: false,
        error: validationError('Shelly firmware does not support Shelly.Update.')
      };
    }

    return this.transport.call<null>({
      method: RPC_METHODS.ShellyUpdate,
      params: { stage: 'stable' }
    });
  }
}
