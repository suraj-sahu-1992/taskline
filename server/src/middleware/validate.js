import { ApiError } from "../utils/api-error.js";
// Validate each configured request source before passing only parsed data onward.
export const validate = (schemas) => (req, _res, next) => {
  req.validated = {};
  for (const [source, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[source]);
    if (!result.success)
      return next(
        new ApiError(
          400,
          "Validation failed",
          result.error.issues.map((issue) => ({
            field: issue.path.join(".") || source,
            message: issue.message,
          })),
        ),
      );
    req.validated[source] = result.data;
  }
  next();
};
