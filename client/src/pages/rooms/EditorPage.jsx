import { useParams } from 'react-router-dom';

import PagePlaceholder from '../../components/common/PagePlaceholder.jsx';

export function EditorPage() {
  const { roomId } = useParams();

  return (
    <PagePlaceholder
      step="Step 32"
      title={`Room ${roomId ?? '—'}`}
      description="Realtime Monaco editor, presence and run panel ship in Steps 32–36."
    />
  );
}

export default EditorPage;
