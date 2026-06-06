import TerritoryDetailClient from './client';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function TerritoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <TerritoryDetailClient params={params} />;
}
