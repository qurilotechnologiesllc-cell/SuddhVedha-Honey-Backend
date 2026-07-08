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

  // Mongoose Validation Error
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }))
    return {
      name: 'ValidationError',
      statusCode: 400,
      status: 'fail',
      message: 'Validation failed',
      details,
      stack: error.stack
    }
  }

  // Mongoose Duplicate Key Error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0]
    const value = error.keyValue[field]
    return {
      name: 'DuplicateKeyError',
      statusCode: 409,
      status: 'fail',
      message: `${field}: "${value}" already exists`,
      stack: error.stack
    }
  }

  // Mongoose CastError (Invalid ObjectId)
  if (error.name === 'CastError') {
    return {
      name: 'CastError',
      statusCode: 400,
      status: 'fail',
      message: `Invalid ${error.path}: ${error.value}`,
      stack: error.stack
    }
  }

  // JWT Errors
  if (error.name === 'JsonWebTokenError') {
    return {
      name: 'JsonWebTokenError',
      statusCode: 401,
      status: 'fail',
      message: 'Invalid token. Please login again',
      stack: error.stack
    }
  }

  if (error.name === 'TokenExpiredError') {
    return {
      name: 'TokenExpiredError',
      statusCode: 401,
      status: 'fail',
      message: 'Token expired. Please login again',
      stack: error.stack
    }
  }

  // Operational Errors (apne banaye hue)
  if (error.isOperational) {
    return {
      name: error.name,
      statusCode: error.statusCode,
      status: error.status,
      message: error.message,
      details: error.details,
      stack: error.stack
    }
  }

  // Unknown/Unexpected Errors
  // Development mein actual error dikhao!
  return {
    name: error.name || 'UnknownError',
    statusCode: 500,
    status: 'error',
    message: isDevelopment
      ? error.message  // ← Actual error dikhega!
      : 'Something went wrong on the server',
    stack: error.stack
  }
}

const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl}`));
};


const errorHandler = (error, req, res, next) => {

  // Terminal pe poora error print karo!
  console.error('─────────────────────────────────')
  console.error('❌ ERROR:', error.name)
  console.error('📝 MESSAGE:', error.message)
  console.error('📍 STACK:', error.stack)
  console.error('─────────────────────────────────')

  const normalizedError = normalizeError(error)

  const response = {
    success: false,
    status: normalizedError.status,
    statusCode: normalizedError.statusCode,
    error: normalizedError.name,
    message: normalizedError.message,
  }

  if (normalizedError.details) {
    response.details = normalizedError.details
  }

  // Development mein stack trace bhi bhejo
  if (isDevelopment) {
    response.stack = normalizedError.stack
  }

  res.status(normalizedError.statusCode).json(response)
}


module.exports = {
  errorHandler,
  notFoundHandler,
};
