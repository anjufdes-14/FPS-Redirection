import React from 'react';
import { Card, Badge } from 'react-bootstrap';

const FPSTestPanel = ({ fpsData }) => {
  if (!fpsData || fpsData.length === 0) {
    return null;
  }

  return (
    <Card className="mb-3">
      <Card.Header>
        <h6>FPS Status Test Panel</h6>
      </Card.Header>
      <Card.Body>
        <div className="row">
          {fpsData.map((fps, idx) => (
            <div key={fps.fps_id} className="col-md-4 mb-2">
              <div className="d-flex justify-content-between align-items-center p-2 border rounded">
                <div>
                  <strong>{fps.fps_name}</strong>
                  <br />
                  <small className="text-muted">ID: {fps.fps_id}</small>
                </div>
                <Badge bg={fps.status === 'closed' ? 'danger' : 'success'}>
                  {fps.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
};

export default FPSTestPanel; 