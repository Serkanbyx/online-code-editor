import { Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from './layouts/MainLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import SettingsLayout from './layouts/SettingsLayout.jsx';

import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AdminRoute from './routes/AdminRoute.jsx';
import GuestOnlyRoute from './routes/GuestOnlyRoute.jsx';

import HomePage from './pages/home/HomePage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';

import SnippetDetailPage from './pages/snippets/SnippetDetailPage.jsx';
import EditSnippetPage from './pages/snippets/EditSnippetPage.jsx';
import MySnippetsPage from './pages/snippets/MySnippetsPage.jsx';

import RoomsHubPage from './pages/rooms/RoomsHubPage.jsx';
import EditorPage from './pages/rooms/EditorPage.jsx';

import ProfilePage from './pages/profile/ProfilePage.jsx';

import ProfileSettingsPage from './pages/settings/ProfileSettingsPage.jsx';
import AccountSettingsPage from './pages/settings/AccountSettingsPage.jsx';
import AppearanceSettingsPage from './pages/settings/AppearanceSettingsPage.jsx';
import EditorSettingsPage from './pages/settings/EditorSettingsPage.jsx';
import PrivacySettingsPage from './pages/settings/PrivacySettingsPage.jsx';
import NotificationsSettingsPage from './pages/settings/NotificationsSettingsPage.jsx';

import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminSnippetsPage from './pages/admin/AdminSnippetsPage.jsx';
import AdminCommentsPage from './pages/admin/AdminCommentsPage.jsx';
import AdminReportsPage from './pages/admin/AdminReportsPage.jsx';

import NotFoundPage from './pages/misc/NotFoundPage.jsx';
import ForbiddenPage from './pages/misc/ForbiddenPage.jsx';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />

        <Route element={<GuestOnlyRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        <Route path="snippets/:id" element={<SnippetDetailPage />} />
        <Route path="u/:username" element={<ProfilePage />} />
        <Route path="403" element={<ForbiddenPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="snippets/:id/edit" element={<EditSnippetPage />} />
          <Route path="me/snippets" element={<MySnippetsPage />} />
          <Route path="rooms" element={<RoomsHubPage />} />
          <Route path="room/:roomId" element={<EditorPage />} />

          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="account" element={<AccountSettingsPage />} />
            <Route path="appearance" element={<AppearanceSettingsPage />} />
            <Route path="editor" element={<EditorSettingsPage />} />
            <Route path="privacy" element={<PrivacySettingsPage />} />
            <Route path="notifications" element={<NotificationsSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/admin" element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="snippets" element={<AdminSnippetsPage />} />
          <Route path="comments" element={<AdminCommentsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
