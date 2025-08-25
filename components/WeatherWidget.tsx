import React, { useState, useEffect, useCallback } from 'react';
import { getWeatherData, getWeatherIcon, formatWeatherDescription } from '../services/weatherService';

interface WeatherData {
  temperature: number;
  feelsLike: number; // Sensação térmica
  description: string;
  icon: string;
  city: string;
  humidity: number;
  windSpeed: number;
}

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchWeather = useCallback(async (forceRefresh = false) => {
    // Verificar se já temos dados recentes (menos de 5 minutos)
    if (!forceRefresh && weather && lastUpdate) {
      const timeDiff = Date.now() - lastUpdate.getTime();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutos em millisegundos
      
      if (timeDiff < fiveMinutes) {
        console.log('Usando dados em cache do clima');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getWeatherData();
      setWeather(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Erro ao carregar clima');
      console.error('Erro ao buscar clima:', err);
    } finally {
      setLoading(false);
    }
  }, [weather, lastUpdate]);

  useEffect(() => {
    fetchWeather();

    // Atualizar clima a cada 30 minutos
    const interval = setInterval(() => fetchWeather(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  // Fechar detalhes quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDetails && !target.closest('.weather-widget')) {
        setShowDetails(false);
      }
    };

    if (showDetails) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDetails]);

  if (loading && !weather) {
    return (
      <div className="weather-widget flex items-center space-x-2 px-3 py-2 bg-secondary/50 rounded-lg">
        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-text-secondary">Carregando clima...</span>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="weather-widget flex items-center space-x-2 px-3 py-2 bg-secondary/50 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span className="text-sm text-text-secondary">Clima indisponível</span>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchWeather(true); // Forçar atualização
  };

  // Determinar se a sensação térmica é diferente da temperatura real
  const hasDifferentFeelsLike = weather.feelsLike !== weather.temperature;

  return (
    <div className="weather-widget relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors duration-200"
        title="Clique para ver detalhes do clima"
      >
        <img 
          src={getWeatherIcon(weather.icon)} 
          alt={weather.description}
          className="w-8 h-8"
        />
        <div className="text-left">
          <div className="text-sm font-medium text-text-primary">
            {weather.temperature}°C
            {hasDifferentFeelsLike && (
              <span className="text-xs text-text-secondary ml-1">
                (sente {weather.feelsLike}°C)
              </span>
            )}
          </div>
          <div className="text-xs text-text-secondary">
            {formatWeatherDescription(weather.description)}
          </div>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detalhes expandidos */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-card border border-gray-600 rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-primary">{weather.city}</h3>
            <button
              onClick={() => setShowDetails(false)}
              className="text-text-secondary hover:text-text-primary transition-colors"
              title="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center space-x-3 mb-4">
            <img 
              src={getWeatherIcon(weather.icon)} 
              alt={weather.description}
              className="w-12 h-12"
            />
            <div className="flex-1">
              <div className="text-2xl font-bold text-text-primary">
                {weather.temperature}°C
              </div>
              {hasDifferentFeelsLike && (
                <div className="text-sm text-text-secondary">
                  Sensação: {weather.feelsLike}°C
                </div>
              )}
              <div className="text-sm text-text-secondary">
                {formatWeatherDescription(weather.description)}
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Umidade:</span>
              <span className="text-text-primary">{weather.humidity}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Vento:</span>
              <span className="text-text-primary">{weather.windSpeed} km/h</span>
            </div>
          </div>

          {lastUpdate && (
            <div className="text-xs text-text-secondary mb-3">
              Atualizado: {lastUpdate.toLocaleTimeString()}
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="flex-1 text-xs bg-accent/20 text-accent hover:bg-accent/30 transition-colors py-2 px-3 rounded-md flex items-center justify-center space-x-1"
              title="Atualizar dados do clima"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Atualizar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherWidget; 