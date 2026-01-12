import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Play,
  Mail,
  Linkedin,
  Clock,
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  Eye,
  Settings,
  Users,
  Calendar,
  ChevronDown,
  Check,
  Wand2,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { fetcher, poster } from '@/lib/api';
import toast from 'react-hot-toast';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { Fragment } from 'react';

interface CampaignStep {
  id: string;
  type: 'email' | 'linkedin_connect' | 'linkedin_message' | 'delay' | 'condition';
  order: number;
  config: {
    subject?: string;
    body?: string;
    delayDays?: number;
    delayHours?: number;
    condition?: {
      type: 'opened' | 'clicked' | 'replied' | 'not_opened' | 'not_replied';
      value?: string;
    };
    variants?: Array<{
      id: string;
      subject: string;
      body: string;
      weight: number;
    }>;
  };
}

interface CampaignData {
  name: string;
  type: 'email' | 'linkedin' | 'multichannel';
  contactListIds: string[];
  excludeListIds: string[];
  senderAccountId: string;
  schedule: {
    timezone: string;
    sendingDays: number[];
    sendingHoursStart: number;
    sendingHoursEnd: number;
    dailyLimit: number;
  };
  steps: CampaignStep[];
  settings: {
    trackOpens: boolean;
    trackClicks: boolean;
    stopOnReply: boolean;
    unsubscribeLink: boolean;
  };
}

const defaultStep: Omit<CampaignStep, 'id' | 'order'> = {
  type: 'email',
  config: {
    subject: '',
    body: '',
  },
};

const STEPS = ['Основное', 'Контакты', 'Последовательность', 'Расписание', 'Обзор'];

