import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Outlet } from "react-router-dom"
import {
  deleteAccount as deleteAccountRequest,
  getAuthenticatedUser,
  login as loginRequest,
  logout as logoutRequest,
  restoreAuthentication,
  type AuthenticatedUser,
} from "../api/auth"
import { getPublicRegions } from "../api/public"
import Navbar from "./Navbar"
import RegionDialog, { type RegionOption } from "./RegionDialog"

const REGION_KEY = "local-stamp:selected-region-id"

interface AppState {
  authReady: boolean
  loggedIn: boolean
  user: AuthenticatedUser | null
  region: string
  regionId: string
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  openRegionDialog: () => void
}

const AppStateContext = createContext<AppState | null>(null)

export function useAppState() {
  const state = useContext(AppStateContext)
  if (!state) throw new Error("useAppState must be used within AppLayout")
  return state
}

export default function AppLayout() {
  const [authReady, setAuthReady] = useState(false)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [regions, setRegions] = useState<RegionOption[]>([])
  const [region, setRegion] = useState<RegionOption | null>(null)
  const [regionError, setRegionError] = useState<string | null>(null)
  const [regionRequestVersion, setRegionRequestVersion] = useState(0)
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)

  useEffect(() => {
    let active = true
    restoreAuthentication()
      .then((restoredUser) => {
        if (active) setUser(restoredUser)
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setRegionError(null)
    getPublicRegions(controller.signal)
      .then(({ regions: nextRegions }) => {
        setRegions(nextRegions)
        const storedRegionId = window.localStorage.getItem(REGION_KEY)
        const nextRegion =
          nextRegions.find((item) => item.regionId === storedRegionId) ??
          nextRegions[0] ??
          null
        setRegion(nextRegion)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setRegionError(
          error instanceof Error
            ? error.message
            : "서비스 지역을 불러오지 못했습니다.",
        )
      })
    return () => controller.abort()
  }, [regionRequestVersion])

  const selectRegion = useCallback((nextRegion: RegionOption) => {
    setRegion(nextRegion)
    window.localStorage.setItem(REGION_KEY, nextRegion.regionId)
  }, [])

  const state = useMemo<AppState>(
    () => ({
      authReady,
      loggedIn: user !== null,
      user,
      region: region?.name ?? "지역",
      regionId: region?.regionId ?? "",
      login: async (email, password) => {
        await loginRequest(email, password)
        setUser(await getAuthenticatedUser())
      },
      logout: async () => {
        await logoutRequest()
        setUser(null)
      },
      deleteAccount: async () => {
        await deleteAccountRequest()
        setUser(null)
      },
      openRegionDialog: () => setRegionDialogOpen(true),
    }),
    [authReady, region, user],
  )

  return (
    <AppStateContext.Provider value={state}>
      <div className="app-shell">
        <Navbar
          loggedIn={state.loggedIn}
          user={user}
          onLogout={state.logout}
          onDeleteAccount={state.deleteAccount}
        />
        <main>
          {!authReady || (!region && !regionError) ? (
            <section className="visitor-page-state">
              방문자 서비스를 불러오는 중입니다.
            </section>
          ) : regionError ? (
            <section className="visitor-page-state">
              <p>{regionError}</p>
              <button
                className="text-link-button"
                type="button"
                onClick={() => setRegionRequestVersion((value) => value + 1)}
              >
                다시 시도
              </button>
            </section>
          ) : (
            <Outlet />
          )}
        </main>
        {regionDialogOpen && (
          <RegionDialog
            regions={regions}
            regionId={region?.regionId ?? ""}
            onSelect={selectRegion}
            onClose={() => setRegionDialogOpen(false)}
          />
        )}
      </div>
    </AppStateContext.Provider>
  )
}
