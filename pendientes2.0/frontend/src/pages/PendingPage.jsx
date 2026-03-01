import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    getPendientes, addPendiente, updatePendiente, deletePendiente, notifyPendiente,
    getPendienteTasks, addPendienteTask, addPendienteTasksBulk, updatePendienteTask, deletePendienteTask, completePendiente,
    getClientes, addSupportNote, addGlobalTask
} from '../api';
import {
    Plus, Trash2, Edit2, Bell, X, Calendar as CalendarIcon, Send,
    CheckSquare, Square, Building2, Clock, ChevronRight, Check,
    BookOpen, Sparkles, ListTodo, Globe, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Badge, SearchInput } from '../components/ui';

// ─── Retroalimentación Modal ──────────────────────────────────────────────────
const RetroModal = ({ pendiente, tasks, onSave, onClose }) => {
    const completedDate = new Date().toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const defaultTitle = `Soporte completado: ${pendiente.actividad || pendiente.empresa || 'Pendiente'}`;
    const defaultContent = [
        `✅ Completado el ${completedDate}`,
        '',
        pendiente.observaciones ? `📋 Observaciones:\n${pendiente.observaciones}` : '',
        tasks.length > 0 ? `\n📝 Tareas realizadas:\n${tasks.map(t => `- ${t.description}`).join('\n')}` : '',
    ].filter(Boolean).join('\n').trim();

    const [title, setTitle] = useState(defaultTitle);
    const [content, setContent] = useState(defaultContent);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 24 }}
                className="bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-indigo-500/20 p-5 flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl shrink-0">
                        <Sparkles size={20} className="text-indigo-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-white text-lg">Retroalimentación</h2>
                        <p className="text-indigo-300/70 text-xs mt-0.5">Se guardará como nota de soporte</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors shrink-0">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Título</label>
                        <input
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Descripción</label>
                        <textarea
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-mono resize-none h-40"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-sm font-medium"
                        >
                            Omitir
                        </button>
                        <button
                            onClick={() => onSave(title, content)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 text-sm"
                        >
                            <BookOpen size={15} />
                            Guardar Nota de Soporte
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ─── Global Task Exclusion Modal ──────────────────────────────────────────────
const GlobalExcludeModal = ({ clientes, onConfirm, onClose }) => {
    const [excluded, setExcluded] = useState(new Set());

    const toggle = (id) => {
        const s = new Set(excluded);
        if (s.has(id)) s.delete(id); else s.add(id);
        setExcluded(s);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
                <div className="bg-indigo-600/10 border-b border-slate-700 p-4 flex items-center gap-3">
                    <Globe size={18} className="text-indigo-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-white">Tarea Global</h2>
                        <p className="text-slate-400 text-xs mt-0.5">Elige qué clientes EXCLUIR</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white shrink-0"><X size={18} /></button>
                </div>
                <div className="p-4 max-h-72 overflow-y-auto space-y-1 custom-scrollbar">
                    {clientes.map(c => (
                        <div key={c.id} onClick={() => toggle(c.id)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${excluded.has(c.id) ? 'opacity-40' : 'bg-slate-800/50'}`}>
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${excluded.has(c.id) ? 'border-slate-600 bg-slate-800' : 'bg-indigo-500 border-indigo-500'}`}>
                                {!excluded.has(c.id) && <Check size={12} className="text-white" />}
                            </div>
                            <span className="text-sm font-medium text-slate-200 min-w-0 truncate">{c.empresa}</span>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-700 flex gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                    <button
                        onClick={() => onConfirm(Array.from(excluded))}
                        className="flex-1 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all active:scale-95"
                    >
                        Confirmar ({clientes.length - excluded.size} clientes)
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// ─── Task List Panel ───────────────────────────────────────────────────────────
const TaskPanel = ({ pendiente, onTasksChange, onComplete }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newDesc, setNewDesc] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editDesc, setEditDesc] = useState('');
    const inputRef = useRef(null);

    const fetchTasks = useCallback(async () => {
        if (!pendiente) return;
        setLoading(true);
        try {
            const res = await getPendienteTasks(pendiente.id);
            setTasks(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [pendiente?.id]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const handleAdd = async (e) => {
        e.preventDefault();
        const desc = newDesc.trim();
        if (!desc) return;
        const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);
        setNewDesc('');
        try {
            if (lines.length > 1) {
                await addPendienteTasksBulk(pendiente.id, lines);
            } else {
                await addPendienteTask(pendiente.id, lines[0]);
            }
            await fetchTasks();
            onTasksChange?.();
        } catch (e) {
            toast.error('Error al agregar tarea');
        }
    };

    const toggleTask = async (task) => {
        const newCompleted = !task.completed;
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t));
        try {
            await updatePendienteTask(pendiente.id, task.id, { completed: newCompleted, description: task.description });
            await fetchTasks();
            onTasksChange?.();
        } catch (e) {
            toast.error('Error al actualizar');
            fetchTasks();
        }
    };

    const removeTask = async (task) => {
        setTasks(prev => prev.filter(t => t.id !== task.id));
        try {
            await deletePendienteTask(pendiente.id, task.id);
            onTasksChange?.();
        } catch (e) {
            toast.error('Error al eliminar');
            fetchTasks();
        }
    };

    const saveEdit = async (task) => {
        if (!editDesc.trim()) return;
        try {
            await updatePendienteTask(pendiente.id, task.id, { completed: task.completed, description: editDesc.trim() });
            setEditingId(null);
            fetchTasks();
        } catch (e) {
            toast.error('Error al editar');
        }
    };

    const allDone = tasks.length > 0 && tasks.every(t => t.completed);
    const completedCount = tasks.filter(t => t.completed).length;

    if (!pendiente) return (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-3 p-8">
            <ListTodo size={44} className="opacity-20" />
            <p className="text-sm">Selecciona un pendiente para ver sus tareas</p>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Panel Header */}
            <div className="p-4 md:p-5 border-b border-slate-800 shrink-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base md:text-lg font-bold text-white truncate">{pendiente.actividad}</h2>
                        <div className="flex flex-wrap gap-3 mt-1">
                            {pendiente.empresa && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <Building2 size={11} />{pendiente.empresa}
                                </span>
                            )}
                            {pendiente.fecha_limite && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock size={11} />Vence: {pendiente.fecha_limite}
                                </span>
                            )}
                        </div>
                    </div>
                    <Badge status={pendiente.estado} dark className="shrink-0 mt-0.5" />
                </div>

                {pendiente.observaciones && (
                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap mt-2">
                        <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">Observaciones · </span>
                        {pendiente.observaciones}
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {tasks.length > 0 && (
                <div className="px-5 pt-4 shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Tareas · {completedCount}/{tasks.length}
                        </span>
                        {allDone && (
                            <span className="text-xs font-bold text-emerald-400 animate-pulse">¡Todo listo!</span>
                        )}
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                            animate={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            )}

            {/* Task list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 min-h-0 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-slate-600 text-sm">Cargando tareas...</div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2">
                        <ListTodo size={30} className="opacity-30" />
                        <p className="text-sm italic">Sin tareas registradas</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {tasks.map(task => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12, height: 0 }}
                                className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                    task.completed
                                        ? 'bg-emerald-500/5 border-emerald-500/10'
                                        : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60'
                                }`}
                            >
                                <button
                                    onClick={() => toggleTask(task)}
                                    className={`mt-0.5 shrink-0 transition-colors ${task.completed ? 'text-emerald-400' : 'text-slate-600 hover:text-blue-400'}`}
                                >
                                    {task.completed ? <CheckSquare size={17} /> : <Square size={17} />}
                                </button>

                                {editingId === task.id ? (
                                    <div className="flex-1 flex gap-2 min-w-0">
                                        <input
                                            autoFocus
                                            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-blue-500 min-w-0"
                                            value={editDesc}
                                            onChange={e => setEditDesc(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') saveEdit(task);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                        />
                                        <button onClick={() => saveEdit(task)} className="text-blue-400 hover:text-blue-300 text-xs font-bold px-2 shrink-0">✓</button>
                                        <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-white text-xs px-1 shrink-0">✕</button>
                                    </div>
                                ) : (
                                    <span className={`flex-1 text-sm leading-relaxed min-w-0 ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                        {task.description}
                                    </span>
                                )}

                                {editingId !== task.id && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button
                                            onClick={() => { setEditingId(task.id); setEditDesc(task.description); }}
                                            className="p-1 text-slate-500 hover:text-blue-400 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={13} />
                                        </button>
                                        <button
                                            onClick={() => removeTask(task)}
                                            className="p-1 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Add Task */}
            {pendiente.estado !== 'Finalizado' && (
                <div className="px-5 pb-3 shrink-0 border-t border-slate-800 pt-3">
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <textarea
                            ref={inputRef}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none transition-all min-w-0"
                            placeholder="Nueva tarea (Enter = agregar, Shift+Enter = nueva línea para varias)"
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                            rows={1}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAdd(e);
                                }
                            }}
                        />
                        <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all active:scale-95 shrink-0">
                            <Plus size={18} />
                        </button>
                    </form>
                </div>
            )}

            {/* Complete Button */}
            {pendiente.estado !== 'Finalizado' && (
                <div className="px-5 pb-5 shrink-0">
                    <button
                        onClick={() => onComplete(tasks)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] text-sm"
                    >
                        <Check size={17} />
                        Marcar Pendiente como Completado
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Main PendingPage ──────────────────────────────────────────────────────────
const PendingPage = () => {
    const [searchParams] = useSearchParams();
    const [pendientes, setPendientes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [retroModal, setRetroModal] = useState(null);
    const [globalExcludeModal, setGlobalExcludeModal] = useState(null);
    const [showCC, setShowCC] = useState(false);

    const emptyForm = {
        fecha: new Date().toISOString().split('T')[0],
        actividad: '',
        descripcion: '',
        empresa: '',
        estado: 'Pendiente',
        observaciones: '',
        fecha_limite: '',
        email_notificacion: '',
        cc_emails: '',
        dias_antes_notificacion: 3
    };
    const [formData, setFormData] = useState(emptyForm);
    const [taskLines, setTaskLines] = useState('');

    const selectedPendiente = pendientes.find(p => p.id === selectedId) || null;

    useEffect(() => {
        fetchAll();
        const paramId = searchParams.get('pendiente');
        if (paramId) setSelectedId(parseInt(paramId));
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [pRes, cRes] = await Promise.all([getPendientes(), getClientes()]);
            setPendientes(pRes.data);
            setClientes(cRes.data);
            const paramId = searchParams.get('pendiente');
            if (paramId) setSelectedId(parseInt(paramId));
        } catch (e) {
            toast.error('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Guardando...');
        try {
            let res;
            const payload = { ...formData };
            if (editingItem) {
                await updatePendiente(editingItem.id, payload);
                toast.success('Pendiente actualizado', { id: toastId });
                res = { data: { id: editingItem.id } };
            } else {
                res = await addPendiente(payload);
                toast.success('Pendiente creado', { id: toastId });
            }
            const newId = res?.data?.id || editingItem?.id;
            if (newId && taskLines.trim()) {
                const lines = taskLines.split('\n').map(l => l.trim().replace(/^[-•]\s*/, '')).filter(Boolean);
                if (lines.length > 0) await addPendienteTasksBulk(newId, lines);
            }
            if (!payload.empresa && !editingItem) {
                setGlobalExcludeModal({ pendienteId: newId, taskLines });
            }
            setModalOpen(false);
            setEditingItem(null);
            setFormData(emptyForm);
            setTaskLines('');
            setShowCC(false);
            await fetchAll();
            if (newId) setSelectedId(newId);
        } catch (error) {
            toast.error('Error al guardar', { id: toastId });
        }
    };

    const handleGlobalConfirm = async (excludedIds) => {
        const { pendienteId } = globalExcludeModal;
        setGlobalExcludeModal(null);
        const currentTasks = (await getPendienteTasks(pendienteId)).data;
        for (const task of currentTasks) {
            try { await addGlobalTask({ description: task.description, excludedClientIds: excludedIds }); } catch { }
        }
        toast.success('Tarea global asignada a clientes');
    };

    const handleDelete = (id) => {
        toast.custom((t) => (
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-2xl w-[340px]">
                <h3 className="font-bold text-white mb-2">¿Eliminar Pendiente?</h3>
                <p className="text-slate-400 text-sm mb-4">Esta acción eliminará el pendiente y todas sus tareas permanentemente.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => toast.dismiss(t)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white">Cancelar</button>
                    <button onClick={async () => {
                        toast.dismiss(t);
                        await deletePendiente(id);
                        if (selectedId === id) setSelectedId(null);
                        fetchAll();
                        toast.success('Pendiente eliminado');
                    }} className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors">Confirmar</button>
                </div>
            </div>
        ));
    };

    const handleNotify = (item) => {
        toast.custom((t) => (
            <div className="flex flex-col w-[360px] bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden">
                <div className="bg-slate-800/50 p-4 border-b border-slate-700/50 flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg ring-1 ring-blue-500/20 shrink-0">
                        <Send size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm">Confirmar Envío</h3>
                        <p className="text-slate-400 text-[11px]">Recordatorio por correo</p>
                    </div>
                    <button onClick={() => toast.dismiss(t)} className="text-slate-500 hover:text-white p-1 shrink-0"><X size={15} /></button>
                </div>
                <div className="p-4 space-y-2.5">
                    <div className="flex items-center gap-2.5 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-sm text-slate-200 truncate">{item.email_notificacion || item.emailNotificacion}</span>
                    </div>
                    {item.cc_emails && (
                        <div className="flex flex-wrap gap-1 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                            {item.cc_emails.split(',').map((email, i) => (
                                <span key={i} className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">{email.trim()}</span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
                    <button onClick={() => toast.dismiss(t)} className="px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                    <button onClick={async () => {
                        toast.dismiss(t);
                        const id2 = toast.loading('Enviando...');
                        try {
                            const res = await notifyPendiente(item.id);
                            toast.success(res.data.message, { id: id2 });
                        } catch (error) {
                            toast.error(error.response?.data?.error || 'Error', { id: id2 });
                        }
                    }} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition-all">
                        <Send size={13} /> Enviar
                    </button>
                </div>
            </div>
        ), { duration: Infinity, unstyled: true });
    };

    const handleComplete = async (tasks) => {
        if (!selectedPendiente) return;
        setRetroModal({ pendiente: selectedPendiente, tasks });
    };

    const handleRetroSave = async (title, content) => {
        const toastId = toast.loading('Completando pendiente...');
        try {
            await completePendiente(selectedPendiente.id);
            await addSupportNote({ title, content });
            toast.success('Pendiente completado y nota guardada', { id: toastId });
        } catch (e) {
            toast.error('Error', { id: toastId });
        } finally {
            setRetroModal(null);
            fetchAll();
        }
    };

    const handleRetroClose = async () => {
        const toastId = toast.loading('Completando pendiente...');
        try {
            await completePendiente(selectedPendiente.id);
            toast.success('Pendiente completado', { id: toastId });
        } catch (e) {
            toast.error('Error', { id: toastId });
        } finally {
            setRetroModal(null);
            fetchAll();
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ ...emptyForm, ...item });
            setShowCC(!!item.cc_emails);
        } else {
            setEditingItem(null);
            setFormData(emptyForm);
            setTaskLines('');
            setShowCC(false);
        }
        setModalOpen(true);
    };

    const filtered = pendientes.filter(p =>
        (p.actividad || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.empresa || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] gap-0 pb-20 md:pb-0">
            <Toaster position="top-center" theme="dark" richColors />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pendientes</h1>
                    <p className="text-slate-500 text-xs mt-0.5">Gestión de tareas y recordatorios</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 font-medium text-sm"
                >
                    <Plus size={17} />
                    Nuevo Pendiente
                </button>
            </div>

            {/* Split Panel */}
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                {/* LEFT: Pendientes List */}
                <div className="w-full md:w-80 lg:w-96 shrink-0 flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-3 border-b border-slate-800 shrink-0">
                        <SearchInput
                            dark
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar..."
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center py-12 text-slate-600 text-sm">Cargando...</div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-2">
                                <AlertCircle size={30} className="opacity-20" />
                                <p className="text-sm">Sin pendientes</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/50">
                                {filtered.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedId(item.id)}
                                        className={`w-full text-left p-4 transition-all hover:bg-slate-800/50 group relative ${selectedId === item.id ? 'bg-blue-600/10 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                                    >
                                        {selectedId === item.id && (
                                            <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400" />
                                        )}
                                        <div className="flex items-start justify-between gap-2 pr-4">
                                            <span className={`text-sm font-semibold leading-snug ${selectedId === item.id ? 'text-white' : 'text-slate-300'}`}>
                                                {item.actividad}
                                            </span>
                                            <Badge status={item.estado} dark size="xs" className="shrink-0 mt-0.5" />
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-1.5">
                                            {item.empresa && (
                                                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                                    <Building2 size={10} />{item.empresa}
                                                </span>
                                            )}
                                            {item.fecha_limite && (
                                                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                                    <Clock size={10} />{item.fecha_limite}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            {(item.email_notificacion || item.emailNotificacion) && (
                                                <button onClick={() => handleNotify(item)} className="p-1 text-slate-500 hover:text-emerald-400 rounded transition-colors" title="Notificar">
                                                    <Send size={12} />
                                                </button>
                                            )}
                                            <button onClick={() => openModal(item)} className="p-1 text-slate-500 hover:text-blue-400 rounded transition-colors">
                                                <Edit2 size={12} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Task Panel (desktop) */}
                <div className="hidden md:flex flex-1 flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden min-w-0">
                    <TaskPanel
                        pendiente={selectedPendiente}
                        onTasksChange={fetchAll}
                        onComplete={handleComplete}
                    />
                </div>
            </div>

            {/* Mobile Task View */}
            {selectedId && (
                <div className="md:hidden mt-3 shrink-0 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden max-h-[50vh] flex flex-col">
                    <TaskPanel
                        pendiente={selectedPendiente}
                        onTasksChange={fetchAll}
                        onComplete={handleComplete}
                    />
                </div>
            )}

            {/* New/Edit Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/70 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden mb-8"
                        >
                            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    {editingItem
                                        ? <Edit2 size={17} className="text-blue-400" />
                                        : <Plus size={17} className="text-blue-400" />
                                    }
                                    {editingItem ? 'Editar Pendiente' : 'Nuevo Pendiente'}
                                </h2>
                                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actividad / Asunto</label>
                                    <input
                                        autoFocus required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        placeholder="Ej: Renovar dominio cliente X"
                                        value={formData.actividad}
                                        onChange={e => setFormData({ ...formData, actividad: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Building2 size={11} /> Empresa
                                        <span className="text-slate-600 font-normal normal-case">(vacío = global)</span>
                                    </label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:border-blue-500 outline-none transition-all appearance-none"
                                        value={formData.empresa}
                                        onChange={e => setFormData({ ...formData, empresa: e.target.value })}
                                    >
                                        <option value="">🌐 Sin empresa (global)</option>
                                        {clientes.map(c => (
                                            <option key={c.id} value={c.empresa}>{c.empresa}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:border-blue-500 outline-none appearance-none"
                                        value={formData.estado}
                                        onChange={e => setFormData({ ...formData, estado: e.target.value })}
                                    >
                                        <option value="Pendiente">🟡 Pendiente</option>
                                        <option value="En Curso">🔵 En Curso</option>
                                        <option value="Finalizado">🟢 Finalizado</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observaciones</label>
                                    <textarea
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:border-blue-500 outline-none h-20 resize-none transition-all placeholder-slate-600"
                                        placeholder="Contexto, detalles adicionales..."
                                        value={formData.observaciones || ''}
                                        onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                                    />
                                </div>

                                {!editingItem && (
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <ListTodo size={11} /> Tareas iniciales
                                            <span className="text-slate-600 font-normal normal-case">(una por línea)</span>
                                        </label>
                                        <textarea
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:border-blue-500 outline-none h-24 resize-none font-mono text-sm placeholder-slate-600 transition-all"
                                            placeholder={"- Instalar actualizaciones\n- Revisar backups\n- Verificar SSL"}
                                            value={taskLines}
                                            onChange={e => setTaskLines(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-2 border-t border-slate-800" />

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Límite</label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={15} />
                                        <input
                                            type="date"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 focus:border-blue-500 outline-none [color-scheme:dark] text-slate-200"
                                            value={formData.fecha_limite}
                                            onChange={e => setFormData({ ...formData, fecha_limite: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Días Anticipación</label>
                                    <input
                                        type="number" min="0"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-slate-200"
                                        value={formData.dias_antes_notificacion}
                                        onChange={e => setFormData({ ...formData, dias_antes_notificacion: parseInt(e.target.value) })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Notificación</label>
                                        <button type="button" onClick={() => setShowCC(!showCC)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                            {showCC ? 'Ocultar CC' : '+ CC'}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Bell className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={14} />
                                        <input
                                            type="email"
                                            placeholder="correo@ejemplo.com"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 focus:border-blue-500 outline-none text-slate-200"
                                            value={formData.email_notificacion}
                                            onChange={e => setFormData({ ...formData, email_notificacion: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {showCC && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CC <span className="font-normal lowercase text-slate-600">(separar por comas)</span></label>
                                        <input
                                            type="text"
                                            placeholder="cc1@mail.com, cc2@mail.com"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none text-slate-200"
                                            value={formData.cc_emails || ''}
                                            onChange={e => setFormData({ ...formData, cc_emails: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-2 flex justify-end gap-3 pt-1">
                                    <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium text-sm">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="px-7 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm">
                                        {editingItem ? 'Guardar Cambios' : 'Crear Pendiente'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Retroalimentación Modal */}
            <AnimatePresence>
                {retroModal && (
                    <RetroModal
                        pendiente={retroModal.pendiente}
                        tasks={retroModal.tasks}
                        onSave={handleRetroSave}
                        onClose={handleRetroClose}
                    />
                )}
            </AnimatePresence>

            {/* Global Exclude Modal */}
            <AnimatePresence>
                {globalExcludeModal && (
                    <GlobalExcludeModal
                        clientes={clientes}
                        onConfirm={handleGlobalConfirm}
                        onClose={() => setGlobalExcludeModal(null)}
                        pendienteData={globalExcludeModal}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default PendingPage;