export default function CampaignBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [currentStep, setCurrentStep] = useState(0);
  const [campaign, setCampaign] = useState<CampaignData>({
    name: '',
    type: 'email',
    contactListIds: [],
    excludeListIds: [],
    senderAccountId: '',
    schedule: {
      timezone: 'Europe/Moscow',
      sendingDays: [1, 2, 3, 4, 5],
      sendingHoursStart: 9,
      sendingHoursEnd: 18,
      dailyLimit: 50,
    },
    steps: [
      {
        id: '1',
        type: 'email',
        order: 0,
        config: {
          subject: '',
          body: '',
        },
      },
    ],
    settings: {
      trackOpens: true,
      trackClicks: true,
      stopOnReply: true,
      unsubscribeLink: true,
    },
  });

  const [selectedStepId, setSelectedStepId] = useState<string | null>('1');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Load existing campaign if editing
  const { data: existingCampaign } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => fetcher<CampaignData>(`/campaigns/${id}`),
    enabled: isEditing,
  });

  const saveMutation = useMutation({
    mutationFn: (data: CampaignData) =>
      isEditing ? poster(`/campaigns/${id}`, data) : poster('/campaigns', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(isEditing ? 'Кампания обновлена' : 'Кампания создана');
      navigate('/campaigns');
    },
    onError: () => {
      toast.error('Ошибка сохранения');
    },
  });

  const launchMutation = useMutation({
    mutationFn: (data: CampaignData) => poster('/campaigns/launch', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Кампания запущена!');
      navigate('/campaigns');
    },
  });

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    setCampaign((prev) => {
      const steps = [...prev.steps];
      const [removed] = steps.splice(result.source.index, 1);
      steps.splice(result.destination!.index, 0, removed);
      return {
        ...prev,
        steps: steps.map((step, index) => ({ ...step, order: index })),
      };
    });
  }, []);

  const addStep = (type: CampaignStep['type']) => {
    const newStep: CampaignStep = {
      id: `step-${Date.now()}`,
      type,
      order: campaign.steps.length,
      config:
        type === 'delay'
          ? { delayDays: 2, delayHours: 0 }
          : type === 'email'
          ? { subject: '', body: '' }
          : {},
    };
    setCampaign((prev) => ({ ...prev, steps: [...prev.steps, newStep] }));
    setSelectedStepId(newStep.id);
  };

  const removeStep = (stepId: string) => {
    setCampaign((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i })),
    }));
    if (selectedStepId === stepId) {
      setSelectedStepId(campaign.steps[0]?.id || null);
    }
  };

  const updateStep = (stepId: string, updates: Partial<CampaignStep['config']>) => {
    setCampaign((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId ? { ...s, config: { ...s.config, ...updates } } : s
      ),
    }));
  };

  const selectedStep = campaign.steps.find((s) => s.id === selectedStepId);

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return campaign.name.trim() !== '';
      case 1:
        return campaign.contactListIds.length > 0 || true; // Allow for demo
      case 2:
        return campaign.steps.length > 0 && campaign.steps.some((s) => s.type === 'email' || s.type === 'linkedin_message');
      case 3:
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/campaigns')}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {isEditing ? 'Редактирование кампании' : 'Новая кампания'}
              </h1>
              {campaign.name && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{campaign.name}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => saveMutation.mutate(campaign)} className="btn-secondary">
              <Save className="mr-2 h-4 w-4" />
              Сохранить черновик
            </button>
            {currentStep === STEPS.length - 1 && (
              <button onClick={() => launchMutation.mutate(campaign)} className="btn-primary">
                <Play className="mr-2 h-4 w-4" />
                Запустить кампанию
              </button>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className="flex flex-1 items-center"
                onClick={() => index < currentStep && setCurrentStep(index)}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    index < currentStep
                      ? 'cursor-pointer bg-primary-600 text-white'
                      : index === currentStep
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                  }`}
                >
                  {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    index <= currentStep
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-4 h-0.5 flex-1 ${
                      index < currentStep
                        ? 'bg-primary-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6 dark:bg-gray-900">
        {currentStep === 0 && (
          <BasicInfoStep campaign={campaign} setCampaign={setCampaign} />
        )}
        {currentStep === 1 && (
          <ContactsStep campaign={campaign} setCampaign={setCampaign} />
        )}
        {currentStep === 2 && (
          <SequenceStep
            campaign={campaign}
            selectedStep={selectedStep}
            selectedStepId={selectedStepId}
            setSelectedStepId={setSelectedStepId}
            addStep={addStep}
            removeStep={removeStep}
            updateStep={updateStep}
            onDragEnd={handleDragEnd}
            onAIGenerate={() => setShowAIModal(true)}
            onPreview={() => setShowPreviewModal(true)}
          />
        )}
        {currentStep === 3 && (
          <ScheduleStep campaign={campaign} setCampaign={setCampaign} />
        )}
        {currentStep === 4 && <ReviewStep campaign={campaign} />}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 0}
            className="btn-secondary disabled:opacity-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </button>
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={currentStep === STEPS.length - 1 || !canProceed()}
            className="btn-primary disabled:opacity-50"
          >
            Далее
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      </div>

      {/* AI Modal */}
      <AIGeneratorModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={(subject, body) => {
          if (selectedStepId) {
            updateStep(selectedStepId, { subject, body });
          }
          setShowAIModal(false);
        }}
      />

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        step={selectedStep}
      />
    </div>
  );
}

// Step 1: Basic Info
function BasicInfoStep({
  campaign,
  setCampaign,
}: {
  campaign: CampaignData;
  setCampaign: React.Dispatch<React.SetStateAction<CampaignData>>;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Основная информация
        </h2>

        <div className="space-y-6">
          <div>
            <label className="label">Название кампании *</label>
            <input
              type="text"
              value={campaign.name}
              onChange={(e) => setCampaign((c) => ({ ...c, name: e.target.value }))}
              className="input mt-1"
              placeholder="Например: Q1 Enterprise Outreach"
            />
          </div>

          <div>
            <label className="label">Тип кампании</label>
            <div className="mt-2 grid grid-cols-3 gap-4">
              {[
                { type: 'email', icon: Mail, label: 'Email', desc: 'Только email рассылка' },
                { type: 'linkedin', icon: Linkedin, label: 'LinkedIn', desc: 'LinkedIn outreach' },
                { type: 'multichannel', icon: Settings, label: 'Мультиканал', desc: 'Email + LinkedIn' },
              ].map(({ type, icon: Icon, label, desc }) => (
                <button
                  key={type}
                  onClick={() => setCampaign((c) => ({ ...c, type: type as CampaignData['type'] }))}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    campaign.type === type
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      campaign.type === type ? 'text-primary-600' : 'text-gray-400'
                    }`}
                  />
                  <div className="mt-2 font-medium text-gray-900 dark:text-gray-100">{label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Аккаунт отправителя</label>
            <select
              value={campaign.senderAccountId}
              onChange={(e) => setCampaign((c) => ({ ...c, senderAccountId: e.target.value }))}
              className="input mt-1"
            >
              <option value="">Выберите аккаунт...</option>
              <option value="1">ivan@company.ru (SMTP)</option>
              <option value="2">sales@company.ru (Google)</option>
              <option value="3">LinkedIn - Ivan Petrov</option>
            </select>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Настройки отслеживания</h4>
            <div className="mt-3 space-y-2">
              {[
                { key: 'trackOpens', label: 'Отслеживать открытия' },
                { key: 'trackClicks', label: 'Отслеживать клики' },
                { key: 'stopOnReply', label: 'Останавливать при ответе' },
                { key: 'unsubscribeLink', label: 'Добавлять ссылку отписки' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={campaign.settings[key as keyof typeof campaign.settings]}
                    onChange={(e) =>
                      setCampaign((c) => ({
                        ...c,
                        settings: { ...c.settings, [key]: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Contacts Selection
function ContactsStep({
  campaign,
  setCampaign,
}: {
  campaign: CampaignData;
  setCampaign: React.Dispatch<React.SetStateAction<CampaignData>>;
}) {
  const mockLists = [
    { id: '1', name: 'Enterprise Leads', count: 2450 },
    { id: '2', name: 'Tech Startups', count: 1230 },
    { id: '3', name: 'Marketing Directors', count: 890 },
    { id: '4', name: 'Recently Imported', count: 500 },
  ];

  const toggleList = (listId: string) => {
    setCampaign((c) => ({
      ...c,
      contactListIds: c.contactListIds.includes(listId)
        ? c.contactListIds.filter((id) => id !== listId)
        : [...c.contactListIds, listId],
    }));
  };

  const selectedCount = mockLists
    .filter((l) => campaign.contactListIds.includes(l.id))
    .reduce((sum, l) => sum + l.count, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Выберите контакты
        </h2>

        <div className="space-y-4">
          {mockLists.map((list) => (
            <div
              key={list.id}
              onClick={() => toggleList(list.id)}
              className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-colors ${
                campaign.contactListIds.includes(list.id)
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                    campaign.contactListIds.includes(list.id)
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-gray-300'
                  }`}
                >
                  {campaign.contactListIds.includes(list.id) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{list.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>{list.count.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {selectedCount > 0 && (
          <div className="mt-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900 dark:text-green-100">
                Выбрано {selectedCount.toLocaleString()} контактов
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 3: Sequence Builder
function SequenceStep({
  campaign,
  selectedStep,
  selectedStepId,
  setSelectedStepId,
  addStep,
  removeStep,
  updateStep,
  onDragEnd,
  onAIGenerate,
  onPreview,
}: {
  campaign: CampaignData;
  selectedStep?: CampaignStep;
  selectedStepId: string | null;
  setSelectedStepId: (id: string | null) => void;
  addStep: (type: CampaignStep['type']) => void;
  removeStep: (id: string) => void;
  updateStep: (id: string, updates: Partial<CampaignStep['config']>) => void;
  onDragEnd: (result: DropResult) => void;
  onAIGenerate: () => void;
  onPreview: () => void;
}) {
  const stepIcons = {
    email: Mail,
    linkedin_connect: Linkedin,
    linkedin_message: Linkedin,
    delay: Clock,
    condition: Settings,
  };

  const stepLabels = {
    email: 'Email',
    linkedin_connect: 'LinkedIn Connect',
    linkedin_message: 'LinkedIn Message',
    delay: 'Задержка',
    condition: 'Условие',
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Steps List */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Последовательность
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => addStep('email')}
              className="btn-secondary text-sm py-1.5"
            >
              <Mail className="mr-1.5 h-4 w-4" />
              Email
            </button>
            <button
              onClick={() => addStep('delay')}
              className="btn-secondary text-sm py-1.5"
            >
              <Clock className="mr-1.5 h-4 w-4" />
              Задержка
            </button>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="steps">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {campaign.steps.map((step, index) => {
                  const Icon = stepIcons[step.type];
                  return (
                    <Draggable key={step.id} draggableId={step.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onClick={() => setSelectedStepId(step.id)}
                          className={`flex items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                            selectedStepId === step.id
                              ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                          } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab">
                            <GripVertical className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                            <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {stepLabels[step.type]}
                            </div>
                            {step.type === 'email' && step.config.subject && (
                              <div className="text-sm text-gray-500 truncate">
                                {step.config.subject}
                              </div>
                            )}
                            {step.type === 'delay' && (
                              <div className="text-sm text-gray-500">
                                {step.config.delayDays} дн. {step.config.delayHours} ч.
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeStep(step.id);
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {campaign.steps.length === 0 && (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            Добавьте первый шаг кампании
          </div>
        )}
      </div>

      {/* Step Editor */}
      <div className="card">
        {selectedStep ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Редактирование шага
              </h2>
              <div className="flex gap-2">
                <button onClick={onPreview} className="btn-secondary text-sm py-1.5">
                  <Eye className="mr-1.5 h-4 w-4" />
                  Предпросмотр
                </button>
                {selectedStep.type === 'email' && (
                  <button onClick={onAIGenerate} className="btn-primary text-sm py-1.5">
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    AI Генерация
                  </button>
                )}
              </div>
            </div>

            {selectedStep.type === 'email' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Тема письма</label>
                  <input
                    type="text"
                    value={selectedStep.config.subject || ''}
                    onChange={(e) => updateStep(selectedStep.id, { subject: e.target.value })}
                    className="input mt-1"
                    placeholder="{{firstName}}, у меня есть идея для {{company}}"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Используйте {'{{переменные}}'} для персонализации
                  </p>
                </div>
                <div>
                  <label className="label">Текст письма</label>
                  <textarea
                    rows={12}
                    value={selectedStep.config.body || ''}
                    onChange={(e) => updateStep(selectedStep.id, { body: e.target.value })}
                    className="input mt-1 font-mono text-sm"
                    placeholder="Привет {{firstName}}!&#10;&#10;Я заметил, что {{company}} работает в сфере..."
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {['{{firstName}}', '{{lastName}}', '{{company}}', '{{title}}'].map((variable) => (
                    <button
                      key={variable}
                      onClick={() => {
                        const body = (selectedStep.config.body || '') + variable;
                        updateStep(selectedStep.id, { body });
                      }}
                      className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                    >
                      {variable}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedStep.type === 'delay' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Дни</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedStep.config.delayDays || 0}
                      onChange={(e) =>
                        updateStep(selectedStep.id, { delayDays: parseInt(e.target.value) })
                      }
                      className="input mt-1"
                    />
                  </div>
                  <div>
                    <label className="label">Часы</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={selectedStep.config.delayHours || 0}
                      onChange={(e) =>
                        updateStep(selectedStep.id, { delayHours: parseInt(e.target.value) })
                      }
                      className="input mt-1"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Пауза между этим и следующим шагом
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            Выберите шаг для редактирования
          </div>
        )}
      </div>
    </div>
  );
}

// Step 4: Schedule
function ScheduleStep({
  campaign,
  setCampaign,
}: {
  campaign: CampaignData;
  setCampaign: React.Dispatch<React.SetStateAction<CampaignData>>;
}) {
  const daysOfWeek = [
    { value: 1, label: 'Пн' },
    { value: 2, label: 'Вт' },
    { value: 3, label: 'Ср' },
    { value: 4, label: 'Чт' },
    { value: 5, label: 'Пт' },
    { value: 6, label: 'Сб' },
    { value: 0, label: 'Вс' },
  ];

  const toggleDay = (day: number) => {
    setCampaign((c) => ({
      ...c,
      schedule: {
        ...c.schedule,
        sendingDays: c.schedule.sendingDays.includes(day)
          ? c.schedule.sendingDays.filter((d) => d !== day)
          : [...c.schedule.sendingDays, day].sort(),
      },
    }));
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Расписание отправки
        </h2>

        <div className="space-y-6">
          <div>
            <label className="label">Часовой пояс</label>
            <select
              value={campaign.schedule.timezone}
              onChange={(e) =>
                setCampaign((c) => ({
                  ...c,
                  schedule: { ...c.schedule, timezone: e.target.value },
                }))
              }
              className="input mt-1"
            >
              <option value="Europe/Moscow">Москва (UTC+3)</option>
              <option value="Europe/Kiev">Киев (UTC+2)</option>
              <option value="Asia/Almaty">Алматы (UTC+6)</option>
            </select>
          </div>

          <div>
            <label className="label">Дни отправки</label>
            <div className="mt-2 flex gap-2">
              {daysOfWeek.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleDay(value)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg font-medium transition-colors ${
                    campaign.schedule.sendingDays.includes(value)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Начало (часы)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={campaign.schedule.sendingHoursStart}
                onChange={(e) =>
                  setCampaign((c) => ({
                    ...c,
                    schedule: { ...c.schedule, sendingHoursStart: parseInt(e.target.value) },
                  }))
                }
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Конец (часы)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={campaign.schedule.sendingHoursEnd}
                onChange={(e) =>
                  setCampaign((c) => ({
                    ...c,
                    schedule: { ...c.schedule, sendingHoursEnd: parseInt(e.target.value) },
                  }))
                }
                className="input mt-1"
              />
            </div>
          </div>

          <div>
            <label className="label">Дневной лимит</label>
            <input
              type="number"
              min="1"
              max="500"
              value={campaign.schedule.dailyLimit}
              onChange={(e) =>
                setCampaign((c) => ({
                  ...c,
                  schedule: { ...c.schedule, dailyLimit: parseInt(e.target.value) },
                }))
              }
              className="input mt-1"
            />
            <p className="mt-1 text-sm text-gray-500">
              Максимальное количество писем в день
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 5: Review
function ReviewStep({ campaign }: { campaign: CampaignData }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Обзор кампании
        </h2>

        <div className="space-y-6">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Основное</h3>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Название</dt>
                <dd className="text-gray-900 dark:text-gray-100">{campaign.name || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Тип</dt>
                <dd className="text-gray-900 dark:text-gray-100 capitalize">{campaign.type}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Последовательность</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {campaign.steps.length} шагов
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {campaign.steps.map((step, index) => (
                <li key={step.id} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs dark:bg-gray-600">
                    {index + 1}
                  </span>
                  {step.type === 'email' && `Email: ${step.config.subject || 'Без темы'}`}
                  {step.type === 'delay' && `Задержка: ${step.config.delayDays}д ${step.config.delayHours}ч`}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Расписание</h3>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Часовой пояс</dt>
                <dd className="text-gray-900 dark:text-gray-100">{campaign.schedule.timezone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Часы отправки</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {campaign.schedule.sendingHoursStart}:00 - {campaign.schedule.sendingHoursEnd}:00
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Дневной лимит</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {campaign.schedule.dailyLimit} писем
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  Кампания готова к запуску
                </h4>
                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                  Нажмите "Запустить кампанию" чтобы начать отправку
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// AI Generator Modal
function AIGeneratorModal({
  isOpen,
  onClose,
  onGenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (subject: string, body: string) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    onGenerate(
      '{{firstName}}, идея для {{company}} по увеличению продаж',
      `Привет {{firstName}}!

Меня зовут Иван, и я помогаю компаниям вроде {{company}} увеличивать продажи с помощью автоматизации.

Я заметил, что вы работаете в сфере ${prompt || 'технологий'}, и у меня есть несколько идей, которые могут быть вам полезны.

Будет ли у вас 15 минут на этой неделе для короткого звонка?

С уважением,
Иван`
    );
    setIsGenerating(false);
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
                <Dialog.Title className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                  <Wand2 className="h-5 w-5 text-primary-600" />
                  AI Генератор писем
                </Dialog.Title>

                <div className="mt-4">
                  <label className="label">Опишите ваше предложение</label>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="input mt-1"
                    placeholder="Мы предлагаем SaaS решение для автоматизации email рассылок. Целевая аудитория - B2B компании..."
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <label className="label">Тон письма</label>
                  <div className="flex gap-2">
                    {['Формальный', 'Дружелюбный', 'Прямой'].map((tone) => (
                      <button key={tone} className="badge-gray cursor-pointer hover:bg-gray-200">
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={onClose} className="btn-secondary">
                    Отмена
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="btn-primary"
                  >
                    {isGenerating ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Генерация...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Сгенерировать
                      </>
                    )}
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

// Preview Modal
function PreviewModal({
  isOpen,
  onClose,
  step,
}: {
  isOpen: boolean;
  onClose: () => void;
  step?: CampaignStep;
}) {
  const mockData = {
    firstName: 'Алексей',
    lastName: 'Петров',
    company: 'TechCorp',
    title: 'CTO',
  };

  const replaceVariables = (text: string) => {
    return text
      .replace(/\{\{firstName\}\}/g, mockData.firstName)
      .replace(/\{\{lastName\}\}/g, mockData.lastName)
      .replace(/\{\{company\}\}/g, mockData.company)
      .replace(/\{\{title\}\}/g, mockData.title);
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all dark:bg-gray-800">
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                  <Dialog.Title className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                    <Eye className="h-5 w-5" />
                    Предпросмотр письма
                  </Dialog.Title>
                </div>

                {step?.type === 'email' && (
                  <div className="p-6">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700">
                        <div className="text-sm text-gray-500">Тема:</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {replaceVariables(step.config.subject || '')}
                        </div>
                      </div>
                      <div className="p-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {replaceVariables(step.config.body || '')}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                  <button onClick={onClose} className="btn-secondary w-full">
                    Закрыть
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