import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  MoreHorizontal,
  Mail,
  Linkedin,
  Users,
  TrendingUp,
  Clock,
  Calendar,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  MousePointer,
  MessageSquare,
  UserX,
  RefreshCw,
  Download,
  Settings,
  BarChart3,
} from 'lucide-react';
import { Menu, Transition, Tab } from '@headlessui/react';
import { Fragment } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { fetcher, poster, deleter } from '@/lib/api';
import toast from 'react-hot-toast';

interface CampaignDetail {
  id: string;
  name: string;
  type: 'email' | 'linkedin' | 'multichannel';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'scheduled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  scheduledAt?: string;
  senderAccount: {
    id: string;
    email: string;
    name?: string;
  };
  stats: {
    totalContacts: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
    pending: number;
  };
  steps: Array<{
    id: string;
    type: 'email' | 'linkedin_connect' | 'linkedin_message' | 'delay';
    order: number;
    subject?: string;
    stats: {
      sent: number;
      opened: number;
      clicked: number;
      replied: number;
    };
  }>;
  dailyStats: Array<{
    date: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  }>;
  contacts: Array<{
    id: string;
    name: string;
    email: string;
    company?: string;
    status: 'pending' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed';
    currentStep: number;
    lastActivityAt?: string;
  }>;
}

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [contactFilter, setContactFilter] = useState<string>('all');

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => fetcher<CampaignDetail>(`/campaigns/${id}`),
  });

  // Mock data
  const mockCampaign: CampaignDetail = {
    id: id!,
    name: 'Q1 Enterprise Outreach',
    type: 'email',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    startedAt: '2025-01-02T09:00:00Z',
    senderAccount: {
      id: '1',
      email: 'ivan@company.ru',
      name: 'Ivan Petrov',
    },
    stats: {
      totalContacts: 2450,
      sent: 1876,
      delivered: 1834,
      opened: 792,
      clicked: 163,
      replied: 98,
      bounced: 42,
      unsubscribed: 12,
      pending: 574,
    },
    steps: [
      {
        id: 's1',
        type: 'email',
        order: 0,
        subject: 'Идея для {{company}}',
        stats: { sent: 1876, opened: 792, clicked: 163, replied: 98 },
      },
      {
        id: 's2',
        type: 'delay',
        order: 1,
        stats: { sent: 0, opened: 0, clicked: 0, replied: 0 },
      },
      {
        id: 's3',
        type: 'email',
        order: 2,
        subject: 'Следующий шаг?',
        stats: { sent: 890, opened: 356, clicked: 67, replied: 45 },
      },
      {
        id: 's4',
        type: 'delay',
        order: 3,
        stats: { sent: 0, opened: 0, clicked: 0, replied: 0 },
      },
      {
        id: 's5',
        type: 'email',
        order: 4,
        subject: 'Последняя попытка',
        stats: { sent: 423, opened: 127, clicked: 21, replied: 12 },
      },
    ],
    dailyStats: generateDailyStats(),
    contacts: generateMockContacts(),
  };

  const data = campaign || mockCampaign;

  const pauseMutation = useMutation({
    mutationFn: () => poster(`/campaigns/${id}/pause`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      toast.success('Кампания приостановлена');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => poster(`/campaigns/${id}/resume`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      toast.success('Кампания возобновлена');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleter(`/campaigns/${id}`),
    onSuccess: () => {
      toast.success('Кампания удалена');
      navigate('/campaigns');
    },
  });

  const statusConfig = {
    draft: { label: 'Черновик', class: 'badge-gray', icon: Edit },
    active: { label: 'Активна', class: 'badge-success', icon: Play },
    paused: { label: 'На паузе', class: 'badge-warning', icon: Pause },
    completed: { label: 'Завершена', class: 'badge-primary', icon: CheckCircle2 },
    scheduled: { label: 'Запланирована', class: 'badge-info', icon: Calendar },
  };

  const openRate = data.stats.sent > 0 ? ((data.stats.opened / data.stats.sent) * 100).toFixed(1) : '0';
  const clickRate = data.stats.sent > 0 ? ((data.stats.clicked / data.stats.sent) * 100).toFixed(1) : '0';
  const replyRate = data.stats.sent > 0 ? ((data.stats.replied / data.stats.sent) * 100).toFixed(1) : '0';
  const bounceRate = data.stats.sent > 0 ? ((data.stats.bounced / data.stats.sent) * 100).toFixed(1) : '0';

  const filteredContacts = data.contacts.filter((contact) => {
    if (contactFilter === 'all') return true;
    return contact.status === contactFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/campaigns')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.name}</h1>
              <span className={statusConfig[data.status].class}>
                {statusConfig[data.status].label}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                {data.type === 'email' && <Mail className="h-4 w-4" />}
                {data.type === 'linkedin' && <Linkedin className="h-4 w-4" />}
                {data.type === 'multichannel' && <TrendingUp className="h-4 w-4" />}
                {data.type === 'email' ? 'Email' : data.type === 'linkedin' ? 'LinkedIn' : 'Мультиканал'}
              </span>
              <span>•</span>
              <span>Создана {format(new Date(data.createdAt), 'd MMM yyyy', { locale: ru })}</span>
              {data.startedAt && (
                <>
                  <span>•</span>
                  <span>Запущена {format(new Date(data.startedAt), 'd MMM yyyy', { locale: ru })}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {data.status === 'active' && (
            <button onClick={() => pauseMutation.mutate()} className="btn-secondary">
              <Pause className="mr-2 h-4 w-4" />
              Пауза
            </button>
          )}
          {data.status === 'paused' && (
            <button onClick={() => resumeMutation.mutate()} className="btn-primary">
              <Play className="mr-2 h-4 w-4" />
              Возобновить
            </button>
          )}
          <Link to={`/campaigns/${id}/edit`} className="btn-secondary">
            <Edit className="mr-2 h-4 w-4" />
            Редактировать
          </Link>
          <Menu as="div" className="relative">
            <Menu.Button className="btn-secondary px-3">
              <MoreHorizontal className="h-5 w-5" />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      <Copy className="h-4 w-4" />
                      Дублировать
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      Экспорт данных
                    </button>
                  )}
                </Menu.Item>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => deleteMutation.mutate()}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 ${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Удалить
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard
          label="Всего контактов"
          value={data.stats.totalContacts}
          icon={Users}
          color="gray"
        />
        <StatCard
          label="Отправлено"
          value={data.stats.sent}
          subValue={`${((data.stats.sent / data.stats.totalContacts) * 100).toFixed(0)}%`}
          icon={Mail}
          color="blue"
        />
        <StatCard
          label="Open Rate"
          value={`${openRate}%`}
          subValue={`${data.stats.opened} открытий`}
          icon={Eye}
          color="green"
        />
        <StatCard
          label="Click Rate"
          value={`${clickRate}%`}
          subValue={`${data.stats.clicked} кликов`}
          icon={MousePointer}
          color="purple"
        />
        <StatCard
          label="Reply Rate"
          value={`${replyRate}%`}
          subValue={`${data.stats.replied} ответов`}
          icon={MessageSquare}
          color="orange"
        />
        <StatCard
          label="Bounce Rate"
          value={`${bounceRate}%`}
          subValue={`${data.stats.bounced} отказов`}
          icon={UserX}
          color="red"
        />
      </div>

      {/* Tabs */}
      <Tab.Group>
        <Tab.List className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {['Обзор', 'Шаги', 'Контакты', 'Активность'].map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                `flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`
              }
            >
              {tab}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          {/* Overview Tab */}
          <Tab.Panel className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Performance Chart */}
              <div className="card">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Динамика отправки
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.dailyStats}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sent"
                        name="Отправлено"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorSent)"
                      />
                      <Area
                        type="monotone"
                        dataKey="opened"
                        name="Открыто"
                        stroke="#22c55e"
                        fillOpacity={1}
                        fill="url(#colorOpened)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="card">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Воронка конверсии
                </h3>
                <div className="space-y-4">
                  <FunnelStep
                    label="Отправлено"
                    value={data.stats.sent}
                    total={data.stats.totalContacts}
                    color="bg-blue-500"
                  />
                  <FunnelStep
                    label="Доставлено"
                    value={data.stats.delivered}
                    total={data.stats.sent}
                    color="bg-cyan-500"
                  />
                  <FunnelStep
                    label="Открыто"
                    value={data.stats.opened}
                    total={data.stats.delivered}
                    color="bg-green-500"
                  />
                  <FunnelStep
                    label="Кликнуто"
                    value={data.stats.clicked}
                    total={data.stats.opened}
                    color="bg-purple-500"
                  />
                  <FunnelStep
                    label="Ответило"
                    value={data.stats.replied}
                    total={data.stats.clicked}
                    color="bg-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Campaign Info */}
            <div className="card">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Информация о кампании
              </h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Отправитель</div>
                  <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {data.senderAccount.email}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Шагов в последовательности</div>
                  <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {data.steps.filter((s) => s.type !== 'delay').length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Ожидают отправки</div>
                  <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {data.stats.pending}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Отписались</div>
                  <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {data.stats.unsubscribed}
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* Steps Tab */}
          <Tab.Panel>
            <div className="card">
              <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Шаги последовательности
              </h3>
              <div className="space-y-4">
                {data.steps.map((step, index) => (
                  <StepCard key={step.id} step={step} index={index} />
                ))}
              </div>
            </div>
          </Tab.Panel>

          {/* Contacts Tab */}
          <Tab.Panel>
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Контакты ({filteredContacts.length})
                </h3>
                <Menu as="div" className="relative">
                  <Menu.Button className="btn-secondary text-sm">
                    {contactFilter === 'all' ? 'Все статусы' : contactStatusLabels[contactFilter]}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-1 w-48 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => setContactFilter('all')}
                            className={`block w-full px-4 py-2 text-left text-sm ${
                              active ? 'bg-gray-100 dark:bg-gray-700' : ''
                            }`}
                          >
                            Все статусы
                          </button>
                        )}
                      </Menu.Item>
                      {Object.entries(contactStatusLabels).map(([value, label]) => (
                        <Menu.Item key={value}>
                          {({ active }) => (
                            <button
                              onClick={() => setContactFilter(value)}
                              className={`block w-full px-4 py-2 text-left text-sm ${
                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                              }`}
                            >
                              {label}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 text-left text-sm font-medium text-gray-500">Контакт</th>
                      <th className="pb-3 text-left text-sm font-medium text-gray-500">Компания</th>
                      <th className="pb-3 text-left text-sm font-medium text-gray-500">Статус</th>
                      <th className="pb-3 text-left text-sm font-medium text-gray-500">Шаг</th>
                      <th className="pb-3 text-left text-sm font-medium text-gray-500">
                        Последняя активность
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredContacts.slice(0, 50).map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600 dark:bg-gray-700">
                              {contact.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {contact.name}
                              </div>
                              <div className="text-sm text-gray-500">{contact.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          {contact.company || '—'}
                        </td>
                        <td className="py-3">
                          <ContactStatusBadge status={contact.status} />
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          Шаг {contact.currentStep + 1}
                        </td>
                        <td className="py-3 text-sm text-gray-500">
                          {contact.lastActivityAt
                            ? format(new Date(contact.lastActivityAt), 'd MMM, HH:mm', { locale: ru })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredContacts.length > 50 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Показано 50 из {filteredContacts.length} контактов
                </div>
              )}
            </div>
          </Tab.Panel>

          {/* Activity Tab */}
          <Tab.Panel>
            <div className="card">
              <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Последняя активность
              </h3>
              <ActivityFeed />
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  color: 'gray' | 'blue' | 'green' | 'purple' | 'orange' | 'red';
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
          {subValue && <div className="text-xs text-gray-400">{subValue}</div>}
        </div>
      </div>
    </div>
  );
}

// Funnel Step Component
function FunnelStep({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {value.toLocaleString()} ({percentage}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Step Card Component
function StepCard({ step, index }: { step: CampaignDetail['steps'][0]; index: number }) {
  const stepIcons = {
    email: Mail,
    linkedin_connect: Linkedin,
    linkedin_message: Linkedin,
    delay: Clock,
  };

  const Icon = stepIcons[step.type];
  const isDelay = step.type === 'delay';

  if (isDelay) {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
          <Clock className="h-5 w-5 text-gray-500" />
        </div>
        <div className="text-gray-600 dark:text-gray-400">Ожидание 2 дня</div>
      </div>
    );
  }

  const openRate = step.stats.sent > 0 ? ((step.stats.opened / step.stats.sent) * 100).toFixed(1) : '0';
  const clickRate = step.stats.sent > 0 ? ((step.stats.clicked / step.stats.sent) * 100).toFixed(1) : '0';
  const replyRate = step.stats.sent > 0 ? ((step.stats.replied / step.stats.sent) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
            <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              Шаг {Math.floor(index / 2) + 1}: {step.subject || 'Email'}
            </div>
            <div className="text-sm text-gray-500">
              {step.stats.sent.toLocaleString()} отправлено
            </div>
          </div>
        </div>
        <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Eye className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{openRate}%</div>
          <div className="text-xs text-gray-500">Open Rate</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{clickRate}%</div>
          <div className="text-xs text-gray-500">Click Rate</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
          <div className="text-lg font-semibold text-green-600">{replyRate}%</div>
          <div className="text-xs text-gray-500">Reply Rate</div>
        </div>
      </div>
    </div>
  );
}

// Contact Status Badge
const contactStatusLabels: Record<string, string> = {
  pending: 'Ожидает',
  sent: 'Отправлено',
  opened: 'Открыто',
  clicked: 'Кликнуто',
  replied: 'Ответил',
  bounced: 'Отказ',
  unsubscribed: 'Отписался',
};

function ContactStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    pending: 'badge-gray',
    sent: 'badge-info',
    opened: 'badge-primary',
    clicked: 'badge-purple',
    replied: 'badge-success',
    bounced: 'badge-error',
    unsubscribed: 'badge-warning',
  };

  return <span className={config[status]}>{contactStatusLabels[status]}</span>;
}

// Activity Feed
function ActivityFeed() {
  const activities = [
    { type: 'reply', contact: 'Алексей Смирнов', time: '10 минут назад' },
    { type: 'open', contact: 'Мария Козлова', time: '25 минут назад' },
    { type: 'click', contact: 'Дмитрий Волков', time: '1 час назад' },
    { type: 'sent', contact: 'Елена Новикова', time: '2 часа назад' },
    { type: 'bounce', contact: 'Сергей Петров', time: '3 часа назад' },
    { type: 'open', contact: 'Анна Иванова', time: '4 часа назад' },
    { type: 'reply', contact: 'Павел Сидоров', time: '5 часов назад' },
  ];

  const activityConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    reply: { icon: MessageSquare, color: 'text-green-500', label: 'ответил на письмо' },
    open: { icon: Eye, color: 'text-blue-500', label: 'открыл письмо' },
    click: { icon: MousePointer, color: 'text-purple-500', label: 'кликнул по ссылке' },
    sent: { icon: Mail, color: 'text-gray-500', label: 'получил письмо' },
    bounce: { icon: XCircle, color: 'text-red-500', label: 'письмо не доставлено' },
  };

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const config = activityConfig[activity.type];
        const Icon = config.icon;
        return (
          <div key={index} className="flex items-center gap-4">
            <div className={`rounded-full p-2 ${config.color} bg-opacity-10`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1">
              <span className="font-medium text-gray-900 dark:text-gray-100">{activity.contact}</span>
              <span className="text-gray-600 dark:text-gray-400"> {config.label}</span>
            </div>
            <span className="text-sm text-gray-500">{activity.time}</span>
          </div>
        );
      })}
    </div>
  );
}

