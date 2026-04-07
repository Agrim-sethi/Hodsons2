import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Bar, Cell } from 'recharts';
import { Icon } from '../Icon';
import { HOUSE_COLORS } from '../../constants';
import { HouseStandingsDatum, PodiumPlayer } from './types';

const houseConfig = (house: string) => {
  const key = house.toLowerCase() as keyof typeof HOUSE_COLORS;
  return HOUSE_COLORS[key] ?? HOUSE_COLORS.nilgiri;
};

export const PodiumStep: React.FC<{ player: PodiumPlayer | null; rank: number }> = ({ player, rank }) => {
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-end z-10 w-full px-1 opacity-50">
        <div className="text-center mb-2 h-[60px] flex flex-col items-center justify-end">
          <span className="text-xs text-slate-500 italic">TBD</span>
        </div>
        <div className={`w-full ${rank === 1 ? 'h-32' : rank === 2 ? 'h-24' : 'h-20'} bg-white/5 rounded-t-lg border-t-2 border-white/10 flex items-start justify-center pt-2`}>
          <span className="text-xl font-black text-white/30">{rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}</span>
        </div>
      </div>
    );
  }

  const config = houseConfig(player.house);
  const heightMap: Record<number, string> = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
  const labelMap: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };
  const medalColor: Record<number, string> = { 1: 'text-yellow-400', 2: 'text-slate-300', 3: 'text-amber-600' };

  return (
    <div className="flex flex-col items-center justify-end z-10 w-full px-1 lg:px-2">
      <div className="text-center mb-2">
        <p className="text-xs lg:text-sm font-bold text-white leading-tight mb-1 truncate w-24 mx-auto" title={player.name}>{player.name.split(' ')[0]}</p>
        <div className={`inline-flex items-center justify-center gap-1 uppercase tracking-wider text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg}/20 ${config.text} border ${config.border}/30 mb-1`}>
          {player.house}
        </div>
        {player.timing && (
          <div className="text-[10px] lg:text-xs font-mono text-slate-400 mb-1 leading-none">{player.timing}</div>
        )}
        <Icon name="emoji_events" className={`text-2xl lg:text-3xl ${medalColor[rank]} block mx-auto`} />
      </div>
      <div className={`w-full ${heightMap[rank]} bg-gradient-to-t ${config.gradient} rounded-t-lg border-t-4 ${config.border} flex items-start justify-center pt-2 shadow-lg shadow-black/50 relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
        <span className="text-2xl font-black text-white/90 drop-shadow-md relative z-10">{labelMap[rank]}</span>
      </div>
    </div>
  );
};

export const StandingsChart: React.FC<{ title: string; subtitle: string; data: HouseStandingsDatum[]; icon: string; onClick?: () => void }> = ({ title, subtitle, data, icon, onClick }) => (
  <div
    className={`glass-panel w-full rounded-2xl p-6 lg:p-8 mb-6 border border-white/5 relative overflow-hidden min-h-[470px] flex flex-col ${onClick ? 'cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all group' : ''}`}
    onClick={onClick}
  >
    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
      <Icon name="bar_chart" className="text-[150px] text-white" />
    </div>

    <div className="flex items-center gap-3 mb-6 relative z-10">
      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <Icon name={icon} size="24" />
      </div>
      <div>
        <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      {onClick && (
        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] uppercase font-bold text-slate-400">View Stats</span>
        </div>
      )}
    </div>

    <div className="h-[260px] w-full relative z-10">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 30, left: 0, bottom: 0 }} layout="vertical">
          <defs>
            {data.map((entry, idx) => (
              <linearGradient key={`grad-${idx}`} id={`grad_${title.replace(/\s+/g, '')}_${entry.name}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={entry.color} stopOpacity={0.6} />
                <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="name" type="category" tick={{ fill: '#fff', fontSize: 14, fontWeight: 'bold' }} axisLine={false} tickLine={false} width={100} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
            formatter={(value: number) => [`${value} pts`, 'Points']}
          />
          <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
          <Bar dataKey="points" radius={[0, 8, 8, 0]} barSize={28} animationDuration={1000}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`url(#grad_${title.replace(/\s+/g, '')}_${entry.name})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="relative z-10 mt-6 border-t border-primary/10 pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">Per House Points</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Quick Counter</span>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {data.map((entry) => {
          const config = houseConfig(entry.name);
          return (
            <div
              key={entry.name}
              className="rounded-2xl border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(201,163,74,0.03))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,244,214,0.04)]"
            >
              <div className="mb-2">
                <span className={`text-[9px] font-black uppercase tracking-[0.22em] ${config.text}`}>
                  {entry.name}
                </span>
              </div>
              <div className={`text-2xl font-black ${entry.points > 0 ? 'text-[#f4dfac]' : entry.points < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {entry.points > 0 ? `+${entry.points}` : entry.points}
              </div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500 leading-tight">
                Championship Pts
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
