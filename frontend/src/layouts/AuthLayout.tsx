import { Outlet, Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 p-12 text-white">
        <div className="flex flex-col justify-between">
          <div>
            <Link to="/" className="flex items-center gap-2 text-2xl font-bold">
              <Zap className="h-8 w-8" />
              OutreachPro
            </Link>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Автоматизируйте B2B outreach и увеличьте продажи
            </h1>
            <p className="text-lg text-primary-100">
              Email-кампании, LinkedIn автоматизация, AI-генерация контента — всё в одном месте.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-3xl font-bold">300%</div>
                <div className="text-sm text-primary-200">Рост ответов</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-3xl font-bold">5x</div>
                <div className="text-sm text-primary-200">Экономия времени</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-3xl font-bold">10k+</div>
                <div className="text-sm text-primary-200">Активных пользователей</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-3xl font-bold">AI</div>
                <div className="text-sm text-primary-200">Персонализация</div>
              </div>
            </div>
          </div>

          <div className="text-sm text-primary-200">
            © 2025 OutreachPro. Все права защищены.
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary-600">
              <Zap className="h-8 w-8" />
              OutreachPro
            </Link>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
