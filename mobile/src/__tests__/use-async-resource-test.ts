import { act, renderHook } from '@testing-library/react-native';

import { useAsyncResource } from '@/hooks/use-async-resource';

/** A promise the test resolves or rejects by hand, to control timing. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Props = { key: string | null };

describe('useAsyncResource', () => {
  it('is idle and does not load when the key is null', async () => {
    const load = jest.fn(() => Promise.resolve('data'));

    const { result } = await renderHook(() => useAsyncResource(null, load));

    expect(result.current.status).toBe('idle');
    expect(load).not.toHaveBeenCalled();
  });

  it('loads, then reports the data', async () => {
    const request = deferred<string>();

    const { result } = await renderHook(() => useAsyncResource('a', () => request.promise));
    expect(result.current.status).toBe('loading');

    await act(async () => request.resolve('data for a'));

    expect(result.current).toMatchObject({ status: 'success', data: 'data for a' });
  });

  it('reports a failed load as an error', async () => {
    const request = deferred<string>();

    const { result } = await renderHook(() => useAsyncResource('a', () => request.promise));
    await act(async () => request.reject(new Error('offline')));

    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('offline');
  });

  it('ignores a slow response for an old key', async () => {
    const requests: Record<string, ReturnType<typeof deferred<string>>> = {
      a: deferred<string>(),
      b: deferred<string>(),
    };
    const { result, rerender } = await renderHook(
      ({ key }: Props) => useAsyncResource(key, () => requests[key ?? 'a'].promise),
      { initialProps: { key: 'a' } }
    );

    await rerender({ key: 'b' });
    await act(async () => requests.b.resolve('data for b'));
    await act(async () => requests.a.resolve('data for a'));

    expect(result.current).toMatchObject({ status: 'success', data: 'data for b' });
  });

  it('aborts the previous request when the key changes', async () => {
    const signals: AbortSignal[] = [];
    const { rerender } = await renderHook(
      ({ key }: Props) =>
        useAsyncResource(key, (signal) => {
          signals.push(signal);
          return new Promise<string>(() => {});
        }),
      { initialProps: { key: 'a' } }
    );

    await rerender({ key: 'b' });

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('keeps showing the old data while reloading', async () => {
    let call = 0;
    const second = deferred<string>();
    const { result } = await renderHook(() =>
      useAsyncResource('a', () => (++call === 1 ? Promise.resolve('first') : second.promise))
    );
    await act(async () => {});
    expect(result.current.data).toBe('first');

    await act(async () => result.current.reload());

    expect(result.current).toMatchObject({ status: 'loading', data: 'first' });
    await act(async () => second.resolve('second'));
    expect(result.current).toMatchObject({ status: 'success', data: 'second' });
  });

  it('clears the data while a new key loads', async () => {
    const requests = { a: deferred<string>(), b: deferred<string>() };
    const { result, rerender } = await renderHook(
      ({ key }: Props) => useAsyncResource(key, () => requests[key === 'b' ? 'b' : 'a'].promise),
      { initialProps: { key: 'a' } }
    );
    await act(async () => requests.a.resolve('data for a'));

    await rerender({ key: 'b' });

    expect(result.current).toMatchObject({ status: 'loading', data: undefined });
  });

  it('can keep the previous data while a new key loads', async () => {
    const requests = { a: deferred<string>(), b: deferred<string>() };
    const { result, rerender } = await renderHook(
      ({ key }: Props) =>
        useAsyncResource(key, () => requests[key === 'b' ? 'b' : 'a'].promise, {
          keepPreviousData: true,
        }),
      { initialProps: { key: 'a' } }
    );
    await act(async () => requests.a.resolve('data for a'));

    await rerender({ key: 'b' });
    expect(result.current).toMatchObject({ status: 'loading', data: 'data for a' });

    await act(async () => requests.b.resolve('data for b'));
    expect(result.current).toMatchObject({ status: 'success', data: 'data for b' });
  });

  it('can retry after an error', async () => {
    let call = 0;
    const { result } = await renderHook(() =>
      useAsyncResource('a', () =>
        ++call === 1 ? Promise.reject(new Error('offline')) : Promise.resolve('data')
      )
    );
    await act(async () => {});
    expect(result.current.status).toBe('error');

    await act(async () => result.current.reload());

    expect(result.current).toMatchObject({ status: 'success', data: 'data', error: undefined });
  });
});
