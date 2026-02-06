import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PendingPage from './pages/PendingPage';
import ClientsPage from './pages/ClientsPage';
import SupportNotesPage from './pages/SupportNotesPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<PendingPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/notas" element={<SupportNotesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
