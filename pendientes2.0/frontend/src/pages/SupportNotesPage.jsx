import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Calendar, Plus, Save, Trash2, BrainCircuit,
    Send, StickyNote, Clock, ImageIcon, CheckCircle2,
    Loader2, Eye, AlignLeft, AlignCenter, AlignRight, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageResize from 'tiptap-extension-resize-image';

// Extensión custom para soportar alineación de imágenes
const CustomImageResize = ImageResize.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            dataAlign: {
                default: 'center',
                parseHTML: element => element.getAttribute('data-align') || element.parentElement?.getAttribute('data-align'),
                renderHTML: attributes => {
                    if (!attributes.dataAlign) return {};
                    return { 'data-align': attributes.dataAlign };
                },
            },
        };
    },
    renderHTML({ node, HTMLAttributes }) {
        const { dataAlign, ...rest } = HTMLAttributes;
        const divAttrs = { class: 'image-resizer' };
        if (dataAlign) divAttrs['data-align'] = dataAlign;
        return ['div', divAttrs, ['img', rest]];
    },
});
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
                placeholder.innerHTML = 'Imagen no disponible';
                placeholder.style.cssText = 'padding:12px;background:#1e293b;border:1px dashed #475569;border-radius:8px;color:#64748b;font-size:12px;display:inline-block;margin:4px 0;';
                this.parentNode?.replaceChild(placeholder, this);
            };
            const src = img.src;
            img.src = '';
            img.src = src;
        });
    }, 300);
};

const TAG_PALETTE = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16',
    '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
    '#8b5cf6', '#d946ef', '#f43f5e', '#71717a'
];

const getAutoColor = (tag, existingColors = {}) => {
    if (existingColors[tag]) return existingColors[tag];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
};

const parseTagColors = (jsonString) => {
    try {
        return JSON.parse(jsonString || '{}');
    } catch {
        return {};
    }
};

