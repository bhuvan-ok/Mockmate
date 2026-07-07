import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    error = new ApiError(statusCode, error.message || 'Internal server error');
  }

  if (env.isDev) {
    console.error(error);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    details: error.details,
    ...(env.isDev ? { stack: err.stack } : {}),
  });
};
