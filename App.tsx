
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import { Device, AuthState, DeviceStatus, Group } from './types';
import { generateMockDevices } from './services/mockData';
import { ICONS } from './constants';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize data
  useEffect(() => {
    const initialDevices = generateMockDevices(200);
    setDevices(initialDevices);
    
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setAuth({
        isAuthenticated: true,
        user: JSON.parse(savedUser)
      });
    }
  }, []);

  const handleLogin = (username: string) => {
    const user = { 
      id: '1', 
      username, 
      role: 'super_admin' as const, 
      createdAt: new Date().toISOString(), 
      status: 'active' as const 
    };
    setAuth({ isAuthenticated: true, user });
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setAuth({ isAuthenticated: false, user: null });
    localStorage.removeItem('user');
  };

  const handleUpdateDevices = useCallback((ids: string[], updates: Partial<Device>) => {
    setIsLoading(true);
    setTimeout(() => {
      setDevices(prev => 
        prev.map(d => ids.includes(d.id) ? { ...d, ...updates } : d)
      );
      setIsLoading(false);
      
      if (updates.status === DeviceStatus.BUSY) {
        setTimeout(() => {
          setDevices(prev => 
            prev.map(d => ids.includes(d.id) ? { ...d, status: DeviceStatus.ONLINE, currentRound: Math.min(d.currentRound + 1, d.config.gameRounds) } : d)
          );
        }, 8000);
      }
    }, 500);
  }, []);

  const handleAddGroup = (name: string, deviceIds: string[]) => {
    const newGroup: Group = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      deviceCount: deviceIds.length
    };
    setGroups([...groups, newGroup]);
    setDevices(prev => prev.map(d => deviceIds.includes(d.id) ? { ...d, groupId: newGroup.id } : d));
  };

  const handleUpdateGroupName = (id: string, name: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g));
  };

  if (!auth.isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout
      user={auth.user}
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-indigo-100 overflow-hidden z-[110]">
          <div className="h-full bg-indigo-600 animate-[loading_1s_infinite_ease-in-out]" style={{ width: '40%' }} />
        </div>
      )}
      
      {activeTab === 'dashboard' || activeTab === 'devices' ? (
        <Dashboard 
          devices={devices} 
          groups={groups}
          onUpdateDevices={handleUpdateDevices} 
          onAddGroup={handleAddGroup}
          onUpdateGroupName={handleUpdateGroupName}
        />
      ) : activeTab === 'users' ? (
        <UserManagement />
      ) : (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
             <ICONS.Settings />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">功能建设中</h2>
          <p className="text-gray-500 max-w-xs">该模块正在开发中，敬请期待。</p>
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </Layout>
  );
};

export default App;
