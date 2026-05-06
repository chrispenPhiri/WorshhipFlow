const STORAGE_KEY = "wf-ai-usage";

interface AiUsage {
  images: { date: string; count: number };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): AiUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AiUsage;
  } catch { /* ignore */ }
  return { images: { date: today(), count: 0 } };
}

function save(usage: AiUsage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export function getDailyImageCount(): number {
  const usage = load();
  if (usage.images.date !== today()) return 0;
  return usage.images.count;
}

export function incrementDailyImageCount(): void {
  const usage = load();
  if (usage.images.date !== today()) {
    usage.images = { date: today(), count: 1 };
  } else {
    usage.images.count += 1;
  }
  save(usage);
}

export function checkImageLimit(limit: number): { allowed: boolean; current: number } {
  const current = getDailyImageCount();
  if (limit === 0) return { allowed: true, current };
  return { allowed: current < limit, current };
}
