import { Navigate, Route, Routes } from "react-router-dom"

import {
  OperatorAuthProvider,
  OperatorGuard,
  OperatorLoginPage,
} from "./OperatorAuth"

import OperatorLayout from "./OperatorLayout"

import {
  ContentDetailPage,
  ContentFormPage,
  ContentListPage,
  ContentRevisionPage,
  ContentSessionFormPage,
} from "./pages/ContentPages"

import { CheckInPage, ReservationPage } from "./pages/ReservationPages"

import {
  CouponFormPage,
  CouponListPage,
  MissionFormPage,
  MissionListPage,
  StampbookPage,
} from "./pages/BenefitPages"

import "./operator.css"

export default function OperatorApp() {
  return (
    <OperatorAuthProvider>
      <Routes>
        <Route path="login" element={<OperatorLoginPage />} />
        <Route element={<OperatorGuard />}>
          <Route element={<OperatorLayout />}>
            <Route index element={<ContentListPage />} />
            <Route path="contents/new" element={<ContentFormPage />} />
            <Route path="contents/:contentId" element={<ContentDetailPage />} />
            <Route
              path="contents/:contentId/edit"
              element={<ContentFormPage />}
            />
            <Route
              path="contents/:contentId/sessions/new"
              element={<ContentSessionFormPage />}
            />
            <Route
              path="content-revisions/:revisionId"
              element={<ContentRevisionPage />}
            />
            <Route path="reservations" element={<ReservationPage />} />
            <Route path="check-in" element={<CheckInPage />} />
            <Route path="coupon-policies" element={<CouponListPage />} />
            <Route path="coupon-policies/new" element={<CouponFormPage />} />
            <Route
              path="coupon-policies/:couponPolicyId/edit"
              element={<CouponFormPage />}
            />
            <Route path="missions" element={<MissionListPage />} />
            <Route path="missions/new" element={<MissionFormPage />} />
            <Route
              path="missions/:missionId/edit"
              element={<MissionFormPage />}
            />
            <Route path="stampbooks" element={<StampbookPage />} />
            <Route path="*" element={<Navigate to="/operator" replace />} />
          </Route>
        </Route>
      </Routes>
    </OperatorAuthProvider>
  )
}
