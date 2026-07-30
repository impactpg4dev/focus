import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  MyLocation as MyLocationIcon,
} from '@mui/icons-material';
import { getCombinedLocation, getLocationFromBrowser, getIP } from '../../../utils/sessionUtils';

const UserLocationInfo = () => {
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState(null);
  const [coords, setCoords] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  // Reverse geocoding menggunakan BigDataCloud API
  const reverseGeocode = async (lat, lon) => {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`;
      const response = await fetch(url);
      const data = await response.json();

      console.log('🔍 BigDataCloud response:', data);

      if (data) {
        // Field utama
        let country = data.countryName || '';
        let province = data.principalSubdivision || '';
        let city = data.city || '';
        let locality = data.locality || '';
        let postcode = data.postcode || '';

        // Ambil dari localityInfo.administrative untuk hierarki yang lebih akurat
        const admin = data.localityInfo?.administrative || [];

        let village = '';
        let subdistrict = '';
        let kabupaten = '';
        let provinsi = '';

        // Mapping berdasarkan adminLevel (prioritas utama)
        for (const item of admin) {
          const level = item.adminLevel;
          if (level === 2) {
            // Negara
            if (!country) country = item.name;
          } else if (level === 4) {
            // Provinsi
            provinsi = item.name;
            if (!province) province = item.name;
          } else if (level === 5) {
            // Kabupaten/Kota
            kabupaten = item.name;
            if (!city) city = item.name;
          } else if (level === 6) {
            // Kecamatan
            subdistrict = item.name;
          } else if (level === 7 || level === 8) {
            // Desa/Kelurahan (level 7 = desa, level 8 = kelurahan)
            if (!village) village = item.name;
          }
        }

        // Fallback: jika adminLevel tidak tersedia, gunakan order
        if (!provinsi && admin.length > 0) {
          const sorted = [...admin].sort((a, b) => a.order - b.order);
          // order 2-3 = negara, 4 = provinsi, 5 = kabupaten, 6 = kecamatan, 7+ = desa
          const countryItem = sorted.find(a => a.order === 2 || a.order === 3);
          if (countryItem && !country) country = countryItem.name;

          const provinceItem = sorted.find(a => a.order === 4);
          if (provinceItem) {
            provinsi = provinceItem.name;
            if (!province) province = provinceItem.name;
          }

          const cityItem = sorted.find(a => a.order === 5);
          if (cityItem) {
            kabupaten = cityItem.name;
            if (!city) city = cityItem.name;
          }

          const subdistrictItem = sorted.find(a => a.order === 6);
          if (subdistrictItem) subdistrict = subdistrictItem.name;

          const villageItem = sorted.find(a => a.order >= 7);
          if (villageItem) village = villageItem.name;
        }

        // Gunakan locality sebagai fallback untuk desa
        if (!village && locality) village = locality;

        // Tampilkan nama yang paling spesifik
        const cityName = kabupaten || city || '';
        const provinceName = provinsi || province || '';

        // Buat display name yang lebih rapi
        const parts = [village, subdistrict, cityName, provinceName, country].filter(Boolean);
        const displayName = parts.join(', ') || data.locality || data.city || 'Lokasi tidak diketahui';

        const components = {
          village,
          subdistrict,
          city: cityName,
          province: provinceName,
          country,
          postcode,
          display_name: displayName,
          raw: data,
        };

        console.log('📌 Address components:', components);
        return components;
      }
      return null;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return null;
    }
  };

  const fetchLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      let ip = null;
      try {
        ip = await getIP();
      } catch (e) {
        console.warn('Gagal dapat IP:', e);
      }

      let locationData = await getCombinedLocation(ip || '');
      let lat = locationData.lat;
      let lon = locationData.lon;

      if (!lat || !lon || (locationData.accuracy && locationData.accuracy > 1000)) {
        const browserLoc = await getLocationFromBrowser();
        if (browserLoc.lat && browserLoc.lon) {
          lat = browserLoc.lat;
          lon = browserLoc.lon;
        }
      }

      if (!lat || !lon) {
        setError('Tidak dapat memperoleh koordinat. Periksa izin lokasi atau koneksi internet.');
        setLoading(false);
        return;
      }

      setCoords({ lat, lon, accuracy: locationData.accuracy || null });

      const addr = await reverseGeocode(lat, lon);
      if (addr && (addr.village || addr.subdistrict || addr.city)) {
        setAddress(addr);
      } else {
        setError('Gagal mengambil informasi alamat.');
      }
    } catch (err) {
      console.error('Error fetching location info:', err);
      setError('Gagal mendapatkan lokasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
    const interval = setInterval(fetchLocation, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = () => setExpanded(!expanded);

  const getShortAddress = () => {
    if (!address) return 'Lokasi tidak tersedia';
    const parts = [
      address.village,
      address.subdistrict,
      address.city,
    ].filter(Boolean);
    return parts.join(', ') || address.display_name || 'Lokasi';
  };

  const getAddressLabels = () => {
    if (!address) return [];
    const items = [
      { key: 'Desa/Kelurahan', value: address.village },
      { key: 'Kecamatan', value: address.subdistrict },
      { key: 'Kabupaten/Kota', value: address.city },
      { key: 'Provinsi', value: address.province },
      { key: 'Negara', value: address.country },
      { key: 'Kode Pos', value: address.postcode },
    ];
    return items.filter(item => item.value && item.value.trim() !== '');
  };

  return (
    <Paper
      sx={{
        p: 0,
        mb: '4px',
        mx: 1,
        background:'transparent',
        boxShadow:0
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', flex: 1 }}>
          <MyLocationIcon color="primary" fontSize="small" />
          {loading ? (
            <CircularProgress size={20} />
          ) : error ? (
            <Typography variant="caption" color="error" sx={{ flex: 1 }}>
              {error}
            </Typography>
          ) : (
            <Tooltip title={address?.display_name || ''} arrow>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                }}
              >
                {getShortAddress()}
              </Typography>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <IconButton size="small" onClick={fetchLocation} disabled={loading} title="Refresh lokasi">
            <RefreshIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={toggleExpand}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', mb: '12px', }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            <strong>Detail lokasi saat ini:</strong>
          </Typography>

          {address ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
              {getAddressLabels().map((item) => (
                <React.Fragment key={item.key}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {item.key}:
                  </Typography>
                  <Typography variant="caption">{item.value}</Typography>
                </React.Fragment>
              ))}
              {coords && (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Koordinat:
                  </Typography>
                  <Typography variant="caption">
                    {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}
                    {coords.accuracy && ` (±${Math.round(coords.accuracy)}m)`}
                  </Typography>
                </>
              )}
              {address.display_name && address.display_name !== getShortAddress() && (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Alamat Lengkap:
                  </Typography>
                  <Typography variant="caption" sx={{ wordBreak: 'break-word' }}>
                    {address.display_name}
                  </Typography>
                </>
              )}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Tidak ada data alamat.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default UserLocationInfo;