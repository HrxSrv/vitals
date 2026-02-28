import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return '—';
  }
};

export const formatDateShort = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return '—';
  }
};

export const formatRelative = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return '—';
  }
};

export const formatAge = (dob: string | null | undefined): string => {
  if (!dob) return '—';
  try {
    const birth = parseISO(dob);
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    const adjusted = m < 0 || (m === 0 && now.getDate() < birth.getDate()) ? age - 1 : age;
    return `${adjusted} yrs`;
  } catch {
    return '—';
  }
};

export const formatValue = (value: number, unit: string): string =>
  `${value} ${unit}`;

export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const formatRelationship = (r: string): string => {
  const map: Record<string, string> = {
    self: 'Self',
    mother: 'Mother',
    father: 'Father',
    spouse: 'Spouse',
    grandmother: 'Grandmother',
    grandfather: 'Grandfather',
    other: 'Other',
  };
  return map[r] ?? capitalize(r);
};
