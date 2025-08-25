
import React, { useContext } from 'react';
import { ThemeContext } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { signOutUser } from '../services/firebaseAuth';
import WeatherWidget from './WeatherWidget';

const Header: React.FC = () => {
  const { user } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  console.log('Header renderizado, usuário:', user ? `Logado: ${user.name}` : 'Não logado');

  const handleLogout = async () => {
    console.log('Botão Sair clicado!');
    try {
      console.log('Iniciando logout...');
      await signOutUser();
      console.log('Logout realizado com sucesso');
      navigate('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      alert('Erro ao fazer logout. Tente novamente.');
    }
  };

  return (
    <header className="bg-card shadow-md relative z-50">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-accent" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.5 9a.5.5 0 000 1h7a.5.5 0 000-1h-7zM7 6.5a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zM10 12a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 0110 12z" clipRule="evenodd" />
          </svg>
          <h1 className="text-xl font-bold text-text-primary">Project Manager</h1>
        </Link>

        {/* Widget do Clima - Centralizado */}
        <div className="hidden md:block">
          <WeatherWidget />
        </div>

        {/* Menu de Navegação + Toggle Tema */}
        <nav>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="button button-secondary flex items-center justify-center"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              style={{ minWidth: 40, minHeight: 40 }}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" /></svg>
              )}
            </button>
            {user ? (
              <>
                <span className="text-text-secondary hidden sm:block">Olá, {user.name}</span>
                <button
                  onClick={handleLogout}
                  className="button button-primary"
                  style={{ pointerEvents: 'auto' }}
                >
                  Sair
                </button>
              </>
            ) : (
              <Link to="/login" className="button button-secondary">Login</Link>
            )}
          </div>
        </nav>
      </div>

      {/* Widget do Clima para Mobile - Posicionado abaixo do header */}
      <div className="md:hidden border-t border-gray-600 bg-secondary/30">
        <div className="container mx-auto px-4 py-2 flex justify-center">
          <WeatherWidget />
        </div>
      </div>
    </header>
  );
};

export default Header;
