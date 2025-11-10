import { useEffect } from 'react';
import axios from 'axios';

/**
 * Keep-Alive Hook
 * Pings the backend server every 10 minutes to prevent it from sleeping (Render.com free tier)
 * Only runs when user is logged in
 */
export const useKeepAlive = () => {
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const pingUrl = `${backendUrl}/ping`;
    
    let isActive = true;
    let timeoutId = null;

    const pingServer = async () => {
      if (!isActive) return;
      
      try {
        // Simple GET request to keep server awake
        await axios.get(pingUrl, { 
          timeout: 5000,
          // Don't send auth headers for ping
          headers: {}
        });
        console.log('🏓 Keep-alive ping: Server awake');
      } catch (error) {
        // Silently fail - server might be waking up from sleep
        console.log('🏓 Keep-alive ping: Server waking up...');
      }

      // Schedule next ping in 10 minutes (600,000 ms)
      // This is less than the 15-minute Render.com sleep timeout
      if (isActive) {
        timeoutId = setTimeout(pingServer, 10 * 60 * 1000);
      }
    };

    // Initial ping after 5 seconds (let app initialize first)
    timeoutId = setTimeout(pingServer, 5000);

    // Cleanup on unmount
    return () => {
      isActive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);
};

export default useKeepAlive;

