import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Dumbbell,
  Shield
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { gym, profile, isAdmin } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Plans', href: '/plans', icon: CreditCard },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    ...(isAdmin ? [{ name: 'Admin Panel', href: '/admin', icon: Shield }] : []),
  ];

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white z-50 lg:hidden"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-8 w-8 text-indigo-600" />
                  <span className="text-xl font-bold text-gray-900">GymFlow</span>
                </div>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      location.pathname === item.href
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r">
        <div className="flex items-center h-16 px-6 border-b">
          <Dumbbell className="h-8 w-8 text-indigo-600" />
          <span className="ml-3 text-xl font-bold text-gray-900">GymFlow</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                location.pathname === item.href
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t space-y-4">
          <div className="px-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {gym?.name || 'My Gym'}
            </p>
            <p className="text-sm font-medium text-gray-600 truncate">
              {profile?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:pl-64 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              {navigation.find((n) => n.href === location.pathname)?.name || 'Dashboard'}
            </h1>
            <div className="hidden sm:block">
              <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                {gym?.name || 'GymFlow'}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
