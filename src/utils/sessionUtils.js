// focus/src/utils/sessionUtils.js
import { database, ref, get, set, push, update, remove, DB_PATHS } from '../config/firebase';

/**
 * Get device information from browser
 */
export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const device = {
    device_type: 'Desktop',
    browser: 'Unknown',
    browser_version: '',
    os: 'Unknown',
    os_version: '',
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
  };

  // Detect OS
  if (ua.includes('Windows')) {
    device.os = 'Windows';
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    if (match) device.os_version = match[1];
  } else if (ua.includes('Android')) {
    device.os = 'Android';
    device.device_type = 'Mobile';
    const match = ua.match(/Android (\d+\.\d+)/);
    if (match) device.os_version = match[1];
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    device.os = 'iOS';
    device.device_type = /iPad/.test(ua) ? 'Tablet' : 'Mobile';
  } else if (ua.includes('Mac OS X')) {
    device.os = 'macOS';
  } else if (ua.includes('Linux')) {
    device.os = 'Linux';
  }

  // Detect browser
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    device.browser = 'Chrome';
    const match = ua.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) device.browser_version = match[1];
  } else if (ua.includes('Firefox')) {
    device.browser = 'Firefox';
    const match = ua.match(/Firefox\/(\d+\.\d+)/);
    if (match) device.browser_version = match[1];
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    device.browser = 'Safari';
  } else if (ua.includes('Edg')) {
    device.browser = 'Edge';
  }

  // Detect tablet
  if (ua.includes('Tablet') || (ua.includes('Android') && !ua.includes('Mobile'))) {
    device.device_type = 'Tablet';
  }

  return device;
};

/**
 * Get IP address from ipify
 */
export const getIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || '0.0.0.0';
  } catch (error) {
    console.error('Error fetching IP:', error);
    return '0.0.0.0';
  }
};

/**
 * Get location from IP using ip-api.com
 */
