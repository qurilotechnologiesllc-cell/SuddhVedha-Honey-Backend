const AppError = require('./AppError');
const HTTP_STATUS = require('./httpStatusCodes');
const { NotFoundError, ValidationError, ConflictError, BadRequestError } = require('./errorTypes');

const isDevelopment = process.env.NODE_ENV === 'development';

const handleMongooseValidationError = (error) => {
  const details = Object.values(error.errors).map((fieldError) => ({
    field: fieldError.path,
    message: fieldError.message,
  }));

  return new ValidationError('Validation failed. Please fix the highlighted fields.', details);
};

const handleMongooseCastError = (error) => {
  return new BadRequestError(`Invalid ${error.path}: ${error.value}`, {
    field: error.path,
    value: error.value,
  });
};

const handleDuplicateKeyError = (error) => {
  const duplicateFields = Object.keys(error.keyValue || {});

  return new ConflictError('Resource already exists with the provided unique value.', {
    fields: duplicateFields,
    values: error.keyValue,
  });
};

const normalizeError = (error) => {
  if (error instanceof AppError) {
    return error;
  }

  if (error.name === 'ValidationError' && error.errors) {
    return handleMongooseValidationError(error);
  }

  if (error.name === 'CastError') {
    return handleMongooseCastError(error);
  }

  if (error.code === 11000) {
    return handleDuplicateKeyError(error);
  }

  if (error.type === 'entity.parse.failed') {
    return new BadRequestError('Invalid JSON format in request body.');
  }

  return new AppError(
    isDevelopment ? error.message : 'Something went wrong on the server.',
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
};

const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl}`));
};

const errorHandler = (error, req, res, next) => {
  const normalizedError = normalizeError(error);

  const response = {
    success: false,
    status: normalizedError.status,
    statusCode: normalizedError.statusCode,
    error: normalizedError.name,
    message: normalizedError.message,
  };

  if (normalizedError.details) {
    response.details = normalizedError.details;
  }

  if (isDevelopment) {
    response.stack = normalizedError.stack;
  }

  res.status(normalizedError.statusCode).json(response);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
