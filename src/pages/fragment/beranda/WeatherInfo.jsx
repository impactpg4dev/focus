// focus/src/pages/fragment/beranda/WeatherInfo.jsx
import React from 'react';
import {
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  WbSunny as WbSunnyIcon,
  Cloud as CloudIcon,
  Grain as RainIcon,
  Thermostat as TempIcon,
} from '@mui/icons-material';

// Komponen widget untuk cuaca
const WeatherMetric = ({ icon, label, value, color = 'text.primary' }) => (
  <Box
    sx={{
      p: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.paper',
      borderRadius: 1,
    }}
  >
    <Box sx={{ color: `${color}.main`, mb: 0.5 }}>
      {icon}
    </Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight="500">
      {value || '-'}
    </Typography>
  </Box>
);

const WeatherInfo = () => {
  // Data dummy (nanti bisa dihubungkan ke API cuaca)
  const weatherData = {
    temperature: '32°C',
    condition: 'Cerah',
    humidity: '65%',
    wind: '12 km/h',
    feelsLike: '34°C',
    uvIndex: '8',
  };

  const weatherMetrics = [
    { key: 'temperature', label: 'Suhu', value: weatherData.temperature, icon: <TempIcon fontSize="medium" />, color: 'error' },
    { key: 'condition', label: 'Kondisi', value: weatherData.condition, icon: <WbSunnyIcon fontSize="medium" color="warning" />, color: 'warning' },
    { key: 'humidity', label: 'Kelembaban', value: weatherData.humidity, icon: <RainIcon fontSize="medium" color="primary" />, color: 'primary' },
    { key: 'wind', label: 'Angin', value: weatherData.wind, icon: <CloudIcon fontSize="medium" color="info" />, color: 'info' },
    { key: 'feelsLike', label: 'Terasa', value: weatherData.feelsLike, icon: <TempIcon fontSize="medium" color="success" />, color: 'success' },
    { key: 'uvIndex', label: 'UV Index', value: weatherData.uvIndex, icon: <WbSunnyIcon fontSize="medium" color="warning" />, color: 'warning' },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
        }}
      >
        {weatherMetrics.map((item) => (
          <WeatherMetric
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={item.value}
            color={item.color}
          />
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
        Cuaca diperbarui secara otomatis
      </Typography>
    </Box>
  );
};

export default WeatherInfo;