import { useState } from 'react';
import { Key, Eye, EyeOff, Save, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface ApiSettings {
  openaiKey?: string;
  anthropicKey?: string;
  hunterKey?: string;
  clearbitKey?: string;
  googleClientId?: string;
  googleClientSecret?: string;
}

export default function ApiSettingsPage() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editedSettings, setEditedSettings] = useState<ApiSettings>({});
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<ApiSettings>({
    queryKey: ['api-settings'],
    queryFn: () => api.get('/settings/api').then(res => res.data),
  });

  // Save settings
  const saveMutation = useMutation({
    mutationFn: (data: ApiSettings) => api.put('/settings/api', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-settings'] });
      toast.success('API settings saved successfully');
      setEditedSettings({});
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = () => {
    saveMutation.mutate(editedSettings);
  };

  const toggleVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: keyof ApiSettings, value: string) => {
    setEditedSettings(prev => ({ ...prev, [key]: value }));
  };

  const maskKey = (key?: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}${'•'.repeat(Math.max(8, key.length - 8))}${key.slice(-4)}`;
  };

  const apiKeys = [
    {
      id: 'openaiKey',
      label: 'OpenAI API Key',
      description: 'For AI-powered email generation and personalization',
      placeholder: 'sk-...',
      docs: 'https://platform.openai.com/api-keys',
    },
    {
      id: 'anthropicKey',
      label: 'Anthropic Claude API Key',
      description: 'Alternative AI provider for content generation',
      placeholder: 'sk-ant-...',
      docs: 'https://console.anthropic.com/settings/keys',
    },
    {
      id: 'hunterKey',
      label: 'Hunter.io API Key',
      description: 'For email finding and verification',
      placeholder: 'hunter_...',
      docs: 'https://hunter.io/api-keys',
    },
    {
      id: 'clearbitKey',
      label: 'Clearbit API Key',
      description: 'For contact and company enrichment',
      placeholder: 'sk_...',
      docs: 'https://dashboard.clearbit.com/api',
    },
  ];

  const oauthSettings = [
    {
      id: 'googleClientId',
      label: 'Google OAuth Client ID',
      description: 'For Google authentication and Gmail integration',
      placeholder: '123456789-abc.apps.googleusercontent.com',
      docs: 'https://console.cloud.google.com/apis/credentials',
    },
    {
      id: 'googleClientSecret',
      label: 'Google OAuth Client Secret',
      description: 'OAuth client secret from Google Cloud Console',
      placeholder: 'GOCSPX-...',
      docs: 'https://console.cloud.google.com/apis/credentials',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            API Settings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure API keys and credentials for integrations
          </p>
        </div>

        {/* Warning Banner */}
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex gap-3">
            <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <h3 className="font-medium text-yellow-900 dark:text-yellow-200">
                Keep your API keys secure
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                Never share your API keys publicly. They are encrypted and stored securely.
              </p>
            </div>
          </div>
        </div>

        {/* AI Services */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            AI Services
          </h2>
          <div className="space-y-4">
            {apiKeys.map((key) => {
              const currentValue = settings?.[key.id as keyof ApiSettings];
              const editedValue = editedSettings[key.id as keyof ApiSettings];
              const displayValue = editedValue ?? currentValue ?? '';
              const isVisible = showKeys[key.id];

              return (
                <div
                  key={key.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <label className="block font-medium text-gray-900 dark:text-white">
                        {key.label}
                      </label>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {key.description}
                      </p>
                    </div>
                    <a
                      href={key.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Get API Key →
                    </a>
                  </div>

                  <div className="relative">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={isVisible ? displayValue : maskKey(displayValue)}
                      onChange={(e) => handleChange(key.id as keyof ApiSettings, e.target.value)}
                      placeholder={key.placeholder}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility(key.id)}
                      className="absolute inset-y-0 right-2 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    >
                      {isVisible ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* OAuth Settings */}
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            OAuth Configuration
          </h2>
          <div className="space-y-4">
            {oauthSettings.map((setting) => {
              const currentValue = settings?.[setting.id as keyof ApiSettings];
              const editedValue = editedSettings[setting.id as keyof ApiSettings];
              const displayValue = editedValue ?? currentValue ?? '';
              const isVisible = showKeys[setting.id];

              return (
                <div
                  key={setting.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <label className="block font-medium text-gray-900 dark:text-white">
                        {setting.label}
                      </label>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {setting.description}
                      </p>
                    </div>
                    <a
                      href={setting.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Setup Guide →
                    </a>
                  </div>

                  <div className="relative">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={isVisible ? displayValue : maskKey(displayValue)}
                      onChange={(e) => handleChange(setting.id as keyof ApiSettings, e.target.value)}
                      placeholder={setting.placeholder}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 pr-20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility(setting.id)}
                      className="absolute inset-y-0 right-2 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    >
                      {isVisible ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        {Object.keys(editedSettings).length > 0 && (
          <div className="sticky bottom-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-white shadow-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-900/20">
          <h3 className="mb-2 font-medium text-blue-900 dark:text-blue-200">
            How API keys are used
          </h3>
          <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <li>• AI services power email generation and personalization</li>
            <li>• Hunter.io finds and verifies email addresses</li>
            <li>• Clearbit enriches contact profiles with company data</li>
            <li>• Google OAuth enables authentication and Gmail integration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
