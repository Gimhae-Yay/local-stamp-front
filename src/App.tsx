import { BrowserRouter, Route, Routes } from "react-router-dom"

import AppLayout from "./components/AppLayout"

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
import RegionalAdminApp from "./admin/RegionalAdminApp"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/region-admin/*" element={<RegionalAdminApp />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/events/:eventId/reviews" element={<ReviewsPage />} />
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
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/stampbook" element={<StampbookPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/payment/complete" element={<PaymentCompletePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
