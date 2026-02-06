import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from './components/RequireAuth';
import { AppLayout } from './layouts/AppLayout';
import { ApartmentDetailPage } from './pages/apartments/ApartmentDetailPage';
import { ApartmentsPage } from './pages/apartments/ApartmentsPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { LeasesPage } from './pages/leases/LeasesPage';
import { LoginPage } from './pages/login/LoginPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { OrgPage } from './pages/org/OrgPage';
import { RoomsPage } from './pages/rooms/RoomsPage';
import { SigningPage } from './pages/signing/SigningPage';
import { TenantsPage } from './pages/tenants/TenantsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/apartments" element={<ApartmentsPage />} />
          <Route path="/apartments/:apartmentId" element={<ApartmentDetailPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/leases" element={<LeasesPage />} />
          <Route path="/signing" element={<SigningPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/org" element={<OrgPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
