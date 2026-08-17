import { createContext, useContext, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import RegionDialog from './RegionDialog'

interface AppState {
  loggedIn: boolean
  region: string
  login: () => void
  logout: () => void
  openRegionDialog: () => void
}

const AppStateContext = createContext<AppState | null>(null)

export function useAppState() {
  const state = useContext(AppStateContext)
  if (!state) throw new Error('useAppState must be used within AppLayout')
  return state
}

export default function AppLayout() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [region, setRegion] = useState('김해시')
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)
  const state: AppState = {
    loggedIn,
    region,
    login: () => setLoggedIn(true),
    logout: () => setLoggedIn(false),
    openRegionDialog: () => setRegionDialogOpen(true),
  }

  return (
    <AppStateContext.Provider value={state}>
      <div className="app-shell">
        <Navbar loggedIn={loggedIn} onLogout={state.logout} />
        <main><Outlet /></main>
        {regionDialogOpen && <RegionDialog region={region} onSelect={setRegion} onClose={() => setRegionDialogOpen(false)} />}
      </div>
    </AppStateContext.Provider>
  )
}
