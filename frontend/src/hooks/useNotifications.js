import { useState, useEffect } from 'react';
import API from '../api';

export const useNotifications = () => {
  const [counts, setCounts] = useState({
    reminders: 0,
    invoices: 0,
    lowStock: 0,
    leaves: 0,
    attendance: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchNotificationCounts = async () => {
    try {
      const response = await API.dashboard.getNotificationCounts();
      setCounts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch notification counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotificationCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  return { counts, loading, refresh: fetchNotificationCounts };
};

export default useNotifications;