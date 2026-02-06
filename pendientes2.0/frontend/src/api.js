import axios from 'axios';

// Ensure this matches your backend URL.
// Relative path for same-origin serving (production) or localhost for dev (if proxy setup, but let's stick to relative for the integrated build)
const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5002/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Pendientes
export const getPendientes = () => api.get('/pendientes');
export const addPendiente = (data) => api.post('/pendientes', data);
export const updatePendiente = (id, data) => api.put(`/pendientes/${id}`, data);
export const deletePendiente = (id) => api.delete(`/pendientes/${id}`);
export const notifyPendiente = (id) => api.post(`/notify/${id}`);

// Clientes
export const getClientes = () => api.get('/clientes');
export const addCliente = (data) => api.post('/clientes', data);
export const updateCliente = (id, data) => api.put(`/clientes/${id}`, data);
export const deleteCliente = (id) => api.delete(`/clientes/${id}`);
export const importClientesBulk = (clientes) => api.post('/clientes/bulk', clientes);

// Client Tasks
export const getClientTasks = (clientId) => api.get(`/clients/${clientId}/tasks`);
export const addClientTask = (clientId, description) => api.post(`/clients/${clientId}/tasks`, { description });
export const addClientTasksBulk = (clientId, tasks) => api.post(`/clients/${clientId}/tasks/bulk`, { tasks });
export const updateTaskStatus = (taskId, completed) => api.put(`/tasks/${taskId}`, { completed });
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);
export const addGlobalTask = (data) => api.post('/tasks/global', data);
export const createPendingTasks = (clientId, data) => api.post(`/clients/${clientId}/create-pending-tasks`, data);

// Check Notifications (Manual Trigger for Admin)
export const checkAllNotifications = () => api.post('/notifications/check-all');

// Support Notes
export const getSupportNotes = () => api.get('/supportnotes');
export const addSupportNote = (data) => api.post('/supportnotes', data);
export const updateSupportNote = (id, data) => api.put(`/supportnotes/${id}`, data);
export const deleteSupportNote = (id) => api.delete(`/supportnotes/${id}`);

// AI
export const askAi = (query) => api.post('/ai/ask', { query });
