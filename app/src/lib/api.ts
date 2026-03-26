const BASE = "/api";

/**
 * Parses response; on non-ok, throws Error with res.body.error if present (so validation
 * messages from the API are surfaced to callers, e.g. Fast Capture modal).
 */
async function handleRes<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    if (text) {
      try {
        const body = JSON.parse(text) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        // Non-JSON error body (e.g. HTML); keep statusText
      }
    }
    throw new Error(message);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  get: <T>(path: string) => fetch(BASE + path).then((r) => handleRes<T>(r)),
  post: <T>(path: string, body: unknown) =>
    fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => handleRes<T>(r)),
  patch: <T>(path: string, body: unknown) =>
    fetch(BASE + path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => handleRes<T>(r)),
  delete: (path: string) =>
    fetch(BASE + path, { method: "DELETE" }).then(async (r) => {
      if (r.status === 204 || r.ok) return;
      const t = await r.text();
      let msg = r.statusText;
      if (t) {
        try {
          const body = JSON.parse(t) as { error?: string };
          if (body?.error) msg = body.error;
        } catch {
          // non-JSON body
        }
      }
      throw new Error(msg);
    }),
};
