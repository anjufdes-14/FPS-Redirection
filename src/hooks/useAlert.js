import { useState, useCallback } from 'react';

export const useAlert = () => {
  const [alerts, setAlerts] = useState([]);

  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    const newAlert = { id, message, type };
    
    setAlerts(prev => [...prev, newAlert]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 5000);
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  return { alerts, addAlert, removeAlert };
};
