import React from 'react';
import { Icon } from '../components/Icon';
import { HOUSE_COLORS } from '../constants';
import { getEvents } from '../utils/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const standingsTooltipStyle = {
  backgroundColor: 'rgba(10, 20, 34, 0.96)',
  borderColor: 'rgba(201,163,74,0.28)',
  color: '#fff7e4',
  borderRadius: '14px',
  padding: '10px 14px',
  boxShadow: '0 14px 32px rgba(0, 0, 0, 0.42)'
};

const HouseCard = ({ house, place, points, change, isUp, colorConfig }: any) => (
  <div className={`glass-panel rounded-2xl p-6 relative overflow-hidden group border-t-4 ${colorConfig.border} ${colorConfig.glow ? 'shadow-lg ' + colorConfig.glow.replace('box-shadow:', '') : ''}`}>
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
      <Icon name="shield" className={`text-[120px] ${colorConfig.text}`} />
    </div>
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`size-12 rounded-full ${colorConfig.bg}/20 flex items-center justify-center ${colorConfig.text} border ${colorConfig.border}/30`}>
          <span className="font-black text-xl">{house[0]}</span>
        </div>
        <span className={`${place === 1 ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20' : 'bg-slate-700/50 text-slate-300'} text-xs font-bold px-2 py-1 rounded uppercase tracking-wide border border-transparent`}>
          {place === 1 ? '1st Place' : place === 2 ? '2nd Place' : place === 3 ? '3rd Place' : '4th Place'}
        </span>
      </div>
      <div>
        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">{house} House</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">{points}</span>
          <span className="text-slate-400 text-sm">pts</span>
        </div>
        <div className={`mt-4 flex items-center gap-2 text-sm font-medium w-fit px-2 py-1 rounded ${isUp === true ? 'text-green-400 bg-green-400/10' : isUp === false ? 'text-red-400 bg-red-400/10' : 'text-slate-400 bg-slate-700/30'}`}>
          <Icon name={isUp === true ? "trending_up" : isUp === false ? "trending_down" : "remove"} className="text-base" />
          <span>{change}</span>
        </div>
      </div>
    </div>
  </div>
);


