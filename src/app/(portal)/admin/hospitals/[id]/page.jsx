import HospitalDetailPage from '@/components/pages/HospitalDetailPage';

export default async function HospitalDetail({ params }) {
    const { id } = await params;
    return <HospitalDetailPage id={id} />;
}
