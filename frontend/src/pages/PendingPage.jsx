
import React, { useEffect, useState } from 'react';
import { Plus, Bell, Trash2, Edit2, Search } from 'lucide-react';
import { getPendientes, addPendiente, updatePendiente, deletePendiente, notifyPendiente } from '../api';

export default function PendingPage() {
    const [pendientes, setPendientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Form State
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
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getPendientes();
            setPendientes(res.data);
        } catch (err) {
            console.error(err);
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
            setShowModal(false);
            setEditingItem(null);
            resetForm();
            loadData();
        } catch (err) {
            alert('Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar pendiente?')) return;
        try {
            await deletePendiente(id);
            loadData();
        } catch (err) {
            alert('Error al eliminar');
        }
    };

    const handleNotify = async (id) => {
        try {
            const res = await notifyPendiente(id);
            alert(res.data.message);
        } catch (err) {
            alert(err.response?.data?.error || 'Error al enviar notificación');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            fecha: item.fecha,
            actividad: item.actividad,
            descripcion: item.descripcion,
            empresa: item.empresa,
            estado: item.estado,
            observaciones: item.observaciones,
            fecha_limite: item.fecha_limite,
            email_notificacion: item.email_notificacion,
            dias_antes_notificacion: item.dias_antes_notificacion || 3
        });
        setShowModal(true);
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
        setEditingItem(null);
    };

    const isUrgent = (dateStr, status) => {
        if (!dateStr || status === 'Completado') return false;
        const today = new Date().toISOString().split('T')[0];
        return dateStr <= today;
    };

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Mis Pendientes</h2>
                <button className="btn" onClick={() => { resetForm(); setShowModal(true); }}>
                    <Plus size={18} /> Nuevo Pendiente
                </button>
            </div>

            <div className="table-container glass-panel">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Actividad</th>
                            <th>Empresa</th>
                            <th>Estado</th>
                            <th>Límite</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendientes.map(item => (
                            <tr key={item.id} className={isUrgent(item.fecha_limite, item.estado) ? 'urgent-row' : ''}>
                                <td>{item.fecha}</td>
                                <td>
                                    <strong>{item.actividad}</strong>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.descripcion}</div>
                                </td>
                                <td>{item.empresa}</td>
                                <td>
                                    <span className={`badge ${item.estado.toLowerCase().replace(' ', '_')}`}>
                                        {item.estado}
                                    </span>
                                </td>
                                <td>{item.fecha_limite}</td>
                                <td className="actions">
                                    <button onClick={() => handleEdit(item)} className="btn-icon" title="Editar"><Edit2 size={18} /></button>
                                    <button onClick={() => handleNotify(item.id)} className="btn-icon" title="Notificar"><Bell size={18} /></button>
                                    <button onClick={() => handleDelete(item.id)} className="btn-icon" title="Eliminar"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingItem ? 'Editar Pendiente' : 'Nuevo Pendiente'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Actividad</label>
                                <input required value={formData.actividad} onChange={e => setFormData({ ...formData, actividad: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Empresa</label>
                                    <input value={formData.empresa} onChange={e => setFormData({ ...formData, empresa: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Estado</label>
                                    <select value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })}>
                                        <option>Pendiente</option>
                                        <option>En Progreso</option>
                                        <option>Completado</option>
                                        <option>Cancelado</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Fecha Límite</label>
                                    <input type="date" value={formData.fecha_limite} onChange={e => setFormData({ ...formData, fecha_limite: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Email Notificación</label>
                                    <input type="email" value={formData.email_notificacion} onChange={e => setFormData({ ...formData, email_notificacion: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Días antes de notificación</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={formData.dias_antes_notificacion}
                                    onChange={e => setFormData({ ...formData, dias_antes_notificacion: parseInt(e.target.value) || 0 })}
                                />
                                <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                                    Recibirás un correo este número de días antes de la fecha límite (no se envían correos los fines de semana)
                                </small>
                            </div>
                            <div className="form-group">
                                <label>Observaciones</label>
                                <input value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" style={{ background: '#e5e7eb', color: '#374151' }} onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn">{editingItem ? 'Actualizar' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
