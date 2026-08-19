import { JobDetail } from "@/components/JobDetail";

export default async function VagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetail jobId={id} />;
}
