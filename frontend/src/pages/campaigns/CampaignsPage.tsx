import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  Copy,
  Trash2,
  Mail,
  Linkedin,
  Calendar,
  Users,
  TrendingUp,
  ChevronDown,
  Eye,
  Edit,
  BarChart3,
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { fetcher, poster, deleter } from '@/lib/api';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'linkedin' | 'multichannel';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'scheduled';
  totalContacts: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  stepsCount: number;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CampaignsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns', search, statusFilter, typeFilter],
    queryFn: () => fetcher<Campaign[]>(`/campaigns?search=${search}&status=${statusFilter}&type=${typeFilter}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleter(`/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Кампания удалена');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'pause' | 'resume' }) =>
      poster(`/campaigns/${id}/${action}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Статус кампании обновлён');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => poster(`/campaigns/${id}/duplicate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Кампания скопирована');
    },
  });

  // Mock data
  const mockCampaigns: Campaign[] = [
    {
      id: '1',
      name: 'Q1 Enterprise Outreach',
      type: 'email',
      status: 'active',
      totalContacts: 2450,
      sentCount: 1876,
      openRate: 42.3,
      clickRate: 8.7,
      replyRate: 5.2,
      stepsCount: 4,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-12T10:00:00Z',
    },
    {
      id: '2',
      name: 'Product Launch Campaign',
      type: 'multichannel',
      status: 'active',
      totalContacts: 1230,
      sentCount: 890,
      openRate: 38.5,
      clickRate: 6.2,
      replyRate: 3.8,
      stepsCount: 5,
      createdAt: '2025-01-05T00:00:00Z',
      updatedAt: '2025-01-12T08:30:00Z',
    },
    {
      id: '3',
      name: 'LinkedIn Connection Campaign',
      type: 'linkedin',
      status: 'paused',
      totalContacts: 500,
      sentCount: 234,
      openRate: 0,
      clickRate: 0,
      replyRate: 12.4,
      stepsCount: 3,
      createdAt: '2025-01-03T00:00:00Z',
      updatedAt: '2025-01-10T16:00:00Z',
    },
    {
      id: '4',
      name: 'Follow-up Sequence',
      type: 'email',
      status: 'completed',
      totalContacts: 890,
      sentCount: 890,
      openRate: 51.2,
      clickRate: 12.1,
      replyRate: 7.1,
      stepsCount: 3,
      createdAt: '2024-12-15T00:00:00Z',
      updatedAt: '2025-01-08T00:00:00Z',
    },
    {
      id: '5',
      name: 'Cold Outreach - Tech Startups',
      type: 'email',
      status: 'draft',
      totalContacts: 3200,
      sentCount: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      stepsCount: 4,
      createdAt: '2025-01-10T00:00:00Z',
      updatedAt: '2025-01-11T14:00:00Z',
    },
    {
      id: '6',
      name: 'Webinar Invite',
      type: 'email',
      status: 'scheduled',
      totalContacts: 1500,
      sentCount: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      stepsCount: 2,
      scheduledAt: '2025-01-15T09:00:00Z',
      createdAt: '2025-01-12T00:00:00Z',
      updatedAt: '2025-01-12T00:00:00Z',
    },
  ];

  const displayCampaigns = campaigns || mockCampaigns;

  const filteredCampaigns = displayCampaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || campaign.status === statusFilter;
    const matchesType = !typeFilter || campaign.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: displayCampaigns.length,
    active: displayCampaigns.filter((c) => c.status === 'active').length,
    paused: displayCampaigns.filter((c) => c.status === 'paused').length,
    draft: displayCampaigns.filter((c) => c.status === 'draft').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Кампании</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Управляйте email и LinkedIn кампаниями
          </p>
        </div>
        <Link to="/campaigns/new" className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Новая кампания
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Всего кампаний"
          value={stats.total}
          icon={BarChart3}
          color="blue"
        />
        <StatsCard
          label="Активных"
          value={stats.active}
          icon={Play}
          color="green"
        />
        <StatsCard
          label="На паузе"
          value={stats.paused}
          icon={Pause}
          color="yellow"
        />
        <StatsCard
          label="Черновики"
          value={stats.draft}
          icon={Edit}
          color="gray"
        />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск кампаний..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-3">
            <Menu as="div" className="relative">
              <Menu.Button className="btn-secondary">
                {statusFilter ? statusLabels[statusFilter as keyof typeof statusLabels] : 'Статус'}
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
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => setStatusFilter('')}
                        className={`block w-full px-4 py-2 text-left text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                      >
                        Все статусы
                      </button>
                    )}
                  </Menu.Item>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <Menu.Item key={value}>
                      {({ active }) => (
                        <button
                          onClick={() => setStatusFilter(value)}
                          className={`block w-full px-4 py-2 text-left text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                        >
                          {label}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Items>
              </Transition>
            </Menu>

            <Menu as="div" className="relative">
              <Menu.Button className="btn-secondary">
                {typeFilter ? typeLabels[typeFilter as keyof typeof typeLabels] : 'Тип'}
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
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => setTypeFilter('')}
                        className={`block w-full px-4 py-2 text-left text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                      >
                        Все типы
                      </button>
                    )}
                  </Menu.Item>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <Menu.Item key={value}>
                      {({ active }) => (
                        <button
                          onClick={() => setTypeFilter(value)}
                          className={`block w-full px-4 py-2 text-left text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
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
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCampaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onToggleStatus={(action) => toggleStatusMutation.mutate({ id: campaign.id, action })}
            onDuplicate={() => duplicateMutation.mutate(campaign.id)}
            onDelete={() => deleteMutation.mutate(campaign.id)}
            onEdit={() => navigate(`/campaigns/${campaign.id}/edit`)}
            onView={() => navigate(`/campaigns/${campaign.id}`)}
          />
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="card py-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Кампании не найдены
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {search || statusFilter || typeFilter
              ? 'Попробуйте изменить параметры поиска'
              : 'Создайте первую кампанию, чтобы начать'}
          </p>
          {!search && !statusFilter && !typeFilter && (
            <Link to="/campaigns/new" className="btn-primary mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Создать кампанию
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const statusLabels = {
  draft: 'Черновик',
  active: 'Активна',
  paused: 'На паузе',
  completed: 'Завершена',
  scheduled: 'Запланирована',
};

const typeLabels = {
  email: 'Email',
  linkedin: 'LinkedIn',
  multichannel: 'Мультиканал',
};

// Stats Card Component
function StatsCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  return (
    <div className="card flex items-center gap-4">
      <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  );
}

// Campaign Card Component
function CampaignCard({
  campaign,
  onToggleStatus,
  onDuplicate,
  onDelete,
  onEdit,
  onView,
}: {
  campaign: Campaign;
  onToggleStatus: (action: 'pause' | 'resume') => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onView: () => void;
}) {
  const statusConfig = {
    draft: { label: 'Черновик', class: 'badge-gray' },
    active: { label: 'Активна', class: 'badge-success' },
    paused: { label: 'На паузе', class: 'badge-warning' },
    completed: { label: 'Завершена', class: 'badge-primary' },
    scheduled: { label: 'Запланирована', class: 'badge-info' },
  };

  const typeConfig = {
    email: { icon: Mail, label: 'Email' },
    linkedin: { icon: Linkedin, label: 'LinkedIn' },
    multichannel: { icon: TrendingUp, label: 'Мультиканал' },
  };

  const TypeIcon = typeConfig[campaign.type].icon;
  const status = statusConfig[campaign.status];

  return (
    <div className="card group transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
            <TypeIcon className="h-5 w-5" />
          </div>
          <div>
            <Link
              to={`/campaigns/${campaign.id}`}
              className="font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-100"
            >
              {campaign.name}
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{typeConfig[campaign.type].label}</span>
              <span>•</span>
              <span>{campaign.stepsCount} шагов</span>
            </div>
          </div>
        </div>
        <Menu as="div" className="relative">
          <Menu.Button className="rounded-lg p-1 opacity-0 hover:bg-gray-100 group-hover:opacity-100 dark:hover:bg-gray-700">
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
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
                    onClick={onView}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                  >
                    <Eye className="h-4 w-4" />
                    Просмотр
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onEdit}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                  >
                    <Edit className="h-4 w-4" />
                    Редактировать
                  </button>
                )}
              </Menu.Item>
              {campaign.status === 'active' && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onToggleStatus('pause')}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    >
                      <Pause className="h-4 w-4" />
                      Поставить на паузу
                    </button>
                  )}
                </Menu.Item>
              )}
              {campaign.status === 'paused' && (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onToggleStatus('resume')}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    >
                      <Play className="h-4 w-4" />
                      Возобновить
                    </button>
                  )}
                </Menu.Item>
              )}
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onDuplicate}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                  >
                    <Copy className="h-4 w-4" />
                    Дублировать
                  </button>
                )}
              </Menu.Item>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onDelete}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
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

      <div className="mt-4">
        <span className={status.class}>{status.label}</span>
        {campaign.scheduledAt && campaign.status === 'scheduled' && (
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="mr-1 inline h-3 w-3" />
            {new Date(campaign.scheduledAt).toLocaleDateString('ru-RU')}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Users className="h-4 w-4" />
        <span>
          {campaign.sentCount.toLocaleString()} / {campaign.totalContacts.toLocaleString()}
        </span>
        <div className="ml-auto flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-primary-500"
              style={{
                width: `${campaign.totalContacts ? (campaign.sentCount / campaign.totalContacts) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {campaign.sentCount > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {campaign.openRate}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Open Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {campaign.clickRate}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Click Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{campaign.replyRate}%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Reply Rate</div>
          </div>
        </div>
      )}
    </div>
  );
}