import { ApiError } from "../utils/api-error.js";
// Translate known errors and hide internal details behind a generic 500 response.
export function errorHandler(error, _req, res, _next) {
  if (error instanceof ApiError)
    return res
      .status(error.status)
      .json({ success: false, message: error.message, errors: error.errors });
  if (error.type === "entity.parse.failed")
    return res
      .status(400)
      .json({ success: false, message: "Invalid JSON body", errors: [] });
  if (error.type === "entity.too.large")
    return res.status(413).json({
      success: false,
      message: "Request body is too large",
      errors: [],
    });
  if (error.name === "ValidationError")
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  console.error("Request failed:", error.name);
  res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again.",
    errors: [],
  });
}
