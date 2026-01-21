import React, { useEffect, useState } from 'react';
import { getPendientes, addPendiente, updatePendiente, deletePendiente, notifyPendiente } from '../api';
import { Plus, Search, Trash2, Edit2, Bell, X, Calendar as CalendarIcon, Send, MessageSquare, Clock, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';

const PendingPage = () => {
    const [pendientes, setPendientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
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
    });
    const [showCC, setShowCC] = useState(false);

    useEffect(() => {
        fetchPendientes();
    }, []);

    const fetchPendientes = async () => {
        try {
            setLoading(true);
            const res = await getPendientes();
            setPendientes(res.data);
        } catch (error) {
            console.error('Error fetching pendientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await updatePendiente(editingItem.id, formData);
                toast.success("Mensaje actualizado correctamente");
            } else {
                await addPendiente(formData);
                toast.success("Mensaje creado correctamente");
            }
            setModalOpen(false);
            setEditingItem(null);
            resetForm();
            fetchPendientes();
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Error al guardar. Revisa la consola.');
        }
    };

    const handleDelete = (id) => {
        toast.custom((t) => (
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-2xl w-[350px]">
                <h3 className="font-bold text-white mb-2">¿Eliminar Mensaje?</h3>
                <p className="text-slate-400 text-sm mb-4">Esta acción eliminará este pendiente permanentemente.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => toast.dismiss(t)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white">Cancelar</button>
                    <button onClick={async () => {
                        toast.dismiss(t);
                        try {
                            await deletePendiente(id);
                            toast.success('Mensaje eliminado');
                            fetchPendientes();
                        } catch (error) {
                            toast.error('Error al eliminar');
                        }
                    }} className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors">Confirmar</button>
                </div>
            </div>
        ));
    };

    const handleNotify = (item) => {
        toast.custom((t) => (
            <div className="flex flex-col w-[400px] bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden font-sans">
                {/* Header */}
                <div className="bg-slate-800/50 p-4 border-b border-slate-700/50 flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg ring-1 ring-blue-500/20">
                        <Send size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white text-sm tracking-tight">Confirmar Envío</h3>
                        <p className="text-slate-400 text-[11px] font-medium">Se enviará el recordatorio por correo.</p>
                    </div>
                    <button onClick={() => toast.dismiss(t)} className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-slate-700/50 rounded-lg"><X size={16} /></button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4 bg-slate-900/50">
                    {/* Para */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Destinatario</label>
                        <div className="flex items-center gap-2.5 p-2.5 bg-slate-950 rounded-xl border border-slate-800 group hover:border-slate-700 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-sm text-slate-200 truncate font-medium">{item.email_notificacion || item.emailNotificacion}</span>
                        </div>
                    </div>

                    {/* CC */}
                    {item.cc_emails && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">En Copia (CC)</label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                                {item.cc_emails.split(',').map((email, i) => (
                                    <span key={i} className="inline-flex items-center text-[11px] bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/50 select-all">
                                        {email.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={() => toast.dismiss(t)}
                        className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={async () => {
                            toast.dismiss(t);
                            const toastId = toast.loading("Enviando...");
                            try {
                                const res = await notifyPendiente(item.id);
                                toast.success(res.data.message, { id: toastId });
                            } catch (error) {
                                toast.error(error.response?.data?.error || 'Error enviando notificación', { id: toastId });
                            }
                        }}
                        className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                        <Send size={14} strokeWidth={2.5} />
                        Enviar Correo
                    </button>
                </div>
            </div>
        ), { duration: Infinity, unstyled: true });
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ ...item });
            setShowCC(!!item.cc_emails);
        } else {
            setEditingItem(null);
            resetForm();
            setShowCC(false);
        }
        setModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
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
        });
    };

    const filteredPendientes = pendientes.filter(item =>
        item.actividad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-24 md:pb-0">
            <Toaster position="top-center" theme="dark" richColors />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
                        <MessageSquare className="text-blue-500" size={28} />
                        <span className="hidden sm:inline">Centro de Mensajería</span>
                        <span className="sm:hidden">Mensajes</span>
                    </h1>
                    <p className="text-slate-400 mt-1 text-xs md:text-sm ml-0 sm:ml-11">Gestión de alertas y recordatorios</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/25 transition-all active:scale-95 font-medium text-sm md:text-base"
                >
                    <Plus size={20} />
                    Nuevo Mensaje
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-800/50 backdrop-blur-sm p-3 md:p-4 rounded-2xl border border-slate-700/50 flex items-center gap-3 shadow-inner">
                <Search className="text-slate-500 flex-shrink-0" size={20} />
                <input
                    type="text"
                    placeholder="Buscar en mensajes..."
                    className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 w-full text-sm md:text-base"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Message List Layout using Grid instead of Table for messaging feel */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <p className="text-center py-10 text-slate-500">Cargando mensajes...</p>
                ) : filteredPendientes.length === 0 ? (
                    <p className="text-center py-10 text-slate-500">No hay mensajes pendientes.</p>
                ) : (
                    filteredPendientes.map((item) => (
                        <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 hover:border-slate-700 transition-all shadow-sm hover:shadow-md group relative">
                            <div className="flex flex-col gap-4">
                                {/* Left Content */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                                        <h3 className="text-base md:text-lg font-semibold text-white">{item.actividad}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${item.estado === 'Completado' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            item.estado === 'En Curso' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>{item.estado}</span>
                                    </div>

                                    <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-slate-400">
                                        {item.empresa && (
                                            <div className="flex items-center gap-1.5">
                                                <Building2 size={16} className="flex-shrink-0" />
                                                <span className="truncate">{item.empresa}</span>
                                            </div>
                                        )}
                                        {item.fechaLimite && (
                                            <div className={`flex items-center gap-1.5 ${new Date(item.fechaLimite) < new Date() ? 'text-red-400 font-medium' : ''}`}>
                                                <Clock size={16} className="flex-shrink-0" />
                                                <span>Vence: {item.fechaLimite}</span>
                                            </div>
                                        )}
                                    </div>

                                    {item.descripcion && (
                                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 mt-3 shadow-inner">
                                            <p className="text-slate-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">{item.descripcion}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right Actions */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:border-t-0 border-t border-slate-800 pt-3 sm:pt-0">
                                    {/* Check both cases for email property to support legacy/new backend responses */}
                                    {(item.email_notificacion || item.emailNotificacion) ? (
                                        <div className="flex flex-col gap-2 flex-1">
                                            <button
                                                onClick={() => handleNotify(item)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white rounded-xl transition-all text-sm font-medium"
                                                title={`Enviar correo a ${item.email_notificacion || item.emailNotificacion}`}
                                            >
                                                <Send size={18} />
                                                <span>Enviar Ahora</span>
                                            </button>
                                            <span className="text-[10px] text-slate-600 truncate text-center sm:text-left">{item.email_notificacion || item.emailNotificacion}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-600 italic px-2 text-center sm:text-left">Sin correo</span>
                                    )}

                                    <div className="flex gap-2 justify-center sm:justify-start">
                                        <button onClick={() => openModal(item)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"><Edit2 size={18} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    {editingItem ? <Edit2 size={20} className="text-blue-500" /> : <Plus size={20} className="text-blue-500" />}
                                    {editingItem ? 'Editar Mensaje' : 'Nuevo Mensaje'}
                                </h2>
                                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto custom-scrollbar">

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asunto / Actividad</label>
                                    <input autoFocus required className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-lg font-medium text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-slate-600"
                                        placeholder="Ej: Renovar Dominio"
                                        value={formData.actividad} onChange={e => setFormData({ ...formData, actividad: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 focus:border-blue-500 outline-none transition-colors"
                                            placeholder="Nombre de la empresa"
                                            value={formData.empresa} onChange={e => setFormData({ ...formData, empresa: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</label>
                                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none appearance-none"
                                        value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })}>
                                        <option value="Pendiente">🟡 Pendiente</option>
                                        <option value="En Curso">🔵 En Curso</option>
                                        <option value="Completado">🟢 Completado</option>
                                    </select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensaje / Descripción</label>
                                    <textarea className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-blue-500 outline-none h-24 resize-none"
                                        placeholder="Detalles sobre este recordatorio..."
                                        value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                                </div>

                                {/* Modern Date Picker Trigger */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Límite</label>
                                    <div className="relative cursor-pointer group">
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 group-hover:text-blue-400 transition-colors" size={18} />
                                        <input
                                            type="date"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 focus:border-blue-500 outline-none cursor-pointer [color-scheme:dark]"
                                            value={formData.fecha_limite}
                                            onChange={e => setFormData({ ...formData, fecha_limite: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 border-t border-slate-800 my-2"></div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Notificación</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowCC(!showCC)}
                                            className="text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                                        >
                                            {showCC ? 'Ocultar CC' : '+ Agregar CC'}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Bell className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500" size={18} />
                                        <input type="email" placeholder="correo@ejemplo.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 focus:border-blue-500 outline-none"
                                            value={formData.email_notificacion} onChange={e => setFormData({ ...formData, email_notificacion: e.target.value })} />
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {showCC && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CC Emails <span className="text-[10px] lowercase font-normal text-slate-600">(separar por comas)</span></label>
                                                <div className="relative">
                                                    <Bell className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                                    <input type="text" placeholder="jefe@empresa.com, asistente@empresa.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 focus:border-blue-500 outline-none"
                                                        value={formData.cc_emails || ''} onChange={e => setFormData({ ...formData, cc_emails: e.target.value })} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Anticipación (Días)</label>
                                    <input type="number" min="0" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none"
                                        value={formData.dias_antes_notificacion} onChange={e => setFormData({ ...formData, dias_antes_notificacion: parseInt(e.target.value) })} />
                                </div>

                                <div className="md:col-span-2 pt-6 flex justify-end gap-3 mt-2">
                                    <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium">Cancelar</button>
                                    <button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transform active:scale-95 transition-all">
                                        {editingItem ? 'Guardar Cambios' : 'Crear Mensaje'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PendingPage;
