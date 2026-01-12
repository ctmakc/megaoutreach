import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

// Main Pages
import DashboardPage from '@/pages/dashboard/DashboardPage';
import CampaignsPage from '@/pages/campaigns/CampaignsPage';
import CampaignDetailPage from '@/pages/campaigns/CampaignDetailPage';
import CampaignBuilderPage from '@/pages/campaigns/CampaignBuilderPage';
import ContactsPage from '@/pages/contacts/ContactsPage';
import ContactDetailPage from '@/pages/contacts/ContactDetailPage';
import InboxPage from '@/pages/inbox/InboxPage';
import TemplatesPage from '@/pages/templates/TemplatesPage';
import AnalyticsPage from '@/pages/analytics/AnalyticsPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import AccountsPage from '@/pages/settings/AccountsPage';
import TeamPage from '@/pages/settings/TeamPage';
import IntegrationsPage from '@/pages/settings/IntegrationsPage';
import ApiSettingsPage from '@/pages/settings/ApiSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>

              {/* Protected Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* Campaigns */}
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/campaigns/new" element={<CampaignBuilderPage />} />
                <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
                <Route path="/campaigns/:id/edit" element={<CampaignBuilderPage />} />
                
                {/* Contacts */}
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/contacts/:id" element={<ContactDetailPage />} />
                
                {/* Inbox */}
                <Route path="/inbox" element={<InboxPage />} />
                
                {/* Templates */}
                <Route path="/templates" element={<TemplatesPage />} />
                
                {/* Analytics */}
                <Route path="/analytics" element={<AnalyticsPage />} />
                
                {/* Settings */}
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/accounts" element={<AccountsPage />} />
                <Route path="/settings/team" element={<TeamPage />} />
                <Route path="/settings/integrations" element={<IntegrationsPage />} />
                <Route path="/settings/api" element={<ApiSettingsPage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
          
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#fff',
                borderRadius: '8px',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}