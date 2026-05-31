import React from 'react';
import { Spinner, Modal } from 'react-bootstrap';

const LoadingSpinner = () => {
  return (
    <Modal show={true} centered backdrop="static">
      <Modal.Body className="text-center py-4">
        <Spinner animation="border" variant="primary" className="mb-3" />
        <div>Processing redirection...</div>
      </Modal.Body>
    </Modal>
  );
};

export default LoadingSpinner;
