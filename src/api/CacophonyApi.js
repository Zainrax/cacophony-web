import { fetch } from "./fetch";
import config from "../config";

async function fetchJsonWithMethod(endpoint, method, body) {
  return fetch(`${config.api}${endpoint}`, {
    method: method,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  });
}

export default {
  /**
   * Returns a promise that when resolved, returns an object with a result, success boolean, and status code.
   * The result field is the JSON blob from the response body.
   * These fields can easily be resolved using object destructuring to directly assign the required information.
   * @param {string} endpoint - The cacophony API endpoint to target, for example `/api/v1/users`.
   * @returns {Promise<{result: *, success: boolean, status: number}>}
   */
  get: async endpoint => fetch(`${config.api}${endpoint}`, { method: "GET" }),

  /**
   * Returns a promise that when resolved, returns an object with a result, success boolean, and status code.
   * The result field is the JSON blob from the response body.
   * These fields can easily be resolved using object destructuring to directly assign the required information.
   * @param {string} endpoint - The cacophony API endpoint to target, for example `/api/v1/users`.
   * @param {*} [body] - An object to go in the request body that will be sent as JSON.
   * @returns {Promise<{result: *, success: boolean, status: number}>}
   */
  post: async (endpoint, body) => fetchJsonWithMethod(endpoint, "POST", body),

  /**
   * Returns a promise that when resolved, returns an object with a result, success boolean, and status code.
   * The result field is the JSON blob from the response body.
   * These fields can easily be resolved using object destructuring to directly assign the required information.
   * @param {string} endpoint - The cacophony API endpoint to target, for example `/api/v1/users`.
   * @param {*} [body] - An object to go in the request body that will be sent as JSON.
   * @returns {Promise<{result: *, success: boolean, status: number}>}
   */
  patch: async (endpoint, body) => fetchJsonWithMethod(endpoint, "PATCH", body),

  /**
   * Returns a promise that when resolved, returns an object with a result, success boolean, and status code.
   * The result field is the JSON blob from the response body.
   * These fields can easily be resolved using object destructuring to directly assign the required information.
   * @param {string} endpoint - The cacophony API endpoint to target, for example `/api/v1/users`.
   * @param {*} [body] - An object to go in the request body that will be sent as JSON.
   * @returns {Promise<{result: *, success: boolean, status: number}>}
   */
  delete: async (endpoint, body) =>
    fetchJsonWithMethod(endpoint, "DELETE", body)
};
