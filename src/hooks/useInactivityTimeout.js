// focus/src/hooks/useInactivityTimeout.js
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOut } from '../config/firebase';
import { logoutSession, updateSessionActivity } from '../utils/sessionUtils';

// 12 jam dalam milidetik
const INACTIVITY_TIMEOUT = 12 * 60 * 60 * 1000; // 43200000 ms

// Interval pengecekan (setiap 1 menit)
const CHECK_INTERVAL = 60 * 1000;

const useInactivityTimeout = () => {
  const navigate = useNavigate();
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const sessionIdRef = useRef(localStorage.getItem('focus_session_id'));

  // Fungsi untuk reset timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    // Update last_activity di database (throttled internally)
    if (sessionIdRef.current) {
      updateSessionActivity(sessionIdRef.current).catch(err => 
        console.error('Error updating activity:', err)
      );
    }
  }, []);

  // Fungsi untuk logout
  const handleLogout = useCallback(async () => {
    try {
      const sessionId = sessionIdRef.current;
      if (sessionId) {
        await logoutSession(sessionId, 'timeout');
        localStorage.removeItem('focus_session_id');
      }
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out due to inactivity:', error);
    }
  }, [navigate]);

  // Cek inactivity secara periodik
  const checkInactivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
      handleLogout();
    }
  }, [handleLogout]);

  useEffect(() => {
    // Event listener untuk reset timer
    const events = [
      'mousedown', 'mousemove', 'click', 'scroll', 'keydown', 
      'touchstart', 'touchmove', 'wheel'
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Daftarkan event listener
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Set interval pengecekan
    intervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL);

    // Ambil sessionId dari localStorage
    sessionIdRef.current = localStorage.getItem('focus_session_id');

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [resetTimer, checkInactivity]);

  // Fungsi untuk reset timer secara manual
  const reset = resetTimer;

  return { reset };
};

export default useInactivityTimeout;