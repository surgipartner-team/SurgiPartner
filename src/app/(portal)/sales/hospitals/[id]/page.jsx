import HospitalDetailPage from '@/components/pages/HospitalDetailPage';

export default async function SalesHospitalDetail({ params }) {
    const { id } = await params;
    return <HospitalDetailPage id={id} />;
}
