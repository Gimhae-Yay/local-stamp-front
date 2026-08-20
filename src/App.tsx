import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"
import { lazy, Suspense } from "react"

import AppLayout, { useAppState } from "./components/AppLayout"

import HomePage from "./pages/HomePage"

import {
  EventsPage,
  EventDetailPage,
  NotFoundPage,
  ReviewsPage,
} from "./pages/EventPages"

import {
  BookingPage,
  BookingConfirmPage,
  BookingCompletePage,
  CancelReservationPage,
  PaymentCompletePage,
  ReservationDetailPage,
  ReservationsPage,
} from "./pages/ReservationPages"

import {
  CouponsPage,
  MissionsPage,
  ReviewPage,
  StampbookPage,
} from "./pages/ActivityPages"

import { LoginPage, SignupPage } from "./pages/AuthPages"
import OperatorRequestPage from "./pages/OperatorRequestPage"
const RegionalAdminApp = lazy(() => import("./admin/RegionalAdminApp"))
const PlatformAdminApp = lazy(() => import("./platform-admin/PlatformAdminApp"))
const OperatorApp = lazy(() => import("./operator/OperatorApp"))

function RequireAuthentication() {
  const { loggedIn } = useAppState()
  const location = useLocation()
  return loggedIn ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="route-loading">화면을 불러오는 중입니다.</div>
        }
      >
        <Routes>
          <Route path="/admin/*" element={<PlatformAdminApp />} />
          <Route path="/region-admin/*" element={<RegionalAdminApp />} />
          <Route path="/operator/*" element={<OperatorApp />} />
          <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/events/:eventId/reviews" element={<ReviewsPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route element={<RequireAuthentication />}>
            <Route path="/events/:eventId/reserve" element={<BookingPage />} />
            <Route
              path="/events/:eventId/reserve/confirm"
              element={<BookingConfirmPage />}
            />
            <Route
              path="/events/:eventId/reserve/complete"
              element={<BookingCompletePage />}
            />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route
              path="/reservations/:reservationId"
              element={<ReservationDetailPage />}
            />
            <Route
              path="/reservations/:reservationId/cancel"
              element={<CancelReservationPage />}
            />
            <Route path="/reviews/new" element={<ReviewPage />} />
            <Route path="/coupons" element={<CouponsPage />} />
            <Route path="/stampbook" element={<StampbookPage />} />
            <Route path="/operator-request" element={<OperatorRequestPage />} />
            <Route path="/payment/complete" element={<PaymentCompletePage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
