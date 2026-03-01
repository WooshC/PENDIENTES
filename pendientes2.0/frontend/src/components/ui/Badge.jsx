import React from 'react';

const lightStyles = {
    'Finalizado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'En Curso': 'bg-amber-100 text-amber-700 border-amber-200',
    'Sin Tareas': 'bg-slate-100 text-slate-500 border-slate-200',
    'Pendiente': 'bg-blue-100 text-blue-600 border-blue-200',
};

const darkStyles = {
    'Finalizado': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'En Curso': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Sin Tareas': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'Pendiente': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

/**
 * Status badge component.
 * @param {string} status - 'Finalizado' | 'En Curso' | 'Sin Tareas' | 'Pendiente'
 * @param {boolean} dark - Use dark theme colors (default false)
 * @param {'xs'|'sm'} size - Badge size (default 'sm')
 */
const Badge = ({ status, dark = false, size = 'sm', className = '' }) => {
    const styles = dark ? darkStyles : lightStyles;
    const style = styles[status] ?? (dark ? darkStyles['Pendiente'] : lightStyles['Pendiente']);
    const sizeClass = size === 'xs'
        ? 'text-[10px] px-1.5 py-0.5'
        : 'text-xs px-2.5 py-0.5';

    return (
        <span className={`inline-flex items-center rounded-full font-bold border ${style} ${sizeClass} ${className}`}>
            {status}
        </span>
    );
};

export default Badge;
