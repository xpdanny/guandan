
import React from 'react';
import { ICONS } from '../constants';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: '仪表盘', icon: <ICONS.Dashboard /> },
    { id: 'devices', label: '设备管理', icon: <ICONS.Devices /> },
    { id: 'users', label: '用户管理', icon: <ICONS.Users /> },
    { id: 'settings', label: '系统设置', icon: <ICONS.Settings /> },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-900 text-white flex-shrink-0 flex flex-col hidden lg:flex">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-indigo-600 transform rotate-45" />
            </div>
            掼蛋智能管理
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-indigo-800 text-white shadow-inner' : 'text-indigo-200 hover:bg-indigo-800/50'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 bg-indigo-950/50">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-white border-2 border-indigo-400">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.username}</p>
              <p className="text-xs text-indigo-300">{user?.role === 'admin' ? '超级管理员' : '操作员'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-indigo-300 hover:text-white py-2 rounded-lg border border-indigo-700/50 hover:border-white/50 transition-colors"
          >
            退出系统
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="lg:hidden flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-white transform rotate-45" />
            </div>
            <span className="font-bold text-indigo-900">掼蛋发牌</span>
          </div>
          
          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-slate-600">服务运行中</span>
            </div>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Message Inspector (底部) */}
        <div className="flex-shrink-0">
          {/* 延迟加载，避免 SSR/环境问题 */}
          <React.Suspense fallback={null}>
            <MessageInspectorWrapper />
          </React.Suspense>
        </div>
      </main>
    </div>
  );
};

export default Layout;

// 包装以延迟导入 MessageInspector，避免模块循环
const MessageInspectorWrapper: React.FC = () => {
  const [Loaded, setLoaded] = React.useState<React.FC | null>(null);
  React.useEffect(() => {
    let mounted = true;
    import('./MessageInspector').then(mod => { if (mounted) setLoaded(() => mod.default); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!Loaded) return null;
  const Cmp = Loaded;
  return <Cmp />;
};
