import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { ClerkProvider } from "@clerk/clerk-react";

const clerkPublishableKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

// Validate that Clerk key is present
if (!clerkPublishableKey) {
  console.error('Missing REACT_APP_CLERK_PUBLISHABLE_KEY environment variable');
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));
}

const root = ReactDOM.createRoot(document.getElementById('root'));

// Only render if we have the Clerk key
if (clerkPublishableKey) {
  root.render(
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <App />
    </ClerkProvider>
  );
} else {
  // Render a fallback message if Clerk is not configured
  root.render(
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Configuration Error</h2>
      <p>Clerk authentication is not properly configured.</p>
      <p>Please ensure REACT_APP_CLERK_PUBLISHABLE_KEY is set in your .env file.</p>
    </div>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
