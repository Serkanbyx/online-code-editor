import { useParams } from 'react-router-dom';

import PagePlaceholder from '../../components/common/PagePlaceholder.jsx';

export function EditSnippetPage() {
  const { id } = useParams();

  return (
    <PagePlaceholder
      step="Step 37"
      title={`Edit snippet #${id ?? '—'}`}
      description="Metadata and code editing tools ship in Step 37."
    />
  );
}

export default EditSnippetPage;
