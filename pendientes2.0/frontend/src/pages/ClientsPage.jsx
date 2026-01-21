import React, { useEffect, useState } from 'react';
import { getClientes, addCliente, updateCliente, deleteCliente, getClientTasks, addClientTask, updateTaskStatus, deleteTask, createPendingTasks, addGlobalTask } from '../api';
import { Plus, Search, Trash2, Edit2, ChevronDown, CheckSquare, Square, FileSpreadsheet, Layers, Filter, X, Send, UserX, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ClientsPage = () => {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedClient, setExpandedClient] = useState(null);
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [showFilters, setShowFilters] = useState(false);

    // Modals
    const [clientModalOpen, setClientModalOpen] = useState(false);
    const [globalTaskModalOpen, setGlobalTaskModalOpen] = useState(false);

    // Forms
    const [editingClient, setEditingClient] = useState(null);
    const [clientFormData, setClientFormData] = useState({ empresa: '', observaciones: '', procedimiento: '', check_estado: false, estado: 'Pendiente' });

    // Global Task Form
    const [globalTaskDesc, setGlobalTaskDesc] = useState('');
    const [excludedClients, setExcludedClients] = useState(new Set());

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await getClientes();
            setClientes(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando clientes");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const getClientStatus = (client) => {
        if (!client.total_tasks || client.total_tasks === 0) return 'Sin Tareas';
        if (client.check_estado) return 'Finalizado';
        return client.estado || 'Pendiente';
    };

    const handleClientSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading("Guardando...");

        const payload = {
            ...clientFormData,
            check_estado: Boolean(clientFormData.check_estado),
            id: editingClient ? editingClient.id : 0
        };

        try {
            if (editingClient) {
                await updateCliente(editingClient.id, payload);
                toast.success("Cliente actualizado", { id: toastId });
            } else {
                await addCliente(payload);
                toast.success("Cliente creado", { id: toastId });
            }
            setClientModalOpen(false);
            setEditingClient(null);
            fetchClientes();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar", { id: toastId });
        }
    };

    const handleDeleteClient = async (id) => {
        toast.custom((t) => (
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-2xl w-[350px]">
                <h3 className="font-bold text-white mb-2">¿Eliminar Cliente?</h3>
                <p className="text-slate-400 text-sm mb-4">Esta acción eliminará la empresa y todas sus tareas asociadas.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => toast.dismiss(t)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white">Cancelar</button>
                    <button onClick={async () => {
                        toast.dismiss(t);
                        await deleteCliente(id);
                        fetchClientes();
                        toast.success("Cliente eliminado");
                    }} className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors">Confirmar</button>
                </div>
            </div>
        ));
    };

    const handleGlobalTaskSubmit = async () => {
        if (!globalTaskDesc.trim()) return toast.error("Describe la tarea");

        const toastId = toast.loading("Asignando tarea global...");
        try {
            await addGlobalTask({
                description: globalTaskDesc,
                excludedClientIds: Array.from(excludedClients)
            });
            toast.success(`Tarea asignada a ${clientes.length - excludedClients.size} clientes`, { id: toastId });
            setGlobalTaskModalOpen(false);
            setGlobalTaskDesc('');
            setExcludedClients(new Set());
            fetchClientes(); // Refresh counts
        } catch (error) {
            console.error(error);
            toast.error("Error asignando tarea", { id: toastId });
        }
    };

    const toggleExclusion = (id) => {
        const newSet = new Set(excludedClients);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExcludedClients(newSet);
    };

    const filtered = clientes.filter(c => {
        const matchesSearch = c.empresa.toLowerCase().includes(searchTerm.toLowerCase());
        const status = getClientStatus(c);
        const matchesFilter = statusFilter === 'Todos' || status === statusFilter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Directorio de Clientes</h1>
                    <p className="text-slate-400 mt-1 text-sm">Gestiona tus empresas contratadas y sus mantenimientos.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 font-bold text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all text-sm">
                        <FileSpreadsheet size={18} />
                        Excel
                    </button>
                    <button
                        onClick={() => setGlobalTaskModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 font-bold text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all text-sm"
                    >
                        <Layers size={18} />
                        Tarea Global
                    </button>
                    <button
                        onClick={() => { setEditingClient(null); setClientFormData({ empresa: '', observaciones: '', procedimiento: '', check_estado: false, estado: 'Pendiente' }); setClientModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 font-bold text-white rounded-xl shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all text-sm"
                    >
                        <Plus size={18} />
                        Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                        <Search className="text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente o empresa..."
                            className="bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 w-full text-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 shadow-sm transition-all ${showFilters || statusFilter !== 'Todos' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                        >
                            <Filter size={16} />
                            <span className="text-sm font-bold">{statusFilter}</span>
                            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden"
                                >
                                    {['Todos', 'Pendiente', 'Finalizado', 'En Curso', 'Sin Tareas'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => { setStatusFilter(status); setShowFilters(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-between ${statusFilter === status ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                                        >
                                            {status}
                                            {statusFilter === status && <Check size={14} />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 px-6 py-4 bg-slate-50 border-b border-slate-100 gap-4">
                    <div className="col-span-4 text-xs font-bold text-blue-600 uppercase tracking-wider">Empresa</div>
                    <div className="col-span-2 text-xs font-bold text-blue-600 uppercase tracking-wider text-center">Estado</div>
                    <div className="col-span-2 text-xs font-bold text-blue-600 uppercase tracking-wider">Tareas</div>
                    <div className="col-span-3 text-xs font-bold text-blue-600 uppercase tracking-wider">Observaciones</div>
                    <div className="col-span-1 text-xs font-bold text-blue-600 uppercase tracking-wider text-right">Acciones</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-40 text-slate-400">Cargando...</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex justify-center items-center h-40 text-slate-400 italic">No se encontraron clientes</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map(client => (
                                <ClientRow
                                    key={client.id}
                                    client={client}
                                    displayStatus={getClientStatus(client)}
                                    isExpanded={expandedClient === client.id}
                                    onExpand={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                                    onEdit={() => {
                                        setEditingClient(client);
                                        setClientFormData({ ...client, check_estado: Boolean(client.check_estado) });
                                        setClientModalOpen(true);
                                    }}
                                    onDelete={() => handleDeleteClient(client.id)}
                                    onTasksChange={() => fetchClientes(true)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* New/Edit Client Modal */}
            <AnimatePresence>
                {clientModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                            <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-800">{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                                <button onClick={() => setClientModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleClientSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nombre Empresa</label>
                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-700 font-medium" value={clientFormData.empresa} onChange={e => setClientFormData({ ...clientFormData, empresa: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Estado</label>
                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-700" value={clientFormData.estado} onChange={e => setClientFormData({ ...clientFormData, estado: e.target.value })}>
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Finalizado">Finalizado</option>
                                            <option value="En Curso">En Curso</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Procedimiento</label>
                                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-700" value={clientFormData.procedimiento} onChange={e => setClientFormData({ ...clientFormData, procedimiento: e.target.value })} placeholder="Ej. Actualizar tablas" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Observaciones</label>
                                    <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-700 h-24 resize-none" value={clientFormData.observaciones} onChange={e => setClientFormData({ ...clientFormData, observaciones: e.target.value })} placeholder="Detalles adicionales..." />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setClientModalOpen(false)} className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">Guardar Cambios</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Global Task Modal */}
            <AnimatePresence>
                {globalTaskModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="bg-indigo-600 p-6 flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Layers size={24} className="text-indigo-200" />
                                        Tarea Global
                                    </h2>
                                    <p className="text-indigo-100/80 text-sm mt-1">Asigna una tarea a múltiples clientes simultáneamente.</p>
                                </div>
                                <button onClick={() => setGlobalTaskModalOpen(false)} className="text-indigo-200 hover:text-white bg-white/10 p-1.5 rounded-lg hover:bg-white/20 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="p-6 flex-1 overflow-hidden flex flex-col">
                                <div className="mb-6">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Descripción de la Tarea</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-800 font-medium text-lg placeholder-slate-400"
                                        placeholder="Ej. Realizar respaldo mensual..."
                                        value={globalTaskDesc}
                                        onChange={e => setGlobalTaskDesc(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="p-3 border-b border-slate-200 bg-slate-100/50 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destinatarios ({clientes.length - excludedClients.size})</span>
                                        <span className="text-xs text-slate-400">Clic para excluir</span>
                                    </div>
                                    <div className="overflow-y-auto p-2 grid grid-cols-2 gap-2">
                                        {clientes.map(client => {
                                            const isExcluded = excludedClients.has(client.id);
                                            return (
                                                <div
                                                    key={client.id}
                                                    onClick={() => toggleExclusion(client.id)}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${isExcluded ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-indigo-200 shadow-sm'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isExcluded ? 'border-slate-400 text-transparent' : 'bg-indigo-500 border-indigo-500 text-white'}`}>
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                    <span className={`text-sm font-medium ${isExcluded ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{client.empresa}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                                <button onClick={() => setGlobalTaskModalOpen(false)} className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                                <button onClick={handleGlobalTaskSubmit} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                                    Asignar Tarea
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ClientRow = ({ client, displayStatus, isExpanded, onExpand, onEdit, onDelete, onTasksChange }) => {
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [newTaskDesc, setNewTaskDesc] = useState('');

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
        if (onTasksChange) onTasksChange();
    };

    const toggleTask = async (task) => {
        const newStatus = !task.completed;
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newStatus } : t));
        await updateTaskStatus(task.id, newStatus);
        if (onTasksChange) onTasksChange();
    };

    const removeTask = async (id) => {
        // Optimistic
        setTasks(prev => prev.filter(t => t.id !== id));
        await deleteTask(id);
        if (onTasksChange) onTasksChange();
    };

    const handleConvertToPending = async (e) => {
        e.preventDefault();

        if (!convertData.email || !convertData.email.includes('@')) {
            return toast.error("Ingresa un email válido");
        }

        const dias = parseInt(convertData.dias);
        if (isNaN(dias) || dias < 0) {
            return toast.error("Días de antelación inválido");
        }

        const toastId = toast.loading("Generando pendientes...");
        try {
            const payload = {
                email: convertData.email,
                dias_antes_notificacion: dias,
                fecha_limite: convertData.fecha || null
            };

            const res = await createPendingTasks(client.id, payload);
            toast.success(res.data.message || "Pendientes generados", { id: toastId });
            setConvertModalOpen(false);
        } catch (error) {
            console.error(error);
            let msg = "Error generando tareas";
            if (error.response?.data) {
                if (error.response.data.error) {
                    msg = error.response.data.error; // Custom error
                } else if (error.response.data.errors) {
                    // Validation errors
                    const validationErrors = Object.values(error.response.data.errors).flat();
                    msg = validationErrors.join(', ');
                }
            }
            toast.error(msg, { id: toastId });
        }
    };

    return (
        <div className="group bg-white hover:bg-slate-50 transition-colors">
            {/* Row Content */}
            <div className={`grid grid-cols-12 px-6 py-4 gap-4 items-center cursor-pointer ${isExpanded ? 'bg-blue-50/50' : ''}`} onClick={onExpand}>
                <div className="col-span-4 font-bold text-slate-700 flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={18} className="text-blue-500" /> : <div className="w-[18px]" />}
                    <span className="bg-blue-600/10 text-blue-700 px-2 py-0.5 rounded uppercase text-sm">{client.empresa}</span>
                </div>

                <div className="col-span-2 flex justify-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${displayStatus === 'Finalizado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        displayStatus === 'En Curso' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            displayStatus === 'Sin Tareas' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                'bg-blue-100 text-blue-600 border-blue-200'
                        }`}>
                        {displayStatus}
                    </span>
                </div>

                <div className="col-span-2 text-sm text-slate-600">
                    {client.tasks && client.tasks.length > 0 ? (
                        <ul className="list-disc pl-4 space-y-1">
                            {client.tasks.slice(0, 2).map((task, i) => (
                                <li key={i} className="truncate text-xs font-medium text-slate-700">{task}</li>
                            ))}
                            {client.tasks.length > 2 && (
                                <li className="text-[10px] text-slate-400 font-bold pl-1">+ {client.tasks.length - 2} más...</li>
                            )}
                        </ul>
                    ) : (
                        <span className="italic text-slate-400 text-xs">Sin tareas</span>
                    )}
                </div>

                <div className="col-span-3 text-sm font-bold text-slate-600 uppercase">
                    {client.observaciones || <span className="text-slate-300 font-normal normal-case">Sin observaciones</span>}
                </div>

                <div className="col-span-1 flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setConvertModalOpen(true)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Convertir a Pendientes">
                        <CheckSquare size={18} />
                    </button>
                    <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Edit2 size={18} />
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Expanded Area */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-slate-50 border-y border-slate-100 shadow-inner">
                        <div className="p-6 pl-12">
                            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <FileSpreadsheet size={16} className="text-blue-500" />
                                Lista de Tareas
                            </h4>

                            {/* Task List */}
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm max-w-3xl">
                                <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                                    {loadingTasks ? <span className="text-slate-400 text-sm">Cargando...</span> :
                                        tasks.length === 0 ? <span className="text-slate-400 text-sm italic">No hay tareas registradas.</span> :
                                            tasks.map(task => (
                                                <div key={task.id} className="flex items-center gap-3 group">
                                                    <button onClick={() => toggleTask(task)} className={task.completed ? "text-emerald-500" : "text-slate-300 hover:text-blue-500"}>
                                                        {task.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </button>
                                                    <span className={`text-sm flex-1 ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.description}</span>
                                                    <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                </div>
                                <form onSubmit={handleAddTask} className="flex items-center gap-2 border-t border-slate-100 pt-3">
                                    <input className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400" placeholder="+ Agregar nueva tarea..." value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} />
                                    <button type="submit" className="text-xs font-bold text-blue-600 hover:text-blue-500 uppercase">Agregar</button>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Convert Modal */}
            {convertModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm px-4" onClick={e => e.stopPropagation()}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg text-slate-800 mb-4">Generar Pendientes</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Email Notificación</label>
                                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:border-blue-500 outline-none text-slate-700" value={convertData.email} onChange={e => setConvertData({ ...convertData, email: e.target.value })} placeholder="correo@ejemplo.com" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Días Antelación</label>
                                <input type="number" min="1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:border-blue-500 outline-none text-slate-700" value={convertData.dias} onChange={e => setConvertData({ ...convertData, dias: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Fecha Límite</label>
                                <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:border-blue-500 outline-none text-slate-700" value={convertData.fecha} onChange={e => setConvertData({ ...convertData, fecha: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setConvertModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-lg">Cancelar</button>
                            <button onClick={handleConvertToPending} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-500/20">Generar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientsPage;
