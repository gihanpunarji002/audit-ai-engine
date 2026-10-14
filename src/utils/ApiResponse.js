import HttpStatus from '../constants/httpStatus.js';

export class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {*} data - Response data payload
   * @param {string} [message='Success'] - Response message
   */
  constructor(statusCode = HttpStatus.OK, data = null, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  static success(data, message = 'Success', statusCode = HttpStatus.OK) {
    return new ApiResponse(statusCode, data, message);
  }

  static created(data, message = 'Resource created successfully') {
    return new ApiResponse(HttpStatus.CREATED, data, message);
  }

  static noContent(message = 'Resource deleted successfully') {
    return new ApiResponse(HttpStatus.NO_CONTENT, null, message);
  }
}

export default ApiResponse;
