// Central API & Socket URL config
// In production: VITE_API_URL = your Render backend URL (e.g. https://printo-backend.onrender.com)
// In development: falls back to empty string (uses Vite proxy -> localhost:5000)

export const API_BASE = import.meta.env.VITE_API_URL || '';
export const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;
