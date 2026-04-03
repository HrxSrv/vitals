const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function fetchSlots(): Promise<{ remaining: number }> {
  const res = await fetch(`${API_BASE}/slots`, { cache: 'no-store' });
  if (!res.ok) throw new Error('slots fetch failed');
  return res.json();
}
