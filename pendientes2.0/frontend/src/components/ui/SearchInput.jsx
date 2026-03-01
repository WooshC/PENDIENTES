import React from 'react';
import { Search } from 'lucide-react';

/**
 * Search input component with two themes.
 * @param {boolean} dark - Dark theme (sidebar/panel style). Default false = light card style.
 */
const SearchInput = ({ value, onChange, placeholder = 'Buscar...', dark = false, className = '' }) => {
    if (dark) {
        return (
            <div className={`flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2 ${className}`}>
                <Search size={15} className="text-slate-500 shrink-0" />
                <input
                    type="text"
                    placeholder={placeholder}
                    className="bg-transparent outline-none text-sm text-slate-300 placeholder-slate-600 flex-1 min-w-0"
                    value={value}
                    onChange={onChange}
                />
            </div>
        );
    }

    return (
        <div className={`bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all ${className}`}>
            <Search className="text-slate-400 shrink-0" size={18} />
            <input
                type="text"
                placeholder={placeholder}
                className="bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 w-full text-sm font-medium min-w-0"
                value={value}
                onChange={onChange}
            />
        </div>
    );
};

export default SearchInput;
