import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';


const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let memoryToken: string | null = localStorage.getItem('smartshelf_token');

export const setAuthToken = (token: string | null) => {
  memoryToken = token;
  if (token) {
    localStorage.setItem('smartshelf_token', token);
  } else {
    localStorage.removeItem('smartshelf_token');
  }
};

client.interceptors.request.use((config) => {
  if (memoryToken) {
    config.headers.Authorization = `Bearer ${memoryToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const detail = error.response.data?.detail || '';
      if (
        typeof detail === 'string' &&
        (detail.toLowerCase().includes('token') ||
          detail.toLowerCase().includes('unauthorized') ||
          detail.toLowerCase().includes('invalid'))
      ) {
        setAuthToken(null);
        localStorage.removeItem('smartshelf_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
