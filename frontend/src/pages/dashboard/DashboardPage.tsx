import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Send,
  Mail,
  MousePointerClick,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Calendar,
  Target,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface DashboardStats {
  contacts: { total: number; change: number };
  campaigns: { active: number; change: number };
  emailsSent: { total: number; change: number };
  openRate: { value: number; change: number };
  clickRate: { value: number; change: number };
  replyRate: { value: number; change: number };
}

interface ActivityItem {
  id: string;
  type: 'email_sent' | 'email_opened' | 'email_clicked' | 'reply_received' | 'contact_added';
  message: string;
  timestamp: string;
  contact?: { name: string; email: string };
}

interface ChartData {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetcher<DashboardStats>('/analytics/dashboard-stats'),
  });

  const { data: chartData } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: () => fetcher<ChartData[]>('/analytics/dashboard-chart'),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => fetcher<ActivityItem[]>('/analytics/recent-activity'),
  });

  const { data: activeCampaigns } = useQuery({
    queryKey: ['active-campaigns'],
    queryFn: () => fetcher<any[]>('/campaigns?status=active&limit=5'),
  });

  // Mock data for demo
  const mockStats: DashboardStats = {
    contacts: { total: 12847, change: 12.5 },
    campaigns: { active: 8, change: 2 },
    emailsSent: { total: 45231, change: 18.2 },
    openRate: { value: 42.3, change: 3.1 },
    clickRate: { value: 8.7, change: -0.5 },
    replyRate: { value: 4.2, change: 1.2 },
  };

  const mockChartData: ChartData[] = [
    { date: '6 янв', sent: 1200, opened: 480, clicked: 96, replied: 48 },
    { date: '7 янв', sent: 1350, opened: 567, clicked: 108, replied: 54 },
    { date: '8 янв', sent: 980, opened: 412, clicked: 78, replied: 39 },
    { date: '9 янв', sent: 1500, opened: 630, clicked: 120, replied: 60 },
    { date: '10 янв', sent: 1100, opened: 462, clicked: 88, replied: 44 },
    { date: '11 янв', sent: 1680, opened: 706, clicked: 134, replied: 67 },
    { date: '12 янв', sent: 1420, opened: 597, clicked: 114, replied: 57 },
  ];

  const mockActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'reply_received',
      message: 'Ответил на письмо из кампании "Q1 Outreach"',
      timestamp: '5 минут назад',
      contact: { name: 'Алексей Петров', email: 'a.petrov@company.ru' },
    },
    {
      id: '2',
      type: 'email_opened',
      message: 'Открыл письмо "Предложение о сотрудничестве"',
      timestamp: '12 минут назад',
      contact: { name: 'Мария Иванова', email: 'm.ivanova@corp.ru' },
    },
    {
      id: '3',
      type: 'email_clicked',
      message: 'Перешёл по ссылке в письме',
      timestamp: '25 минут назад',
      contact: { name: 'Дмитрий Сидоров', email: 'd.sidorov@tech.io' },
    },
    {
      id: '4',
      type: 'contact_added',
      message: 'Добавлено 150 новых контактов',
      timestamp: '1 час назад',
    },
    {
      id: '5',
      type: 'email_sent',
      message: 'Отправлено 234 письма в кампании "Product Launch"',
      timestamp: '2 часа назад',
    },
  ];

  const displayStats = stats || mockStats;
  const displayChartData = chartData || mockChartData;
  const displayActivity = recentActivity || mockActivity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Добро пожаловать, {user?.firstName || 'Пользователь'}! 👋
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Вот что происходит с вашими кампаниями сегодня
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/contacts" className="btn-secondary">
            <Users className="mr-2 h-4 w-4" />
            Добавить контакты
          </Link>
          <Link to="/campaigns/new" className="btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            Новая кампания
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Всего контактов"
          value={displayStats.contacts.total.toLocaleString()}
          change={displayStats.contacts.change}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Активных кампаний"
          value={displayStats.campaigns.active}
          change={displayStats.campaigns.change}
          icon={Send}
          color="purple"
        />
        <StatCard
          title="Писем отправлено"
          value={displayStats.emailsSent.total.toLocaleString()}
          change={displayStats.emailsSent.change}
          icon={Mail}
          color="green"
        />
        <StatCard
          title="Open Rate"
          value={`${displayStats.openRate.value}%`}
          change={displayStats.openRate.change}
          icon={Mail}
          color="yellow"
        />
        <StatCard
          title="Click Rate"
          value={`${displayStats.clickRate.value}%`}
          change={displayStats.clickRate.change}
          icon={MousePointerClick}
          color="orange"
        />
        <StatCard
          title="Reply Rate"
          value={`${displayStats.replyRate.value}%`}
          change={displayStats.replyRate.change}
          icon={MessageSquare}
          color="pink"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Chart */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Активность за неделю
            </h2>
            <select className="input w-auto text-sm">
              <option>Последние 7 дней</option>
              <option>Последние 30 дней</option>
              <option>Последние 90 дней</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayChartData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f9fafb',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorSent)"
                  name="Отправлено"
                />
                <Area
                  type="monotone"
                  dataKey="opened"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorOpened)"
                  name="Открыто"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary-500" />
              <span className="text-gray-600 dark:text-gray-400">Отправлено</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Открыто</span>
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Воронка конверсий
          </h2>
          <div className="space-y-4">
            <FunnelStep
              label="Отправлено"
              value={45231}
              percentage={100}
              color="bg-primary-500"
            />
            <FunnelStep
              label="Доставлено"
              value={44108}
              percentage={97.5}
              color="bg-blue-500"
            />
            <FunnelStep
              label="Открыто"
              value={19132}
              percentage={42.3}
              color="bg-green-500"
            />
            <FunnelStep
              label="Кликнули"
              value={3935}
              percentage={8.7}
              color="bg-yellow-500"
            />
            <FunnelStep
              label="Ответили"
              value={1900}
              percentage={4.2}
              color="bg-pink-500"
            />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Последняя активность
            </h2>
            <Link
              to="/analytics"
              className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Все события
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {displayActivity.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Активные кампании
            </h2>
            <Link
              to="/campaigns"
              className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Все кампании
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Q1 Enterprise Outreach', sent: 2450, opened: 42, replied: 5.2 },
              { name: 'Product Launch Campaign', sent: 1230, opened: 38, replied: 3.8 },
              { name: 'Follow-up Sequence', sent: 890, opened: 51, replied: 7.1 },
              { name: 'Cold Outreach - Tech', sent: 3200, opened: 35, replied: 2.9 },
            ].map((campaign, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {campaign.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {campaign.sent.toLocaleString()} отправлено
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {campaign.opened}%
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Open</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-600">{campaign.replied}%</div>
                    <div className="text-gray-500 dark:text-gray-400">Reply</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          icon={Target}
          title="Создать кампанию"
          description="Запустите новую email или LinkedIn кампанию"
          href="/campaigns/new"
        />
        <QuickAction
          icon={Users}
          title="Импорт контактов"
          description="Загрузите CSV или подключите CRM"
          href="/contacts?import=true"
        />
        <QuickAction
          icon={Calendar}
          title="Запланировать"
          description="Настройте расписание отправки"
          href="/campaigns"
        />
        <QuickAction
          icon={Mail}
          title="Проверить входящие"
          description="У вас 12 новых ответов"
          href="/inbox"
          badge="12"
        />
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'orange' | 'pink';
}

function StatCard({ title, value, change, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-400',
  };

  const isPositive = change >= 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div
          className={`flex items-center text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isPositive ? (
            <TrendingUp className="mr-1 h-4 w-4" />
          ) : (
            <TrendingDown className="mr-1 h-4 w-4" />
          )}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
      </div>
    </div>
  );
}

// Funnel Step Component
interface FunnelStepProps {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

function FunnelStep({ label, value, percentage, color }: FunnelStepProps) {
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
          className={`h-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Activity Row Component
function ActivityRow({ item }: { item: ActivityItem }) {
  const iconMap = {
    email_sent: { icon: Send, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900' },
    email_opened: { icon: Mail, color: 'text-green-500 bg-green-100 dark:bg-green-900' },
    email_clicked: { icon: MousePointerClick, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900' },
    reply_received: { icon: MessageSquare, color: 'text-pink-500 bg-pink-100 dark:bg-pink-900' },
    contact_added: { icon: Users, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900' },
  };

  const { icon: Icon, color } = iconMap[item.type];

  return (
    <div className="flex items-start gap-3">
      <div className={`rounded-lg p-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        {item.contact && (
          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.contact.name}
          </div>
        )}
        <div className="text-sm text-gray-600 dark:text-gray-400">{item.message}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{item.timestamp}</div>
      </div>
    </div>
  );
}

// Quick Action Component
interface QuickActionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  badge?: string;
}

function QuickAction({ icon: Icon, title, description, href, badge }: QuickActionProps) {
  return (
    <Link
      to={href}
      className="card group relative transition-all hover:border-primary-300 hover:shadow-md dark:hover:border-primary-700"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary-100 p-3 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white dark:bg-primary-900 dark:text-primary-400">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{title}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</div>
        </div>
      </div>
      {badge && (
        <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}