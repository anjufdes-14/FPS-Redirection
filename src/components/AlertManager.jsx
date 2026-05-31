import React from 'react';
import { Alert } from 'react-bootstrap';

const AlertManager = ({ alerts, onRemoveAlert }) => {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      {alerts.map(alert => (
        <Alert
          key={alert.id}
          variant={alert.type}
          dismissible
          onClose={() => onRemoveAlert(alert.id)}
        >
          {alert.message}
        </Alert>
      ))}
    </div>
  );
};

export default AlertManager;
