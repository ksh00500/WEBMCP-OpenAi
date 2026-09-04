export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error || "DEFAULT");
  return body;
}
