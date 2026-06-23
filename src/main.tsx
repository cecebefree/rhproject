import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA4_ID || 'G-N25NYZHMSX'

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

function initGA4() {
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)
}

if (typeof window !== 'undefined') {
  initGA4()

  const originalPushState = history.pushState
  history.pushState = function (...args) {
    originalPushState.apply(history, args)
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
    })
  }

  window.addEventListener('popstate', () => {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)