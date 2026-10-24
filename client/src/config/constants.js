// Application constants and environment configuration

const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
const processEnv = typeof process !== 'undefined' ? process.env : undefined;

const rawApiUrl =
  metaEnv?.VITE_API_URL ||
  metaEnv?.VITE_API_BASE_URL ||
  processEnv?.VITE_API_URL ||
  processEnv?.VITE_API_BASE_URL ||
  'http://localhost:5000/api';

// Ensure standard /api suffix without duplicate trailing slashes
export const API_BASE_URL = rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;

export const APP_CONFIG = {
  name: 'ShopEasy',
  version: '1.0.0',
  description: 'Full-stack modern e-commerce platform',
};

export default { API_BASE_URL, APP_CONFIG };
