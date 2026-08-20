import { Navigate, Route, Routes } from "react-router-dom"
import {
  PlatformAuthProvider,
  PlatformGuard,
  PlatformLoginPage,
  SuperAdminGuard,
} from "./PlatformAdminAuth"
import PlatformLayout from "./PlatformLayout"
import AdminAccountPage from "./pages/AdminAccountPage"
import PlatformHomePage from "./pages/HomePage"
import RegionListPage from "./pages/RegionPages"
import {
  ManualRefundPage,
  PaymentDiscrepancyDetailPage,
  PaymentDiscrepancyListPage,
  RefundFailureDetailPage,
  RefundFailureListPage,
} from "./pages/TransactionPages"
import UserListPage from "./pages/UserPages"
import "./platform-admin.css"

export default function PlatformAdminApp() {
  return (
    <PlatformAuthProvider>
      <Routes>
        <Route path="login" element={<PlatformLoginPage />} />
        <Route element={<PlatformGuard />}>
          <Route element={<PlatformLayout />}>
            <Route index element={<PlatformHomePage />} />
            <Route path="regions" element={<RegionListPage />} />
            <Route path="users" element={<UserListPage />} />
            <Route element={<SuperAdminGuard />}>
              <Route path="admin-accounts" element={<AdminAccountPage />} />
            </Route>
            <Route
              path="payment-discrepancies"
              element={<PaymentDiscrepancyListPage />}
            />
            <Route
              path="payment-discrepancies/:discrepancyId"
              element={<PaymentDiscrepancyDetailPage />}
            />
            <Route path="refund-failures" element={<RefundFailureListPage />} />
            <Route
              path="refund-failures/:refundId"
              element={<RefundFailureDetailPage />}
            />
            <Route path="manual-refund" element={<ManualRefundPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>
      </Routes>
    </PlatformAuthProvider>
  )
}
