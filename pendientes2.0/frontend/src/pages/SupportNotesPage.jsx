import React, { useState, useEffect, useCallback } from 'react';
import {
    Calendar, Plus, Save, Trash2, BrainCircuit,
    Send, StickyNote, Clock, ImageIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import {
    getSupportNotes, addSupportNote, updateSupportNote,
    deleteSupportNote, askAi, getChatHistory, uploadNoteImage
} from '../api';
import { SearchInput, Spinner, EmptyState } from '../components/ui';

// Manejar imágenes rotas en el editor
const handleBrokenImages = () => {
    setTimeout(() => {
        document.querySelectorAll('.ProseMirror img').forEach(img => {
            img.onerror = null;
            img.onerror = function () {
                const placeholder = document.createElement('div');
                placeholder.innerHTML = '🖼️ Imagen no disponible';
                placeholder.style.cssText = 'padding:12px;background:#1e293b;border:1px dashed #475569;border-radius:8px;color:#64748b;font-size:12px;display:inline-block;margin:4px 0;';
                this.parentNode?.replaceChild(placeholder, this);
            };
            // Forzar re-chequeo si ya falló
            const src = img.src;
            img.src = '';
            img.src = src;
        });
    }, 300);
};

const SupportNotesPage = () => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [selectedNote, setSelectedNote] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [mobileTab, setMobileTab] = useState('notes');
    const [noteTitle, setNoteTitle] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const messagesEndRef = React.useRef(null);
    const fileInputRef = React.useRef(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({ inline: false, allowBase64: false }),
        ],
        content: '',
        onUpdate: () => handleBrokenImages(),
        onCreate: () => handleBrokenImages(),
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[180px] text-sm text-slate-300 leading-relaxed',
            },
        },
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [chatHistory, isAiThinking]);

    useEffect(() => {
        fetchNotes();
        fetchChatHistory();
    }, []);

    const fetchChatHistory = async () => {
        try {
            const response = await getChatHistory();
            setChatHistory(response.data);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const response = await getSupportNotes();
            setNotes(response.data);
        } catch (error) {
            toast.error('No se pudieron cargar las notas');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async () => {
        const content = editor?.getHTML() || '';
        if (!content || content === '<p></p>') {
            toast.error('La nota no puede estar vacía');
            return;
        }
        try {
            if (selectedNote) {
                await updateSupportNote(selectedNote.id, {
                    ...selectedNote,
                    title: noteTitle || 'Nota sin título',
                    content
                });
                toast.success('Nota actualizada');
            } else {
                await addSupportNote({
                    title: noteTitle || 'Nota sin título',
                    content
                });
                toast.success('Nota guardada');
            }
            fetchNotes();
            setIsEditing(false);
            setSelectedNote(null);
            setNoteTitle('');
            editor?.commands.setContent('');
            setMobileTab('notes');
        } catch (error) {
            toast.error('Error al guardar la nota');
        }
    };

    const handleDeleteNote = (id) => {
        toast.custom((t) => (
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-2xl w-[350px]">
                <h3 className="font-bold text-white mb-2">¿Eliminar Nota?</h3>
                <p className="text-slate-400 text-sm mb-4">Esta acción eliminará esta nota permanentemente.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => toast.dismiss(t)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white">Cancelar</button>
                    <button onClick={async () => {
                        toast.dismiss(t);
                        try {
                            await deleteSupportNote(id);
                            toast.success('Nota eliminada');
                            if (selectedNote?.id === id) {
                                setSelectedNote(null);
                                setNoteTitle('');
                                editor?.commands.setContent('');
                                setIsEditing(false);
                            }
                            fetchNotes();
                        } catch (error) {
                            toast.error('Error al eliminar la nota');
                        }
                    }} className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors">Confirmar</button>
                </div>
            </div>
        ));
    };

    const handleSelectNote = (note) => {
        setSelectedNote(note);
        setNoteTitle(note.title);
        editor?.commands.setContent(note.content || '');
        setIsEditing(true);
        setMobileTab('editor');
    };

    const handleNewNote = () => {
        setSelectedNote(null);
        setNoteTitle('');
        editor?.commands.setContent('');
        setIsEditing(true);
        setMobileTab('editor');
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Si no hay nota guardada aún, primero la creamos
        let noteId = selectedNote?.id;
        if (!noteId) {
            try {
                const content = editor?.getHTML() || '';
                const res = await addSupportNote({
                    title: noteTitle || 'Nota sin título',
                    content
                });
                noteId = res.data.id;
                setSelectedNote(res.data);
                fetchNotes();
            } catch {
                toast.error('Guarda la nota primero para subir imágenes');
                return;
            }
        }

        try {
            setUploadingImage(true);
            const res = await uploadNoteImage(noteId, file);
            const imageUrl = `http://localhost:5002${res.data.url}`;
            editor?.chain().focus().setImage({ src: imageUrl }).run();
            toast.success('Imagen insertada');
        } catch (error) {
            toast.error('Error al subir la imagen');
        } finally {
            setUploadingImage(false);
            e.target.value = '';
        }
    };

    const handleAiAsk = async () => {
        if (!aiQuery.trim()) return;
        const currentQuery = aiQuery;
        setAiQuery('');
        setChatHistory(prev => [...prev, { role: 'user', content: currentQuery }]);
        setIsAiThinking(true);
        try {
            const response = await askAi(currentQuery);
            setChatHistory(prev => [...prev, { role: 'ai', content: response.data.response }]);
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Error al conectar con la IA';
            toast.error(errorMsg);
            setChatHistory(prev => [...prev, { role: 'error', content: `Error: ${errorMsg}` }]);
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
            const date = new Date(dateString.replace(' ', 'T'));
            if (isNaN(date.getTime())) return dateString;
            return format(date, 'dd/MM HH:mm');
        } catch { return '---'; }
    };

    return (
        <div className="space-y-4 pb-2">
            <Toaster position="top-center" theme="dark" richColors />

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Notas de Soporte
                    </h1>
                    <p className="text-slate-400 mt-0.5 text-xs md:text-sm">Registra y consulta el historial de soporte brindado.</p>
                </div>
                <button onClick={handleNewNote} className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 font-medium text-sm active:scale-95">
                    <Plus size={18} /> Nueva Nota
                </button>
            </header>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800 backdrop-blur-sm">
                <SearchInput dark value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar en notas..." className="sm:col-span-2 py-2.5" />
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-300 text-sm" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                </div>
            </div>

            {/* Mobile Tabs */}
            <div className="flex lg:hidden border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
                {[
                    { key: 'notes', label: 'Notas', icon: <StickyNote size={15} /> },
                    { key: 'editor', label: 'Editor', icon: <Save size={15} /> },
                    { key: 'ai', label: 'IA', icon: <BrainCircuit size={15} /> },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setMobileTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all ${mobileTab === tab.key ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}>
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* Notes List */}
                <div className={`lg:col-span-4 lg:block ${mobileTab === 'notes' ? 'block' : 'hidden'}`}>
                    <div className="space-y-2 max-h-[calc(100vh-22rem)] lg:max-h-[calc(100vh-20rem)] overflow-y-auto pr-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-12 gap-4">
                                <Spinner size="md" />
                                <p className="text-slate-500 text-sm">Cargando notas...</p>
                            </div>
                        ) : filteredNotes.length === 0 ? (
                            <EmptyState icon={StickyNote} title="No se encontraron notas" description={searchTerm ? 'Intenta con otra búsqueda' : 'Crea tu primera nota de soporte'} />
                        ) : (
                            filteredNotes.map((note) => (
                                <motion.div key={note.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                    onClick={() => handleSelectNote(note)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer group ${selectedNote?.id === note.id ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
                                    <div className="flex justify-between items-start mb-1.5">
                                        <h3 className={`font-semibold truncate pr-4 text-sm ${selectedNote?.id === note.id ? 'text-blue-400' : 'text-slate-200'}`}>{note.title}</h3>
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0"><Clock size={10} />{formatDate(note.created_at)}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{note.content?.replace(/<[^>]*>/g, '') || ''}</p>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Editor + AI */}
                <div className={`lg:col-span-8 flex flex-col gap-4 ${mobileTab !== 'notes' ? 'block' : 'hidden lg:flex'}`}>

                    {/* Note Editor */}
                    <div className={`${mobileTab === 'ai' ? 'hidden lg:flex' : 'flex'} flex-col bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm min-h-[300px] lg:min-h-[380px]`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><StickyNote size={18} /></div>
                                <h2 className="text-lg font-semibold text-slate-100">{selectedNote ? 'Editar Nota' : 'Nueva Nota'}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Botón subir imagen */}
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingImage}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded-xl transition-all font-medium text-sm"
                                    title="Insertar imagen"
                                >
                                    {uploadingImage ? <Spinner size="sm" /> : <ImageIcon size={16} />}
                                    {uploadingImage ? 'Subiendo...' : 'Imagen'}
                                </button>
                                {selectedNote && (
                                    <button onClick={() => handleDeleteNote(selectedNote.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Eliminar">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button onClick={handleSaveNote} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium text-sm active:scale-95">
                                    <Save size={16} /> Guardar
                                </button>
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="Título de la nota..."
                            className="bg-transparent text-xl font-bold text-slate-100 border-none focus:outline-none mb-3 placeholder:text-slate-600"
                            value={noteTitle}
                            onChange={e => setNoteTitle(e.target.value)}
                        />

                        <div className="flex-1 border border-slate-700/50 rounded-xl p-3 overflow-y-auto">
                            <EditorContent editor={editor} />
                        </div>
                    </div>

                    {/* AI Assistant */}
                    <div className={`${mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'} flex-col bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-5 backdrop-blur-sm`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><BrainCircuit size={18} /></div>
                            <h2 className="text-base font-semibold text-indigo-100">Consultar a la IA</h2>
                        </div>
                        <div className="bg-slate-950/50 border border-indigo-500/10 p-4 rounded-xl max-h-[260px] overflow-y-auto space-y-3 custom-scrollbar mb-3">
                            {chatHistory.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center italic py-6">Haz preguntas sobre tus notas de soporte para obtener ayuda instantánea.</p>
                            ) : (
                                chatHistory.map((msg, idx) => (
                                    <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600/20 text-indigo-100 rounded-tr-none' : msg.role === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-slate-800/50 text-slate-300 rounded-tl-none border border-slate-700/50'}`}>
                                            {msg.content}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                            {isAiThinking && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                    <div className="bg-slate-800/50 p-3 rounded-2xl rounded-tl-none border border-slate-700/50 flex items-center gap-1.5">
                                        {[0, 0.2, 0.4].map((delay, i) => (
                                            <div key={i} className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Pregunta algo sobre tus notas..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-200 text-sm min-w-0"
                                value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAiAsk()} disabled={isAiThinking} />
                            <button onClick={handleAiAsk} disabled={!aiQuery.trim() || isAiThinking} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:shadow-none shrink-0">
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportNotesPage;