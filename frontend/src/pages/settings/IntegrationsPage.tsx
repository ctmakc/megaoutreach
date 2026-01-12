import { useState } from 'react';
import { CheckCircle, ExternalLink, Settings, Zap } from 'lucide-react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'ai' | 'enrichment' | 'crm' | 'analytics';
  isConnected: boolean;
  config?: Record<string, any>;
}

const integrations: Integration[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'AI-powered email generation and personalization',
    icon: '🤖',
    category: 'ai',
    isConnected: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Advanced AI for content generation and analysis',
    icon: '🧠',
    category: 'ai',
    isConnected: false,
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    description: 'Find and verify email addresses',
    icon: '🎯',
    category: 'enrichment',
    isConnected: false,
  },
  {
    id: 'clearbit',
    name: 'Clearbit',
    description: 'Enrich contacts with company data',
    icon: '📊',
    category: 'enrichment',
    isConnected: false,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts and deals with HubSpot CRM',
    icon: '🔗',
    category: 'crm',
    isConnected: false,
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Integrate with Salesforce CRM',
    icon: '☁️',
    category: 'crm',
    isConnected: false,
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Track outreach performance',
    icon: '📈',
    category: 'analytics',
    isConnected: false,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5000+ apps',
    icon: '⚡',
    category: 'analytics',
    isConnected: false,
  },
];

const categories = {
  ai: { label: 'AI & Personalization', color: 'text-purple-600' },
  enrichment: { label: 'Data Enrichment', color: 'text-blue-600' },
  crm: { label: 'CRM', color: 'text-green-600' },
  analytics: { label: 'Analytics & Automation', color: 'text-orange-600' },
};

export default function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch integration status
  const { data: connectedIntegrations } = useQuery<Record<string, boolean>>({
    queryKey: ['integrations-status'],
    queryFn: () => api.get('/integrations').then(res => res.data),
  });

  // Connect integration
  const connectMutation = useMutation({
    mutationFn: ({ id, config }: { id: string; config?: any }) =>
      api.post(`/integrations/${id}/connect`, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations-status'] });
      toast.success('Integration connected');
      setConfiguring(null);
    },
    onError: () => toast.error('Failed to connect integration'),
  });

  // Disconnect integration
  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/integrations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations-status'] });
      toast.success('Integration disconnected');
    },
    onError: () => toast.error('Failed to disconnect integration'),
  });

  const filteredIntegrations = selectedCategory
    ? integrations.filter((i) => i.category === selectedCategory)
    : integrations;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Integrations
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Connect MegaOutreach with your favorite tools
          </p>
        </div>

        {/* Category Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              !selectedCategory
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {Object.entries(categories).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                selectedCategory === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Integrations Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredIntegrations.map((integration) => {
            const isConnected = connectedIntegrations?.[integration.id] || false;
            const categoryInfo = categories[integration.category];

            return (
              <div
                key={integration.id}
                className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{integration.icon}</div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {integration.name}
                      </h3>
                      <p className={`text-xs ${categoryInfo.color}`}>
                        {categoryInfo.label}
                      </p>
                    </div>
                  </div>
                  {isConnected && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>

                {/* Description */}
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {integration.description}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => setConfiguring(integration.id)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Settings className="h-4 w-4" />
                        Configure
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to disconnect this integration?')) {
                            disconnectMutation.mutate(integration.id);
                          }
                        }}
                        className="flex-1 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfiguring(integration.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                    >
                      <Zap className="h-4 w-4" />
                      Connect
                    </button>
                  )}
                </div>

                {/* Configuration Modal/Form (simplified) */}
                {configuring === integration.id && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                    <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                      API Configuration
                    </h4>
                    <input
                      type="password"
                      placeholder="Enter API Key"
                      className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // In real app, get API key from input
                          connectMutation.mutate({ id: integration.id });
                        }}
                        disabled={connectMutation.isPending}
                        className="flex-1 rounded bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {connectMutation.isPending ? 'Connecting...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setConfiguring(null)}
                        className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-900/20">
          <div className="flex gap-3">
            <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-200">
                Need help setting up integrations?
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Check out our{' '}
                <a href="#" className="underline hover:no-underline">
                  integration guides
                </a>{' '}
                or{' '}
                <a href="#" className="underline hover:no-underline">
                  contact support
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
