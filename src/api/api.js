import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

const AUTH_PROFILE_ROUTES = ['/api/auth/me', '/api/auth/profile', '/api/auth/usuario'];

async function getFromFirstAvailableRoute(routes) {
  let lastError = null;

  for (const route of routes) {
    try {
      return await api.get(route);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('No profile route available under /api/auth/**');
}

api.interceptors.request.use(async config => {
  let token = await AsyncStorage.getItem('token');
  if (!token && typeof window !== 'undefined' && window.localStorage) {
    token = window.localStorage.getItem('token');
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('api: no se encontró token para', config.url);
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';

    if (status === 401 && !url.includes('/api/auth/')) {
      await AsyncStorage.removeItem('token');
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('token');
      }
      // Limpiar también el header de axios
      delete api.defaults.headers.common['Authorization'];
    }
    return Promise.reject(error);
  }
);

// Exportar instancia para inyectar token directamente tras login
export { api as axiosInstance };

export default {
  login: (email, password) => api.post('/api/auth/login', { email, contrasena: password }),
  register: (data) => api.post('/api/auth/register', data),
  getProfile: async () => getFromFirstAvailableRoute(AUTH_PROFILE_ROUTES),
  // Reportes
  getReports: () => api.get('/api/reportes'),
  getReport: id => api.get(`/api/reportes/${id}`),
  createReport: data => api.post('/api/reportes', data),
  updateReport: (id, data) => api.put(`/api/reportes/${id}`, data),
  deleteReport: id => api.delete(`/api/reportes/${id}`),
  // Mascotas
  createMascota: data => api.post('/api/mascotas', data),
  updateMascota: (id, data) => api.put(`/api/mascotas/${id}`, data),
  // Contactos
  createContacto: data => api.post('/api/contactos', data),
  updateContacto: (id, data) => api.put(`/api/contactos/${id}`, data),
  // Catálogos
  getTiposReporte: () => api.get('/api/catalogos/tipos-reporte'),
  getEstatus: () => api.get('/api/catalogos/estatus'),
  getEspecies: () => api.get('/api/catalogos/especies'),
  getRazas: () => api.get('/api/catalogos/razas'),
  getSexos: () => api.get('/api/catalogos/sexos'),
  getMarcasDistintivas: () => api.get('/api/catalogos/marcas-distintivas'),
  getCanalesPreferencia: () => api.get('/api/catalogos/canales-preferencia'),
  // Geolocalización
  getComunas: () => api.get('/api/comunas'),
  getCoordenadas: () => api.get('/api/coordenadas'),
  createCoordenada: data => api.post('/api/coordenadas', data),
  updateCoordenada: (id, data) => api.put(`/api/coordenadas/${id}`, data),
  // Otros
  getGeo: params => api.get('/api/geo', { params }),
  getMatches: reportId => api.get('/api/matching', { params: { reportId } }),
  getMatchingReglas: () => api.get('/api/matching/reglas/activas'),
  getCoincidenciasPorReporte: id => api.get(`/api/matching/reportes/${id}`),
  syncCoincidencias: id => api.post(`/api/matching/sync/${id}`),
  crearSolicitudCoincidencia: data => api.post('/api/matching/solicitudes', data),
  procesarCoincidencia: id => api.post(`/api/matching/solicitudes/${id}/procesar`),
  obtenerResultadoCoincidencia: id => api.get(`/api/matching/solicitudes/${id}/resultado`),
  getNotifications: () => api.get('/api/notificaciones'),
  uploadMedia: data => api.post('/api/storage', data),
  health: () => api.get('/actuator/health'),
  info: () => api.get('/actuator/info'),
  gatewayInfo: () => api.get('/actuator/gateway')
};