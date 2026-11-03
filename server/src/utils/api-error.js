export class ApiError extends Error {
  // Carry an expected HTTP status and field errors to centralized error handling.
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