const SupportNotesPage = () => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const [selectedNote, setSelectedNote] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [mobileTab, setMobileTab] = useState('notes');
    const [noteTitle, setNoteTitle] = useState('');
    const [noteTags, setNoteTags] = useState([]);
    const [noteTagColors, setNoteTagColors] = useState({});
    const [tagInput, setTagInput] = useState('');
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [imageToolbar, setImageToolbar] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const editorRef = useRef(null);
    const tagInputRef = useRef(null);

    // Función reutilizable para subir imagen e insertarla en el editor
    const processImageFile = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        const currentEditor = editorRef.current;
        let noteId = selectedNote?.id;
        if (!noteId) {
            try {
                const content = currentEditor?.getHTML() || '';
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
            const imageUrl = `${import.meta.env.PROD ? '' : 'http://localhost:5002'}${res.data.url}`;
            currentEditor?.chain().focus().setImage({ src: imageUrl }).run();
            toast.success('Imagen insertada');
        } catch (error) {
            toast.error('Error al subir la imagen');
        } finally {
            setUploadingImage(false);
        }
    }, [selectedNote, noteTitle]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            CustomImageResize.configure({
                inline: false,
                allowBase64: false,
                minWidth: 80,
                maxWidth: 1200,
            }),
        ],
        content: '',
        onUpdate: () => {
            handleBrokenImages();
        },
        onCreate: () => handleBrokenImages(),
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[180px] text-sm text-slate-300 leading-relaxed',
            },
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;
                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) {
                            event.preventDefault();
                            processImageFile(file);
                            return true;
                        }
                    }
                }
                return false;
            },
            handleDrop: (view, event, slice, moved) => {
                if (moved) return false;
                const files = event.dataTransfer?.files;
                if (!files?.length) return false;
                for (const file of files) {
                    if (file.type.startsWith('image/')) {
                        event.preventDefault();
                        processImageFile(file);
                        return true;
                    }
                }
                return false;
            },
        },
    });
    editorRef.current = editor;

    // Detectar imagen seleccionada para mostrar toolbar flotante
    useEffect(() => {
        if (!editor) return;
        const handleSelection = () => {
            const selectedNode = document.querySelector('.ProseMirror .image-resizer.ProseMirror-selectednode, .ProseMirror img.ProseMirror-selectednode');
            if (selectedNode) {
                const rect = selectedNode.getBoundingClientRect();
                setImageToolbar({ top: rect.top, left: rect.left + rect.width / 2 });
            } else if (!editor.isActive('image')) {
                setImageToolbar(null);
            }
        };
        editor.on('selectionUpdate', handleSelection);
        editor.on('focus', handleSelection);
        return () => {
            editor.off('selectionUpdate', handleSelection);
            editor.off('focus', handleSelection);
        };
    }, [editor]);

    const handleImageAlign = (align) => {
        if (!editor) return;
        editor.chain().focus().updateAttributes('image', { dataAlign: align }).run();
    };

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

    const fetchNotesSilent = async () => {
        try {
            const response = await getSupportNotes();
            setNotes(response.data);
        } catch { /* silent */ }
    };

    const handleSaveNote = async () => {
        const content = editor?.getHTML() || '';
        if (!content || content === '<p></p>') {
            toast.error('La nota no puede estar vacía');
            return;
        }
        const tagsString = noteTags.length > 0 ? noteTags.join(',') : 'Soporte';
        const tagColorsString = JSON.stringify(noteTagColors);
        try {
            if (selectedNote) {
                await updateSupportNote(selectedNote.id, {
                    ...selectedNote,
                    title: noteTitle || 'Nota sin título',
                    content,
                    tags: tagsString,
                    tag_colors: tagColorsString
                });
                toast.success('Nota actualizada');
            } else {
                await addSupportNote({
                    title: noteTitle || 'Nota sin título',
                    content,
                    tags: tagsString,
                    tag_colors: tagColorsString
                });
                toast.success('Nota guardada');
            }
            fetchNotes();
            setIsEditing(false);
            setSelectedNote(null);
            setNoteTitle('');
            setNoteTags([]);
            setNoteTagColors({});
            setTagInput('');
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
        const tags = note.tags ? note.tags.split(',').map(t => t.trim()).filter(Boolean) : ['Soporte'];
        setNoteTags(tags);
        const colors = parseTagColors(note.tag_colors);
        const merged = {};
        tags.forEach(t => merged[t] = colors[t] || getAutoColor(t, colors));
        setNoteTagColors(merged);
        setTagInput('');
        setShowTagDropdown(false);
        editor?.commands.setContent(note.content || '');
        setIsEditing(true);
        setMobileTab('editor');
    };

    const handleNewNote = () => {
        setSelectedNote(null);
        setNoteTitle('');
        setNoteTags([]);
        setNoteTagColors({});
        setTagInput('');
        setShowTagDropdown(false);
        editor?.commands.setContent('');
        setIsEditing(true);
        setMobileTab('editor');
    };

    const addTag = (tag) => {
        const clean = tag.trim();
        if (!clean || noteTags.includes(clean)) return;
        setNoteTags([...noteTags, clean]);
        setNoteTagColors(prev => ({ ...prev, [clean]: getAutoColor(clean, prev) }));
        setTagInput('');
        setShowTagDropdown(false);
    };

    const removeTag = (tag) => {
        setNoteTags(noteTags.filter(t => t !== tag));
        setNoteTagColors(prev => {
            const next = { ...prev };
            delete next[tag];
            return next;
        });
    };

    const setTagColor = (tag, color) => {
        setNoteTagColors(prev => ({ ...prev, [tag]: color }));
    };

    const handleTagInputKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (tagInput.trim()) addTag(tagInput);
        }
        if (e.key === 'Escape') {
            setShowTagDropdown(false);
        }
    };

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (tagInputRef.current && !tagInputRef.current.contains(e.target)) {
                setShowTagDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processImageFile(file);
        e.target.value = '';
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
        const matchesTag = !tagFilter || (note.tags || 'Soporte').split(',').map(t => t.trim()).includes(tagFilter);
        return matchesText && matchesDate && matchesTag;
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
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/20 shrink-0">
                        <StickyNote size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
                            Notas de Soporte
                        </h1>
                        <p className="text-slate-500 mt-0.5 text-xs md:text-sm font-medium">Historial técnico y consultas resueltas</p>
                    </div>
                </div>
                <button onClick={handleNewNote} className="self-start sm:self-auto flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl transition-all shadow-lg shadow-amber-500/25 font-semibold text-sm active:scale-95 hover:shadow-amber-500/40">
                    <Plus size={20} strokeWidth={2.5} /> Nueva Nota
                </button>
            </header>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
                <div className="flex-1 relative group">
                    <SearchInput dark value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar en notas..." className="w-full py-2.5" />
                </div>
                <div className="flex gap-3">
                    <div className="relative w-40">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={15} />
                        <input type="date" className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all text-slate-300 text-sm hover:border-slate-600" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                    </div>
                    <div className="relative w-48">
                        <select
                            value={tagFilter}
                            onChange={e => setTagFilter(e.target.value)}
                            className="w-full h-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all text-slate-300 text-sm appearance-none cursor-pointer hover:border-slate-600"
                        >
                            <option value="">📑 Todas las etiquetas</option>
                            {Array.from(new Set(notes.flatMap(n => (n.tags || 'Soporte').split(',').map(t => t.trim())))).sort().map(tag => (
                                <option key={tag} value={tag}>{tag}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                    </div>
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
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all ${mobileTab === tab.key ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
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
                                <motion.div key={note.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                                    onClick={() => handleSelectNote(note)}
                                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer group relative overflow-hidden ${selectedNote?.id === note.id ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/40 shadow-lg shadow-amber-500/10' : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40 hover:shadow-md hover:shadow-black/20'}`}>
                                    {selectedNote?.id === note.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400 to-orange-500" />
                                    )}
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <h3 className={`font-semibold truncate pr-2 text-sm leading-tight ${selectedNote?.id === note.id ? 'text-amber-300' : 'text-slate-200 group-hover:text-white'}`}>{note.title}</h3>
                                        <span className="text-[10px] text-slate-600 flex items-center gap-1 shrink-0 font-mono tracking-tight"><Clock size={10} />{formatDate(note.created_at)}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {(note.tags || 'Soporte').split(',').map(t => t.trim()).filter(Boolean).slice(0, 4).map((tag) => {
                                            const colors = parseTagColors(note.tag_colors);
                                            const color = colors[tag] || getAutoColor(tag);
                                            return (
                                                <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium border" style={{ backgroundColor: color + '18', color: color, borderColor: color + '30' }}>
                                                    {tag}
                                                </span>
                                            );
                                        })}
                                        {(note.tags || 'Soporte').split(',').length > 4 && (
                                            <span className="px-1.5 py-0.5 text-[10px] text-slate-600">+{(note.tags || 'Soporte').split(',').length - 4}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed group-hover:text-slate-400 transition-colors">{note.content?.replace(/<[^>]*>/g, '') || ''}</p>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Editor + AI */}
                <div className={`lg:col-span-8 flex flex-col gap-4 ${mobileTab !== 'notes' ? 'block' : 'hidden lg:flex'}`}>

                    {/* Note Editor */}
                    <div className={`${mobileTab === 'ai' ? 'hidden lg:flex' : 'flex'} flex-col bg-gradient-to-b from-slate-900/80 to-slate-900/40 border border-slate-800/60 rounded-2xl p-5 backdrop-blur-sm shadow-xl shadow-black/10`}>
                        {/* Toolbar del Editor */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                    <StickyNote size={16} />
                                </div>
                                <h2 className="text-base font-semibold text-slate-200">{selectedNote ? 'Editar Nota' : 'Nueva Nota'}</h2>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingImage}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 hover:text-slate-200 rounded-lg transition-all text-xs font-medium border border-slate-700/50 hover:border-slate-600"
                                    title="Insertar imagen"
                                >
                                    {uploadingImage ? <Spinner size="sm" /> : <ImageIcon size={14} />}
                                    {uploadingImage ? 'Subiendo...' : 'Imagen'}
                                </button>
                                {selectedNote && (
                                    <button onClick={() => handleDeleteNote(selectedNote.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Eliminar">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button onClick={handleSaveNote} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-lg transition-all text-xs font-semibold shadow-lg shadow-amber-500/20 active:scale-95">
                                    <Save size={14} strokeWidth={2.5} /> Guardar
                                </button>
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="Título de la nota..."
                            className="bg-transparent text-2xl font-bold text-white border-none focus:outline-none mb-3 placeholder:text-slate-700 tracking-tight"
                            value={noteTitle}
                            onChange={e => setNoteTitle(e.target.value)}
                        />

                        {/* Tags input */}
                        <div className="mb-4" ref={tagInputRef}>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                {noteTags.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-[11px] font-semibold shadow-sm border group/tag relative" style={{ backgroundColor: (noteTagColors[tag] || getAutoColor(tag, noteTagColors)) + '18', color: noteTagColors[tag] || getAutoColor(tag, noteTagColors), borderColor: (noteTagColors[tag] || getAutoColor(tag, noteTagColors)) + '35' }}>
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: noteTagColors[tag] || getAutoColor(tag, noteTagColors) }} />
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors opacity-60 hover:opacity-100">
                                            <X size={11} strokeWidth={2.5} />
                                        </button>
                                        {/* Color picker mini */}
                                        <div className="hidden group-hover/tag:flex absolute top-full left-0 mt-1 z-20 bg-slate-800 border border-slate-700 rounded-lg p-1.5 gap-1 shadow-xl">
                                            {TAG_PALETTE.map(c => (
                                                <button key={c} onClick={() => setTagColor(tag, c)} className="w-5 h-5 rounded-full border border-white/10 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                    </span>
                                ))}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Escribe o selecciona una etiqueta..."
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 placeholder:text-slate-600 transition-all"
                                    value={tagInput}
                                    onChange={e => { setTagInput(e.target.value); setShowTagDropdown(true); }}
                                    onFocus={() => setShowTagDropdown(true)}
                                    onKeyDown={handleTagInputKeyDown}
                                />
                                {/* Dropdown de etiquetas existentes */}
                                {showTagDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-[180px] overflow-y-auto custom-scrollbar">
                                        {Array.from(new Set(notes.flatMap(n => (n.tags || '').split(',').map(t => t.trim()).filter(Boolean)))).filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !noteTags.includes(t)).length === 0 ? (
                                            <div className="px-3 py-2 text-[11px] text-slate-500">Presiona Enter para crear "{tagInput}"</div>
                                        ) : (
                                            Array.from(new Set(notes.flatMap(n => (n.tags || '').split(',').map(t => t.trim()).filter(Boolean)))).filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !noteTags.includes(t)).map(tag => {
                                                const allColors = {};
                                                notes.forEach(n => Object.assign(allColors, parseTagColors(n.tag_colors)));
                                                const color = allColors[tag] || getAutoColor(tag, allColors);
                                                return (
                                                    <button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition-colors">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                                        {tag}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-h-[280px] lg:min-h-[320px] max-h-[400px] border border-slate-800/60 rounded-xl p-4 overflow-y-auto custom-scrollbar bg-slate-950/30">
                            <EditorContent editor={editor} />
                        </div>

                        {/* Toolbar flotante para imagen seleccionada */}
                        {imageToolbar && (
                            <div
                                className="fixed z-50 flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl px-2 py-1.5 -translate-x-1/2 -translate-y-full mt-[-8px]"
                                style={{ top: imageToolbar.top, left: imageToolbar.left }}
                            >
                                <button onClick={() => setLightboxImage(editor?.getAttributes('image').src)} className="p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-700 rounded-md transition-colors" title="Ver imagen">
                                    <Eye size={14} />
                                </button>
                                <div className="w-px h-4 bg-slate-700 mx-1" />
                                <button onClick={() => handleImageAlign('left')} className="p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-700 rounded-md transition-colors" title="Alinear izquierda">
                                    <AlignLeft size={14} />
                                </button>
                                <button onClick={() => handleImageAlign('center')} className="p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-700 rounded-md transition-colors" title="Centrar">
                                    <AlignCenter size={14} />
                                </button>
                                <button onClick={() => handleImageAlign('right')} className="p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-700 rounded-md transition-colors" title="Alinear derecha">
                                    <AlignRight size={14} />
                                </button>
                            </div>
                        )}

                        {/* Hint de atajos */}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600">
                            <span>💡 Puedes pegar imágenes directamente o arrastrarlas aquí</span>
                        </div>
                    </div>

                    {/* AI Assistant */}
                    <div className={`${mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'} flex-col bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800/60 rounded-2xl p-5 backdrop-blur-sm shadow-xl shadow-black/10`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                                <BrainCircuit size={16} />
                            </div>
                            <h2 className="text-base font-semibold text-slate-200">Asistente IA</h2>
                        </div>

                        {/* Consejos para preguntar */}
                        <div className="bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/10 rounded-xl p-3.5 mb-3">
                            <p className="text-[11px] text-violet-300 font-semibold mb-2 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-violet-400" /> Consejos para preguntar
                            </p>
                            <ul className="text-[10px] text-slate-500 space-y-1.5">
                                <li className="flex items-start gap-1.5"><span className="text-violet-500/60 mt-0.5">▸</span> Menciona una <strong className="text-slate-400">etiqueta</strong>: <em className="text-slate-500">"¿Qué tengo sobre Redes?"</em></li>
                                <li className="flex items-start gap-1.5"><span className="text-violet-500/60 mt-0.5">▸</span> Sé específico con el <strong className="text-slate-400">tema</strong>: <em className="text-slate-500">"Fórmulas de Lago Agrio"</em></li>
                                <li className="flex items-start gap-1.5"><span className="text-violet-500/60 mt-0.5">▸</span> La IA solo ve tus <strong className="text-slate-400">notas</strong>, no tiene internet.</li>
                            </ul>
                        </div>

                        <div className="flex-1 min-h-[180px] max-h-[320px] bg-slate-950/40 border border-slate-800/40 rounded-xl p-4 overflow-y-auto space-y-3 custom-scrollbar mb-3">
                            {chatHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                                    <BrainCircuit size={32} className="text-slate-700 mb-3" />
                                    <p className="text-slate-600 text-sm">Haz preguntas sobre tus notas</p>
                                    <p className="text-slate-700 text-xs mt-1">La IA buscará en tu historial de soporte</p>
                                </div>
                            ) : (
                                chatHistory.map((msg, idx) => (
                                    <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-br from-violet-600/25 to-purple-600/15 text-violet-100 rounded-tr-sm border border-violet-500/20' : msg.role === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/20 rounded-tl-sm' : 'bg-slate-800/60 text-slate-300 rounded-tl-sm border border-slate-700/40'}`}>
                                            {msg.content}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                            {isAiThinking && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                                    <div className="bg-slate-800/60 px-4 py-2.5 rounded-2xl rounded-tl-sm border border-slate-700/40 flex items-center gap-1.5">
                                        {[0, 0.15, 0.3].map((delay, i) => (
                                            <div key={i} className="w-1.5 h-1.5 bg-violet-400/50 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="Pregunta algo sobre tus notas..." className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30 transition-all text-slate-200 text-sm min-w-0 placeholder:text-slate-600"
                                value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAiAsk()} disabled={isAiThinking} />
                            <button onClick={handleAiAsk} disabled={!aiQuery.trim() || isAiThinking} className="p-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:shadow-none shrink-0">
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox / Modal de imagen */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full transition-colors"
                        onClick={() => setLightboxImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Vista previa"
                        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default SupportNotesPage;
