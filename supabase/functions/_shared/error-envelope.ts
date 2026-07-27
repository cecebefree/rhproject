import { jsonResponse } from './cors.ts'

export interface ErrorPayload {
  error: string
  detail?: string
}

export function failLoud(error: string, detail?: string, status = 500): Response {
  const body: ErrorPayload = { error }
  if (detail) body.detail = detail
  return jsonResponse(body, status)
}
