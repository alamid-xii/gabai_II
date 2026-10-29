import { useSchoolProfile } from '../hooks/useSchoolProfile';

export function SchoolName({ short = false }) {
  const { profile } = useSchoolProfile();
  return <>{(short ? profile?.shortName || profile?.schoolName : profile?.schoolName) || 'School'}</>;
}
