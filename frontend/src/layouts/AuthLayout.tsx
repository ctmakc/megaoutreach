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
              Personalized B2B outreach that gets responses
            </h1>
            <p className="text-lg text-primary-100">
              Send authentic, one-on-one emails and LinkedIn messages with AI-powered personalization.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-3xl font-bold">3x</div>
                <div className="text-sm text-primary-200">More Replies</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-3xl font-bold">10h</div>
                <div className="text-sm text-primary-200">Saved Weekly</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-3xl font-bold">98%</div>
                <div className="text-sm text-primary-200">Delivery Rate</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <div className="text-3xl font-bold">AI</div>
                <div className="text-sm text-primary-200">Personalization</div>
              </div>
            </div>
          </div>

          <div className="text-sm text-primary-200">
            © 2025 MegaOutreach. All rights reserved.
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
