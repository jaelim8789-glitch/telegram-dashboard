export async function fetchDashboardBatch(widgets: string[]) {
  const res = await fetch('/api/dashboard/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgets }),
  });
  if (!res.ok) throw new Error('Batch fetch failed');
  return res.json();
}
