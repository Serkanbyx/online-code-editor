import { useParams } from 'react-router-dom';

import PagePlaceholder from '../../components/common/PagePlaceholder.jsx';

export function SnippetDetailPage() {
  const { id } = useParams();

  return (
    <PagePlaceholder
      step="Step 29"
      title={`Snippet #${id ?? '—'}`}
      description="Read-only viewer, like/fork actions and comments arrive in Step 29."
    />
  );
}

export default SnippetDetailPage;
