// Base API & Backend URL configuration
// In development: defaults to http://localhost:3000 if VITE_API_URL is not set
// In production: defaults to '' (relative path /api, handled by Nginx reverse proxy)
export const BACKEND_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.DEV ? 'http://localhost:3000' : '');

export const API_BASE_URL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';
export const API = API_BASE_URL;

export default API;
