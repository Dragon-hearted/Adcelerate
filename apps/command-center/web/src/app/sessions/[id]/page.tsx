import { SessionView } from '@/components/replay/SessionView';

// Next 15: dynamic route `params` is async.
export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionView sessionId={id} />;
}
