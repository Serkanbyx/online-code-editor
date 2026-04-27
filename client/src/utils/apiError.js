const GENERIC_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_MESSAGE = 'Network error. Please check your connection.';

/**
 * Normalize an axios / fetch error into a UI-friendly shape.
 *
 * Server errors follow two shapes:
 *   1) { message: "Human message" }                          — business errors
 *   2) { message: "Validation failed",
 *        errors: [{ field, message }, ...] }                 — express-validator
 *
 * The returned object is safe to render directly:
 *   - `message`     : top-level banner text
 *   - `fieldErrors` : { [field]: message } map for inline hints
 *   - `status`      : HTTP status (or 0 when the request never reached the server)
 */
export function extractApiError(error, fallback = GENERIC_MESSAGE) {
  if (!error) {
    return { message: fallback, fieldErrors: {}, status: 0 };
  }

  const response = error.response;
  const status = response?.status ?? 0;
  const data = response?.data ?? null;

  if (!response) {
    return { message: NETWORK_MESSAGE, fieldErrors: {}, status: 0 };
  }

  const fieldErrors = {};
  if (Array.isArray(data?.errors)) {
    for (const item of data.errors) {
      if (item?.field && !fieldErrors[item.field]) {
        fieldErrors[item.field] = item.message ?? fallback;
      }
    }
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const rawMessage = typeof data?.message === 'string' ? data.message.trim() : '';
  const message =
    rawMessage && (!hasFieldErrors || rawMessage.toLowerCase() !== 'validation failed')
      ? rawMessage
      : hasFieldErrors
        ? 'Please fix the highlighted fields.'
        : fallback;

  return { message, fieldErrors, status };
}

export default extractApiError;
