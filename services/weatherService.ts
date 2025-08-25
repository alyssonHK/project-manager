// Serviço para buscar dados do clima
// Usando a API gratuita do OpenWeatherMap

interface WeatherData {
  temperature: number;
  feelsLike: number; // Sensação térmica
  description: string;
  icon: string;
  city: string;
  humidity: number;
  windSpeed: number;
}

interface OpenWeatherResponse {
  main: {
    temp: number;
    feels_like: number; // Sensação térmica da API
    humidity: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  name: string;
}

// Função para obter a localização do usuário
const getUserLocation = (): Promise<{ lat: number; lon: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn('Geolocalização não suportada, usando localização padrão');
      // Fallback para Joinville - SC
      resolve({ lat: -26.3044, lon: -48.8461 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Erro ao obter localização:', error.message);
        // Fallback para Joinville - SC
        resolve({ lat: -26.3044, lon: -48.8461 });
      },
      {
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 300000 // 5 minutos
      }
    );
  });
};

// Função para buscar dados do clima
export const getWeatherData = async (): Promise<WeatherData> => {
  try {
    // Obter localização do usuário
    const { lat, lon } = await getUserLocation();
    
    // API Key do OpenWeatherMap - pode ser configurada via variável de ambiente
    const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || 'demo';
    
    // Se não houver API key configurada, retornar dados mock
    if (API_KEY === 'demo' || API_KEY === 'YOUR_API_KEY') {
      console.warn('API key do OpenWeatherMap não configurada. Usando dados de demonstração.');
      return getMockWeatherData();
    }
    
    // URL da API (usando coordenadas)
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }
    
    const data: OpenWeatherResponse = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      city: data.name,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // Converter m/s para km/h
    };
  } catch (error) {
    console.error('Erro ao buscar dados do clima:', error);
    // Retornar dados mock em caso de erro
    return getMockWeatherData();
  }
};

// Função para gerar dados mock do clima - agora consistentes
const getMockWeatherData = (): WeatherData => {
  // Usar dados fixos baseados na hora do dia para simular dados realistas
  const now = new Date();
  const hour = now.getHours();
  
  // Dados baseados na hora do dia para simular variação realista
  if (hour >= 6 && hour < 12) {
    // Manhã
    return {
      temperature: 22,
      feelsLike: 24,
      description: 'ensolarado',
      icon: '01d',
      city: 'Joinville',
      humidity: 65,
      windSpeed: 12,
    };
  } else if (hour >= 12 && hour < 18) {
    // Tarde
    return {
      temperature: 25,
      feelsLike: 28,
      description: 'parcialmente nublado',
      icon: '02d',
      city: 'Joinville',
      humidity: 60,
      windSpeed: 15,
    };
  } else if (hour >= 18 && hour < 22) {
    // Noite
    return {
      temperature: 20,
      feelsLike: 22,
      description: 'nublado',
      icon: '03d',
      city: 'Joinville',
      humidity: 75,
      windSpeed: 8,
    };
  } else {
    // Madrugada
    return {
      temperature: 18,
      feelsLike: 16,
      description: 'névoa',
      icon: '50d',
      city: 'Joinville',
      humidity: 85,
      windSpeed: 5,
    };
  }
};

// Função para obter o ícone do clima
export const getWeatherIcon = (iconCode: string): string => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};

// Função para formatar a descrição do clima
export const formatWeatherDescription = (description: string): string => {
  return description.charAt(0).toUpperCase() + description.slice(1);
}; 