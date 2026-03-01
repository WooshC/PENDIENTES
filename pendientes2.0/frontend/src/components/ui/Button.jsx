import React from 'react';

const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20',
    indigo: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20',
    emerald: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white',
    ghost: 'text-slate-400 hover:text-white hover:bg-slate-800',
    'ghost-light': 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
    secondary: 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700',
};

const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-sm',
    icon: 'p-2',
    'icon-sm': 'p-1.5',
};

const Button = ({ variant = 'primary', size = 'md', className = '', children, ...props }) => {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
