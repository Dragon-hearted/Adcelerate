import { getSummary, getTimeseries, getBreakdown, type Range, type Bucket, type BreakdownDimension } from '../token-queries';

const ALLOWED_RANGES: Range[] = ['1d', '7d', '30d'];
const ALLOWED_BUCKETS: Bucket[] = ['hour', 'day'];
const ALLOWED_BREAKDOWNS: BreakdownDimension[] = ['model', 'cwd', 'git_branch'];

export function handleTokensRequest(
  url: URL,
  req: Request,
  headers: Record<string, string>
): Response | null {
  if (!url.pathname.startsWith('/api/tokens/')) return null;
  if (req.method !== 'GET') return null;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  const cwd = url.searchParams.get('cwd') || undefined;

  if (url.pathname === '/api/tokens/summary') {
    return json(getSummary(cwd));
  }

  if (url.pathname === '/api/tokens/timeseries') {
    const rangeParam = url.searchParams.get('range') as Range | null;
    const bucketParam = url.searchParams.get('bucket') as Bucket | null;
    const range = rangeParam && ALLOWED_RANGES.includes(rangeParam) ? rangeParam : '7d';
    const bucket = bucketParam && ALLOWED_BUCKETS.includes(bucketParam) ? bucketParam : 'day';
    return json(getTimeseries(range, bucket, cwd));
  }

  if (url.pathname === '/api/tokens/breakdown') {
    const byParam = url.searchParams.get('by') as BreakdownDimension | null;
    const by = byParam && ALLOWED_BREAKDOWNS.includes(byParam) ? byParam : 'model';
    return json(getBreakdown(by, cwd));
  }

  return null;
}
