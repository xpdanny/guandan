
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onLogin(username);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-indigo-700 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-block w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 transform rotate-12 shadow-xl">
             <div className="w-8 h-8 bg-white transform rotate-45" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">系统登录</h1>
          <p className="text-gray-500 mt-2 font-medium">掼蛋发牌设备集中管理平台</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入管理员账号"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">登录密码</label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-indigo-600" />
              <span className="text-gray-600">记住登录状态</span>
            </label>
            <a href="#" className="text-indigo-600 font-bold hover:underline">忘记密码?</a>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transform transition-all active:scale-95 shadow-lg shadow-indigo-200"
          >
            进入系统
          </button>
        </form>

        <div className="mt-10 text-center text-xs text-gray-400">
          &copy; 2024 智能发牌设备管理系统 v1.0.4
        </div>
      </div>
    </div>
  );
};

export default Login;
