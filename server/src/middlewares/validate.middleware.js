import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    const details = result.error.flatten();
    return next(new ApiError(422, 'Validation failed', details));
  }

  if (result.data.body) req.body = result.data.body;
  next();
};
