import { Capacitor, CapacitorHttp } from "@capacitor/core";
export async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  if (Capacitor.getPlatform() !== "android")
    return handleSession(path, await fetch(path, options));
  const origin =
    import.meta.env.VITE_API_ORIGIN ||
    import.meta.env.VITE_RODAS_ORIGIN ||
    "http://127.0.0.1:4173";
  const url = new URL(path, origin);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && url.hostname === "127.0.0.1")
  )
    throw Error("O servidor das Rodas precisa de HTTPS.");
  const result = await CapacitorHttp.request({
    url: url.href,
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    data:
      typeof options.body === "string" ? JSON.parse(options.body) : undefined,
    connectTimeout: 6000,
    readTimeout: 8000,
    responseType: "json",
  });
  return handleSession(
    path,
    new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}
function handleSession(path: string, response: Response) {
  if (
    response.status === 401 &&
    (path.startsWith("/api/mural") ||
      path.startsWith("/api/rodas") ||
      path.endsWith("/perfil"))
  )
    window.dispatchEvent(new Event("praca-expired"));
  return response;
}
