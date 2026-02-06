import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Bell, CheckCircle2, StickyNote } from 'lucide-react';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-slate-100 flex font-sans selection:bg-blue-500/30 pb-20 md:pb-0">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-950 border-r border-slate-800 flex-shrink-0 fixed h-full z-10 hidden md:flex flex-col transition-all duration-300">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <CheckCircle2 size={20} className="text-white" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        TaskFlow Pro
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Pendientes" />
                    <NavItem to="/clientes" icon={<Users size={20} />} label="Clientes" />
                    <NavItem to="/notas" icon={<StickyNote size={20} />} label="Notas Soporte" />
                </nav>

                <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
                    v2.1.0 &copy; 2026
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 z-50 flex justify-around items-center p-3 pb-safe">
                <MobileNavItem to="/" icon={<LayoutDashboard size={24} />} label="Pendientes" />
                <MobileNavItem to="/clientes" icon={<Users size={24} />} label="Clientes" />
                <MobileNavItem to="/notas" icon={<StickyNote size={24} />} label="Notas" />
            </div>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto w-full">
                <div className="max-w-7xl mx-auto space-y-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

const NavItem = ({ to, icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-blue-600/10 text-blue-400 shadow-sm border border-blue-500/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`
        }
    >
        <span className="group-hover:scale-110 transition-transform duration-200">{icon}</span>
        <span className="font-medium">{label}</span>
    </NavLink>
);

const MobileNavItem = ({ to, icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive
                ? 'text-blue-400'
                : 'text-slate-500'
            }`
        }
    >
        <span className={({ isActive }) => isActive ? 'scale-110' : ''}>{icon}</span>
        <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
);

export default Layout;
