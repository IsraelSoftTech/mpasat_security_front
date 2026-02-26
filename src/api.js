/**
 * API base URL for production (https://mpasat-security-back.onrender.com).
 * In development, empty string so relative URLs work with Vite proxy.
 */
export const API_BASE = import.meta.env.VITE_API_URL || ''
