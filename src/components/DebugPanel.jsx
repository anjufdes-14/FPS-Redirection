import React, { useState } from 'react';
import { Card, Button, Collapse } from 'react-bootstrap';

const DebugPanel = ({ fpsData, customerData }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!fpsData || fpsData.length === 0) {
    return null;
  }

  return (
    <Card className="mb-3">
      <Card.Header>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          aria-controls="debug-content"
          aria-expanded={isOpen}
        >
          {isOpen ? 'Hide' : 'Show'} Debug Info
        </Button>
      </Card.Header>
      <Collapse in={isOpen}>
        <Card.Body id="debug-content">
          <h6>FPS Data ({fpsData.length} items):</h6>
          <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px' }}>
            <pre>{JSON.stringify(fpsData, null, 2)}</pre>
          </div>
          
          {customerData && customerData.length > 0 && (
            <>
              <h6 className="mt-3">Beneficiary Data ({customerData.length} items):</h6>
              <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '12px' }}>
                <pre>{JSON.stringify(customerData.slice(0, 3), null, 2)}</pre>
                {customerData.length > 3 && <p className="text-muted">... and {customerData.length - 3} more</p>}
              </div>
            </>
          )}
        </Card.Body>
      </Collapse>
    </Card>
  );
};

export default DebugPanel; 