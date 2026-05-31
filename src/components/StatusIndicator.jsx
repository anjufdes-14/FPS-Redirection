import React from 'react';
import { Badge } from 'react-bootstrap';

const StatusIndicator = ({ fpsData }) => {
  if (!fpsData || fpsData.length === 0) {
    return <div className="text-muted">No FPS data loaded</div>;
  }

  const totalFPS = fpsData.length;
  const openFPS = fpsData.filter(fps => fps.status !== 'closed').length;
  const closedFPS = totalFPS - openFPS;

  return (
    <div className="d-flex gap-2 align-items-center">
      <span className="text-muted">FPS Status:</span>
      <Badge bg="success">{openFPS} Open</Badge>
      <Badge bg="danger">{closedFPS} Closed</Badge>
      <Badge bg="secondary">Total: {totalFPS}</Badge>
    </div>
  );
};

export default StatusIndicator; 