export const getLocationFromIP = async (ip) => {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,lat,lon,isp`);
    const data = await response.json();
    if (data.status === 'success') {
      return {
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        lat: data.lat || null,
        lon: data.lon || null,
        isp: data.isp || 'Unknown',
        source: 'ip',
        accuracy: null,
      };
    }
    return { city: 'Unknown', country: 'Unknown', lat: null, lon: null, isp: 'Unknown', source: 'ip', accuracy: null };
  } catch (error) {
    console.error('Error fetching location from IP:', error);
    return { city: 'Unknown', country: 'Unknown', lat: null, lon: null, isp: 'Unknown', source: 'ip', accuracy: null };
  }
};

/**
 * Get location from browser Geolocation API (more accurate)
 */
export const getLocationFromBrowser = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lon: null, accuracy: null, source: 'browser' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'browser',
        });
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        resolve({ lat: null, lon: null, accuracy: null, source: 'browser' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

/**
 * Get combined location (IP + browser geolocation)
 */
export const getCombinedLocation = async (ip) => {
  // 1. Get from IP first (fast)
  const ipLocation = await getLocationFromIP(ip);
  
  // 2. Try to get from browser (more accurate)
  const browserLocation = await getLocationFromBrowser();
  
  // 3. Combine: prefer browser coordinates if available
  if (browserLocation.lat && browserLocation.lon) {
    return {
      city: ipLocation.city,
      country: ipLocation.country,
      lat: browserLocation.lat,
      lon: browserLocation.lon,
      accuracy: browserLocation.accuracy,
      isp: ipLocation.isp,
      source: 'browser',
    };
  }
  
  // 4. Fallback to IP location
  return {
    city: ipLocation.city,
    country: ipLocation.country,
    lat: ipLocation.lat,
    lon: ipLocation.lon,
    accuracy: null,
    isp: ipLocation.isp,
    source: 'ip',
  };
};

/**
 * Get network connection type
 */
export const getConnectionType = () => {
  if (navigator.connection) {
    return navigator.connection.effectiveType || navigator.connection.type || 'unknown';
  }
  return 'unknown';
};

/**
 * Generate unique ID for device based on userAgent + user_id
 */
export const generateDeviceId = (userAgent, userId) => {
  const str = `${userAgent}_${userId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `DEV_${Math.abs(hash).toString(36).toUpperCase()}`;
};

/**
 * Generate unique ID for network based on ip + user_id
 */
export const generateNetworkId = (ip, userId) => {
  const str = `${ip}_${userId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `NET_${Math.abs(hash).toString(36).toUpperCase()}`;
};

/**
 * Generate unique ID for location based on city, country, lat, lon
 */
export const generateLocationId = (city, country, lat, lon) => {
  const str = `${city}_${country}_${lat || ''}_${lon || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `LOC_${Math.abs(hash).toString(36).toUpperCase()}`;
};

/**
 * Save or update device info (with id)
 */
export const saveDeviceInfo = async (userId, device) => {
  const deviceId = generateDeviceId(navigator.userAgent, userId);
  const deviceRef = ref(database, `${DB_PATHS.USER_DEVICES}/${deviceId}`);
  const snapshot = await get(deviceRef);
  const existing = snapshot.val();

  const data = {
    id_user_device: deviceId, // tambahkan id
    user_id: userId,
    ...device,
    last_seen: Date.now(),
  };

  if (existing) {
    await update(deviceRef, {
      ...data,
      first_seen: existing.first_seen || Date.now(),
    });
  } else {
    await set(deviceRef, {
      ...data,
      first_seen: Date.now(),
    });
  }

  return deviceId;
};

/**
 * Save or update network info (with id)
 */
export const saveNetworkInfo = async (userId, ip, isp, connectionType) => {
  const networkId = generateNetworkId(ip, userId);
  const networkRef = ref(database, `${DB_PATHS.USER_NETWORKS}/${networkId}`);
  const snapshot = await get(networkRef);
  const existing = snapshot.val();

  const data = {
    id_user_network: networkId, // tambahkan id
    user_id: userId,
    ip_address: ip,
    isp: isp || 'Unknown',
    connection_type: connectionType || 'unknown',
    last_seen: Date.now(),
  };

  if (existing) {
    await update(networkRef, {
      ...data,
      first_seen: existing.first_seen || Date.now(),
    });
  } else {
    await set(networkRef, {
      ...data,
      first_seen: Date.now(),
    });
  }

  return networkId;
};

/**
 * Save or update location info (with id)
 */
export const saveLocationInfo = async (userId, locationData) => {
  const { city, country, lat, lon, accuracy, source } = locationData;
  const locationId = generateLocationId(city, country, lat, lon);
  const locationRef = ref(database, `${DB_PATHS.USER_LOCATIONS}/${locationId}`);
  const snapshot = await get(locationRef);
  const existing = snapshot.val();

  const data = {
    id_user_location: locationId, // tambahkan id
    user_id: userId,
    city: city || 'Unknown',
    country: country || 'Unknown',
    lat: lat || null,
    lon: lon || null,
    accuracy: accuracy || null,
    source: source || 'ip',
    last_seen: Date.now(),
  };

  if (existing) {
    await update(locationRef, {
      ...data,
      first_seen: existing.first_seen || Date.now(),
    });
  } else {
    await set(locationRef, {
      ...data,
      first_seen: Date.now(),
    });
  }

  return locationId;
};

/**
 * Create a new online session (with id)
 */
export const createSession = async (userId, deviceId, networkId, locationId) => {
  const sessionRef = ref(database, DB_PATHS.ONLINE_SESSIONS);
  const newSessionRef = push(sessionRef);
  const sessionId = newSessionRef.key;

  const sessionData = {
    id_online_sessions: sessionId, // tambahkan id
    user_id: userId,
    login_time: Date.now(),
    last_activity: Date.now(),
    is_active: true,
    logout_method: null,
    device_id: deviceId,
    network_id: networkId,
    location_id: locationId,
  };

  await set(newSessionRef, sessionData);
  return sessionId;
};

/**
 * Update last activity timestamp (throttled)
 */
let lastActivityUpdateTime = 0;
const ACTIVITY_UPDATE_THROTTLE = 2 * 60 * 1000; // 2 menit

export const updateSessionActivity = async (sessionId) => {
  if (!sessionId) return;
  
  const now = Date.now();
  if (now - lastActivityUpdateTime < ACTIVITY_UPDATE_THROTTLE) {
    return;
  }
  
  try {
    const sessionRef = ref(database, `${DB_PATHS.ONLINE_SESSIONS}/${sessionId}`);
    await update(sessionRef, {
      last_activity: now,
    });
    lastActivityUpdateTime = now;
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
};

/**
 * Logout session (move to history) with id
 */
export const logoutSession = async (sessionId, method = 'manual') => {
  if (!sessionId) return;

  try {
    const sessionRef = ref(database, `${DB_PATHS.ONLINE_SESSIONS}/${sessionId}`);
    const snapshot = await get(sessionRef);
    const data = snapshot.val();
    if (!data) return;

    // Prepare history data with id
    const historyData = {
      ...data,
      id_login_history: sessionId, // tambahkan id
      logout_time: Date.now(),
      is_active: false,
      logout_method: method,
    };

    // Save to history
    const historyRef = ref(database, `${DB_PATHS.LOGIN_HISTORY}/${sessionId}`);
    await set(historyRef, historyData);

    // Remove from active sessions
    await remove(sessionRef);

    // Clear session from localStorage
    localStorage.removeItem('focus_session_id');
  } catch (error) {
    console.error('Error logging out session:', error);
  }
};

/**
 * Get active session for user
 */
export const getActiveSession = async (userId) => {
  try {
    const sessionRef = ref(database, DB_PATHS.ONLINE_SESSIONS);
    const snapshot = await get(sessionRef);
    const data = snapshot.val();
    if (!data) return null;

    for (const key in data) {
      if (data[key].user_id === userId && data[key].is_active === true) {
        return { sessionId: key, ...data[key] };
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting active session:', error);
    return null;
  }
};

/**
 * Get session history for user
 */
export const getSessionHistory = async (userId, limit = 20) => {
  try {
    const historyRef = ref(database, DB_PATHS.LOGIN_HISTORY);
    const snapshot = await get(historyRef);
    const data = snapshot.val();
    if (!data) return [];

    const history = [];
    for (const key in data) {
      if (data[key].user_id === userId) {
        history.push({ sessionId: key, ...data[key] });
      }
    }
    history.sort((a, b) => (b.login_time || 0) - (a.login_time || 0));
    return history.slice(0, limit);
  } catch (error) {
    console.error('Error getting session history:', error);
    return [];
  }
};

/**
 * Check if user is online (based on last_activity within 5 minutes)
 */
export const isUserOnline = (session) => {
  if (!session || !session.is_active) return false;
  const now = Date.now();
  const lastActivity = session.last_activity || 0;
  const fiveMinutes = 5 * 60 * 1000;
  return (now - lastActivity) < fiveMinutes;
};

export default {
  getDeviceInfo,
  getIP,
  getLocationFromIP,
  getLocationFromBrowser,
  getCombinedLocation,
  getConnectionType,
  generateDeviceId,
  generateNetworkId,
  generateLocationId,
  saveDeviceInfo,
  saveNetworkInfo,
  saveLocationInfo,
  createSession,
  updateSessionActivity,
  logoutSession,
  getActiveSession,
  getSessionHistory,
  isUserOnline,
};