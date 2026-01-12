import { useState } from 'react';
import { Plus, Mail, Linkedin, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface EmailAccount {
  id: string;
  email: string;
  name?: string;
  status: 'warming' | 'ready' | 'limited' | 'blocked';
  dailyLimit: number;
  sentToday: number;
  deliveryRate: number;
  isActive: boolean;
}

interface LinkedInAccount {
  id: string;
  email: string;
  profileUrl?: string;
  profileName?: string;
  status: 'active' | 'limited' | 'blocked' | 'verification_needed';
  connectionsToday: number;
  messagesToday: number;
  isActive: boolean;
}

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<'email' | 'linkedin'>('email');
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [showAddLinkedIn, setShowAddLinkedIn] = useState(false);
  const queryClient = useQueryClient();

  // Fetch email accounts
  const { data: emailAccounts, isLoading: loadingEmail } = useQuery<EmailAccount[]>({
    queryKey: ['email-accounts'],
    queryFn: () => api.get('/email/accounts').then(res => res.data),
  });

  // Fetch LinkedIn accounts
  const { data: linkedinAccounts, isLoading: loadingLinkedIn } = useQuery<LinkedInAccount[]>({
    queryKey: ['linkedin-accounts'],
    queryFn: () => api.get('/linkedin/accounts').then(res => res.data),
  });

  // Delete email account
  const deleteEmailMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/email/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
      toast.success('Email account removed');
    },
    onError: () => toast.error('Failed to remove account'),
  });

  // Delete LinkedIn account
  const deleteLinkedInMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/linkedin/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedin-accounts'] });
      toast.success('LinkedIn account removed');
    },
    onError: () => toast.error('Failed to remove account'),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warming':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'limited':
      case 'verification_needed':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Connected Accounts
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your email and LinkedIn accounts for outreach
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('email')}
              className={`border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === 'email'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Mail className="mr-2 inline-block h-5 w-5" />
              Email Accounts
            </button>
            <button
              onClick={() => setActiveTab('linkedin')}
              className={`border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === 'linkedin'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Linkedin className="mr-2 inline-block h-5 w-5" />
              LinkedIn Accounts
            </button>
          </nav>
        </div>

        {/* Email Accounts Tab */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            {/* Add Button */}
            <button
              onClick={() => setShowAddEmail(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-gray-600 hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              <Plus className="h-5 w-5" />
              Connect Email Account
            </button>

            {/* Loading */}
            {loadingEmail && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            )}

            {/* Email Accounts List */}
            {emailAccounts?.map((account) => (
              <div
                key={account.id}
                className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {account.name || account.email}
                        </h3>
                        {account.name && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {account.email}
                          </p>
                        )}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(account.status)}`}>
                        {account.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Daily Limit</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {account.sentToday} / {account.dailyLimit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Delivery Rate</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {account.deliveryRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                        {account.isActive ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this account?')) {
                        deleteEmailMutation.mutate(account.id);
                      }
                    }}
                    className="ml-4 rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}

            {!loadingEmail && emailAccounts?.length === 0 && (
              <div className="py-12 text-center">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No email accounts
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by connecting your first email account.
                </p>
              </div>
            )}
          </div>
        )}

        {/* LinkedIn Accounts Tab */}
        {activeTab === 'linkedin' && (
          <div className="space-y-4">
            {/* Add Button */}
            <button
              onClick={() => setShowAddLinkedIn(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-gray-600 hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              <Plus className="h-5 w-5" />
              Connect LinkedIn Account
            </button>

            {/* Loading */}
            {loadingLinkedIn && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            )}

            {/* LinkedIn Accounts List */}
            {linkedinAccounts?.map((account) => (
              <div
                key={account.id}
                className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Linkedin className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {account.profileName || account.email}
                        </h3>
                        {account.profileUrl && (
                          <a
                            href={account.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:underline"
                          >
                            View Profile
                          </a>
                        )}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(account.status)}`}>
                        {account.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Connections Today</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {account.connectionsToday} / 50
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Messages Today</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {account.messagesToday} / 100
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                        {account.isActive ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this account?')) {
                        deleteLinkedInMutation.mutate(account.id);
                      }
                    }}
                    className="ml-4 rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}

            {!loadingLinkedIn && linkedinAccounts?.length === 0 && (
              <div className="py-12 text-center">
                <Linkedin className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No LinkedIn accounts
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by connecting your first LinkedIn account.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
