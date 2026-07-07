export class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
