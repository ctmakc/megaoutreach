import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Linkedin,
  Building,
  Trash2,
  Tag,
  UserPlus,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import { Menu, Transition, Dialog } from '@headlessui/react';
import { Fragment } from 'react';
import { fetcher, poster, deleter } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table';

interface Contact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  phone?: string;
  linkedinUrl?: string;
  status: 'active' | 'bounced' | 'unsubscribed' | 'complained';
  tags: string[];
  lastContactedAt?: string;
  createdAt: string;
}

interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
}

const columnHelper = createColumnHelper<Contact>();

export default function ContactsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showImportModal, setShowImportModal] = useState(searchParams.get('import') === 'true');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  const [filters, setFilters] = useState({
    status: '',
    tags: [] as string[],
    hasEmail: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search, filters],
    queryFn: () => fetcher<ContactsResponse>(`/contacts?search=${search}&status=${filters.status}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => poster('/contacts/bulk-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setRowSelection({});
      toast.success('Контакты удалены');
    },
  });

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        ),
      }),
      columnHelper.accessor((row) => `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.email, {
        id: 'name',
        header: 'Контакт',
        cell: ({ row }) => (
          <Link to={`/contacts/${row.original.id}`} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
              {row.original.firstName?.[0] || row.original.email[0].toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {row.original.firstName || row.original.lastName
                  ? `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim()
                  : row.original.email}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {row.original.email}
              </div>
            </div>
          </Link>
        ),
      }),
      columnHelper.accessor('company', {
        header: 'Компания',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.company ? (
              <>
                <Building className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-gray-900 dark:text-gray-100">{row.original.company}</div>
                  {row.original.title && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {row.original.title}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Статус',
        cell: ({ getValue }) => {
          const status = getValue();
          const statusConfig = {
            active: { label: 'Активный', class: 'badge-success' },
            bounced: { label: 'Bounce', class: 'badge-danger' },
            unsubscribed: { label: 'Отписан', class: 'badge-warning' },
            complained: { label: 'Жалоба', class: 'badge-danger' },
          };
          const config = statusConfig[status];
          return <span className={config.class}>{config.label}</span>;
        },
      }),
      columnHelper.accessor('tags', {
        header: 'Теги',
        cell: ({ getValue }) => {
          const tags = getValue();
          if (!tags?.length) return <span className="text-gray-400">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <span key={tag} className="badge-gray">
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="badge-gray">+{tags.length - 2}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('lastContactedAt', {
        header: 'Последний контакт',
        cell: ({ getValue }) => {
          const date = getValue();
          if (!date) return <span className="text-gray-400">Никогда</span>;
          return (
            <span className="text-gray-600 dark:text-gray-400">
              {new Date(date).toLocaleDateString('ru-RU')}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        cell: ({ row }) => (
          <Menu as="div" className="relative">
            <Menu.Button className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
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
                    <Link
                      to={`/contacts/${row.original.id}`}
                      className={`flex items-center gap-2 px-4 py-2 text-sm ${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      <Mail className="h-4 w-4" />
                      Написать письмо
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      <Tag className="h-4 w-4" />
                      Добавить тег
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
                      <UserPlus className="h-4 w-4" />
                      Добавить в кампанию
                    </button>
                  )}
                </Menu.Item>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => deleteMutation.mutate([row.original.id])}
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
        ),
      }),
    ],
    [deleteMutation]
  );

  // Mock data
  const mockContacts: Contact[] = [
    {
      id: '1',
      email: 'ivan.petrov@company.ru',
      firstName: 'Иван',
      lastName: 'Петров',
      company: 'ООО Технологии',
      title: 'CTO',
      status: 'active',
      tags: ['Enterprise', 'Tech'],
      lastContactedAt: '2025-01-10T10:00:00Z',
      createdAt: '2024-12-01T00:00:00Z',
    },
    {
      id: '2',
      email: 'maria.ivanova@corp.io',
      firstName: 'Мария',
      lastName: 'Иванова',
      company: 'Corp Solutions',
      title: 'Head of Sales',
      status: 'active',
      tags: ['Sales', 'B2B'],
      createdAt: '2024-12-15T00:00:00Z',
    },
    {
      id: '3',
      email: 'alex@startup.com',
      firstName: 'Алексей',
      company: 'StartupHub',
      title: 'Founder',
      status: 'bounced',
      tags: ['Startup'],
      createdAt: '2024-11-20T00:00:00Z',
    },
    {
      id: '4',
      email: 'dmitry.sidorov@mega.ru',
      firstName: 'Дмитрий',
      lastName: 'Сидоров',
      company: 'MegaCorp',
      title: 'VP Engineering',
      status: 'active',
      tags: ['Enterprise', 'Engineering'],
      lastContactedAt: '2025-01-08T14:30:00Z',
      createdAt: '2024-10-05T00:00:00Z',
    },
    {
      id: '5',
      email: 'elena@fintech.io',
      firstName: 'Елена',
      lastName: 'Козлова',
      company: 'FinTech Pro',
      title: 'Product Manager',
      status: 'unsubscribed',
      tags: ['Fintech', 'Product'],
      createdAt: '2024-09-12T00:00:00Z',
    },
  ];

  const contacts = data?.contacts || mockContacts;

  const table = useReactTable({
    data: contacts,
    columns,
    state: {
      sorting,
      rowSelection,
      globalFilter: search,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Контакты
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {data?.total || contacts.length} контактов в базе
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowImportModal(true)} className="btn-secondary">
            <Upload className="mr-2 h-4 w-4" />
            Импорт
          </button>
          <button className="btn-secondary">
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            Добавить
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по имени, email или компании..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`btn-secondary ${showFilterPanel ? 'bg-primary-50 text-primary-700 dark:bg-primary-900' : ''}`}
            >
              <Filter className="mr-2 h-4 w-4" />
              Фильтры
              {(filters.status || filters.tags.length > 0) && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                  {(filters.status ? 1 : 0) + filters.tags.length}
                </span>
              )}
            </button>
            <Menu as="div" className="relative">
              <Menu.Button className="btn-secondary">
                Статус
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
                  {['', 'active', 'bounced', 'unsubscribed'].map((status) => (
                    <Menu.Item key={status}>
                      {({ active }) => (
                        <button
                          onClick={() => setFilters({ ...filters, status })}
                          className={`flex w-full items-center justify-between px-4 py-2 text-sm ${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          }`}
                        >
                          {status === '' ? 'Все' : status === 'active' ? 'Активные' : status === 'bounced' ? 'Bounce' : 'Отписанные'}
                          {filters.status === status && <Check className="h-4 w-4 text-primary-600" />}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <div className="mt-4 flex items-center gap-4 rounded-lg bg-primary-50 p-3 dark:bg-primary-900/50">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              Выбрано: {selectedCount}
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary text-sm py-1.5">
                <Tag className="mr-1.5 h-4 w-4" />
                Добавить тег
              </button>
              <button className="btn-secondary text-sm py-1.5">
                <UserPlus className="mr-1.5 h-4 w-4" />
                В кампанию
              </button>
              <button
                onClick={() => {
                  const ids = Object.keys(rowSelection);
                  deleteMutation.mutate(ids);
                }}
                className="btn-danger text-sm py-1.5"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Удалить
              </button>
            </div>
            <button
              onClick={() => setRowSelection({})}
              className="ml-auto text-sm text-primary-600 hover:text-primary-500"
            >
              Снять выделение
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Показано {table.getRowModel().rows.length} из {contacts.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="btn-secondary py-1.5 text-sm disabled:opacity-50"
            >
              Назад
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="btn-secondary py-1.5 text-sm disabled:opacity-50"
            >
              Далее
            </button>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <ImportContactsModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setSearchParams({});
        }}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}

// Import Contacts Modal
function ImportContactsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      setFile(droppedFile);
    } else {
      toast.error('Пожалуйста, загрузите CSV файл');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // await api.post('/contacts/import', formData);
      toast.success('Контакты успешно импортированы');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onClose();
    } catch (error) {
      toast.error('Ошибка импорта');
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                  Импорт контактов
                </Dialog.Title>

                <div className="mt-4">
                  <div
                    className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    {file ? (
                      <div className="flex items-center justify-center gap-2">
                        <Check className="h-5 w-5 text-green-500" />
                        <span className="font-medium">{file.name}</span>
                        <button
                          onClick={() => setFile(null)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Перетащите CSV файл сюда или{' '}
                          <label className="cursor-pointer text-primary-600 hover:text-primary-500">
                            выберите файл
                            <input
                              type="file"
                              accept=".csv"
                              className="hidden"
                              onChange={handleFileSelect}
                            />
                          </label>
                        </p>
                      </>
                    )}
                  </div>

                  <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Формат CSV
                    </h4>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Файл должен содержать колонки: email, first_name, last_name, company, title
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={onClose} className="btn-secondary">
                    Отмена
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!file}
                    className="btn-primary disabled:opacity-50"
                  >
                    Импортировать
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Add Contact Modal
function AddContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    title: '',
    linkedinUrl: '',
  });
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // await poster('/contacts', formData);
      toast.success('Контакт добавлен');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onClose();
      setFormData({ email: '', firstName: '', lastName: '', company: '', title: '', linkedinUrl: '' });
    } catch (error) {
      toast.error('Ошибка добавления контакта');
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                  Добавить контакт
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="label">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input mt-1"
                      placeholder="email@company.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Имя</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="input mt-1"
                        placeholder="Иван"
                      />
                    </div>
                    <div>
                      <label className="label">Фамилия</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="input mt-1"
                        placeholder="Петров"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Компания</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="input mt-1"
                      placeholder="ООО Компания"
                    />
                  </div>

                  <div>
                    <label className="label">Должность</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="input mt-1"
                      placeholder="CTO"
                    />
                  </div>

                  <div>
                    <label className="label">LinkedIn URL</label>
                    <input
                      type="url"
                      value={formData.linkedinUrl}
                      onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                      className="input mt-1"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary">
                      Отмена
                    </button>
                    <button type="submit" className="btn-primary">
                      Добавить
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}