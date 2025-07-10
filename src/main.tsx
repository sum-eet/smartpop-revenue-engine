import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { webVitalsMonitor } from './lib/webVitals'

// Initialize web vitals monitoring
webVitalsMonitor;

createRoot(document.getElementById("root")!).render(<App />);
