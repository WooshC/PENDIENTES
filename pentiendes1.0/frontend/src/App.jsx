
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { CheckSquare, Users, LayoutDashboard, Bell } from 'lucide-react';
import PendingPage from './pages/PendingPage';
import ClientsPage from './pages/ClientsPage';

function NavTabs() {
  const location = useLocation();

  return (
    <div className="tabs">
      <Link to="/" className={`tab-btn ${location.pathname === '/' ? 'active' : ''}`}>
        <CheckSquare size={18} />
        Pendientes
      </Link>
      <Link to="/clients" className={`tab-btn ${location.pathname === '/clients' ? 'active' : ''}`}>
        <Users size={18} />
        Clientes
      </Link>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="container">
        <header>
          <h1>
            <LayoutDashboard style={{ display: 'inline-block', marginRight: '10px', verticalAlign: 'middle' }} />
            Gestión de Tareas
          </h1>
          <NavTabs />
        </header>

        <main>
          <Routes>
            <Route path="/" element={<PendingPage />} />
            <Route path="/clients" element={<ClientsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
