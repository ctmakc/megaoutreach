import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  Linkedin,
  Phone,
  Building,
  MapPin,
  Calendar,
  Tag,
  Edit,
  Trash2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  MousePointerClick,
  MessageSquare,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { fetcher, deleter } from '@/lib/api';
import toast from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface Contact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  phone?: string;
  linkedinUrl?: string;
  location?: string;
  website?: string;
  status: 'active' | 'bounced' | 'unsubscribed' | 'complained';
  tags: string[];
  customFields: Record<string, string>;
  enrichmentData?: {
    companySize?: string;
    industry?: string;
    linkedinFollowers?: number;
  };
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  type: 'email_sent' | 'email_opened' | 'email_clicked' | 'email_replied' | 'email_bounced' | 'linkedin_message';
  subject?: string;
  campaign?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'campaigns' | 'notes'>('activity');

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => fetcher<Contact>(`/contacts/${id}`),
  });

  const { data: activities } = useQuery({
    queryKey: ['contact-activity', id],
    queryFn: () => fetcher<Activity[]>(`/contacts/${id}/activity`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleter(`/contacts/${id}`),
    onSuccess: () => {
      toast.success('Контакт удалён');
      navigate('/contacts');
    },
  });

  // Mock data
  const mockContact: Contact = {
    id: id || '1',
    email: 'ivan.petrov@techcorp.ru',
    firstName: 'Иван',
    lastName: 'Петров',
    company: 'TechCorp Solutions',
    title: 'Chief Technology Officer',
    phone: '+7 (999) 123-45-67',
    linkedinUrl: 'https://linkedin.com/in/ivan-petrov',
    location: 'Москва, Россия',
    website: 'https://techcorp.ru',
    status: 'active',
    tags: ['Enterprise', 'Tech', 'Decision Maker'],
    customFields: {
      'Lead Source': 'LinkedIn',
      'Budget': '500k+',
    },
    enrichmentData: {
      companySize: '100-500',
      industry: 'Technology',
      linkedinFollowers: 2450,
    },
    lastContactedAt: '2025-01-10T10:00:00Z',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  };

  const mockActivities: Activity[] = [
    {
      id: '1',
      type: 'email_replied',
      subject: 'Re: Предложение о сотрудничестве',
      campaign: 'Q1 Enterprise Outreach',
      timestamp: '2025-01-10T10:00:00Z',
    },
    {
      id: '2',
      type: 'email_opened',
      subject: 'Предложение о сотрудничестве',
      campaign: 'Q1 Enterprise Outreach',
      timestamp: '2025-01-09T14:30:00Z',
    },
    {
      id: '3',
      type: 'email_clicked',
      subject: 'Предложение о сотрудничестве',
      campaign: 'Q1 Enterprise Outreach',
      timestamp: '2025-01-09T14:35:00Z',
    },
    {
      id: '4',
      type: 'email_sent',
      subject: 'Предложение о сотрудничестве',
      campaign: 'Q1 Enterprise Outreach',
      timestamp: '2025-01-08T09:00:00Z',
    },
    {
      id: '5',
      type: 'linkedin_message',
      subject: 'Connection Request',
      timestamp: '2025-01-05T11:00:00Z',
    },
  ];

  const displayContact = contact || mockContact;
  const displayActivities = activities || mockActivities;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const fullName = [displayContact.firstName, displayContact.lastName].filter(Boolean).join(' ') || displayContact.email;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/contacts"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
              {displayContact.firstName?.[0] || displayContact.email[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {fullName}
              </h1>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                {displayContact.title && <span>{displayContact.title}</span>}
                {displayContact.title && displayContact.company && <span>•</span>}
                {displayContact.company && <span>{displayContact.company}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">
            <Edit className="mr-2 h-4 w-4" />
            Редактировать
          </button>
          <button className="btn-primary">
            <Send className="mr-2 h-4 w-4" />
            Написать
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Details Card */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Контактная информация
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem icon={Mail} label="Email" value={displayContact.email} />
              {displayContact.phone && (
                <InfoItem icon={Phone} label="Телефон" value={displayContact.phone} />
              )}
              {displayContact.company && (
                <InfoItem icon={Building} label="Компания" value={displayContact.company} />
              )}
              {displayContact.location && (
                <InfoItem icon={MapPin} label="Локация" value={displayContact.location} />
              )}
              {displayContact.linkedinUrl && (
                <InfoItem
                  icon={Linkedin}
                  label="LinkedIn"
                  value="Открыть профиль"
                  href={displayContact.linkedinUrl}
                />
              )}
              {displayContact.website && (
                <InfoItem
                  icon={ExternalLink}
                  label="Сайт"
                  value={displayContact.website}
                  href={displayContact.website}
                />
              )}
            </div>
          </div>

          {/* Activity Tabs */}
          <div className="card">
            <div className="mb-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
              {(['activity', 'campaigns', 'notes'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab === 'activity' && 'Активность'}
                  {tab === 'campaigns' && 'Кампании'}
                  {tab === 'notes' && 'Заметки'}
                </button>
              ))}
            </div>

            {activeTab === 'activity' && (
              <div className="space-y-4">
                {displayActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            )}

            {activeTab === 'campaigns' && (
              <div className="space-y-3">
                {['Q1 Enterprise Outreach', 'Product Launch', 'Follow-up Sequence'].map((campaign) => (
                  <div
                    key={campaign}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">{campaign}</span>
                    <span className="badge-success">Активна</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <textarea
                  rows={3}
                  className="input"
                  placeholder="Добавить заметку..."
                />
                <button className="btn-primary text-sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Добавить заметку
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Статус</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Статус контакта</span>
                <StatusBadge status={displayContact.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Добавлен</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {new Date(displayContact.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
              {displayContact.lastContactedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Последний контакт</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(displayContact.lastContactedAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tags Card */}
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Теги</h3>
              <button className="text-sm text-primary-600 hover:text-primary-500">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayContact.tags.map((tag) => (
                <span key={tag} className="badge-primary">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Enrichment Data */}
          {displayContact.enrichmentData && (
            <div className="card">
              <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
                Обогащённые данные
              </h3>
              <div className="space-y-3">
                {displayContact.enrichmentData.industry && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Индустрия</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {displayContact.enrichmentData.industry}
                    </span>
                  </div>
                )}
                {displayContact.enrichmentData.companySize && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Размер компании</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {displayContact.enrichmentData.companySize}
                    </span>
                  </div>
                )}
                {displayContact.enrichmentData.linkedinFollowers && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">LinkedIn подписчики</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {displayContact.enrichmentData.linkedinFollowers.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Fields */}
          {Object.keys(displayContact.customFields).length > 0 && (
            <div className="card">
              <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
                Дополнительные поля
              </h3>
              <div className="space-y-3">
                {Object.entries(displayContact.customFields).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{key}</span>
                    <span className="text-gray-900 dark:text-gray-100">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Transition appear show={showDeleteModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowDeleteModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-gray-800">
                  <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Удалить контакт?
                  </Dialog.Title>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Вы уверены, что хотите удалить контакт {fullName}? Это действие нельзя отменить.
                  </p>
                  <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">
                      Отмена
                    </button>
                    <button onClick={() => deleteMutation.mutate()} className="btn-danger">
                      Удалить
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

// Helper Components
function InfoItem({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-gray-400" />
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-gray-900 dark:text-gray-100">{value}</div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
        {content}
      </a>
    );
  }

  return content;
}

function StatusBadge({ status }: { status: Contact['status'] }) {
  const config = {
    active: { label: 'Активный', class: 'badge-success' },
    bounced: { label: 'Bounce', class: 'badge-danger' },
    unsubscribed: { label: 'Отписан', class: 'badge-warning' },
    complained: { label: 'Жалоба', class: 'badge-danger' },
  };
  const { label, class: className } = config[status];
  return <span className={className}>{label}</span>;
}

function ActivityItem({ activity }: { activity: Activity }) {
  const iconConfig = {
    email_sent: { icon: Send, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900', label: 'Письмо отправлено' },
    email_opened: { icon: Mail, color: 'text-green-500 bg-green-100 dark:bg-green-900', label: 'Письмо открыто' },
    email_clicked: { icon: MousePointerClick, color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900', label: 'Клик по ссылке' },
    email_replied: { icon: MessageSquare, color: 'text-pink-500 bg-pink-100 dark:bg-pink-900', label: 'Получен ответ' },
    email_bounced: { icon: XCircle, color: 'text-red-500 bg-red-100 dark:bg-red-900', label: 'Bounce' },
    linkedin_message: { icon: Linkedin, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900', label: 'LinkedIn' },
  };

  const config = iconConfig[activity.type];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3">
      <div className={`rounded-lg p-2 ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-gray-100">{config.label}</div>
        {activity.subject && (
          <div className="text-sm text-gray-600 dark:text-gray-400">{activity.subject}</div>
        )}
        {activity.campaign && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Кампания: {activity.campaign}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-400">
        {new Date(activity.timestamp).toLocaleString('ru-RU', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}