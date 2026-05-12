import React, { useState, useEffect } from 'react';
import { Wrench, Database, Download, Upload, Archive, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { triggerBackup, getDatabaseStatus, exportCsv, importCsv } from '../api';
import { toast } from 'sonner';

const TABLES = [
    { key: 'pendientes', label: 'Pendientes' },
    { key: 'pendiente_tasks', label: 'Tareas de Pendiente' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'client_tasks', label: 'Tareas de Cliente' },
    { key: 'support_notes', label: 'Notas de Soporte' },
    { key: 'ai_chat_history', label: 'Historial IA' },
];

export default function ToolsPage() {
    const [status, setStatus] = useState(null);
    const [loadingBackup, setLoadingBackup] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [importing, setImporting] = useState({});

    const fetchStatus = async () => {
        setLoadingStatus(true);
        try {
            const res = await getDatabaseStatus();
            setStatus(res.data);
        } catch (err) {
            toast.error('Error al obtener estado de la base de datos');
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleBackup = async () => {
        setLoadingBackup(true);
        try {
            await triggerBackup();
            toast.success('Respaldo completado exitosamente');
        } catch (err) {
            toast.error('Error al crear el respaldo');
        } finally {
            setLoadingBackup(false);
        }
    };

    const handleExport = async (table) => {
        try {
            const res = await exportCsv(table);
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${table}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Exportado: ${table}.csv`);
        } catch (err) {
            toast.error(`Error al exportar ${table}`);
        }
    };

    const handleImport = async (table, file) => {
        if (!file) return;
        setImporting(prev => ({ ...prev, [table]: true }));
        try {
            const res = await importCsv(table, file);
            toast.success(`Importado ${table}: ${res.data.inserted} registros insertados, ${res.data.skipped} omitidos`);
            fetchStatus();
        } catch (err) {
            const msg = err.response?.data?.error || 'Error al importar CSV';
            toast.error(msg);
        } finally {
            setImporting(prev => ({ ...prev, [table]: false }));
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Wrench size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Herramientas</h1>
                    <p className="text-slate-400">Respaldo, exportación e importación de datos</p>
                </div>
            </div>

            {/* Backup Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Archive className="text-emerald-400" size={22} />
                    <h2 className="text-lg font-semibold text-white">Respaldo Manual</h2>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                    Genera un respaldo en formato CSV de todas las tablas de la base de datos. 
                    Los archivos se guardan en la carpeta <code className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">backend/Backups/</code> del servidor.
                </p>
                <button
                    onClick={handleBackup}
                    disabled={loadingBackup}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-600/20"
                >
                    {loadingBackup ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                    {loadingBackup ? 'Generando respaldo...' : 'Ejecutar Respaldo'}
                </button>
            </div>

            {/* Status Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Database className="text-blue-400" size={22} />
                        <h2 className="text-lg font-semibold text-white">Estado de la Base de Datos</h2>
                    </div>
                    <button
                        onClick={fetchStatus}
                        disabled={loadingStatus}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw size={18} className={loadingStatus ? 'animate-spin' : ''} />
                    </button>
                </div>

                {status ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {TABLES.map(t => (
                            <div key={t.key} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                                <div className="text-2xl font-bold text-white">{status[t.key] ?? 0}</div>
                                <div className="text-sm text-slate-400">{t.label}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-slate-500 text-sm">Cargando...</div>
                )}
            </div>

            {/* Import CSV Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                    <Upload className="text-amber-400" size={22} />
                    <h2 className="text-lg font-semibold text-white">Importar desde CSV</h2>
                </div>
                <div className="flex items-start gap-2 mb-4 text-sm text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <p>
                        Los registros con <strong>ID existente</strong> serán omitidos. 
                        Asegúrate de que los archivos CSV usen <strong>punto y coma (;)</strong> como separador y tengan los nombres de columna en la primera fila.
                    </p>
                </div>

                <div className="space-y-3">
                    {TABLES.map(t => (
                        <div key={t.key} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
                            <div className="flex-1">
                                <div className="font-medium text-white">{t.label}</div>
                                <div className="text-xs text-slate-500">{t.key}.csv</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="relative cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="sr-only"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImport(t.key, file);
                                            e.target.value = '';
                                        }}
                                    />
                                    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        importing[t.key]
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                            : 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer'
                                    }`}>
                                        {importing[t.key] ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                                        {importing[t.key] ? 'Importando...' : 'Importar CSV'}
                                    </span>
                                </label>
                                <button
                                    onClick={() => handleExport(t.key)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                                    title="Exportar CSV actual"
                                >
                                    <Download size={14} />
                                    Exportar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
