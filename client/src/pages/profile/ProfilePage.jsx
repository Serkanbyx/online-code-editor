import { useParams } from 'react-router-dom';

import PagePlaceholder from '../../components/common/PagePlaceholder.jsx';

export function ProfilePage() {
  const { username } = useParams();

  return (
    <PagePlaceholder
      step="Step 38"
      title={username ? `@${username}` : 'Profile'}
      description="Public profile with snippets, likes and comments tabs — implemented in Step 38."
    />
  );
}

export default ProfilePage;
