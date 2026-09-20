/**
 * Error Handler Forwarder
 * Re-exports errorMiddleware for backward compatibility with existing route references.
 */

import { errorMiddleware } from './error.middleware.js';

export { errorMiddleware, errorMiddleware as errorHandler };
export default errorMiddleware;
