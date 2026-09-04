export type AthleticsMarkKind = 'track' | 'field';

export type TrackParts = { minutes: string; seconds: string; millis: string };
export type FieldParts = { metres: string; centimetres: string };

const pad = (value: number, width: number) => String(Math.max(0, value)).padStart(width, '0');

export const emptyTrackParts = (): TrackParts => ({ minutes: '', seconds: '', millis: '' });
export const emptyFieldParts = (): FieldParts => ({ metres: '', centimetres: '' });

export const parseTrackParts = (value?: string): TrackParts => {
  if (!value) return emptyTrackParts();
  const parts = value.trim().split(':').map(segment => segment.trim());
  if (parts.length >= 3) {
    return { minutes: parts[0], seconds: parts[1], millis: parts[2] };
  }
  if (parts.length === 2) {
    // Legacy sprint format was seconds:ms; longer races used minutes:seconds.
    const first = Number(parts[0]);
    const second = Number(parts[1]);
    if (!Number.isNaN(first) && first >= 60) {
      return { minutes: parts[0], seconds: parts[1], millis: '' };
    }
    if (!Number.isNaN(second) && (parts[1].length >= 2 || second >= 60)) {
      return { minutes: '', seconds: parts[0], millis: parts[1] };
    }
    return { minutes: parts[0], seconds: parts[1], millis: '' };
  }
  return { minutes: '', seconds: parts[0] || '', millis: '' };
};

export const parseFieldParts = (value?: string): FieldParts => {
  if (!value) return emptyFieldParts();
  const labelled = value.match(/(\d+)\s*m(?:etres?)?\s*(\d+)\s*cm/i);
  if (labelled) {
    return { metres: labelled[1], centimetres: labelled[2] };
  }
  const numeric = value.match(/^(\d+)(?:\.(\d+))?$/);
  if (numeric) {
    const cmRaw = (numeric[2] || '').padEnd(2, '0').slice(0, 2);
    return { metres: numeric[1], centimetres: numeric[2] ? cmRaw : '' };
  }
  const fallback = value.match(/[\d.]+/);
  if (!fallback) return emptyFieldParts();
  const [metres, fraction = ''] = fallback[0].split('.');
  return { metres, centimetres: fraction.padEnd(2, '0').slice(0, 2) };
};

export const composeTrackMark = (parts: TrackParts): string => {
  const minutes = parts.minutes.trim() === '' ? 0 : Number(parts.minutes);
  const seconds = parts.seconds.trim() === '' ? 0 : Number(parts.seconds);
  const millisRaw = parts.millis.trim();
  const millis = millisRaw === '' ? 0 : Number(millisRaw);
  if ([minutes, seconds, millis].some(value => Number.isNaN(value))) return '';
  if (parts.minutes.trim() === '' && parts.seconds.trim() === '' && millisRaw === '') return '';
  const millisWidth = millisRaw.length >= 3 || millis >= 100 ? 3 : 2;
  return `${pad(Math.floor(minutes), 2)}:${pad(Math.floor(seconds), 2)}:${pad(Math.floor(millis), millisWidth)}`;
};

export const composeFieldMark = (parts: FieldParts): string => {
  const metres = parts.metres.trim() === '' ? 0 : Number(parts.metres);
  const centimetres = parts.centimetres.trim() === '' ? 0 : Number(parts.centimetres);
  if ([metres, centimetres].some(value => Number.isNaN(value))) return '';
  if (parts.metres.trim() === '' && parts.centimetres.trim() === '') return '';
  return `${Math.floor(metres)}.${pad(Math.floor(centimetres), 2)}`;
};

export const formatAthleticsMark = (value?: string, kind: AthleticsMarkKind = 'track') => {
  if (!value) return '—';
  if (kind === 'field') {
    const parts = parseFieldParts(value);
    const metres = parts.metres || '0';
    const centimetres = parts.centimetres === '' ? '00' : pad(Number(parts.centimetres) || 0, 2);
    return `${metres}m ${centimetres}cm`;
  }
  const parts = parseTrackParts(value);
  const composed = composeTrackMark({
    minutes: parts.minutes === '' ? '0' : parts.minutes,
    seconds: parts.seconds === '' ? '0' : parts.seconds,
    millis: parts.millis === '' ? '00' : parts.millis
  });
  return composed || value;
};

export const athleticsMarkToNumber = (value?: string, isField = false) => {
  if (!value) return isField ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

  if (isField) {
    const parts = parseFieldParts(value);
    const metres = Number(parts.metres || 0);
    const centimetres = Number(parts.centimetres || 0);
    if (Number.isNaN(metres) || Number.isNaN(centimetres)) return Number.NEGATIVE_INFINITY;
    return metres + (centimetres / 100);
  }

  const parts = parseTrackParts(value);
  const minutes = Number(parts.minutes === '' ? 0 : parts.minutes);
  const seconds = Number(parts.seconds === '' ? 0 : parts.seconds);
  const millisRaw = parts.millis.trim();
  const millis = Number(millisRaw === '' ? 0 : millisRaw);
  if ([minutes, seconds, millis].some(value => Number.isNaN(value))) return Number.POSITIVE_INFINITY;
  const fraction = millisRaw.length >= 3 || millis >= 100 ? millis / 1000 : millis / 100;
  return (minutes * 60) + seconds + fraction;
};

export const eventDepartments = (categories: string[]) => {
  const depts = new Set<string>();
  categories.forEach(category => {
    if (category.startsWith('PDG')) depts.add('PDG');
    else if (category.startsWith('PDB')) depts.add('PDB');
    else if (category.startsWith('GD')) depts.add('GD');
    else if (category.startsWith('BD')) depts.add('BD');
  });
  return (['BD', 'GD', 'PDB', 'PDG'] as const).filter(dept => depts.has(dept));
};
