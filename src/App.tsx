import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"

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
import OperatorReservationSearchPage from "./pages/OperatorReservationPages"
import {
  CreateContentRevisionPage,
  EditContentRevisionPage,
  OperatorContentDetailPage,
  OperatorContentListPage,
} from "./pages/OperatorContentPages"
import RegionalAdminApp from "./admin/RegionalAdminApp"
import PlatformAdminApp from "./platform-admin/PlatformAdminApp"

function RequireAuthentication() {
  const { loggedIn } = useAppState()
  const location = useLocation()
  return loggedIn ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  )
}

function RequireOperator() {
  const { user } = useAppState()
  const isOperator = user?.roleAssignments.some(
    (assignment) => assignment.role === "OPERATOR",
  )
  return isOperator ? <Outlet /> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<PlatformAdminApp />} />
        <Route path="/region-admin/*" element={<RegionalAdminApp />} />
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
            <Route element={<RequireOperator />}>
              <Route
                path="/operator/contents"
                element={<OperatorContentListPage />}
              />
              <Route
                path="/operator/contents/:contentId"
                element={<OperatorContentDetailPage />}
              />
              <Route
                path="/operator/contents/:contentId/revisions/new"
                element={<CreateContentRevisionPage />}
              />
              <Route
                path="/operator/content-revisions/:revisionId/edit"
                element={<EditContentRevisionPage />}
              />
              <Route
                path="/operator/reservations/search"
                element={<OperatorReservationSearchPage />}
              />
            </Route>
            <Route path="/payment/complete" element={<PaymentCompletePage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
