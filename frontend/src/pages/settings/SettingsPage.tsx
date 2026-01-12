import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Building2,
  Mail,
  Linkedin,
  Shield,
  CreditCard,
  Bell,
  Palette,
  Globe,
  Key,
  Trash2,
  Plus,
  Check,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { Tab } from '@headlessui/react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { fetcher, poster, putter, deleter } from '@/lib/api';

interface EmailAccount {
  id: string;
  email: string;
  provider: 'smtp' | 'google' | 'microsoft';
  status: 'active' | 'error' | 'warming';
  dailyLimit: number;
  sentToday: number;
  createdAt: string;
}

interface LinkedInAccount {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'error' | 'limited';
  connectionsSent: number;
  connectionsLimit: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
  lastActive: string;
}

export default function SettingsPage() {
  const { user } = useAuthStore();

  const tabs = [
    { key: 'profile', label: 'Профиль', icon: User },
    { key: 'team', label: 'Команда', icon: Building2 },
    { key: 'email', label: 'Email аккаунты', icon: Mail },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { key: 'api', label: 'API', icon: Key },
    { key: 'notifications', label: 'Уведомления', icon: Bell },
    { key: 'billing', label: 'Биллинг', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Настройки</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Управляйте своим аккаунтом и настройками
        </p>
      </div>

      <Tab.Group>
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar */}
          <Tab.List className="flex flex-row gap-1 overflow-x-auto lg:w-64 lg:flex-shrink-0 lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => (
              <Tab key={tab.key} as={Fragment}>
                {({ selected }) => (
                  <button
                    className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                )}
              </Tab>
            ))}
          </Tab.List>

          {/* Content */}
          <Tab.Panels className="flex-1">
            <Tab.Panel>
              <ProfileSettings />
            </Tab.Panel>
            <Tab.Panel>
              <TeamSettings />
            </Tab.Panel>
            <Tab.Panel>
              <EmailAccountSettings />
            </Tab.Panel>
            <Tab.Panel>
              <LinkedInSettings />
            </Tab.Panel>
            <Tab.Panel>
              <APISettings />
            </Tab.Panel>
            <Tab.Panel>
              <NotificationSettings />
            </Tab.Panel>
            <Tab.Panel>
              <BillingSettings />
            </Tab.Panel>
          </Tab.Panels>
        </div>
      </Tab.Group>
    </div>
  );
}

// Profile Settings
function ProfileSettings() {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    timezone: 'Europe/Moscow',
    language: 'ru',
  });

  const handleSave = () => {
    toast.success('Профиль обновлён');
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Личная информация
        </h2>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-600">
            {formData.firstName[0]}
            {formData.lastName[0]}
          </div>
          <div>
            <button className="btn-secondary text-sm">Загрузить фото</button>
            <p className="mt-1 text-xs text-gray-500">JPG, PNG до 2MB</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Имя</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData((f) => ({ ...f, firstName: e.target.value }))}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label">Фамилия</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData((f) => ({ ...f, lastName: e.target.value }))}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label">Телефон</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
              className="input mt-1"
              placeholder="+7 (999) 123-45-67"
            />
          </div>
          <div>
            <label className="label">Часовой пояс</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData((f) => ({ ...f, timezone: e.target.value }))}
              className="input mt-1"
            >
              <option value="Europe/Moscow">Москва (UTC+3)</option>
              <option value="Europe/Kiev">Киев (UTC+2)</option>
              <option value="Asia/Almaty">Алматы (UTC+6)</option>
            </select>
          </div>
          <div>
            <label className="label">Язык</label>
            <select
              value={formData.language}
              onChange={(e) => setFormData((f) => ({ ...f, language: e.target.value }))}
              className="input mt-1"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} className="btn-primary">
            Сохранить изменения
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Безопасность
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Пароль</div>
              <div className="text-sm text-gray-500">Последнее изменение: 30 дней назад</div>
            </div>
            <button className="btn-secondary">Изменить пароль</button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                Двухфакторная аутентификация
              </div>
              <div className="text-sm text-gray-500">Дополнительная защита аккаунта</div>
            </div>
            <button className="btn-secondary">Включить</button>
          </div>
        </div>
      </div>

      <div className="card border-red-200 dark:border-red-800">
        <h2 className="mb-4 text-lg font-semibold text-red-600">Опасная зона</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Удаление аккаунта приведёт к потере всех данных без возможности восстановления
        </p>
        <button className="btn-secondary border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20">
          <Trash2 className="mr-2 h-4 w-4" />
          Удалить аккаунт
        </button>
      </div>
    </div>
  );
}

