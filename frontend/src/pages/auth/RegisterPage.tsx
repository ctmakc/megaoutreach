import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Sparkles, Mail, Lock, User, Building2, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    password: '',
    agreeTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreeTerms) {
      toast.error('Необходимо согласиться с условиями');
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.name, formData.email, formData.password);
      toast.success('Аккаунт создан!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { label: 'Минимум 8 символов', met: formData.password.length >= 8 },
    { label: 'Заглавная буква', met: /[A-Z]/.test(formData.password) },
    { label: 'Цифра', met: /[0-9]/.test(formData.password) },
  ];

  return (
    <>
      {/* Logo - Mobile */}
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">SalesPilot</span>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Создать аккаунт
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            Войти
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Имя
          </label>
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input pl-10"
              placeholder="Иван Петров"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Рабочий email
          </label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input pl-10"
              placeholder="ivan@company.ru"
            />
          </div>
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Компания
          </label>
          <div className="relative mt-1">
            <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="company"
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="input pl-10"
              placeholder="Название компании"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Пароль
          </label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input pl-10 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          
          {/* Password requirements */}
          {formData.password && (
            <div className="mt-2 space-y-1">
              {passwordRequirements.map((req) => (
                <div key={req.label} className="flex items-center gap-2 text-xs">
                  <Check className={`h-4 w-4 ${req.met ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={req.met ? 'text-green-600' : 'text-gray-500'}>{req.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={formData.agreeTerms}
            onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Я согласен с{' '}
            <a href="#" className="text-primary-600 hover:text-primary-500">
              Условиями использования
            </a>{' '}
            и{' '}
            <a href="#" className="text-primary-600 hover:text-primary-500">
              Политикой конфиденциальности
            </a>
          </span>
        </label>

        <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              Создать аккаунт
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </>
  );
}