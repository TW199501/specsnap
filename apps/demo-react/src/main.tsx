import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@tw199501/specsnap-inspector-react/styles.css';
import { App } from './App.js';

const container = document.getElementById('app');
if (!container) throw new Error('missing #app root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
