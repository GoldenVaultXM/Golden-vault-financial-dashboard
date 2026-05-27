import React, { useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Wallet, TrendingUp, Activity, BarChart2, Home, Settings, LogOut } from 'lucide-react';

export default function GoldenVaultXM() {
  const data = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: 4000 + Math.sin(i * 0.6) * 1200 }));
  const [active, setActive] = useState('Home');

  return (
    <div className="min-h-screen bg-[#080808] text-white p-4 font-sans">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[#d97706]">GoldenVault XM</h1>
        <Wallet className="text-[#d97706]" />
      </header>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111111] p-4 rounded-2xl border border-[#1e1e1e]">
          <p className="text-gray-500 text-xs">Total Balance</p>
          <p className="text-2xl font-bold">$12,450.00</p>
        </div>
        <div className="bg-[#111111] p-4 rounded-2xl border border-[#1e1e1e]">
          <p className="text-gray-500 text-xs">Profit (24h)</p>
          <p className="text-2xl font-bold text-green-500">+$420.50</p>
        </div>
      </div>

      <div className="bg-[#111111] p-6 rounded-2xl border border-[#1e1e1e] mb-6">
        <h2 className="text-sm font-semibold mb-4 text-gray-300">Live Performance</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line type="monotone" dataKey="value" stroke="#d97706" strokeWidth={2} dot={false} />
              <XAxis dataKey="day" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-[#1e1e1e] p-4 flex justify-around">
        <Home onClick={() => setActive('Home')} className={active === 'Home' ? 'text-[#d97706]' : 'text-gray-500'} />
        <BarChart2 onClick={() => setActive('Chart')} className={active === 'Chart' ? 'text-[#d97706]' : 'text-gray-500'} />
        <Activity onClick={() => setActive('Activity')} className={active === 'Activity' ? 'text-[#d97706]' : 'text-gray-500'} />
        <Settings onClick={() => setActive('Settings')} className={active === 'Settings' ? 'text-[#d97706]' : 'text-gray-500'} />
      </nav>
    </div>
  );
}
