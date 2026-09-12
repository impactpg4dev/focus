// focus/src/pages/fragment/beranda/WeatherInfo.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  WbSunny as WbSunnyIcon,
  Cloud as CloudIcon,
  Grain as RainIcon,
  Thermostat as TempIcon,
  Air as WindIcon,
  Compress as PressureIcon,
} from '@mui/icons-material';
import { getCombinedLocation } from '../../../utils/sessionUtils';

// ============================================================
// KOMPONEN WIDGET CUACA
// ============================================================
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
    <Box sx={{ color: `${color}.main`, mb: 0.5 }}>{icon}</Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight="500">
      {value || '-'}
    </Typography>
  </Box>
);

// ============================================================
// KOMPONEN UTAMA
// ============================================================
const WeatherInfo = () => {
  const [weather, setWeather] = useState(null);
  const [locationName, setLocationName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Reverse geocoding (sama seperti UserLocationInfo) ---
  const reverseGeocode = async (lat, lon) => {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`;
      const response = await fetch(url);
      const data = await response.json();
      if (data) {
        let village = '';
        let city = '';
        let province = '';
        const admin = data.localityInfo?.administrative || [];
        for (const item of admin) {
          if (item.adminLevel === 6) village = item.name;
          if (item.adminLevel === 5) city = item.name;
          if (item.adminLevel === 4) province = item.name;
        }
        const parts = [village, city, province].filter(Boolean);
        return parts.join(', ') || data.locality || data.city || 'Lokasi';
      }
      return null;
    } catch {
      return null;
    }
  };

  // --- Fetch cuaca dari Open-Meteo (GRATIS, TANPA API KEY) ---
  const fetchWeather = async (lat, lon) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,pressure_msl&timezone=auto&forecast_days=1`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  };

  // --- Mapping kode cuaca Open-Meteo ---
  const getWeatherDescription = (code) => {
    const map = {
      0: 'Cerah',
      1: 'Cerah Berawan',
      2: 'Berawan',
      3: 'Mendung',
      45: 'Kabut',
      48: 'Kabut Es',
      51: 'Gerimis Ringan',
      53: 'Gerimis',
      55: 'Gerimis Lebat',
      56: 'Gerimis Beku Ringan',
      57: 'Gerimis Beku Lebat',
      61: 'Hujan Ringan',
      63: 'Hujan',
      65: 'Hujan Lebat',
      66: 'Hujan Beku Ringan',
      67: 'Hujan Beku Lebat',
      71: 'Salju Ringan',
      73: 'Salju',
      75: 'Salju Lebat',
      77: 'Butiran Salju',
      80: 'Hujan Ringan',
      81: 'Hujan',
      82: 'Hujan Lebat',
      85: 'Salju Ringan',
      86: 'Salju Lebat',
      95: 'Badai Petir',
      96: 'Badai Petir + Hujan Es',
      99: 'Badai Petir + Hujan Es Lebat',
    };
    return map[code] || 'Tidak diketahui';
  };

  // --- Ikon berdasarkan kode cuaca ---
  const getConditionIcon = (code) => {
    if ([0, 1].includes(code)) return <WbSunnyIcon fontSize="medium" color="warning" />;
    if ([2, 3].includes(code)) return <CloudIcon fontSize="medium" color="info" />;
    if ([45, 48].includes(code)) return <CloudIcon fontSize="medium" color="secondary" />;
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <RainIcon fontSize="medium" color="primary" />;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <RainIcon fontSize="medium" color="info" />;
    if ([95, 96, 99].includes(code)) return <RainIcon fontSize="medium" color="error" />;
    return <WbSunnyIcon fontSize="medium" color="warning" />;
  };

  // --- Mendapatkan lokasi (prioritas browser geolocation) ---
  const getLocation = async () => {
    // 1. Coba browser geolocation (lebih akurat)
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation tidak didukung'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'browser' };
    } catch (browserError) {
      console.warn('Browser geolocation gagal, fallback ke IP:', browserError.message);
    }

    // 2. Fallback ke IP (dari getCombinedLocation)
    try {
      const ipLoc = await getCombinedLocation();
      if (ipLoc.lat && ipLoc.lon) {
        return { lat: ipLoc.lat, lon: ipLoc.lon, source: 'ip' };
      }
    } catch (ipError) {
      console.warn('IP geolocation gagal:', ipError.message);
    }

    throw new Error('Tidak dapat memperoleh koordinat lokasi.');
  };

  // --- Get weather and location name ---
  const getLocationAndWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Dapatkan koordinat
      const { lat, lon, source } = await getLocation();

      // 2. Reverse geocode untuk nama lokasi
      const name = await reverseGeocode(lat, lon);
      setLocationName(name || 'Lokasi');

      // 3. Fetch cuaca
      const weatherData = await fetchWeather(lat, lon);
      setWeather(weatherData);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err.message || 'Gagal memuat cuaca');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh setiap 10 menit
  useEffect(() => {
    getLocationAndWeather();
    const interval = setInterval(getLocationAndWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // --- RENDER LOADING ---
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  // --- RENDER ERROR ---
  if (error) {
    return (
      <Alert severity="warning" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
        Gagal memuat cuaca: {error}
      </Alert>
    );
  }

  // --- RENDER DATA ---
  if (!weather || !weather.current) {
    return (
      <Typography variant="body2" color="text.secondary" align="center">
        Data cuaca tidak tersedia.
      </Typography>
    );
  }

  const current = weather.current;
  const temp = Math.round(current.temperature_2m) || '-';
  const feelsLike = Math.round(current.apparent_temperature) || '-';
  const humidity = current.relative_humidity_2m || '-';
  const windSpeed = current.wind_speed_10m ? `${Math.round(current.wind_speed_10m)} km/h` : '-';
  const pressure = current.pressure_msl || '-';
  const weatherCode = current.weather_code;
  const condition = getWeatherDescription(weatherCode);
  const conditionIcon = getConditionIcon(weatherCode);

  const metrics = [
    {
      key: 'temperature',
      label: 'Suhu',
      value: `${temp}°C`,
      icon: <TempIcon fontSize="medium" color="error" />,
      color: 'error',
    },
    {
      key: 'condition',
      label: 'Kondisi',
      value: condition,
      icon: conditionIcon,
      color: 'warning',
    },
    {
      key: 'humidity',
      label: 'Kelembaban',
      value: `${humidity}%`,
      icon: <RainIcon fontSize="medium" color="primary" />,
      color: 'primary',
    },
    {
      key: 'wind',
      label: 'Angin',
      value: windSpeed,
      icon: <WindIcon fontSize="medium" color="info" />,
      color: 'info',
    },
    {
      key: 'feelsLike',
      label: 'Terasa',
      value: `${feelsLike}°C`,
      icon: <TempIcon fontSize="medium" color="success" />,
      color: 'success',
    },
    {
      key: 'pressure',
      label: 'Tekanan',
      value: `${pressure} hPa`,
      icon: <PressureIcon fontSize="medium" color="secondary" />,
      color: 'secondary',
    },
  ];

  return (
    <Box>
      {/* Header dengan nama lokasi */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        <Box sx={{ fontSize: 40 }}>{conditionIcon}</Box>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {temp}°C
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cuaca di {locationName || 'Lokasi'} · {condition}
          </Typography>
        </Box>
      </Box>

      {/* Grid 3 kolom */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
        }}
      >
        {metrics.map((item) => (
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
        Diperbarui otomatis setiap 10 menit
      </Typography>
    </Box>
  );
};

export default WeatherInfo;