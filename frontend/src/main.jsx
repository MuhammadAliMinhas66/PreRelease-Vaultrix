import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  // GoogleOAuthProvider deliberately sits OUTSIDE StrictMode: it calls
  // Google Identity Services' own google.accounts.id.initialize() from an
  // effect, and that library has no built-in guard against being told to
  // initialize twice. StrictMode intentionally double-invokes effects in
  // development to help catch real bugs, which is valuable everywhere else
  // in the app - but here it just means GSI's "initialize() is called
  // multiple times" console warning, not an actual bug. Keeping
  // GoogleOAuthProvider's one-time init outside StrictMode silences that
  // warning without giving up StrictMode's protection for the rest of the
  // app, which still mounts inside it below.
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <React.StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  </GoogleOAuthProvider>
);
