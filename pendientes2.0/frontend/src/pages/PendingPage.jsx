import React, { useEffect, useState } from 'react';
import { getPendientes, addPendiente, updatePendiente, deletePendiente, notifyPendiente } from '../api';
import { Plus, Search, Trash2, Edit2, Bell, X, Calendar as CalendarIcon, Send, MessageSquare, Clock, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        dias_antes_notificacion: 3
    });

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
            } else {
                await addPendiente(formData);
            }
            setModalOpen(false);
            setEditingItem(null);
            resetForm();
            fetchPendientes();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar. Revisa la consola.');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este pendiente?')) return;
        try {
            await deletePendiente(id);
            fetchPendientes();
        } catch (error) {
            console.error(error);
        }
    };

    const handleNotify = async (id) => {
        if (!confirm('¿Enviar notificación manual ahora?')) return;
        try {
            const res = await notifyPendiente(id);
            alert(res.data.message);
        } catch (error) {
            alert(error.response?.data?.error || 'Error enviando notificación');
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ ...item });
        } else {
            setEditingItem(null);
            resetForm();
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
            dias_antes_notificacion: 3
        });
    };

    const filteredPendientes = pendientes.filter(item =>
        item.actividad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <MessageSquare className="text-blue-500" size={32} />
                        Centro de Mensajería
                    </h1>
                    <p className="text-slate-400 mt-1 ml-11">Gestión de alertas y recordatorios</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/25 transition-all active:scale-95 font-medium"
                >
                    <Plus size={20} />
                    Nuevo Mensaje
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50 flex items-center gap-3 shadow-inner">
                <Search className="text-slate-500" size={20} />
                <input
                    type="text"
                    placeholder="Buscar en mensajes..."
                    className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 w-full"
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
                        <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm hover:shadow-md group relative">
                            <div className="flex flex-col md:flex-row gap-4 justify-between">
                                {/* Left Content */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-semibold text-white">{item.actividad}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${item.estado === 'Completado' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            item.estado === 'En Curso' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>{item.estado}</span>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                        {item.empresa && (
                                            <div className="flex items-center gap-1.5">
                                                <Building2 size={16} />
                                                <span>{item.empresa}</span>
                                            </div>
                                        )}
                                        {item.fechaLimite && (
                                            <div className={`flex items-center gap-1.5 ${new Date(item.fechaLimite) < new Date() ? 'text-red-400 font-medium' : ''}`}>
                                                <Clock size={16} />
                                                <span>Vence: {item.fechaLimite}</span>
                                            </div>
                                        )}
                                    </div>

                                    {item.descripcion && (
                                        <p className="text-slate-500 text-sm mt-2 line-clamp-2">{item.descripcion}</p>
                                    )}
                                </div>

                                {/* Right Actions */}
                                <div className="flex items-center gap-3 md:border-l md:border-slate-800 md:pl-6">
                                    {(item.email_notificacion || item.emailNotificacion) ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <button
                                                onClick={() => handleNotify(item.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                                                title={`Enviar correo a ${item.email_notificacion || item.emailNotificacion}`}
                                            >
                                                <Send size={18} />
                                                <span className="font-medium">Enviar Ahora</span>
                                            </button>
                                            <span className="text-[10px] text-slate-600 max-w-[120px] truncate">{item.email_notificacion || item.emailNotificacion}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-600 italic px-2">Sin correo</span>
                                    )}

                                    <div className="flex gap-1 ml-2">
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
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Notificación</label>
                                    <div className="relative">
                                        <Bell className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500" size={18} />
                                        <input type="email" placeholder="correo@ejemplo.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 focus:border-blue-500 outline-none"
                                            value={formData.email_notificacion} onChange={e => setFormData({ ...formData, email_notificacion: e.target.value })} />
                                    </div>
                                </div>

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
