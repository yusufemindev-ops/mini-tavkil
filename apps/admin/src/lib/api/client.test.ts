import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setOnUnauthorized, uploadFile } from './client';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(jsonResponse(status, body));
}

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setOnUnauthorized(null);
  });

  it('unwraps the { data } envelope on success', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { data: { success: true } }));
    expect(await api.get('/admin/permissions')).toEqual({ success: true });
  });

  it('throws an ApiError carrying the envelope code and status on failure', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(403, { error: { code: 'permissions.forbidden', message: 'no' } }),
    );
    await expect(api.get('/admin/buyers')).rejects.toMatchObject({
      code: 'permissions.forbidden',
      status: 403,
    });
  });

  it('throws an ApiError instance', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(500, { error: { code: 'internal.unhandled', message: 'oops' } }),
    );
    await expect(api.get('/x')).rejects.toBeInstanceOf(ApiError);
  });

  it('maps a network failure to network.unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(api.get('/x')).rejects.toMatchObject({ code: 'network.unreachable', status: 0 });
  });

  // Better Auth has no token refresh: a 401 is terminal — notify the app once, no retry.
  it('calls onUnauthorized once and throws on a 401 (no refresh round-trip)', async () => {
    const onUnauth = vi.fn();
    setOnUnauthorized(onUnauth);
    const fetchMock = mockFetch(401, { error: { code: 'auth.unauthorized' } });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.get('/admin/buyers')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauth).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('uploadFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setOnUnauthorized(null);
  });

  function fakeFile() {
    return new File(['x'], 'logo.png', { type: 'image/png' });
  }

  it('posts multipart FormData without a JSON content-type and unwraps { data }', async () => {
    const fetchMock = mockFetch(201, { data: { url: 'https://cdn/x.png', filename: 'x.png' } });
    vi.stubGlobal('fetch', fetchMock);

    const result = await uploadFile('/admin/media', fakeFile());
    expect(result).toEqual({ url: 'https://cdn/x.png', filename: 'x.png' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
    // The browser must set the multipart boundary itself — we never set a content-type.
    expect(init.headers).toBeUndefined();
  });

  it('throws an ApiError carrying the backend code on a 400', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(400, { error: { code: 'media.invalid_file', message: 'bad file' } }),
    );
    await expect(uploadFile('/admin/media', fakeFile())).rejects.toMatchObject({
      code: 'media.invalid_file',
      status: 400,
    });
  });

  it('calls onUnauthorized on a 401', async () => {
    const onUnauth = vi.fn();
    setOnUnauthorized(onUnauth);
    vi.stubGlobal('fetch', mockFetch(401, { error: { code: 'auth.unauthorized' } }));
    await expect(uploadFile('/admin/media', fakeFile())).rejects.toBeInstanceOf(ApiError);
    expect(onUnauth).toHaveBeenCalledTimes(1);
  });

  it('maps a network failure to network.unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(uploadFile('/admin/media', fakeFile())).rejects.toMatchObject({
      code: 'network.unreachable',
      status: 0,
    });
  });
});
