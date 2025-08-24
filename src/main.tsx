import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Suppress console.log in production to avoid noisy logs in deployment
if (import.meta.env && import.meta.env.PROD) {
  // eslint-disable-next-line no-console
  console.log = () => {}
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 