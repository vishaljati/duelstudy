import { ApiError } from "../utils/ApiError.js";

const isProduction = () => process.env.NODE_ENV === "production";

const normalizeValidationErrors = (error) => {
  if (Array.isArray(error.errors)) return error.errors;

  if (error.name === "ValidationError" && error.errors) {
    return Object.values(error.errors).map(({ path, message }) => ({
      field: path,
      message,
    }));
  }

  return [];
};

export const errorHandler = (error, _req, res, _next) => {
  const isApiError = error instanceof ApiError;
  const isValidationError = error?.name === "ValidationError";
  const statusCode = isApiError
    ? error.statuscode
    : isValidationError
      ? 400
      : 500;
  const safeStatusCode = Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
    ? statusCode
    : 500;
  const errors = normalizeValidationErrors(error);

  const message = isProduction() && safeStatusCode >= 500
    ? "Internal Server Error"
    : isValidationError
      ? "Validation failed"
      : error?.message || "Internal Server Error";

  if (safeStatusCode >= 500 && !isProduction()) {
    console.error(error);
  }

  return res.status(safeStatusCode).json({
    success: false,
    message,
    errors,
    data: null,
  });
};
