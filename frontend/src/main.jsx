// Interview Prep (What & Why):
// What: StrictMode aur createRoot imports hain.
// Why: StrictMode development mein potential problems highlight karta hai aur createRoot React 18 ka naya tarika hai concurrent rendering ke liye.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Interview Prep (What & Why):
// What: Global CSS aur App component import kiya gaya hai.
// Why: App ki global styling yahan apply hoti hai, aur App component main container hai poore frontend app ka.
import './index.css'
import App from './App.jsx'

// Interview Prep (What & Why):
// What: Redux se Provider aur central store import kiya gaya hai.
// Why: Provider ensure karta hai ki Redux store ka state poori application mein kisi bhi component ko access ho sake connect ya hooks ke through.
import { Provider } from 'react-redux'
import { store } from './redux/store.js'

// Interview Prep (What & Why):
// What: ErrorBoundary component import kiya ja raha hai.
// Why: React mein UI trees mein crash aane par poori app blank na ho jaye isliye ErrorBoundary un fallback UI ko dikhata hai.
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

// Interview Prep (What & Why):
// What: createRoot ka use karke 'root' id waale HTML element ko render start point banaya gaya hai.
// Why: Iske andar sabse bahar ErrorBoundary, fir Redux ka Provider, aur finally App component ko render kiya ja raha hai taaki safety aur state management dono globally configure ho jaayein.
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Provider store={store}>
      <App />
    </Provider>
  </ErrorBoundary>
)