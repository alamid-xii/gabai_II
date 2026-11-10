import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../contexts/authState';
import EnrollmentDetailsModal from '../../components/enrollment/EnrollmentDetailsModal';

export function EnrollmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const back = user?.role === 'admin' ? '/admin/enrollments' : user?.role === 'registrar' ? '/registrar/enrollments' : '/my-enrollments';
  return <EnrollmentDetailsModal key={id} enrollmentId={id} onClose={() => navigate(back)} />;
}
