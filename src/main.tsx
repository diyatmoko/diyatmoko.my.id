import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './fonts.css'
import './styles.css'
import App from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element is missing.')
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
if (root.children.length > 0) hydrateRoot(root, app)
else createRoot(root).render(app)
