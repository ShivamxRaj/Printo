// Central API & Socket URL config
// In production: points directly to live Railway backend
// In local development: falls back to empty string (uses Vite proxy -> localhost:5000)

const isDev = import.meta.env.DEV;

export const API_BASE = import.meta.env.VITE_API_URL || (isDev ? '' : 'https://printo-production-7fad6f69.up.railway.app');
export const SOCKET_URL = import.meta.env.VITE_API_URL || (isDev ? window.location.origin : 'https://printo-production-7fad6f69.up.railway.app');

