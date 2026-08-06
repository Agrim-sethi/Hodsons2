import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const dataPrice = [
  { name: 'Cotton', price: 450, color: '#bef264' },
  { name: 'Silk', price: 1850, color: '#f9a8d4' },
  { name: 'Polyester', price: 120, color: '#bef264' },
  { name: 'Linen', price: 980, color: '#f9a8d4' },
  { name: 'Denim', price: 350, color: '#bef264' },
  { name: 'Wool', price: 1250, color: '#f9a8d4' },
];

const dataPie = [
  { name: 'Cotton', value: 40, color: '#60a5fa' },
  { name: 'Silk', value: 30, color: '#a78bfa' },
  { name: 'Polyester', value: 20, color: '#bef264' },
  { name: 'Other', value: 10, color: '#6b7280' },
];

const Analytics: React.FC = () => {
  return (
    <main className="pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-4">
              Market <br/><span className="text-accent-pink">Analytics</span>
            </h1>
            <p className="text-xl text-gray-400 font-light max-w-xl">Real-time insights into textile circulation and price trends.</p>
          </div>
          <div className="flex gap-3">
            <StatsCard label="Total Listings" value="12,482" color="text-accent-green" />
            <StatsCard label="Waste Diverted" value="42.5 Tons" color="text-accent-pink" />
          </div>
        </div>

        {/* Main Chart */}
        <section className="bg-charcoal/30 border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden">
           <div className="flex justify-between items-center mb-12">
            <h2 className="text-4xl font-black tracking-tight">Average Price per Fabric Type</h2>
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
              <span className="text-sm font-bold text-gray-400">Currency: INR/Meter</span>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataPrice}>
                <XAxis dataKey="name" tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{backgroundColor: '#1f2937', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'}}
                  itemStyle={{color: '#fff'}}
                />
                <Bar dataKey="price" radius={[8, 8, 0, 0]}>
                  {dataPrice.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Grid Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Pie Chart */}
          <section className="lg:col-span-1 bg-charcoal/30 border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center">
            <h2 className="text-3xl font-black tracking-tight mb-8 w-full">Inventory Dist.</h2>
            <div className="w-full h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dataPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-4xl font-black">100%</span>
                 <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Stock</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-4">
              {dataPie.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                  <span className="text-sm font-medium text-gray-400">{item.value}% {item.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Progress Bars */}
          <section className="lg:col-span-2 bg-charcoal/30 border border-white/5 rounded-[2.5rem] p-10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black tracking-tight">Buyer Interest Trends</h2>
              <span className="text-sm text-gray-400 font-bold bg-white/5 px-4 py-2 rounded-full border border-white/5">Last 5 Months</span>
            </div>
            <div className="space-y-8">
              <TrendBar label="Sustainability Focused" count="8.4k" percentage="84%" color1="#bef264" color2="#60a5fa" textClass="text-accent-green" />
              <TrendBar label="High-End Luxury" count="6.2k" percentage="62%" color1="#f9a8d4" color2="#a78bfa" textClass="text-accent-pink" />
              <TrendBar label="Independent Designer Lots" count="4.8k" percentage="48%" color1="#60a5fa" color2="#bef264" textClass="text-accent-blue" />
              <TrendBar label="Stock Recovery Bundles" count="3.1k" percentage="31%" color1="#EDE9FE" color2="#f9a8d4" textClass="text-primary" />
            </div>
          </section>
        </div>
        
        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard icon="trending_up" color="text-accent-green" title="Growth Rate" value="+24% MoM" />
            <SummaryCard icon="local_shipping" color="text-accent-pink" title="Active Sellers" value="1,240" />
            <SummaryCard icon="groups" color="text-accent-blue" title="Active Buyers" value="8,920" />
            <SummaryCard icon="savings" color="text-accent-purple" title="Avg. Savings" value="58% Off Retail" />
        </div>
      </div>
    </main>
  );
};

const StatsCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="bg-charcoal/40 border border-white/10 rounded-2xl p-4 flex flex-col min-w-[160px]">
    <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">{label}</span>
    <span className={`text-3xl font-black ${color}`}>{value}</span>
  </div>
);

const TrendBar: React.FC<{ label: string; count: string; percentage: string; color1: string; color2: string; textClass: string }> = ({ label, count, percentage, color1, color2, textClass }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="font-bold text-white uppercase tracking-wider text-xs">{label}</span>
      <span className={`${textClass} font-black`}>{count} Interests</span>
    </div>
    <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden border border-white/10">
      <div 
        className="h-full rounded-full" 
        style={{ width: percentage, background: `linear-gradient(to right, ${color1}, ${color2})`, boxShadow: `0 0 10px ${color1}80` }}
      ></div>
    </div>
  </div>
);

const SummaryCard: React.FC<{ icon: string; color: string; title: string; value: string }> = ({ icon, color, title, value }) => (
  <div className="bg-charcoal/30 border border-white/5 rounded-3xl p-6 hover:bg-charcoal/50 transition-colors">
    <span className={`material-symbols-outlined ${color} mb-4 text-3xl`}>{icon}</span>
    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</h3>
    <p className="text-3xl font-black">{value}</p>
  </div>
);

export default Analytics;
