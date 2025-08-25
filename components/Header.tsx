
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { signOutUser } from '../services/firebaseAuth';
import WeatherWidget from './WeatherWidget';

const Header: React.FC = () => {
  const { user } = useContext(AuthContext);
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

        {/* Menu de Navegação */}
        <nav>
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-text-secondary hidden sm:block">Olá, {user.name}</span>
              <button
                onClick={() => {
                  console.log('Clique detectado no botão Sair!');
                  handleLogout();
                }}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                Sair
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
                 <Link to="/login" className="text-text-secondary hover:text-accent transition-colors">Login</Link>
            </div>
          )}
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
