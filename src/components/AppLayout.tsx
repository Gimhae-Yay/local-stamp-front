import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { getMyProfile, getPublicRegions, hasAccessToken, logoutFromServer, type MyProfile, type PublicRegion } from '../api/public'
import Navbar from './Navbar'
import RegionDialog from './RegionDialog'

interface AppState {
  loggedIn: boolean
  region: string
  regionId: string | null
  login: () => void
  logout: () => Promise<void>
  openRegionDialog: () => void
}

const AppStateContext = createContext<AppState | null>(null)

export function useAppState() {
  const state = useContext(AppStateContext)
  if (!state) throw new Error('useAppState must be used within AppLayout')
  return state
}

export default function AppLayout() {
  const [loggedIn, setLoggedIn] = useState(() => hasAccessToken())
  const [region, setRegion] = useState<PublicRegion | null>(null)
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [regions, setRegions] = useState<PublicRegion[]>([])
  const [regionsLoading, setRegionsLoading] = useState(true)
  const [regionsError, setRegionsError] = useState<string | null>(null)
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)

  const loadRegions = () => {
    const controller = new AbortController()

    setRegionsLoading(true)
    setRegionsError(null)
    getPublicRegions(controller.signal)
      .then(({ regions: publicRegions }) => {
        setRegions(publicRegions)
        setRegion((currentRegion) => currentRegion && publicRegions.some(({ regionId }) => regionId === currentRegion.regionId)
          ? currentRegion
          : publicRegions[0] ?? null)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setRegionsError(error instanceof Error ? error.message : '서비스 지역을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setRegionsLoading(false)
      })

    return controller
  }

  useEffect(() => {
    const controller = loadRegions()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!loggedIn) {
      setProfile(null)
      return
    }

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setProfile(null)
      return
    }

    const controller = new AbortController()
    getMyProfile(accessToken, controller.signal)
      .then((myProfile) => {
        if (!controller.signal.aborted) setProfile(myProfile)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (!controller.signal.aborted) setProfile(null)
      })

    return () => controller.abort()
  }, [loggedIn])

  const state: AppState = {
    loggedIn,
    region: region?.name ?? '지역',
    regionId: region?.regionId ?? null,
    login: () => {
      setProfile(null)
      setLoggedIn(true)
    },
    logout: async () => {
      try {
        await logoutFromServer()
      } catch {
        // The local login state must still be cleared when the logout endpoint is unavailable.
      } finally {
        setProfile(null)
        setLoggedIn(false)
      }
    },
    openRegionDialog: () => setRegionDialogOpen(true),
  }

  return (
    <AppStateContext.Provider value={state}>
      <div className="app-shell">
        <Navbar loggedIn={loggedIn} roleAssignments={profile?.roleAssignments} onLogout={state.logout} />
        <main><Outlet /></main>
        {regionDialogOpen && <RegionDialog
          regionId={region?.regionId ?? null}
          regions={regions}
          isLoading={regionsLoading}
          errorMessage={regionsError}
          onRetry={() => loadRegions()}
          onSelect={setRegion}
          onClose={() => setRegionDialogOpen(false)}
        />}
      </div>
    </AppStateContext.Provider>
  )
}
