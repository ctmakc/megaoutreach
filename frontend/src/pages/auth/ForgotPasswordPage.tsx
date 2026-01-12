import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsSent(true);
    setIsLoading(false);
    toast.success('Письмо отправлено!');
  };

  if (isSent) {
    return (
      <>
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">SalesPilot</span>
        </div>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Проверьте почту
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Мы отправили инструкции для восстановления пароля на {email}
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Вернуться к входу
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">SalesPilot</span>
      </div>

      <div>
        <Link
          to="/login"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
          Восстановить пароль
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Введите email, указанный при регистрации
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-10"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            'Отправить инструкции'
          )}
        </button>
      </form>
    </>
  );
}