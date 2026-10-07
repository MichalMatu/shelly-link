import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPlatform: vi.fn<() => string>(),
  addListener: vi.fn(),
  remove: vi.fn(async () => undefined),
  listener: null as ((state: { isActive: boolean }) => void) | null
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: mocks.getPlatform }
}));

vi.mock('@capacitor/app', () => ({
  App: { addListener: mocks.addListener }
}));

import { useDashboardRuntimeResumeRefresh } from './useDashboardRuntimeResumeRefresh.js';

const createWrapper = (queryClient: QueryClient) =>
  ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

describe('useDashboardRuntimeResumeRefresh', () => {
  beforeEach(() => {
    mocks.getPlatform.mockReset();
    mocks.getPlatform.mockReturnValue('web');
    mocks.addListener.mockReset();
    mocks.remove.mockClear();
    mocks.listener = null;
    mocks.addListener.mockImplementation(
      async (
        _eventName: string,
        listener: (state: { isActive: boolean }) => void
      ) => {
        mocks.listener = listener;
        return { remove: mocks.remove };
      }
    );
  });

  it('does not install a native app listener on web', () => {
    const queryClient = new QueryClient();
    const { unmount } = renderHook(() => useDashboardRuntimeResumeRefresh(), {
      wrapper: createWrapper(queryClient)
    });

    expect(mocks.addListener).not.toHaveBeenCalled();
    unmount();
    queryClient.clear();
  });

  it('refreshes dashboard runtime queries when the native app becomes active', async () => {
    mocks.getPlatform.mockReturnValue('android');
    const queryClient = new QueryClient();
    const refetch = vi.spyOn(queryClient, 'refetchQueries').mockResolvedValue();
    const { unmount } = renderHook(() => useDashboardRuntimeResumeRefresh(), {
      wrapper: createWrapper(queryClient)
    });

    await waitFor(() => expect(mocks.addListener).toHaveBeenCalledTimes(1));

    act(() => mocks.listener?.({ isActive: false }));
    expect(refetch).not.toHaveBeenCalled();

    act(() => mocks.listener?.({ isActive: true }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refetch.mock.calls[0]?.[0]).toEqual({
      predicate: expect.any(Function)
    });

    unmount();
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
    queryClient.clear();
  });
});
