import React from 'react';
import {
  composeFieldMark,
  composeTrackMark,
  FieldParts,
  parseFieldParts,
  parseTrackParts,
  TrackParts
} from '../../utils/athleticsMarks';

const boxClass = 'royal-input rounded-xl px-2 py-2 text-xs font-mono font-bold w-16 text-center text-amber-300 disabled:opacity-60';

export const TrackMarkInput: React.FC<{
  value?: string;
  disabled?: boolean;
  onCommit: (next: string) => void;
}> = ({ value, disabled, onCommit }) => {
  const [parts, setParts] = React.useState<TrackParts>(() => parseTrackParts(value));

  React.useEffect(() => {
    setParts(parseTrackParts(value));
  }, [value]);

  const update = (patch: Partial<TrackParts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    onCommit(composeTrackMark(next));
  };

  return (
    <div className="flex items-end gap-1.5">
      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Min</span>
        <input
          disabled={disabled}
          inputMode="numeric"
          placeholder="0"
          value={parts.minutes}
          onChange={event => update({ minutes: event.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
          className={boxClass}
        />
      </label>
      <span className="pb-2 text-slate-500 font-black">:</span>
      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Sec</span>
        <input
          disabled={disabled}
          inputMode="numeric"
          placeholder="00"
          value={parts.seconds}
          onChange={event => update({ seconds: event.target.value.replace(/[^\d]/g, '').slice(0, 2) })}
          className={boxClass}
        />
      </label>
      <span className="pb-2 text-slate-500 font-black">:</span>
      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Ms</span>
        <input
          disabled={disabled}
          inputMode="numeric"
          placeholder="00"
          value={parts.millis}
          onChange={event => update({ millis: event.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
          className={boxClass}
        />
      </label>
    </div>
  );
};

export const FieldMarkInput: React.FC<{
  value?: string;
  disabled?: boolean;
  onCommit: (next: string) => void;
}> = ({ value, disabled, onCommit }) => {
  const [parts, setParts] = React.useState<FieldParts>(() => parseFieldParts(value));

  React.useEffect(() => {
    setParts(parseFieldParts(value));
  }, [value]);

  const update = (patch: Partial<FieldParts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    onCommit(composeFieldMark(next));
  };

  return (
    <div className="flex items-end gap-1.5">
      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Metres</span>
        <input
          disabled={disabled}
          inputMode="numeric"
          placeholder="0"
          value={parts.metres}
          onChange={event => update({ metres: event.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
          className={boxClass}
        />
      </label>
      <span className="pb-2 text-slate-500 font-black">.</span>
      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Cm</span>
        <input
          disabled={disabled}
          inputMode="numeric"
          placeholder="00"
          value={parts.centimetres}
          onChange={event => update({ centimetres: event.target.value.replace(/[^\d]/g, '').slice(0, 2) })}
          className={boxClass}
        />
      </label>
    </div>
  );
};
