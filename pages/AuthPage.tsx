
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../services/firebaseAuth';

type AuthMode = 'login' | 'signup';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(name, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Erro de autenticação:', err);
      setError(err.message || JSON.stringify(err) || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => (prev === 'login' ? 'signup' : 'login'));
    setError('');
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-md bg-card p-8 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-center text-text-primary mb-2">
          {mode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}
        </h2>
        <p className="text-center text-text-secondary mb-6">
            {mode === 'login' ? 'Faça login para continuar.' : 'Preencha os campos para se cadastrar.'}
        </p>
        
        {error && <p className="bg-red-500/20 text-red-400 p-3 rounded-md mb-4 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="text-sm font-medium text-text-secondary">Nome</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="text-sm font-medium text-text-secondary">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="password"  className="text-sm font-medium text-text-secondary">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 bg-secondary border border-gray-600 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-900/50 disabled:cursor-not-allowed"
          >
            {loading ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div> : (mode === 'login' ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-text-secondary">
          {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <button onClick={toggleMode} className="font-medium text-accent hover:text-blue-400 ml-1">
            {mode === 'login' ? 'Cadastre-se' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
