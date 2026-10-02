import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useStandalonePulseSetupFlow } from './useStandalonePulseSetupFlow.js';

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useStandalonePulseSetupFlow', () => {
  it('starts with the shared Pulse form enabled and valid', () => {
    const { result } = renderHook(() => useStandalonePulseSetupFlow(null), { wrapper });

    expect(result.current.pulseCycleDraft.enabled).toBe(true);
    expect(result.current.pulseCycleValidation).toMatchObject({
      ok: true,
      config: {
        onMs: 10_000,
        offMs: 20_000,
        initialDelayMs: 0,
        startPhase: 'on',
        execution: { mode: 'continuous' }
      }
    });
  });

  it('keeps standalone Pulse enabled while editing the shared draft', () => {
    const { result } = renderHook(() => useStandalonePulseSetupFlow(null), { wrapper });

    act(() => {
      result.current.setPulseCycleDraft({ enabled: false, onSecondsInput: '0.5' });
    });

    expect(result.current.pulseCycleDraft.enabled).toBe(true);
    expect(result.current.pulseCycleValidation.ok).toBe(false);
  });
});
