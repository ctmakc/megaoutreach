import { useState } from 'react';
import {
  Plus,
  Search,
  FileText,
  Mail,
  Linkedin,
  Edit,
  Copy,
  Trash2,
  MoreHorizontal,
  Star,
  Clock,
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface Template {
  id: string;
  name: string;
  subject?: string;
  content: string;
  type: 'email' | 'linkedin';
  category: string;
  isStarred: boolean;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
}

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'email' | 'linkedin'>('all');

  const templates: Template[] = [
    {
      id: '1',
      name: 'Холодное письмо - IT компании',
      subject: 'Идея для {{company}}',
      content: 'Здравствуйте, {{first_name}}!\n\nЗаметил, что {{company}} активно развивается...',
      type: 'email',
      category: 'Холодные письма',
      isStarred: true,
      usageCount: 156,
      lastUsed: '2025-01-12',
      createdAt: '2024-11-15',
    },
    {
      id: '2',
      name: 'Follow-up #1',
      subject: 'Re: Идея для {{company}}',
      content: 'Здравствуйте, {{first_name}}!\n\nПишу, чтобы убедиться, что вы получили...',
      type: 'email',
      category: 'Follow-up',
      isStarred: false,
      usageCount: 89,
      lastUsed: '2025-01-11',
      createdAt: '2024-11-20',
    },
    {
      id: '3',
      name: 'LinkedIn Connection Request',
      content: 'Здравствуйте, {{first_name}}! Увидел ваш профиль и был впечатлён...',
      type: 'linkedin',
      category: 'LinkedIn',
      isStarred: true,
      usageCount: 234,
      lastUsed: '2025-01-12',
      createdAt: '2024-12-01',
    },
    {
      id: '4',
      name: 'LinkedIn Follow-up Message',
      content: 'Спасибо за connection! Хотел поделиться...',
      type: 'linkedin',
      category: 'LinkedIn',
      isStarred: false,
      usageCount: 67,
      lastUsed: '2025-01-10',
      createdAt: '2024-12-05',
    },
  ];

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.content.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || template.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Шаблоны</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Управляйте шаблонами писем и сообщений
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Новый шаблон
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск шаблонов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`btn-secondary text-sm ${typeFilter === 'all' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : ''}`}
          >
            Все
          </button>
          <button
            onClick={() => setTypeFilter('email')}
            className={`btn-secondary text-sm ${typeFilter === 'email' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : ''}`}
          >
            <Mail className="mr-1 h-4 w-4" />
            Email
          </button>
          <button
            onClick={() => setTypeFilter('linkedin')}
            className={`btn-secondary text-sm ${typeFilter === 'linkedin' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : ''}`}
          >
            <Linkedin className="mr-1 h-4 w-4" />
            LinkedIn
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="card group hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${template.type === 'email' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-400'}`}>
            {template.type === 'email' ? <Mail className="h-5 w-5" /> : <Linkedin className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{template.name}</h3>
            <span className="text-xs text-gray-500">{template.category}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded p-1 text-gray-400 hover:text-yellow-500">
            {template.isStarred ? (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <Star className="h-4 w-4" />
            )}
          </button>
          <Menu as="div" className="relative">
            <Menu.Button className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <MoreHorizontal className="h-4 w-4" />
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
              <Menu.Items className="absolute right-0 z-10 mt-1 w-40 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                <Menu.Item>
                  {({ active }) => (
                    <button className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>
                      <Edit className="h-4 w-4" />
                      Редактировать
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>
                      <Copy className="h-4 w-4" />
                      Дублировать
                    </button>
                  )}
                </Menu.Item>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <Menu.Item>
                  {({ active }) => (
                    <button className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>
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

      {template.subject && (
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Тема:</span> {template.subject}
        </div>
      )}

      <div className="mt-2 line-clamp-3 text-sm text-gray-500 dark:text-gray-400">
        {template.content}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-700">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Использован {template.usageCount} раз
        </span>
        {template.lastUsed && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {template.lastUsed}
          </span>
        )}
      </div>
    </div>
  );
}