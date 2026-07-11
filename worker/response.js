export function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extra,
  };
}

export function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    }),
  });
}

export function errorResponse(code, message, status = 400) {
  return jsonResponse({ error: { code, message } }, { status });
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
