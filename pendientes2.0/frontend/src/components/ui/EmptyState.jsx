import React from 'react';

/**
 * Empty state display for lists and panels.
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} title - Main message
 * @param {string} description - Optional subtext
 * @param {boolean} dark - Dark theme (default true)
 */
const EmptyState = ({ icon: Icon, title, description, dark = true, className = '' }) => {
    if (dark) {
        return (
            <div className={`flex flex-col items-center justify-center py-12 gap-2 text-slate-600 ${className}`}>
                {Icon && <Icon size={32} className="opacity-20" />}
                <p className="text-sm">{title}</p>
                {description && <p className="text-xs text-slate-700 mt-0.5">{description}</p>}
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center py-12 gap-2 text-slate-400 ${className}`}>
            {Icon && <Icon size={36} className="opacity-30 mb-1" />}
            <p className="italic text-sm">{title}</p>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
    );
};

export default EmptyState;