const Standings: React.FC = () => {
  const [houseStats, setHouseStats] = React.useState<any>({
    Vindhya: { points: 0, change: "No change", isUp: null, form: [] },
    Himalaya: { points: 0, change: "No change", isUp: null, form: [] },
    Nilgiri: { points: 0, change: "No change", isUp: null, form: [] },
    Siwalik: { points: 0, change: "No change", isUp: null, form: [] },
  });

  const [categoryBreakdown, setCategoryBreakdown] = React.useState<any[]>([]);

  React.useEffect(() => {
    const events = getEvents();
    const stats: any = {
      Vindhya: 0,
      Himalaya: 0,
      Nilgiri: 0,
      Siwalik: 0,
    };

    const sports: any = {};

    events.forEach(event => {
      if (event.completed && event.resultDetails && event.resultDetails.points) {
        const points = parseInt(event.resultDetails.points) || 0;
        const winner = event.resultDetails.winner.trim();

        // Match winner to house
        let houseName = '';
        if (winner.toLowerCase().includes('vindhya') || winner === 'V') houseName = 'Vindhya';
        else if (winner.toLowerCase().includes('himalaya') || winner === 'H') houseName = 'Himalaya';
        else if (winner.toLowerCase().includes('nilgiri') || winner === 'N') houseName = 'Nilgiri';
        else if (winner.toLowerCase().includes('siwalik') || winner === 'S') houseName = 'Siwalik';

        if (houseName) {
          stats[houseName] += points;

          // Category breakdown
          const sport = event.sport || 'Other';
          if (!sports[sport]) {
            sports[sport] = {
              Vindhya: 0,
              Himalaya: 0,
              Nilgiri: 0,
              Siwalik: 0,
              total: 0
            };
          }
          sports[sport][houseName] += points;
          sports[sport].total += points;
        }
      }
    });

    const getForm = (hName: string, hCode: string) => {
      const houseEvents = events
        .filter((e: any) => e.completed && e.participation === 'houses' && (e.houses?.includes(hCode) || e.houses?.includes(hName)))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const formArr = houseEvents.map((e: any) => {
        const winner = (e.resultDetails?.winner || '').trim().toLowerCase();
        if (winner.includes(hName.toLowerCase()) || winner === hCode.toLowerCase()) return 'W';
        if (winner === 'draw' || winner === 'tie') return 'D';
        return 'L';
      });
      return formArr.reverse(); // Newest is appended on the right
    };

    setHouseStats({
      Vindhya: { points: stats.Vindhya, change: stats.Vindhya > 0 ? "+" + stats.Vindhya : "No change", isUp: stats.Vindhya > 0, form: getForm('Vindhya', 'V') },
      Himalaya: { points: stats.Himalaya, change: stats.Himalaya > 0 ? "+" + stats.Himalaya : "No change", isUp: stats.Himalaya > 0, form: getForm('Himalaya', 'H') },
      Nilgiri: { points: stats.Nilgiri, change: stats.Nilgiri > 0 ? "+" + stats.Nilgiri : "No change", isUp: stats.Nilgiri > 0, form: getForm('Nilgiri', 'N') },
      Siwalik: { points: stats.Siwalik, change: stats.Siwalik > 0 ? "+" + stats.Siwalik : "No change", isUp: stats.Siwalik > 0, form: getForm('Siwalik', 'S') },
    });

    const breakdown = Object.entries(sports).map(([name, data]: [string, any]) => ({
      name,
      total: data.total,
      Vindhya: data.Vindhya,
      Himalaya: data.Himalaya,
      Nilgiri: data.Nilgiri,
      Siwalik: data.Siwalik
    }));

    setCategoryBreakdown(breakdown);

  }, []);

  const sortedHouses = Object.entries(houseStats)
    .sort(([, a]: any, [, b]: any) => b.points - a.points);

  const exportToCSV = () => {
    const events = getEvents();
    let csvContent = "Annual Championship Standings 2026\n\n";

    // Standings Section
    csvContent += "HOUSE STANDINGS\n";
    csvContent += "Rank,House,Points\n";
    sortedHouses.forEach(([name, stats]: [string, any], index) => {
      csvContent += `${index + 1},${name},${stats.points}\n`;
    });

    csvContent += "\n\nEVENT RESULTS\n";
    csvContent += "Event,Sport,Date,Winner,Result,House Points Awarded\n";

    events.filter(e => e.completed).forEach(event => {
      const winner = event.resultDetails?.winner || "N/A";
      const result = event.result || "Completed";
      const housePoints = event.resultDetails?.points || "0";
      const row = [
        event.title.replace(/,/g, ""), // Remove commas to prevent CSV breakage
        event.sport,
        new Date(event.date).toLocaleDateString(),
        winner,
        result.replace(/,/g, "-"),
        housePoints
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Sanawar_Sports_Report_2026.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1440px] mx-auto w-full pb-20 px-4">
      {/* Hero */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pt-10">
        <div className="flex flex-col gap-2">
          <div className="royal-kicker flex items-center gap-2">
            <Icon name="emoji_events" className="text-lg" />
            <span>Annual Championship</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">
            Inter-House Shield <span className="text-primary">2026</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Current standings for the prestigious Cock House trophy (Sports Category). Points are updated after every official inter-house event.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 royal-secondary-btn px-5 py-2.5 rounded-lg font-medium"
          >
            <Icon name="download" className="text-xl" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* House Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
        {sortedHouses.map(([name, stats]: [string, any], index) => (
          <HouseCard
            key={name}
            house={name}
            place={index + 1}
            points={stats.points}
            change={stats.change}
            isUp={stats.isUp}
            colorConfig={(HOUSE_COLORS as any)[name.toLowerCase()]}
          />
        ))}
      </div>

      {/* Standings Grid containing Table and Chart */}
      <div className="flex flex-col gap-8">
        {/* League Table with Form */}
        <div className="glass-panel royal-table-shell w-full rounded-2xl p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="table_chart" size="24" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">League Table</h3>
              <p className="text-sm royal-subtitle">Current season standings and recent form</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 min-w-[500px]">
              <thead className="text-xs uppercase royal-table-head">
                <tr>
                  <th className="px-6 py-4 rounded-l-lg font-bold">Pos</th>
                  <th className="px-6 py-4 font-bold">House</th>
                  <th className="px-6 py-4 font-bold">Points</th>
                  <th className="px-6 py-4 font-bold rounded-r-lg">Form (Last 5 Matches)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedHouses.map(([name, stats]: [string, any], index) => (
                  <tr key={name} className="hover:bg-primary/[0.05] transition-colors">
                    <td className="px-6 py-4 font-bold text-white text-lg">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ${(HOUSE_COLORS as any)[name.toLowerCase()].bg}/20 ${(HOUSE_COLORS as any)[name.toLowerCase()].text} border ${(HOUSE_COLORS as any)[name.toLowerCase()].border}/30`}>
                          {name[0]}
                        </div>
                        <span className="font-bold text-white text-base">{name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-white text-xl">
                      {stats.points}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {stats.form && stats.form.length > 0 ? stats.form.map((result: string, i: number) => (
                          <span
                            key={i}
                            className={`size-6 rounded-md flex flex-shrink-0 items-center justify-center text-[11px] font-bold text-white shadow-sm transition-transform hover:scale-110 ${result === 'W' ? 'bg-green-500 hover:bg-green-400' : result === 'L' ? 'bg-red-500 hover:bg-red-400' : 'bg-slate-500 hover:bg-slate-400'
                              }`}
                            title={result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'}
                          >
                            {result}
                          </span>
                        )) : (
                          <span className="text-xs text-slate-500 italic">No matches</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="glass-panel royal-chart-panel w-full rounded-2xl p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="analytics" size="24" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Category Breakdown</h3>
              <p className="text-sm royal-subtitle">Points distribution across different sports</p>
            </div>
          </div>

          <div className="h-[450px] mt-4 w-full">
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdown} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,163,74,0.12)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#c7d2e0', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#f8f1de', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(201,163,74,0.06)' }}
                    contentStyle={standingsTooltipStyle}
                    itemStyle={{ color: '#fff7e4' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', color: '#f3e4bd' }} />
                  <Bar dataKey="Vindhya" name="Vindhya" fill={HOUSE_COLORS.vindhya.hex || '#eab308'} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Himalaya" name="Himalaya" fill={HOUSE_COLORS.himalaya.hex || '#3b82f6'} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Nilgiri" name="Nilgiri" fill={HOUSE_COLORS.nilgiri.hex || '#22c55e'} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Siwalik" name="Siwalik" fill={HOUSE_COLORS.siwalik.hex || '#ef4444'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <p className="text-slate-500 italic">No points recorded for any categories yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Standings;
