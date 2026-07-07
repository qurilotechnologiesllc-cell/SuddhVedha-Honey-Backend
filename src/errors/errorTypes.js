const AppError = require('./AppError');
const HTTP_STATUS = require('./httpStatusCodes');

class BadRequestError extends AppError {
  constructor(message = 'Bad request. Please check the request data.', details = null) {
    super(message, HTTP_STATUS.BAD_REQUEST, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized. Please login and try again.', details = null) {
    super(message, HTTP_STATUS.UNAUTHORIZED, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden. You do not have permission for this action.', details = null) {
    super(message, HTTP_STATUS.FORBIDDEN, details);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource', details = null) {
    super(`${resource} not found.`, HTTP_STATUS.NOT_FOUND, details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists.', details = null) {
    super(message, HTTP_STATUS.CONFLICT, details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed. Please provide valid data.', details = null) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, details);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests. Please try again later.', details = null) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, details);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable. Please try again later.', details = null) {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, details);
  }
}

module.exports = {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  ServiceUnavailableError,
};