// Team Settings
function TeamSettings() {
  const mockTeam: TeamMember[] = [
    {
      id: '1',
      name: 'Иван Петров',
      email: 'ivan@company.ru',
      role: 'owner',
      lastActive: '2025-01-12T10:00:00Z',
    },
    {
      id: '2',
      name: 'Мария Сидорова',
      email: 'maria@company.ru',
      role: 'admin',
      lastActive: '2025-01-12T09:30:00Z',
    },
    {
      id: '3',
      name: 'Алексей Козлов',
      email: 'alexey@company.ru',
      role: 'member',
      lastActive: '2025-01-11T16:00:00Z',
    },
  ];

  const roleLabels = {
    owner: 'Владелец',
    admin: 'Администратор',
    member: 'Участник',
  };

  const roleColors = {
    owner: 'badge-primary',
    admin: 'badge-warning',
    member: 'badge-gray',
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Участники команды
          </h2>
          <button className="btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            Пригласить
          </button>
        </div>

        <div className="space-y-4">
          {mockTeam.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{member.name}</div>
                  <div className="text-sm text-gray-500">{member.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={roleColors[member.role]}>{roleLabels[member.role]}</span>
                {member.role !== 'owner' && (
                  <button className="text-gray-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Email Account Settings
function EmailAccountSettings() {
  const mockAccounts: EmailAccount[] = [
    {
      id: '1',
      email: 'ivan@company.ru',
      provider: 'smtp',
      status: 'active',
      dailyLimit: 100,
      sentToday: 45,
      createdAt: '2025-01-01T00:00:00Z',
    },
    {
      id: '2',
      email: 'sales@company.ru',
      provider: 'google',
      status: 'warming',
      dailyLimit: 50,
      sentToday: 12,
      createdAt: '2025-01-05T00:00:00Z',
    },
    {
      id: '3',
      email: 'outreach@company.ru',
      provider: 'microsoft',
      status: 'error',
      dailyLimit: 100,
      sentToday: 0,
      createdAt: '2025-01-03T00:00:00Z',
    },
  ];

  const providerLabels = {
    smtp: 'SMTP',
    google: 'Google Workspace',
    microsoft: 'Microsoft 365',
  };

  const statusConfig = {
    active: { label: 'Активен', class: 'badge-success' },
    warming: { label: 'Прогрев', class: 'badge-warning' },
    error: { label: 'Ошибка', class: 'badge-error' },
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Email аккаунты
          </h2>
          <button className="btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            Добавить аккаунт
          </button>
        </div>

        <div className="space-y-4">
          {mockAccounts.map((account) => (
            <div
              key={account.id}
              className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {account.email}
                    </div>
                    <div className="text-sm text-gray-500">{providerLabels[account.provider]}</div>
                  </div>
                </div>
                <span className={statusConfig[account.status].class}>
                  {statusConfig[account.status].label}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Отправлено сегодня:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                    {account.sentToday} / {account.dailyLimit}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full bg-primary-500"
                      style={{ width: `${(account.sentToday / account.dailyLimit) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {account.status === 'error' && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Ошибка подключения. Проверьте настройки SMTP.
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button className="btn-secondary text-sm py-1.5">Настройки</button>
                <button className="btn-secondary text-sm py-1.5">Тест</button>
                <button className="btn-secondary text-sm py-1.5 text-red-600 hover:bg-red-50">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Прогрев аккаунтов
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Автоматический прогрев новых email аккаунтов для улучшения доставляемости
        </p>
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Автоматический прогрев
            </div>
            <div className="text-sm text-gray-500">
              Постепенное увеличение лимита отправки
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" defaultChecked className="peer sr-only" />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-primary-800"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

// LinkedIn Settings
function LinkedInSettings() {
  const mockAccounts: LinkedInAccount[] = [
    {
      id: '1',
      name: 'Ivan Petrov',
      email: 'ivan@company.ru',
      status: 'active',
      connectionsSent: 45,
      connectionsLimit: 100,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            LinkedIn аккаунты
          </h2>
          <button className="btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            Подключить аккаунт
          </button>
        </div>

        {mockAccounts.length === 0 ? (
          <div className="py-8 text-center">
            <Linkedin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 font-medium text-gray-900 dark:text-gray-100">
              Нет подключенных аккаунтов
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Подключите LinkedIn аккаунт для автоматизации outreach
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mockAccounts.map((account) => (
              <div
                key={account.id}
                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                      <Linkedin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {account.name}
                      </div>
                      <div className="text-sm text-gray-500">{account.email}</div>
                    </div>
                  </div>
                  <span className="badge-success">Активен</span>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Заявки сегодня:</span>
                    <span className="font-medium">
                      {account.connectionsSent} / {account.connectionsLimit}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(account.connectionsSent / account.connectionsLimit) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Лимиты безопасности
        </h2>
        <div className="space-y-4">
          <div>
            <label className="label">Максимум заявок в день</label>
            <input type="number" defaultValue={100} className="input mt-1" max={100} />
            <p className="mt-1 text-xs text-gray-500">
              Рекомендуется не более 100 для избежания блокировки
            </p>
          </div>
          <div>
            <label className="label">Максимум сообщений в день</label>
            <input type="number" defaultValue={50} className="input mt-1" max={150} />
          </div>
        </div>
      </div>
    </div>
  );
}

// API Settings
function APISettings() {
  const [showKey, setShowKey] = useState(false);
  const apiKey = 'your_api_key_here';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано в буфер обмена');
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">API ключи</h2>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Production API Key</div>
              <div className="mt-1 flex items-center gap-2 font-mono text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••••'}
                </span>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(apiKey)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button className="btn-secondary text-sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновить
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              Никогда не делитесь своим API ключом. При подозрении на утечку немедленно обновите его.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Документация API
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Интегрируйте наш API в ваши приложения
        </p>
        <a
          href="#"
          className="btn-secondary inline-flex items-center"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Открыть документацию
        </a>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Webhooks</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Получайте уведомления о событиях в реальном времени
        </p>
        <button className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Добавить Webhook
        </button>
      </div>
    </div>
  );
}

// Notification Settings
function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailReplies: true,
    campaignComplete: true,
    dailyDigest: false,
    weeklyReport: true,
    errorAlerts: true,
    browserNotifications: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  };

  const notifications = [
    { key: 'emailReplies', label: 'Ответы на письма', desc: 'Уведомление при получении ответа' },
    {
      key: 'campaignComplete',
      label: 'Завершение кампании',
      desc: 'Когда кампания полностью отправлена',
    },
    { key: 'dailyDigest', label: 'Ежедневный дайджест', desc: 'Сводка активности за день' },
    {
      key: 'weeklyReport',
      label: 'Еженедельный отчёт',
      desc: 'Подробная аналитика за неделю',
    },
    { key: 'errorAlerts', label: 'Оповещения об ошибках', desc: 'Проблемы с аккаунтами или отправкой' },
    {
      key: 'browserNotifications',
      label: 'Push-уведомления',
      desc: 'Уведомления в браузере',
    },
  ];

  return (
    <div className="card">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Настройки уведомлений
      </h2>

      <div className="space-y-4">
        {notifications.map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
              <div className="text-sm text-gray-500">{desc}</div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings[key as keyof typeof settings]}
                onChange={() => toggleSetting(key as keyof typeof settings)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-primary-800"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => toast.success('Настройки сохранены')}
          className="btn-primary"
        >
          Сохранить изменения
        </button>
      </div>
    </div>
  );
}

// Billing Settings
function BillingSettings() {
  const currentPlan = {
    name: 'Professional',
    price: 99,
    contacts: 10000,
    emails: 50000,
    users: 5,
  };

  const usage = {
    contacts: 7234,
    emails: 24567,
    users: 3,
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Текущий план
        </h2>

        <div className="rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Ваш план</div>
              <div className="text-2xl font-bold">{currentPlan.name}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">${currentPlan.price}</div>
              <div className="text-sm opacity-90">/ месяц</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm opacity-90">Контакты</div>
              <div className="font-semibold">
                {usage.contacts.toLocaleString()} / {currentPlan.contacts.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90">Emails / мес</div>
              <div className="font-semibold">
                {usage.emails.toLocaleString()} / {currentPlan.emails.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90">Пользователи</div>
              <div className="font-semibold">
                {usage.users} / {currentPlan.users}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button className="btn-primary">Улучшить план</button>
          <button className="btn-secondary">Управление подпиской</button>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Способ оплаты
        </h2>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-16 items-center justify-center rounded bg-gray-100 text-xs font-bold dark:bg-gray-700">
              VISA
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">•••• •••• •••• 4242</div>
              <div className="text-sm text-gray-500">Истекает 12/26</div>
            </div>
          </div>
          <button className="btn-secondary text-sm">Изменить</button>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          История платежей
        </h2>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="pb-3 text-left text-sm font-medium text-gray-500">Дата</th>
              <th className="pb-3 text-left text-sm font-medium text-gray-500">Описание</th>
              <th className="pb-3 text-right text-sm font-medium text-gray-500">Сумма</th>
              <th className="pb-3 text-right text-sm font-medium text-gray-500">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {[
              { date: '12 янв 2025', desc: 'Professional - Январь', amount: 99, status: 'paid' },
              { date: '12 дек 2024', desc: 'Professional - Декабрь', amount: 99, status: 'paid' },
              { date: '12 ноя 2024', desc: 'Professional - Ноябрь', amount: 99, status: 'paid' },
            ].map((payment, i) => (
              <tr key={i}>
                <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{payment.date}</td>
                <td className="py-3 text-sm text-gray-900 dark:text-gray-100">{payment.desc}</td>
                <td className="py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                  ${payment.amount}
                </td>
                <td className="py-3 text-right">
                  <span className="badge-success">Оплачено</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}