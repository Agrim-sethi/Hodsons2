import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, YAxis, LineChart, Line, AreaChart, Area } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { mlService, AggregatedMarketInsights, MaterialTrend } from '../services/mlService';
import { normalizeAccountType } from '../constants/accountTypes';

const Analytics: React.FC = () => {
  const { listings, users } = useAppContext();

  // ML Market Insights
  const marketInsights = useMemo((): AggregatedMarketInsights => {
    return mlService.getAggregatedMarketInsights(listings);
  }, [listings]);

  // ML Material Trends
  const materialTrends = useMemo((): MaterialTrend[] => {
    return mlService.getMaterialTrends(listings);
  }, [listings]);

  // 1. Calculate Average Price per Material (Split by Unit)
  const dataPrice = useMemo(() => {
    const stats: Record<string, { sumM: number; countM: number; sumKg: number; countKg: number }> = {};

    listings.forEach(l => {
      const mat = l.material || 'Unknown';
      if (!stats[mat]) stats[mat] = { sumM: 0, countM: 0, sumKg: 0, countKg: 0 };

      if (l.unit === 'kg') {
        stats[mat].sumKg += l.pricePerUnit;
        stats[mat].countKg += 1;
      } else {
        // Default to 'm'
        stats[mat].sumM += l.pricePerUnit;
        stats[mat].countM += 1;
      }
    });

    return Object.keys(stats).map((mat) => ({
      name: mat,
      priceM: stats[mat].countM > 0 ? Math.round(stats[mat].sumM / stats[mat].countM) : 0,
      priceKg: stats[mat].countKg > 0 ? Math.round(stats[mat].sumKg / stats[mat].countKg) : 0,
    })).sort((a, b) => Math.max(b.priceM, b.priceKg) - Math.max(a.priceM, a.priceKg));
  }, [listings]);

  // 2. Calculate Inventory Distribution (by Quantity)
  const professionData = useMemo(() => {
    const stats: Record<string, number> = {};
    const colors = ['#60a5fa', '#a78bfa', '#bef264', '#f9a8d4', '#cbd5e1', '#fb7185', '#22d3ee', '#f59e0b', '#34d399', '#f97316'];

    users.forEach((user) => {
      const type = normalizeAccountType(user.type);
      stats[type] = (stats[type] || 0) + 1;
    });

    const totalUsers = Object.values(stats).reduce((sum, count) => sum + count, 0);

    return Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count], idx) => ({
        name,
        count,
        value: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0,
        color: colors[idx % colors.length]
      }));
  }, [users]);

  // 3. Calculate Aggregates
  const aggregates = useMemo(() => {
    const totalListings = listings.length;
    const totalQty = listings.reduce((acc, l) => acc + l.qty, 0);
    const totalValue = listings.reduce((acc, l) => acc + (l.qty * l.pricePerUnit), 0);

    const activeOrganizations = new Set(listings.map(l => l.sellerName));
    const organizationCount = activeOrganizations.size;
    const totalUsers = users.length;
    const topProfession = professionData[0]?.name || 'No profession data';

    // Calculate Average Price per Unit separately
    const mListings = listings.filter(l => l.unit === 'm' || !l.unit);
    const kgListings = listings.filter(l => l.unit === 'kg');

    const avgPriceM = mListings.length > 0
      ? Math.round(mListings.reduce((acc, l) => acc + l.pricePerUnit, 0) / mListings.length)
      : 0;

    const avgPriceKg = kgListings.length > 0
      ? Math.round(kgListings.reduce((acc, l) => acc + l.pricePerUnit, 0) / kgListings.length)
      : 0;

    return { totalListings, totalQty, totalValue, organizationCount, totalUsers, topProfession, avgPriceM, avgPriceKg };
  }, [listings, users, professionData]);

  // 4. Calculate Location/City Trends
  const locationTrends = useMemo(() => {
    const stats: Record<string, number> = {};
    listings.forEach(l => {
      const city = l.location.split(',')[0].trim() || 'Unknown';
      stats[city] = (stats[city] || 0) + 1;
    });

    const sortedCities = Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Top 5

    const colors = [
      ['#bef264', '#60a5fa'],
      ['#f9a8d4', '#a78bfa'],
      ['#60a5fa', '#bef264'],
      ['#EDE9FE', '#f9a8d4'],
      ['#a78bfa', '#EDE9FE']
    ];

    return sortedCities.map(([city, count], idx) => ({
      city,
      count,
      percentage: listings.length > 0 ? Math.round((count / listings.length) * 100) + '%' : '0%',
      colors: colors[idx % colors.length]
    }));
  }, [listings]);

  if (listings.length === 0) {
    return (
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center py-20 bg-white/5 rounded-[3rem] border border-white/10 border-dashed">
          <h1 className="text-4xl font-black mb-4">No Data Available</h1>
          <p className="text-gray-400 mb-8">Analytics will appear here once listings are added to the marketplace.</p>
          <span className="material-symbols-outlined text-6xl text-gray-600">bar_chart_off</span>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-none mb-4">
              Market <br /><span className="text-accent-pink">Analytics</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 font-light max-w-xl">Real-time insights from active marketplace data.</p>
          </div>
          <div className="flex gap-3">
            <StatsCard label="Total Listings" value={aggregates.totalListings.toString()} color="text-accent-green" />
            <StatsCard label="Total Stock" value={`${aggregates.totalQty.toFixed(0)} units`} color="text-accent-pink" />
          </div>
        </div>

        {/* Main Chart */}
        <section className="bg-charcoal/30 border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-4xl font-black tracking-tight">Average Price per Fabric</h2>
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
              <span className="text-sm font-bold text-gray-400">Currency: INR</span>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataPrice} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis hide={true} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1f2937', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}
                />
                {/* Visual Distinction: Price/Meter vs Price/Kg */}
                <Bar dataKey="priceM" name="Price (Per Meter)" fill="#bef264" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="priceKg" name="Price (Per Kg)" fill="#f9a8d4" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* AI-Powered Market Insights */}
        <section className="bg-gradient-to-br from-accent-pink/10 via-charcoal/30 to-accent-green/10 border border-accent-pink/30 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-pink/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-accent-pink/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-accent-pink text-2xl">psychology</span>
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight">AI Market Intelligence</h2>
                <p className="text-sm text-gray-400">Predictive insights powered by machine learning algorithms</p>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-10">
              <div className="bg-black/30 rounded-2xl p-4 sm:p-5 border border-white/5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-accent-green text-lg sm:text-xl">monitoring</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-bold truncate">Health</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-accent-green">{marketInsights.marketHealthScore}%</p>
                <p className="text-[10px] text-gray-400 mt-1">Overall Score</p>
              </div>

              <div className="bg-black/30 rounded-2xl p-4 sm:p-5 border border-white/5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`material-symbols-outlined text-lg sm:text-xl ${marketInsights.demandTrend === 'increasing' ? 'text-green-400' :
                    marketInsights.demandTrend === 'decreasing' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                    {marketInsights.demandTrend === 'increasing' ? 'trending_up' :
                      marketInsights.demandTrend === 'decreasing' ? 'trending_down' : 'trending_flat'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-bold truncate">Demand</span>
                </div>
                <p className={`text-xl sm:text-3xl font-black capitalize truncate ${marketInsights.demandTrend === 'increasing' ? 'text-green-400' :
                  marketInsights.demandTrend === 'decreasing' ? 'text-red-400' : 'text-yellow-400'
                  }`}>{marketInsights.demandTrend}</p>
                <p className="text-[10px] text-gray-400 mt-1">Direction</p>
              </div>

              <div className="bg-black/30 rounded-2xl p-4 sm:p-5 border border-white/5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-accent-blue text-lg sm:text-xl">percent</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-bold truncate">Change</span>
                </div>
                <p className={`text-2xl sm:text-3xl font-black ${marketInsights.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {marketInsights.priceChange >= 0 ? '+' : ''}{marketInsights.priceChange}%
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Month Change</p>
              </div>

              <div className="bg-black/30 rounded-2xl p-4 sm:p-5 border border-white/5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-accent-purple text-lg sm:text-xl">diamond</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-bold truncate">Top</span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-accent-purple truncate">{marketInsights.topMaterial}</p>
                <p className="text-[10px] text-gray-400 mt-1">High Demand</p>
              </div>
            </div>

            {/* Material Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trend Cards */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold uppercase tracking-wider text-gray-400 mb-4">Material Trends</h3>
                {materialTrends.slice(0, 4).map((trend, idx) => (
                  <div key={idx} className="bg-black/20 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${trend.trend === 'rising' ? 'bg-green-500/20' :
                      trend.trend === 'falling' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                      }`}>
                      <span className={`material-symbols-outlined ${trend.trend === 'rising' ? 'text-green-400' :
                        trend.trend === 'falling' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                        {trend.trend === 'rising' ? 'trending_up' :
                          trend.trend === 'falling' ? 'trending_down' : 'trending_flat'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <h4 className="font-bold text-white text-sm sm:text-base truncate">{trend.material}</h4>
                        <span className={`text-xs sm:text-sm font-bold flex-shrink-0 ${trend.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                          {trend.priceChangePercent >= 0 ? '+' : ''}{trend.priceChangePercent}%
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">
                          Demand: <span className={`font-bold ${trend.demandScore >= 70 ? 'text-green-400' :
                            trend.demandScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                            }`}>{trend.demandScore}%</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          Avg: ₹{trend.avgPrice}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendations Box */}
              <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                <h3 className="text-lg font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-accent-green">lightbulb</span>
                  AI Recommendations
                </h3>
                <div className="space-y-4">
                  {marketInsights.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl">
                      <span className={`material-symbols-outlined text-xl mt-0.5 ${rec.type === 'opportunity' ? 'text-green-400' :
                        rec.type === 'warning' ? 'text-yellow-400' :
                          rec.type === 'action' ? 'text-blue-400' : 'text-gray-400'
                        }`}>
                        {rec.type === 'opportunity' ? 'rocket_launch' :
                          rec.type === 'warning' ? 'warning' :
                            rec.type === 'action' ? 'bolt' : 'info'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-white font-medium break-words leading-tight">{rec.message}</p>
                        <span className={`text-[9px] uppercase tracking-wider font-bold mt-2 inline-block px-2 py-0.5 rounded-full ${rec.type === 'opportunity' ? 'bg-green-500/20 text-green-400' :
                          rec.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                            rec.type === 'action' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>{rec.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Feature Notice */}
            <div className="mt-10 pt-10 border-t border-white/5">
              <p className="text-sm text-gray-500 italic leading-relaxed max-w-3xl">
                This feature will work more seamlessly as additional listings are added to the market. With your support, it has strong potential to help extend this service to a sustainable benefit for a greater number of textile businesses.
              </p>
            </div>
          </div>
        </section>

        {/* Grid Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Pie Chart */}
          <section className="lg:col-span-1 bg-charcoal/30 border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center">
            <h2 className="text-3xl font-black tracking-tight mb-8 w-full">Profession Mix</h2>
            <div className="w-full h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={professionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {professionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black">100%</span>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Users</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-4">
              {professionData.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm font-medium text-gray-400">{item.value}% {item.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Location Trends */}
          <section className="lg:col-span-2 bg-charcoal/30 border border-white/5 rounded-[2.5rem] p-10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black tracking-tight">Top Locations</h2>
              <span className="text-sm text-gray-400 font-bold bg-white/5 px-4 py-2 rounded-full border border-white/5">By Listing Count</span>
            </div>
            <div className="space-y-8">
              {locationTrends.length > 0 ? locationTrends.map((item, idx) => (
                <TrendBar
                  key={idx}
                  label={item.city}
                  count={item.count.toString()}
                  percentage={item.percentage}
                  color1={item.colors[0]}
                  color2={item.colors[1]}
                  textClass="text-white"
                />
              )) : (
                <p className="text-gray-500">Not enough data to show trends.</p>
              )}
            </div>
          </section>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Split Avg Price Card */}
          <div className="grid grid-cols-2 gap-4 bg-charcoal/30 border border-white/5 rounded-3xl p-6 hover:bg-charcoal/50 transition-colors">
            <div className="col-span-2">
              <span className="material-symbols-outlined text-accent-green mb-4 text-3xl">payments</span>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Avg. Price Breakdown</h3>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Per Meter</span>
              <p className="text-xl font-black text-white">₹{aggregates.avgPriceM}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Per Kg</span>
              <p className="text-xl font-black text-white">₹{aggregates.avgPriceKg}</p>
            </div>
          </div>

          {/* Community Growth */}
          <div className="grid grid-cols-2 gap-4 bg-charcoal/30 border border-white/5 rounded-3xl p-6 hover:bg-charcoal/50 transition-colors">
            <div className="col-span-2">
              <span className="material-symbols-outlined text-accent-pink mb-4 text-3xl">group</span>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Community Growth</h3>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Organizations Listing</span>
              <p className="text-xl font-black text-white">{aggregates.organizationCount}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Registered Users</span>
              <p className="text-xl font-black text-white">{aggregates.totalUsers}</p>
            </div>
          </div>
          <SummaryCard icon="badge" color="text-accent-blue" title="Top Profession" value={aggregates.topProfession} />
          <SummaryCard icon="monetization_on" color="text-accent-purple" title="Total Inventory Value" value={`₹${aggregates.totalValue.toLocaleString()}`} />
        </div>
      </div>
    </main>
  );
};

const StatsCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="bg-charcoal/40 border border-white/10 rounded-2xl p-4 flex flex-col min-w-[140px] sm:min-w-[160px]">
    <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">{label}</span>
    <span className={`text-xl sm:text-3xl font-black ${color}`}>{value}</span>
  </div>
);

const TrendBar: React.FC<{ label: string; count: string; percentage: string; color1: string; color2: string; textClass: string }> = ({ label, count, percentage, color1, color2, textClass }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="font-bold text-white uppercase tracking-wider text-xs">{label}</span>
      <span className={`${textClass} font-black`}>{count} Listings</span>
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
    <p className="text-2xl font-black truncate" title={value}>{value}</p>
  </div>
);

export default Analytics;
