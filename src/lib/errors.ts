export function apiError(code: string, message: string, status = 400) {
  return Response.json({ success: false, error: { code, message } }, { status });
}
export function apiSuccess<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}
