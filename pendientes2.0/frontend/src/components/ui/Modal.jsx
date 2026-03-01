import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Reusable modal wrapper.
 * @param {boolean} open - Whether the modal is visible
 * @param {function} onClose - Called when backdrop or X is clicked
 * @param {string} title - Optional header title
 * @param {React.ReactNode} children - Modal body content
 * @param {string} maxWidth - Tailwind max-width class (default 'max-w-lg')
 * @param {boolean} dark - Dark theme (default false = light)
 * @param {string} zIndex - Tailwind z-index class (default 'z-50')
 * @param {boolean} closeOnBackdrop - Close when clicking backdrop (default true)
 * @param {React.ReactNode} header - Custom header content (replaces title)
 */
const Modal = ({
    open,
    onClose,
    title,
    header,
    children,
    maxWidth = 'max-w-lg',
    dark = false,
    zIndex = 'z-50',
    closeOnBackdrop = true,
}) => {
    const handleBackdrop = () => {
        if (closeOnBackdrop && onClose) onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <div
                    className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-black/60 backdrop-blur-md`}
                    onClick={handleBackdrop}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className={`w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh] rounded-2xl shadow-2xl ${
                            dark
                                ? 'bg-slate-900 border border-slate-700'
                                : 'bg-white'
                        }`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Custom header */}
                        {header && header}

                        {/* Simple title header */}
                        {!header && title && (
                            <div className={`px-5 py-4 flex justify-between items-center shrink-0 ${
                                dark
                                    ? 'border-b border-slate-800 bg-slate-950'
                                    : 'border-b border-slate-100 bg-slate-50'
                            }`}>
                                <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                                    {title}
                                </h2>
                                {onClose && (
                                    <button
                                        onClick={onClose}
                                        className={`p-1 rounded-lg transition-colors ${
                                            dark
                                                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        )}

                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Modal;
