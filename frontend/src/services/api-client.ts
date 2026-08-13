/**
 * Cliente HTTP hacia el BFF (Principio VI: el frontend solo habla con el backend, nunca con
 * servicios externos). Centraliza el manejo de errores para que las páginas muestren estados
 * de error visibles (Principio VIII).
 */
export interface ApiErrorShape {
  error: string;
  mensaje: string;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ApiClientError';
  }
}

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError(0, 'red', 'No se pudo conectar con el servidor');
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = (data ?? {}) as Partial<ApiErrorShape>;
    throw new ApiClientError(res.status, err.error ?? 'error', err.mensaje ?? 'Error inesperado');
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
