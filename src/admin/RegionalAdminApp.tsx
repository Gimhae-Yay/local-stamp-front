import { Route, Routes } from "react-router-dom";
import { AdminAuthProvider, AdminGuard, AdminLoginPage } from "./AdminAuth";
import AdminLayout from "./AdminLayout";
import AdminHomePage from "./pages/AdminHomePage";
import AdminNotFoundPage from "./pages/AdminNotFoundPage";
import {
  MissionDetailPage,
  MissionListPage,
  StampbookDetailPage,
  StampbookListPage,
} from "./pages/BenefitPages";
import {
  ContentDetailPage,
  ContentReviewListPage,
  ContentRevisionDetailPage,
  ContentRevisionListPage,
  PublishedContentDetailPage,
  PublishedContentListPage,
  WithdrawalDetailPage,
  WithdrawalListPage,
} from "./pages/ContentPages";
import { OperatorRequestDetailPage, OperatorRequestListPage } from "./pages/OperatorPages";
import { QrExceptionDetailPage, QrExceptionListPage } from "./pages/QrPages";
import {
  SessionDetailPage,
  SessionListPage,
  SessionRevisionDetailPage,
  SessionRevisionListPage,
} from "./pages/SessionPages";
import "./regional-admin.css";

export default function RegionalAdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route element={<AdminGuard />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminHomePage />} />
            <Route path="operator-requests" element={<OperatorRequestListPage />} />
            <Route path="operator-requests/:requestId" element={<OperatorRequestDetailPage />} />
            <Route path="contents/review" element={<ContentReviewListPage />} />
            <Route path="contents/published" element={<PublishedContentListPage />} />
            <Route path="contents/published/:contentId" element={<PublishedContentDetailPage />} />
            <Route path="contents/:contentId" element={<ContentDetailPage />} />
            <Route path="content-revisions" element={<ContentRevisionListPage />} />
            <Route path="content-revisions/:revisionId" element={<ContentRevisionDetailPage />} />
            <Route path="withdrawal-requests" element={<WithdrawalListPage />} />
            <Route path="withdrawal-requests/:requestId" element={<WithdrawalDetailPage />} />
            <Route path="sessions" element={<SessionListPage />} />
            <Route path="sessions/:sessionId" element={<SessionDetailPage />} />
            <Route path="session-revisions" element={<SessionRevisionListPage />} />
            <Route path="session-revisions/:revisionId" element={<SessionRevisionDetailPage />} />
            <Route path="qr-exceptions" element={<QrExceptionListPage />} />
            <Route path="qr-exceptions/:exceptionId" element={<QrExceptionDetailPage />} />
            <Route path="stampbooks" element={<StampbookListPage />} />
            <Route path="stampbooks/:stampbookId" element={<StampbookDetailPage />} />
            <Route path="missions" element={<MissionListPage />} />
            <Route path="missions/:missionId" element={<MissionDetailPage />} />
            <Route path="*" element={<AdminNotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
