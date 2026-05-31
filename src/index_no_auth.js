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
  console.log('Proceeding without authentication for testing...');
}

const root = ReactDOM.createRoot(document.getElementById('root'));

// Render with or without Clerk based on availability
if (clerkPublishableKey) {
  root.render(
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <App />
    </ClerkProvider>
  );
} else {
  // Render without authentication for testing
  console.warn('Running without Clerk authentication - for testing only');
  root.render(<App />);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();