import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Outlet />
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="relative hidden flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
          <div className="relative flex h-full flex-col items-center justify-center p-12 text-white">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Sparkles className="h-10 w-10" />
              </div>
              <span className="text-4xl font-bold">SalesPilot</span>
            </div>
            <h2 className="mb-4 text-center text-3xl font-bold">
              Автоматизация продаж<br />нового поколения
            </h2>
            <p className="max-w-md text-center text-lg text-primary-100">
              AI-powered платформа для холодных email и LinkedIn outreach. 
              Увеличьте конверсию в 3 раза с персонализированными кампаниями.
            </p>
            
            {/* Features */}
            <div className="mt-12 grid grid-cols-2 gap-6">
              <Feature title="Email Sequences" description="Мультишаговые кампании" />
              <Feature title="LinkedIn Automation" description="Автоматические коннекты" />
              <Feature title="AI Personalization" description="Персонализация писем" />
              <Feature title="Smart Analytics" description="Детальная аналитика" />
            </div>

            {/* Testimonial */}
            <div className="mt-12 rounded-xl bg-white/10 p-6 backdrop-blur">
              <p className="italic text-primary-100">
                "SalesPilot увеличил наш reply rate с 2% до 12%. 
                Это лучший инструмент для B2B outreach на рынке."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20" />
                <div>
                  <div className="font-medium">Алексей Петров</div>
                  <div className="text-sm text-primary-200">CEO, TechStartup</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-primary-200">{description}</div>
    </div>
  );
}