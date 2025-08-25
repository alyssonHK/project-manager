
import React, { useState, useEffect, createContext, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChangedListener } from './services/firebaseAuth';
import type { User } from './types';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import PublicProjectPage from './pages/PublicProjectPage';
import Header from './components/Header';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const handleAuthStateChanged = useCallback((user: User | null) => {
    console.log('Estado de autenticação alterado:', user ? `Usuário: ${user.name}` : 'Usuário deslogado');
    setUser(user);
    setLoading(false);
  }, []);

  useEffect(() => {
    console.log('Configurando listener de autenticação...');
    const unsubscribe = onAuthStateChangedListener(handleAuthStateChanged);
    return () => {
      console.log('Removendo listener de autenticação...');
      unsubscribe();
    };
  }, [handleAuthStateChanged]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-16 h-16 border-4 border-t-transparent border-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <HashRouter>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="flex-grow container mx-auto p-4 md:p-6">
            <Routes>
              <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
              <Route path="/project/:projectId" element={user ? <ProjectDetailPage /> : <Navigate to="/login" />} />
              <Route path="/share/:shareId" element={<PublicProjectPage />} />
              <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
