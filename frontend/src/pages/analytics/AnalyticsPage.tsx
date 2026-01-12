import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Mail,
  Eye,
  MousePointer,
  MessageSquare,
  Users,
  Calendar,
  Download,
  ChevronDown,
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
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
  Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');

  const overviewStats = [
    { label: 'Всего отправлено', value: '45,678', change: '+12.5%', trend: 'up', icon: Mail },
    { label: 'Open Rate', value: '42.3%', change: '+5.2%', trend: 'up', icon: Eye },
    { label: 'Click Rate', value: '8.7%', change: '-1.3%', trend: 'down', icon: MousePointer },
    { label: 'Reply Rate', value: '5.2%', change: '+2.1%', trend: 'up', icon: MessageSquare },
  ];

  const chartData = Array.from({ length: 30 }, (_, i) => ({
    date: `${i + 1}`,
    sent: Math.floor(Math.random() * 200) + 100,
    opened: Math.floor(Math.random() * 100) + 30,
    clicked: Math.floor(Math.random() * 30) + 5,
    replied: Math.floor(Math.random() * 15) + 2,
  }));

  const campaignPerformance = [
    { name: 'Q1 Enterprise Outreach', sent: 2450, openRate: 42.3, replyRate: 5.2 },
    { name: 'LinkedIn Connection Campaign', sent: 1200, openRate: 38.7, replyRate: 7.8 },
    { name: 'Product Launch Announcement', sent: 3200, openRate: 51.2, replyRate: 3.1 },
    { name: 'Customer Success Stories', sent: 890, openRate: 45.8, replyRate: 6.4 },
  ];

  const channelDistribution = [
    { name: 'Email', value: 75, color: '#3b82f6' },
    { name: 'LinkedIn', value: 25, color: '#0ea5e9' },
  ];

  const responseTypes = [
    { name: 'Позитивные', value: 45, color: '#22c55e' },
    { name: 'Нейтральные', value: 35, color: '#6b7280' },
    { name: 'Негативные', value: 20, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Аналитика</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Отслеживайте эффективность ваших кампаний
          </p>
        </div>
        <div className="flex gap-3">
          <Menu as="div" className="relative">
            <Menu.Button className="btn-secondary">
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange === '7d' ? 'Последние 7 дней' : dateRange === '30d' ? 'Последние 30 дней' : 'Последние 90 дней'}
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
                      onClick={() => setDateRange('7d')}
                      className={`block w-full px-4 py-2 text-left text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    >
                      Последние 7 дней
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setDateRange('30d')}
                      className={`block w-full px-4 py-2 text-left text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    >
                      Последние 30 дней
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setDateRange('90d')}
                      className={`block w-full px-4 py-2 text-left text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    >
                      Последние 90 дней
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
          <button className="btn-secondary">
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900">
                  <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <span className={`flex items-center gap-1 text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {stat.change}
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Chart */}
        <div className="card lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Динамика показателей
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Area type="monotone" dataKey="sent" name="Отправлено" stroke="#3b82f6" fill="url(#colorSent)" />
                <Area type="monotone" dataKey="opened" name="Открыто" stroke="#22c55e" fill="url(#colorOpened)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Charts */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">По каналам</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {channelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Тип ответов</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={responseTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {responseTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Эффективность кампаний
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 text-left text-sm font-medium text-gray-500">Кампания</th>
                <th className="pb-3 text-right text-sm font-medium text-gray-500">Отправлено</th>
                <th className="pb-3 text-right text-sm font-medium text-gray-500">Open Rate</th>
                <th className="pb-3 text-right text-sm font-medium text-gray-500">Reply Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {campaignPerformance.map((campaign) => (
                <tr key={campaign.name} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{campaign.name}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                    {campaign.sent.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <span className="rounded-full bg-green-100 px-2 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                      {campaign.openRate}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {campaign.replyRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}