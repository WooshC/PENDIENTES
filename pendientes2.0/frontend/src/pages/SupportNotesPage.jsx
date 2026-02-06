import React, { useState, useEffect } from 'react';
import {
    Search,
    Calendar,
    Plus,
    Save,
    Trash2,
    BrainCircuit,
    Send,
    ChevronRight,
    StickyNote,
    Clock,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import {
    getSupportNotes,
    addSupportNote,
    updateSupportNote,
    deleteSupportNote,
    askAi
} from '../api';

const SupportNotesPage = () => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [selectedNote, setSelectedNote] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);

    const [noteForm, setNoteForm] = useState({
        title: '',
        content: ''
    });

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const response = await getSupportNotes();
            setNotes(response.data);
        } catch (error) {
            console.error('Error fetching notes:', error);
            toast.error('No se pudieron cargar las notas');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async () => {
        if (!noteForm.content.trim()) {
            toast.error('La nota no puede estar vacía');
            return;
        }

        try {
            if (selectedNote) {
                await updateSupportNote(selectedNote.id, {
                    ...selectedNote,
                    title: noteForm.title || 'Nota sin título',
                    content: noteForm.content
                });
                toast.success('Nota actualizada');
            } else {
                await addSupportNote({
                    title: noteForm.title || 'Nota sin título',
                    content: noteForm.content
                });
                toast.success('Nota guardada');
            }
            fetchNotes();
            setIsEditing(false);
            setSelectedNote(null);
            setNoteForm({ title: '', content: '' });
        } catch (error) {
            console.error('Error saving note:', error);
            toast.error('Error al guardar la nota');
        }
    };

    const handleDeleteNote = (id) => {
        toast.custom((t) => (
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-2xl w-[350px]">
                <h3 className="font-bold text-white mb-2">¿Eliminar Nota?</h3>
                <p className="text-slate-400 text-sm mb-4">Esta acción eliminará esta nota de soporte permanentemente.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => toast.dismiss(t)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white">Cancelar</button>
                    <button onClick={async () => {
                        toast.dismiss(t);
                        try {
                            await deleteSupportNote(id);
                            toast.success('Nota eliminada');
                            if (selectedNote?.id === id) {
                                setSelectedNote(null);
                                setNoteForm({ title: '', content: '' });
                                setIsEditing(false);
                            }
                            fetchNotes();
                        } catch (error) {
                            console.error('Error deleting note:', error);
                            toast.error('Error al eliminar la nota');
                        }
                    }} className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors">Confirmar</button>
                </div>
            </div>
        ));
    };

    const handleSelectNote = (note) => {
        setSelectedNote(note);
        setNoteForm({
            title: note.title,
            content: note.content
        });
        setIsEditing(true);
    };

    const handleNewNote = () => {
        setSelectedNote(null);
        setNoteForm({ title: '', content: '' });
        setIsEditing(true);
    };

    const handleAiAsk = async () => {
        if (!aiQuery.trim()) return;

        setIsAiThinking(true);
        setAiResponse('');

        try {
            const response = await askAi(aiQuery);
            setAiResponse(response.data.response);
        } catch (error) {
            console.error('Error asking AI:', error);
            const errorMsg = error.response?.data?.error || 'Error al conectar con el asistente de IA';
            toast.error(errorMsg);
            setAiResponse(`Error: ${errorMsg}`);
        } finally {
            setIsAiThinking(false);
        }
    };

    const filteredNotes = notes.filter(note => {
        const matchesText = (note.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (note.content || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = !dateFilter || (note.created_at && note.created_at.includes(dateFilter));
        return matchesText && matchesDate;
    });

    const formatDate = (dateString) => {
        if (!dateString) return '---';
        try {
            // Backend formats as "yyyy-MM-dd HH:mm:ss"
            // Simple check if it's a valid date
            const date = new Date(dateString.replace(' ', 'T'));
            if (isNaN(date.getTime())) return dateString;
            return format(date, 'dd/MM HH:mm');
        } catch (e) {
            return '---';
        }
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-center" theme="dark" richColors />
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Notas de Soporte
                    </h1>
                    <p className="text-slate-400 mt-1">Registra y consulta el historial de soporte brindado.</p>
                </div>
                <button
                    onClick={handleNewNote}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 font-medium"
                >
                    <Plus size={20} />
                    Nueva Nota
                </button>
            </header>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
                <div className="relative col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar en notas..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="date"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-300"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Notes List */}
                <div className="lg:col-span-4 space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p>Cargando notas...</p>
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                            <StickyNote className="mx-auto mb-4 opacity-20" size={48} />
                            <p>No se encontraron notas</p>
                        </div>
                    ) : (
                        filteredNotes.map((note) => (
                            <motion.div
                                key={note.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handleSelectNote(note)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer group ${selectedNote?.id === note.id
                                    ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5'
                                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-semibold truncate pr-4 ${selectedNote?.id === note.id ? 'text-blue-400' : 'text-slate-200'
                                        }`}>
                                        {note.title}
                                    </h3>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                                        <Clock size={10} />
                                        {formatDate(note.created_at)}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                                    {note.content}
                                </p>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Editor */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col min-h-[400px]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                    <StickyNote size={20} />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-100">
                                    {selectedNote ? 'Editar Nota' : 'Nueva Nota'}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedNote && (
                                    <button
                                        onClick={() => handleDeleteNote(selectedNote.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveNote}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium"
                                >
                                    <Save size={18} />
                                    <span>Guardar</span>
                                </button>
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="Título de la nota..."
                            className="bg-transparent text-xl font-bold text-slate-100 border-none focus:outline-none mb-4 placeholder:text-slate-600"
                            value={noteForm.title}
                            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                        />

                        <textarea
                            placeholder="Escribe aquí los detalles del soporte..."
                            className="flex-1 bg-transparent text-slate-300 border-none focus:outline-none resize-none leading-relaxed placeholder:text-slate-600 min-h-[250px]"
                            value={noteForm.content}
                            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                        />
                    </div>

                    {/* AI Assistant Section */}
                    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 animate-pulse">
                                <BrainCircuit size={20} />
                            </div>
                            <h2 className="text-lg font-semibold text-indigo-100">Consultar a la IA</h2>
                        </div>

                        <div className="space-y-4">
                            {aiResponse && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-950/50 border border-indigo-500/10 p-4 rounded-xl text-slate-300 text-sm leading-relaxed"
                                >
                                    {aiResponse}
                                </motion.div>
                            )}

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Pregunta algo sobre tus notas..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-200"
                                        value={aiQuery}
                                        onChange={(e) => setAiQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAiAsk()}
                                    />
                                    {isAiThinking && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleAiAsk}
                                    disabled={!aiQuery.trim() || isAiThinking}
                                    className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportNotesPage;
