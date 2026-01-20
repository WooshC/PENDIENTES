
import axios from 'axios';

// Development: Proxy handled by Vite or direct URL
// Production: Served from same origin
const API_URL = import.meta.env.DEV ? 'http://localhost:5001/api' : '/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getPendientes = () => api.get('/pendientes');
export const addPendiente = (data) => api.post('/pendientes', data);
export const updatePendiente = (id, data) => api.put(`/pendientes/${id}`, data);
export const deletePendiente = (id) => api.delete(`/pendientes/${id}`);
export const notifyPendiente = (id) => api.post(`/notify/${id}`);

export const getClientes = () => api.get('/clientes');
export const addCliente = (data) => api.post('/clientes', data);
export const updateCliente = (id, data) => api.put(`/clientes/${id}`, data);
export const deleteCliente = (id) => api.delete(`/clientes/${id}`);

export const getClientTasks = (clientId) => api.get(`/clients/${clientId}/tasks`);
export const addClientTask = (clientId, description) => api.post(`/clients/${clientId}/tasks`, { description });
export const addClientTasksBulk = (clientId, tasks) => api.post(`/clients/${clientId}/tasks/bulk`, { tasks });
export const updateTaskStatus = (taskId, completed) => api.put(`/tasks/${taskId}`, { completed });
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);
export const addGlobalTask = (description) => api.post('/tasks/global', { description });
export const createPendingTasks = (clientId, data) => api.post(`/clients/${clientId}/create-pending-tasks`, data);

