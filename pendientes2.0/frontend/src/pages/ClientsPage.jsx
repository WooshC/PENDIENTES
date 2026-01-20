import React, { useEffect, useState } from 'react';
import { getClientes, addCliente, updateCliente, deleteCliente, getClientTasks, addClientTask, updateTaskStatus, deleteTask, createPendingTasks } from '../api';
import { Plus, Search, Trash2, Edit2, ChevronDown, ChevronRight, CheckSquare, Square, Briefcase, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClientsPage = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedClient, setExpandedClient] = useState(null); // ID of expanded client

    // Modal state for Add/Edit Client
    const [clientModalOpen, setClientModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [clientFormData, setClientFormData] = useState({ empresa: '', observaciones: '', procedimiento: '', check_estado: false, estado: 'Pendiente' });

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async () => {
        setLoading(true);
        try {
            const res = await getClientes();
            setClientes(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleClientSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingClient) {
                await updateCliente(editingClient.id, clientFormData);
            } else {
                await addCliente(clientFormData);
            }
            setClientModalOpen(false);
            setEditingClient(null);
            fetchClientes();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteClient = async (id) => {
        if (!confirm('¿Eliminar cliente y todas sus tareas?')) return;
        await deleteCliente(id);
        fetchClientes();
    };

    const filtered = clientes.filter(c => c.empresa.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Gestión de Clientes
                    </h1>
                    <p className="text-slate-400 mt-1">Administra empresas y sus listas de tareas recurrentes</p>
                </div>
                <button
                    onClick={() => { setEditingClient(null); setClientFormData({ empresa: '', observaciones: '', procedimiento: '', check_estado: false, estado: 'Pendiente' }); setClientModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-95 font-medium"
                >
                    <Plus size={20} />
                    Nuevo Cliente
                </button>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50 flex items-center gap-3">
                <Search className="text-slate-500" size={20} />
                <input
                    type="text"
                    placeholder="Buscar empresa..."
                    className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-4">
                {loading ? <p className="text-slate-500 text-center py-10">Cargando clientes...</p> :
                    filtered.map(client => (
                        <ClientCard
                            key={client.id}
                            client={client}
                            isExpanded={expandedClient === client.id}
                            onExpand={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                            onEdit={() => { setEditingClient(client); setClientFormData(client); setClientModalOpen(true); }}
                            onDelete={() => handleDeleteClient(client.id)}
                        />
                    ))
                }
            </div>

            {/* Client Modal */}
            <AnimatePresence>
                {clientModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
                            <h2 className="text-xl font-bold mb-4">{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                            <form onSubmit={handleClientSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-400 uppercase">Empresa</label>
                                    <input className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 outline-none focus:border-emerald-500" value={clientFormData.empresa} onChange={e => setClientFormData({ ...clientFormData, empresa: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-400 uppercase">Observaciones</label>
                                    <textarea className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 outline-none focus:border-emerald-500" value={clientFormData.observaciones} onChange={e => setClientFormData({ ...clientFormData, observaciones: e.target.value })} />
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setClientModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                                    <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">Guardar</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ClientCard = ({ client, isExpanded, onExpand, onEdit, onDelete }) => {
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'bulk'

    // Creation to Pending logic
    const [convertModalOpen, setConvertModalOpen] = useState(false);
    const [convertData, setConvertData] = useState({ email: '', dias: 3, fecha: '' });

    useEffect(() => {
        if (isExpanded) loadTasks();
    }, [isExpanded]);

    const loadTasks = async () => {
        setLoadingTasks(true);
        try {
            const res = await getClientTasks(client.id);
            setTasks(res.data);
        } catch (e) { console.error(e); }
        finally { setLoadingTasks(false); }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskDesc.trim()) return;
        await addClientTask(client.id, newTaskDesc);
        setNewTaskDesc('');
        loadTasks();
    };

    const handleBulkAdd = async () => {
        const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return;
        await import('../api').then(m => m.addClientTasksBulk(client.id, lines)); // dynamic import or just use api
        setBulkText('');
        setViewMode('list');
        loadTasks();
    };

    const toggleTask = async (task) => {
        // Optimistic update
        const newStatus = !task.completed;
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newStatus } : t));
        await updateTaskStatus(task.id, newStatus);
    };

    const removeTask = async (id) => {
        if (!confirm('Borrar tarea?')) return;
        await deleteTask(id);
        loadTasks();
    };

    const handleConvertToPending = async (e) => {
        e.preventDefault();
        try {
            const res = await createPendingTasks(client.id, {
                email: convertData.email,
                dias_antes_notificacion: convertData.dias,
                fecha_limite: convertData.fecha
            });
            alert(res.data.message);
            setConvertModalOpen(false);
        } catch (error) {
            alert(error.response?.data?.error || 'Error');
        }
    };

    return (
        <div className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'border-slate-800 hover:border-slate-700'}`}>
            <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={onExpand}>
                <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-90 bg-slate-800' : 'rotate-0'}`}>
                    <ChevronRight size={20} className="text-slate-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-200">{client.empresa}</h3>
                    <div className="flex gap-4 text-xs text-slate-500 mt-1">
                        <span>{client.total_tasks || 0} Tareas</span>
                        <span>{client.completed_tasks || 0} Completadas</span>
                    </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setConvertModalOpen(true)} className="p-2 text-slate-400 hover:text-blue-400" title="Convertir pendientes a Agenda"><Calendar size={18} /></button>
                    <button onClick={onEdit} className="p-2 text-slate-400 hover:text-emerald-400"><Edit2 size={18} /></button>
                    <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-400"><Trash2 size={18} /></button>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-slate-950/30 border-t border-slate-800">
                        <div className="p-4 sm:p-6 space-y-4">
                            {/* Task Input Area */}
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-xs rounded-md ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}>Simple</button>
                                <button onClick={() => setViewMode('bulk')} className={`px-3 py-1 text-xs rounded-md ${viewMode === 'bulk' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}>Masivo</button>
                            </div>

                            {viewMode === 'list' ? (
                                <form onSubmit={handleAddTask} className="flex gap-2">
                                    <input className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 outline-none focus:border-emerald-500" placeholder="Nueva tarea..." value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} />
                                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium">Agregar</button>
                                </form>
                            ) : (
                                <div className="space-y-2">
                                    <textarea className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 outline-none focus:border-emerald-500" placeholder="Pegar lista de tareas..." value={bulkText} onChange={e => setBulkText(e.target.value)} />
                                    <button onClick={handleBulkAdd} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium w-full">Procesar Importación</button>
                                </div>
                            )}

                            {/* Task List */}
                            <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
                                {loadingTasks ? <p className="text-center text-slate-500">Cargando...</p> :
                                    tasks.length === 0 ? <p className="text-center text-slate-600 italic">Sin tareas registradas</p> :
                                        tasks.map(task => (
                                            <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg group hover:bg-slate-900 transition-colors">
                                                <button onClick={() => toggleTask(task)} className={`transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-600 hover:text-emerald-500'}`}>
                                                    {task.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </button>
                                                <span className={`flex-1 text-sm ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{task.description}</span>
                                                <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                }
                            </div>
                        </div>

                        {/* Convert Modal Inline or Overlay? Overlay is cleaner */}
                        {convertModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                                <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                                    <h3 className="font-bold text-lg mb-4 text-blue-400">Crear Pendientes desde Tareas Incompletas</h3>
                                    <form onSubmit={handleConvertToPending} className="space-y-4">
                                        <div>
                                            <label className="text-xs uppercase text-slate-500">Email Notificación</label>
                                            <input required type="email" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 outline-none focus:border-blue-500" value={convertData.email} onChange={e => setConvertData({ ...convertData, email: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase text-slate-500">Fecha Límite (Opcional)</label>
                                            <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 outline-none focus:border-blue-500" value={convertData.fecha} onChange={e => setConvertData({ ...convertData, fecha: e.target.value })} />
                                        </div>
                                        <div className="flex justify-end gap-3 mt-4">
                                            <button type="button" onClick={() => setConvertModalOpen(false)} className="text-slate-400 hover:text-white">Cancelar</button>
                                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg">Generar</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientsPage;
