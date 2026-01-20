import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2, Edit2, Building, Search, Download, ListChecks, CheckSquare, Plus, Upload, MoreHorizontal, Mail, Filter, Calendar } from 'lucide-react';
import { getClientes, addCliente, updateCliente, deleteCliente, getClientTasks, addClientTask, updateTaskStatus, deleteTask, addGlobalTask, addClientTasksBulk, createPendingTasks } from '../api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function ClientsPage() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos'); // New filter state

    // Task Modal State
    const [showTasksModal, setShowTasksModal] = useState(false);
    const [showGlobalTaskModal, setShowGlobalTaskModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientTasks, setClientTasks] = useState([]);
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [bulkTasks, setBulkTasks] = useState(''); // Text area content
    const [activeTaskTab, setActiveTaskTab] = useState('list'); // 'list' or 'bulk'
    const [emailRecipient, setEmailRecipient] = useState(''); // Single email for pending tasks
    const [diasAntes, setDiasAntes] = useState(3); // Days before notification
    const [fechaLimite, setFechaLimite] = useState(''); // Deadline for pending tasks

    const [globalTaskDescription, setGlobalTaskDescription] = useState('');

    const [formData, setFormData] = useState({
        empresa: '',
        observaciones: '',
        check_estado: false, // Deprecated, kept for compatibility if needed
        estado: 'Pendiente', // New field
        procedimiento: ''
    });

    const statusOptions = ['Sin Tareas', 'Pendiente', 'En Proceso', 'Finalizado'];
    const filterOptions = ['Todos', 'Sin Tareas', 'Pendiente', 'En Proceso', 'Finalizado'];

    const getStatusColor = (status) => {
        switch (status) {
            case 'Sin Tareas': return '#9ca3af'; // Gray
            case 'En Proceso': return '#f59e0b'; // Amber
            case 'Finalizado': return '#10b981'; // Green
            default: return '#ef4444'; // Red (Pendiente)
        }
    };

    const getStatusBadgeStyle = (status) => ({
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: `${getStatusColor(status)}20`, // 20% opacity
        color: getStatusColor(status),
        border: `1px solid ${getStatusColor(status)}`,
        display: 'inline-block'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getClientes();
            setClientes(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate dynamic status based on tasks
    const getClientDynamicStatus = (client) => {
        const totalTasks = client.total_tasks || 0;
        const completedTasks = client.completed_tasks || 0;

        if (totalTasks === 0) {
            return 'Sin Tareas';
        } else if (completedTasks === 0) {
            return 'Pendiente';
        } else if (completedTasks < totalTasks) {
            return 'En Proceso';
        } else {
            return 'Finalizado';
        }
    };

    const filteredClientes = clientes
        .map(client => ({
            ...client,
            dynamicStatus: getClientDynamicStatus(client)
        }))
        .filter(item => {
            // Search filter
            const matchesSearch = item.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.observaciones && item.observaciones.toLowerCase().includes(searchTerm.toLowerCase()));

            // Status filter
            const matchesStatus = statusFilter === 'Todos' || item.dynamicStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });

    const handleExport = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Clientes');

        // Definir columnas
        worksheet.columns = [
            { header: 'Empresa', key: 'empresa', width: 20 },
            { header: 'Estado', key: 'estado', width: 15 },
            { header: 'Procedimiento', key: 'procedimiento', width: 30 },
            { header: 'Observaciones', key: 'observaciones', width: 30 },
        ];

        // Agregar filas
        filteredClientes.forEach(client => {
            worksheet.addRow({
                empresa: client.empresa,
                estado: client.estado || (client.check_estado ? 'Finalizado' : 'Pendiente'),
                procedimiento: client.procedimiento,
                observaciones: client.observaciones
            });
        });

        // Estilos: Bordes y Ancho Automático
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                // Bordes negros
                cell.border = {
                    top: { style: 'thin', color: { argb: '000000' } },
                    left: { style: 'thin', color: { argb: '000000' } },
                    bottom: { style: 'thin', color: { argb: '000000' } },
                    right: { style: 'thin', color: { argb: '000000' } }
                };
            });
        });

        // Ajustar ancho de columnas basado en contenido
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            // Header
            if (column.header) {
                maxLength = column.header.length;
            }
            // Datos
            column.eachCell({ includeEmpty: true }, (cell) => {
                const columnLength = cell.value ? cell.value.toString().length : 0;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            // Set width (aprox 1.2 char width padding)
            column.width = maxLength < 10 ? 10 : maxLength + 2;
        });

        // Generar archivo
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'Clientes.xlsx');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await updateCliente(editingItem.id, formData);
            } else {
                await addCliente(formData);
            }
            setShowModal(false);
            setEditingItem(null);
            resetForm();
            loadData();
        } catch (err) {
            alert('Error al guardar cliente');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar cliente?')) return;
        try {
            await deleteCliente(id);
            loadData();
        } catch (err) {
            alert('Error al eliminar');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            empresa: item.empresa,
            observaciones: item.observaciones,
            check_estado: item.check_estado === 1 || item.check_estado === true,
            estado: item.estado || 'Pendiente',
            procedimiento: item.procedimiento || ''
        });
        setShowModal(true);
    };

    // --- Task Handling ---

    const handleOpenTasks = async (client) => {
        setSelectedClient(client);
        setShowTasksModal(true);
        setActiveTaskTab('list');
        loadTasks(client.id);
    };

    const loadTasks = async (clientId) => {
        try {
            const res = await getClientTasks(clientId);
            setClientTasks(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskDescription.trim()) return;
        try {
            await addClientTask(selectedClient.id, newTaskDescription);
            setNewTaskDescription('');
            loadTasks(selectedClient.id);
        } catch (err) {
            alert('Error al agregar tarea');
        }
    };

    const handleBulkUpload = async () => {
        if (!bulkTasks.trim()) return;

        // Split by new lines and filter empty strings
        const tasks = bulkTasks.split(/\n/).map(t => t.trim()).filter(t => t.length > 0);

        if (tasks.length === 0) return;

        try {
            await addClientTasksBulk(selectedClient.id, tasks);
            setBulkTasks('');
            setActiveTaskTab('list');
            loadTasks(selectedClient.id);
            alert(`${tasks.length} tareas agregadas.`);
        } catch (err) {
            alert('Error al cargar tareas masivas');
        }
    };



    const handleToggleTask = async (task) => {
        try {
            const newCompletedStatus = !task.completed;

            // 1. Update task status in backend
            await updateTaskStatus(task.id, newCompletedStatus);

            // 2. Optimistic Update of clientTasks state
            const updatedTasks = clientTasks.map(t =>
                t.id === task.id ? { ...t, completed: newCompletedStatus } : t
            );
            setClientTasks(updatedTasks);

            // 3. Check if we should auto-update Client Status
            if (updatedTasks.length > 0) {
                const allCompleted = updatedTasks.every(t => t.completed === 1 || t.completed === true);
                const hasSomeProgress = updatedTasks.some(t => t.completed === 1 || t.completed === true);

                let newClientStatus = selectedClient.estado;
                let shouldUpdate = false;

                if (allCompleted && selectedClient.estado !== 'Finalizado') {
                    newClientStatus = 'Finalizado';
                    shouldUpdate = true;
                } else if (!allCompleted && hasSomeProgress && selectedClient.estado !== 'En Proceso') {
                    newClientStatus = 'En Proceso';
                    shouldUpdate = true;
                } else if (!hasSomeProgress && selectedClient.estado !== 'Pendiente') {
                    newClientStatus = 'Pendiente'; // Revert if everything unchecked
                    shouldUpdate = true;
                }

                if (shouldUpdate) {
                    // Update client in backend
                    await updateCliente(selectedClient.id, {
                        ...selectedClient,
                        estado: newClientStatus,
                        // Ensure we send all required fields just in case backend needs them
                        empresa: selectedClient.empresa,
                        observaciones: selectedClient.observaciones,
                        procedimiento: selectedClient.procedimiento
                    });

                    // Update local state (optimistic)
                    setClientes(prev => prev.map(c =>
                        c.id === selectedClient.id ? { ...c, estado: newClientStatus, completed_tasks: completedTasks, total_tasks: updatedTasks.length } : c
                    ));

                    // Update selected client ref
                    setSelectedClient(prev => ({ ...prev, estado: newClientStatus }));

                    // Show small non-blocking notification? (Optional, maybe just let the UI reflect it)
                }
            } else {
                // No tasks, set to "Sin Tareas"
                if (selectedClient.estado !== 'Sin Tareas') {
                    await updateCliente(selectedClient.id, {
                        ...selectedClient,
                        estado: 'Sin Tareas',
                        empresa: selectedClient.empresa,
                        observaciones: selectedClient.observaciones,
                        procedimiento: selectedClient.procedimiento
                    });

                    setClientes(prev => prev.map(c =>
                        c.id === selectedClient.id ? { ...c, estado: 'Sin Tareas', total_tasks: 0, completed_tasks: 0 } : c
                    ));

                    setSelectedClient(prev => ({ ...prev, estado: 'Sin Tareas' }));
                }
            }

        } catch (err) {
            console.error(err);
            alert('Error al actualizar tarea');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm('¿Eliminar tarea?')) return;
        try {
            await deleteTask(taskId);
            loadTasks(selectedClient.id);
        } catch (err) {
            alert('Error al eliminar tarea');
        }
    };

    const handleAddGlobalTask = async (e) => {
        e.preventDefault();
        if (!globalTaskDescription.trim()) return;
        try {
            if (!confirm(`¿Agregar esta tarea a TODOS los ${clientes.length} clientes?`)) return;
            await addGlobalTask(globalTaskDescription);
            setGlobalTaskDescription('');
            setShowGlobalTaskModal(false);
            alert('Tarea global agregada correctamente');
        } catch (err) {
            alert('Error al agregar tarea global');
        }
    };

    const handleCreatePendingTasks = () => {
        setShowEmailModal(true);
    };

    const handleCreatePending = async () => {
        if (!emailRecipient.trim()) {
            alert('Por favor ingresa un correo electrónico');
            return;
        }

        try {
            const res = await createPendingTasks(selectedClient.id, {
                email: emailRecipient,
                dias_antes_notificacion: diasAntes,
                fecha_limite: fechaLimite
            });
            alert(res.data.message);
            setShowEmailModal(false);
            setEmailRecipient('');
            setDiasAntes(3);
            setFechaLimite('');
        } catch (err) {
            alert(err.response?.data?.error || 'Error al crear pendientes');
        }
    };

    const resetForm = () => {
        setFormData({
            empresa: '',
            observaciones: '',
            check_estado: false,
            estado: 'Sin Tareas',
            procedimiento: ''
        });
        setEditingItem(null);
    };

    if (loading) return <div className="loading">Cargando...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                <h2>Directorio de Clientes</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn" onClick={handleExport} style={{ background: '#10b981' }}>
                        <Download size={18} /> Excel
                    </button>
                    <button className="btn" onClick={() => setShowGlobalTaskModal(true)} style={{ background: '#6366f1' }}>
                        <ListChecks size={18} /> Tarea Global
                    </button>
                    <button className="btn" onClick={() => { resetForm(); setShowModal(true); }}>
                        <UserPlus size={18} /> Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Buscar cliente o empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '40px', width: '100%' }}
                    />
                </div>
                <div style={{ position: 'relative', minWidth: '200px' }}>
                    <Filter size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ paddingLeft: '40px', width: '100%', height: '100%' }}
                        className="input"
                    >
                        {filterOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="table-container glass-panel">
                <table>
                    <thead>
                        <tr>
                            <th>Empresa</th>
                            <th>Estado</th>
                            <th>Procedimiento</th>
                            <th>Observaciones</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClientes.length > 0 ? (
                            filteredClientes.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Building size={14} className="text-gray-400" />
                                            <strong>{item.empresa}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={getStatusBadgeStyle(item.dynamicStatus)}>
                                            {item.dynamicStatus}
                                        </span>
                                    </td>
                                    <td>
                                        {item.task_list ? (
                                            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem' }}>
                                                {item.task_list.split('|||').map((task, idx) => (
                                                    <li key={idx}>{task}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin tareas</span>
                                        )}
                                        {/* Show manual text if exists, though tasks are preferred */}
                                        {item.procedimiento && <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#6b7280' }}>Nota: {item.procedimiento}</div>}
                                    </td>
                                    <td>{item.observaciones}</td>
                                    <td className="actions">
                                        <button onClick={() => handleOpenTasks(item)} className="btn-icon" title="Ver Tareas" style={{ color: '#6366f1' }}><CheckSquare size={18} /></button>
                                        <button onClick={() => handleEdit(item)} className="btn-icon" title="Editar"><Edit2 size={18} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="btn-icon" title="Eliminar"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    No se encontraron clientes
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingItem ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre de la Empresa</label>
                                <input required value={formData.empresa} onChange={e => setFormData({ ...formData, empresa: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label>Estado</label>
                                <select
                                    className="input"
                                    value={formData.estado}
                                    onChange={e => setFormData({ ...formData, estado: e.target.value })}
                                >
                                    {statusOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Procedimiento</label>
                                <textarea value={formData.procedimiento} onChange={e => setFormData({ ...formData, procedimiento: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Observaciones</label>
                                <textarea value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" style={{ background: '#e5e7eb', color: '#374151' }} onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn">{editingItem ? 'Actualizar' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tasks Modal */}
            {showTasksModal && selectedClient && (
                <div className="modal-overlay" onClick={() => setShowTasksModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Tareas: {selectedClient.empresa}</h3>
                            <button className="btn-icon" onClick={() => setShowTasksModal(false)}>✕</button>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '1rem' }}>
                            <button
                                onClick={() => setActiveTaskTab('list')}
                                style={{
                                    padding: '10px 15px',
                                    borderBottom: activeTaskTab === 'list' ? '2px solid #6366f1' : 'none',
                                    color: activeTaskTab === 'list' ? '#6366f1' : '#6b7280',
                                    fontWeight: '500',
                                    background: 'none', cursor: 'pointer'
                                }}
                            >
                                Lista
                            </button>
                            <button
                                onClick={() => setActiveTaskTab('bulk')}
                                style={{
                                    padding: '10px 15px',
                                    borderBottom: activeTaskTab === 'bulk' ? '2px solid #6366f1' : 'none',
                                    color: activeTaskTab === 'bulk' ? '#6366f1' : '#6b7280',
                                    fontWeight: '500',
                                    background: 'none', cursor: 'pointer'
                                }}
                            >
                                Carga Masiva
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {activeTaskTab === 'list' ? (
                                <>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '10px' }}>
                                            <input
                                                className="input"
                                                placeholder="Nueva tarea..."
                                                value={newTaskDescription}
                                                onChange={e => setNewTaskDescription(e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            <button type="submit" className="btn"><Plus size={18} /></button>
                                        </form>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h4 style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                                            {clientTasks.filter(t => t.completed).length} / {clientTasks.length} Completadas
                                        </h4>
                                        {clientTasks.filter(t => !t.completed).length > 0 && (
                                            <button
                                                onClick={handleCreatePendingTasks}
                                                className="btn"
                                                style={{ background: '#8b5cf6', fontSize: '0.85rem', padding: '6px 12px' }}
                                            >
                                                <Mail size={16} /> Crear Pendientes
                                            </button>
                                        )}
                                    </div>

                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {clientTasks.length > 0 ? (
                                            clientTasks.map(task => (
                                                <li key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={task.completed === 1 || task.completed === true}
                                                            onChange={() => handleToggleTask(task)}
                                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                        />
                                                        <span style={{ textDecoration: (task.completed === 1 || task.completed === true) ? 'line-through' : 'none', color: (task.completed === 1 || task.completed === true) ? '#9ca3af' : 'inherit' }}>
                                                            {task.description}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => handleDeleteTask(task.id)} className="btn-icon text-red-500"><Trash2 size={16} /></button>
                                                </li>
                                            ))
                                        ) : (
                                            <p style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>No hay tareas registradas.</p>
                                        )}
                                    </ul>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <p style={{ marginBottom: '0.5rem', color: '#4b5563', fontSize: '0.9rem' }}>
                                        Pega aquí tu lista de tareas (una por línea).
                                    </p>
                                    <textarea
                                        value={bulkTasks}
                                        onChange={e => setBulkTasks(e.target.value)}
                                        placeholder={"Revisar documentación\nEnviar correo\nLlamar al cliente"}
                                        style={{ flex: 1, resize: 'none', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                                    />
                                    <button
                                        className="btn"
                                        onClick={handleBulkUpload}
                                        style={{ marginTop: '1rem', alignSelf: 'flex-end', background: '#6366f1' }}
                                    >
                                        <Upload size={18} /> Cargar Tareas
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Global Task Modal */}
            {showGlobalTaskModal && (
                <div className="modal-overlay" onClick={() => setShowGlobalTaskModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Agregar Tarea Global</h3>
                            <button className="btn-icon" onClick={() => setShowGlobalTaskModal(false)}>✕</button>
                        </div>
                        <p style={{ marginBottom: '1rem', color: '#4b5563' }}>
                            Esta acción agregará la siguiente tarea a <strong>TODOS</strong> los clientes registrados.
                        </p>
                        <form onSubmit={handleAddGlobalTask}>
                            <div className="form-group">
                                <label>Descripción de la Tarea</label>
                                <textarea
                                    required
                                    value={globalTaskDescription}
                                    onChange={e => setGlobalTaskDescription(e.target.value)}
                                    placeholder="Ej: Actualizar tablas..."
                                    rows="3"
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" style={{ background: '#e5e7eb', color: '#374151' }} onClick={() => setShowGlobalTaskModal(false)}>Cancelar</button>
                                <button type="submit" className="btn" style={{ background: '#6366f1' }}>Confirmar y Agregar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Pending Tasks Modal */}
            {showEmailModal && selectedClient && (
                <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Crear Pendientes</h3>
                            <button className="btn-icon" onClick={() => setShowEmailModal(false)}>✕</button>
                        </div>
                        <p style={{ marginBottom: '1rem', color: '#4b5563' }}>
                            Crear registros en la página de Pendientes con las tareas pendientes de <strong>{selectedClient.empresa}</strong>.
                        </p>
                        <div className="form-group">
                            <label>Correo Electrónico para Notificaciones</label>
                            <input
                                type="email"
                                value={emailRecipient}
                                onChange={e => setEmailRecipient(e.target.value)}
                                placeholder="ejemplo@correo.com"
                            />
                            <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                                Este correo recibirá las notificaciones automáticas según la configuración.
                            </small>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Días Antes de Notificación</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={diasAntes}
                                    onChange={e => setDiasAntes(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha Límite (Opcional)</label>
                                <input
                                    type="date"
                                    value={fechaLimite}
                                    onChange={e => setFechaLimite(e.target.value)}
                                />
                            </div>
                        </div>
                        <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '1rem' }}>
                            Se crearán {clientTasks.filter(t => !t.completed).length} registro(s) en Pendientes con la fecha de hoy.
                        </small>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <button type="button" className="btn" style={{ background: '#e5e7eb', color: '#374151' }} onClick={() => setShowEmailModal(false)}>Cancelar</button>
                            <button onClick={handleCreatePending} className="btn" style={{ background: '#8b5cf6' }}>
                                <Calendar size={18} /> Crear Pendientes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
