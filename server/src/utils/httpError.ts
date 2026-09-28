// Thrown from a controller, errorHandler turns this into a response with the
// given status code and message.
export function httpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}
