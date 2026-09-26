import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Zap, FileText } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import CoverageMapPage from './pages/CoverageMapPage';
import TestGenerationPage from './pages/TestGenerationPage';
import ReportsPage from './pages/ReportsPage';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: '/',          label: 'Dashboard',    icon: <LayoutDashboard size={18} /> },
  { to: '/coverage',  label: 'Coverage Map', icon: <Map size={18} /> },
  { to: '/generate',  label: 'Generate',     icon: <Zap size={18} /> },
  { to: '/reports',   label: 'Reports',      icon: <FileText size={18} /> },
];

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex flex-col w-56 bg-gray-900 text-white flex-shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-700">
          <span className="text-2xl">🧪</span>
          <span className="text-lg font-semibold tracking-tight">TestForge</span>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                ].join(' ')
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">v0.1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/"         element={<DashboardPage />} />
          <Route path="/coverage" element={<CoverageMapPage />} />
          <Route path="/generate" element={<TestGenerationPage />} />
          <Route path="/reports"  element={<ReportsPage />} />
        </Routes>
      </main>
    </div>
  );
}
