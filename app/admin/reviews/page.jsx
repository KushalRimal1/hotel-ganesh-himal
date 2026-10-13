import ReviewManager from '../../../components/ReviewManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Website Administration | Hotel Ganesh Himal', robots: { index: false, follow: false } };

export default function AdminReviewsPage() {
  return <><link rel="stylesheet" href="/admin.css?v=next-17" /><ReviewManager /></>;
}
