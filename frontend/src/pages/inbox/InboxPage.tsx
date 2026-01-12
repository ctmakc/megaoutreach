import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Mail,
  Linkedin,
  Star,
  StarOff,
  Archive,
  Trash2,
  Reply,
  Forward,
  MoreHorizontal,
  ChevronDown,
  Check,
  Clock,
  User,
  Building2,
  ExternalLink,
  Send,
  Paperclip,
  Smile,
  RefreshCw,
  Inbox,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { Fragment } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { fetcher, poster, putter } from '@/lib/api';
import toast from 'react-hot-toast';

interface Thread {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactCompany?: string;
  contactTitle?: string;
  contactAvatar?: string;
  channel: 'email' | 'linkedin';
  campaignId?: string;
  campaignName?: string;
  subject: string;
  snippet: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  sentiment?: 'positive' | 'negative' | 'neutral';
  isStarred: boolean;
  messagesCount: number;
  lastMessageAt: string;
  messages: Message[];
}

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: string;
  isRead: boolean;
}

type FilterStatus = 'all' | 'unread' | 'replied' | 'starred' | 'archived';
type FilterChannel = 'all' | 'email' | 'linkedin';

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [channelFilter, setChannelFilter] = useState<FilterChannel>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const { data: threads, isLoading, refetch } = useQuery({
    queryKey: ['inbox', search, statusFilter, channelFilter],
    queryFn: () =>
      fetcher<Thread[]>(
        `/inbox?search=${search}&status=${statusFilter}&channel=${channelFilter}`
      ),
  });

  // Mock data
  const mockThreads: Thread[] = [
    {
      id: '1',
      contactId: 'c1',
      contactName: 'Алексей Смирнов',
      contactEmail: 'alexey@techcorp.ru',
      contactCompany: 'TechCorp',
      contactTitle: 'CTO',
      channel: 'email',
      campaignId: 'camp1',
      campaignName: 'Q1 Enterprise Outreach',
      subject: 'Re: Предложение по автоматизации',
      snippet: 'Добрый день! Очень интересное предложение. Давайте обсудим детали...',
      status: 'unread',
      sentiment: 'positive',
      isStarred: true,
      messagesCount: 3,
      lastMessageAt: '2025-01-12T10:30:00Z',
      messages: [
        {
          id: 'm1',
          direction: 'outbound',
          content: `Здравствуйте, Алексей!

Меня зовут Иван, и я представляю компанию SalesPilot. Мы помогаем B2B компаниям автоматизировать процесс продаж и увеличивать конверсию.

Заметил, что TechCorp активно развивается в сфере технологий. У нас есть несколько идей, которые могли бы быть вам полезны.

Будет ли у вас 15 минут на этой неделе для короткого звонка?

С уважением,
Иван Петров`,
          timestamp: '2025-01-10T09:00:00Z',
          isRead: true,
        },
        {
          id: 'm2',
          direction: 'inbound',
          content: `Добрый день, Иван!

Спасибо за обращение. Действительно, мы сейчас как раз рассматриваем варианты автоматизации наших sales-процессов.

Расскажите подробнее о вашем решении? Какие интеграции поддерживаете?

Алексей`,
          timestamp: '2025-01-11T14:20:00Z',
          isRead: true,
        },
        {
          id: 'm3',
          direction: 'inbound',
          content: `Добрый день!

Очень интересное предложение. Давайте обсудим детали. Можем созвониться в четверг после 14:00?

Алексей`,
          timestamp: '2025-01-12T10:30:00Z',
          isRead: false,
        },
      ],
    },
    {
      id: '2',
      contactId: 'c2',
      contactName: 'Мария Козлова',
      contactEmail: 'maria.k@startup.io',
      contactCompany: 'Startup.io',
      contactTitle: 'Head of Sales',
      channel: 'email',
      campaignId: 'camp1',
      campaignName: 'Q1 Enterprise Outreach',
      subject: 'Re: Автоматизация email-рассылок',
      snippet: 'Спасибо, но сейчас у нас другие приоритеты. Может быть в следующем квартале...',
      status: 'read',
      sentiment: 'negative',
      isStarred: false,
      messagesCount: 2,
      lastMessageAt: '2025-01-12T09:15:00Z',
      messages: [
        {
          id: 'm4',
          direction: 'outbound',
          content: 'Первое письмо...',
          timestamp: '2025-01-09T10:00:00Z',
          isRead: true,
        },
        {
          id: 'm5',
          direction: 'inbound',
          content:
            'Спасибо, но сейчас у нас другие приоритеты. Может быть в следующем квартале свяжемся.',
          timestamp: '2025-01-12T09:15:00Z',
          isRead: true,
        },
      ],
    },
    {
      id: '3',
      contactId: 'c3',
      contactName: 'Дмитрий Волков',
      contactEmail: 'dmitry@enterprise.com',
      contactCompany: 'Enterprise Solutions',
      contactTitle: 'CEO',
      channel: 'linkedin',
      campaignId: 'camp2',
      campaignName: 'LinkedIn Connection Campaign',
      subject: 'LinkedIn сообщение',
      snippet: 'Принял вашу заявку. Интересно узнать больше о вашем продукте.',
      status: 'unread',
      sentiment: 'positive',
      isStarred: false,
      messagesCount: 1,
      lastMessageAt: '2025-01-12T08:45:00Z',
      messages: [
        {
          id: 'm6',
          direction: 'inbound',
          content: 'Принял вашу заявку. Интересно узнать больше о вашем продукте.',
          timestamp: '2025-01-12T08:45:00Z',
          isRead: false,
        },
      ],
    },
    {
      id: '4',
      contactId: 'c4',
      contactName: 'Елена Новикова',
      contactEmail: 'elena@bigcorp.ru',
      contactCompany: 'BigCorp',
      contactTitle: 'Marketing Director',
      channel: 'email',
      campaignId: 'camp1',
      campaignName: 'Q1 Enterprise Outreach',
      subject: 'Re: Партнёрство',
      snippet: 'Очень заинтересованы! Можете прислать презентацию и кейсы?',
      status: 'replied',
      sentiment: 'positive',
      isStarred: true,
      messagesCount: 4,
      lastMessageAt: '2025-01-11T16:30:00Z',
      messages: [
        {
          id: 'm7',
          direction: 'outbound',
          content: 'Первое письмо...',
          timestamp: '2025-01-08T10:00:00Z',
          isRead: true,
        },
        {
          id: 'm8',
          direction: 'inbound',
          content: 'Очень заинтересованы! Можете прислать презентацию и кейсы?',
          timestamp: '2025-01-10T11:20:00Z',
          isRead: true,
        },
        {
          id: 'm9',
          direction: 'outbound',
          content: 'Конечно! Вот презентация и несколько кейсов...',
          timestamp: '2025-01-10T14:00:00Z',
          isRead: true,
        },
        {
          id: 'm10',
          direction: 'inbound',
          content: 'Спасибо! Передам коллегам и вернусь с обратной связью на следующей неделе.',
          timestamp: '2025-01-11T16:30:00Z',
          isRead: true,
        },
      ],
    },
    {
      id: '5',
      contactId: 'c5',
      contactName: 'Сергей Петров',
      contactEmail: 'sergey@medium.biz',
      contactCompany: 'Medium Business',
      contactTitle: 'Owner',
      channel: 'email',
      subject: 'Re: Предложение',
      snippet: 'Отпишите меня от рассылки пожалуйста',
      status: 'read',
      sentiment: 'negative',
      isStarred: false,
      messagesCount: 2,
      lastMessageAt: '2025-01-11T12:00:00Z',
      messages: [
        {
          id: 'm11',
          direction: 'outbound',
          content: 'Первое письмо...',
          timestamp: '2025-01-09T09:00:00Z',
          isRead: true,
        },
        {
          id: 'm12',
          direction: 'inbound',
          content: 'Отпишите меня от рассылки пожалуйста',
          timestamp: '2025-01-11T12:00:00Z',
          isRead: true,
        },
      ],
    },
  ];

  const displayThreads = threads || mockThreads;

  const filteredThreads = displayThreads.filter((thread) => {
    const matchesSearch =
      thread.contactName.toLowerCase().includes(search.toLowerCase()) ||
      thread.contactEmail.toLowerCase().includes(search.toLowerCase()) ||
      thread.subject.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'unread' && thread.status === 'unread') ||
      (statusFilter === 'replied' && thread.status === 'replied') ||
      (statusFilter === 'starred' && thread.isStarred) ||
      (statusFilter === 'archived' && thread.status === 'archived');

    const matchesChannel = channelFilter === 'all' || thread.channel === channelFilter;

    return matchesSearch && matchesStatus && matchesChannel;
  });

  const selectedThread = filteredThreads.find((t) => t.id === selectedThreadId);

  // Select first thread by default
  useEffect(() => {
    if (filteredThreads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(filteredThreads[0].id);
    }
  }, [filteredThreads, selectedThreadId]);

  const toggleStarMutation = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
      putter(`/inbox/${id}/star`, { starred }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => putter(`/inbox/${id}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      toast.success('Переписка архивирована');
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      poster(`/inbox/${threadId}/reply`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      setReplyText('');
      setIsComposing(false);
      toast.success('Ответ отправлен');
    },
  });

  const handleSendReply = () => {
    if (!selectedThreadId || !replyText.trim()) return;
    sendReplyMutation.mutate({ threadId: selectedThreadId, content: replyText });
  };

  const unreadCount = displayThreads.filter((t) => t.status === 'unread').length;

  const statusLabels: Record<FilterStatus, string> = {
    all: 'Все',
    unread: 'Непрочитанные',
    replied: 'С ответом',
    starred: 'Избранные',
    archived: 'Архив',
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Входящие</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Нет непрочитанных сообщений'}
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {/* Thread List */}
        <div className="flex w-96 flex-col border-r border-gray-200 dark:border-gray-700">
          {/* Filters */}
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input py-2 pl-9 text-sm"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Menu as="div" className="relative">
                <Menu.Button className="btn-secondary py-1.5 text-sm">
                  {statusLabels[statusFilter]}
                  <ChevronDown className="ml-1 h-4 w-4" />
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
                  <Menu.Items className="absolute left-0 z-10 mt-1 w-40 origin-top-left rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <Menu.Item key={value}>
                        {({ active }) => (
                          <button
                            onClick={() => setStatusFilter(value as FilterStatus)}
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

              <Menu as="div" className="relative">
                <Menu.Button className="btn-secondary py-1.5 text-sm">
                  {channelFilter === 'all'
                    ? 'Все каналы'
                    : channelFilter === 'email'
                    ? 'Email'
                    : 'LinkedIn'}
                  <ChevronDown className="ml-1 h-4 w-4" />
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
                  <Menu.Items className="absolute left-0 z-10 mt-1 w-40 origin-top-left rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setChannelFilter('all')}
                          className={`block w-full px-4 py-2 text-left text-sm ${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          }`}
                        >
                          Все каналы
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setChannelFilter('email')}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          }`}
                        >
                          <Mail className="h-4 w-4" />
                          Email
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setChannelFilter('linkedin')}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          }`}
                        >
                          <Linkedin className="h-4 w-4" />
                          LinkedIn
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Inbox className="h-12 w-12" />
                <p className="mt-2">Нет сообщений</p>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  isSelected={selectedThreadId === thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  onToggleStar={() =>
                    toggleStarMutation.mutate({ id: thread.id, starred: !thread.isStarred })
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Thread Detail */}
        <div className="flex flex-1 flex-col">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-medium text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                    {selectedThread.contactName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {selectedThread.contactName}
                      </span>
                      {selectedThread.sentiment && (
                        <SentimentBadge sentiment={selectedThread.sentiment} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{selectedThread.contactEmail}</span>
                      {selectedThread.contactCompany && (
                        <>
                          <span>•</span>
                          <span>{selectedThread.contactCompany}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      toggleStarMutation.mutate({
                        id: selectedThread.id,
                        starred: !selectedThread.isStarred,
                      })
                    }
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-yellow-500 dark:hover:bg-gray-700"
                  >
                    {selectedThread.isStarred ? (
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => archiveMutation.mutate(selectedThread.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Archive className="h-5 w-5" />
                  </button>
                  <Menu as="div" className="relative">
                    <Menu.Button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
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
                      <Menu.Items className="absolute right-0 z-10 mt-1 w-48 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                              }`}
                            >
                              <User className="h-4 w-4" />
                              Открыть контакт
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
                              <ExternalLink className="h-4 w-4" />
                              Открыть кампанию
                            </button>
                          )}
                        </Menu.Item>
                        <hr className="my-1 border-gray-200 dark:border-gray-700" />
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 ${
                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                              }`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Удалить переписку
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              </div>

              {/* Contact Info Bar */}
              {selectedThread.contactCompany && (
                <div className="flex items-center gap-6 border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Building2 className="h-4 w-4" />
                    <span>{selectedThread.contactCompany}</span>
                  </div>
                  {selectedThread.contactTitle && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span>{selectedThread.contactTitle}</span>
                    </div>
                  )}
                  {selectedThread.campaignName && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Mail className="h-4 w-4" />
                      <span>Кампания: {selectedThread.campaignName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto max-w-3xl space-y-4">
                  {selectedThread.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} thread={selectedThread} />
                  ))}
                </div>
              </div>

              {/* Reply Box */}
              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <div className="mx-auto max-w-3xl">
                  {isComposing ? (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                      <textarea
                        rows={4}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Напишите ответ..."
                        className="w-full resize-none rounded-t-lg border-0 p-3 focus:ring-0 dark:bg-gray-800"
                      />
                      <div className="flex items-center justify-between border-t border-gray-200 p-2 dark:border-gray-700">
                        <div className="flex gap-1">
                          <button className="rounded p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Paperclip className="h-4 w-4" />
                          </button>
                          <button className="rounded p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Smile className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setIsComposing(false);
                              setReplyText('');
                            }}
                            className="btn-secondary py-1.5 text-sm"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={handleSendReply}
                            disabled={!replyText.trim()}
                            className="btn-primary py-1.5 text-sm"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Отправить
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsComposing(true)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    >
                      <Reply className="h-5 w-5" />
                      <span>Написать ответ...</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
              <Mail className="h-16 w-16" />
              <p className="mt-4 text-lg">Выберите переписку</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Thread Item Component
function ThreadItem({
  thread,
  isSelected,
  onClick,
  onToggleStar,
}: {
  thread: Thread;
  isSelected: boolean;
  onClick: () => void;
  onToggleStar: () => void;
}) {
  const isUnread = thread.status === 'unread';

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer border-b border-gray-100 p-4 transition-colors dark:border-gray-700 ${
        isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full font-medium ${
              isUnread
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {thread.contactName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          {thread.channel === 'linkedin' && (
            <div className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 p-0.5">
              <Linkedin className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span
              className={`truncate ${
                isUnread
                  ? 'font-semibold text-gray-900 dark:text-gray-100'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {thread.contactName}
            </span>
            <div className="flex items-center gap-1">
              {thread.sentiment && <SentimentIndicator sentiment={thread.sentiment} />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar();
                }}
                className="rounded p-1 text-gray-400 hover:text-yellow-500"
              >
                {thread.isStarred ? (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ) : (
                  <Star className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div
            className={`truncate text-sm ${
              isUnread ? 'font-medium text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {thread.subject}
          </div>
          <div className="mt-1 truncate text-sm text-gray-500 dark:text-gray-500">
            {thread.snippet}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(thread.lastMessageAt), {
                addSuffix: true,
                locale: ru,
              })}
            </span>
            {thread.messagesCount > 1 && (
              <>
                <span>•</span>
                <span>{thread.messagesCount} сообщений</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message, thread }: { message: Message; thread: Thread }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl rounded-lg p-4 ${
          isOutbound
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        <div
          className={`mt-2 flex items-center gap-2 text-xs ${
            isOutbound ? 'text-primary-200' : 'text-gray-500'
          }`}
        >
          <span>
            {format(new Date(message.timestamp), 'd MMM, HH:mm', { locale: ru })}
          </span>
          {isOutbound && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Доставлено
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Sentiment Badge Component
function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'negative' | 'neutral' }) {
  const config = {
    positive: {
      icon: CheckCircle2,
      label: 'Позитивный',
      class: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    },
    negative: {
      icon: XCircle,
      label: 'Негативный',
      class: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    },
    neutral: {
      icon: AlertCircle,
      label: 'Нейтральный',
      class: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    },
  };

  const { icon: Icon, label, class: className } = config[sentiment];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// Sentiment Indicator (small dot)
function SentimentIndicator({ sentiment }: { sentiment: 'positive' | 'negative' | 'neutral' }) {
  const colors = {
    positive: 'bg-green-500',
    negative: 'bg-red-500',
    neutral: 'bg-gray-400',
  };

  return <div className={`h-2 w-2 rounded-full ${colors[sentiment]}`} />;
}