// Helper functions
function generateDailyStats() {
  const stats = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const sent = Math.floor(Math.random() * 150) + 50;
    stats.push({
      date: format(date, 'd MMM', { locale: ru }),
      sent,
      opened: Math.floor(sent * (0.35 + Math.random() * 0.15)),
      clicked: Math.floor(sent * (0.05 + Math.random() * 0.05)),
      replied: Math.floor(sent * (0.02 + Math.random() * 0.03)),
    });
  }
  return stats;
}

function generateMockContacts() {
  const names = [
    'Алексей Смирнов',
    'Мария Козлова',
    'Дмитрий Волков',
    'Елена Новикова',
    'Сергей Петров',
    'Анна Иванова',
    'Павел Сидоров',
    'Ольга Федорова',
    'Михаил Кузнецов',
    'Наталья Морозова',
  ];
  const companies = ['TechCorp', 'Startup.io', 'Enterprise Solutions', 'BigCorp', 'Medium Business'];
  const statuses: Array<'pending' | 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed'> = [
    'pending',
    'sent',
    'opened',
    'clicked',
    'replied',
    'bounced',
    'unsubscribed',
  ];

  return Array.from({ length: 100 }, (_, i) => ({
    id: `contact-${i}`,
    name: names[i % names.length],
    email: `contact${i}@example.com`,
    company: companies[i % companies.length],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    currentStep: Math.floor(Math.random() * 3),
    lastActivityAt:
      Math.random() > 0.3
        ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
  }));
}