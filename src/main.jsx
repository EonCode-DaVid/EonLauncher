import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './eon.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Límite de errores: en vez de ventana en blanco, muestra el fallo (digno de 1.0)
class EonCodeBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { try { console.error('[eoncode-boundary]', err); } catch {} }
  render() {
    if (this.state.err) {
      const e = this.state.err;
      return React.createElement('div', { style: { padding: 28, fontFamily: 'monospace', color: '#f6f1e8' } },
        React.createElement('h2', null, 'EonLauncher: nie udało się wyświetlić interfejsu'),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', opacity: 0.85 } }, String((e && e.stack) || e)));
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<EonCodeBoundary><App /></EonCodeBoundary>);
