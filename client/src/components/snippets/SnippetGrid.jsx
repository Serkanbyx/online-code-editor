import clsx from 'clsx';

import Skeleton from '../common/Skeleton.jsx';
import SnippetCard from './SnippetCard.jsx';

const GRID_CLASSNAME = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

function SkeletonCard() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-fg/10 bg-bg/60">
      <div className="flex items-center justify-between border-b border-fg/5 px-4 py-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton lines={2} />
        <Skeleton className="mt-auto h-24 w-full" />
      </div>
      <div className="flex items-center justify-between border-t border-fg/5 px-4 py-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SnippetGrid({ snippets, loading, skeletonCount = 12, className }) {
  if (loading) {
    return (
      <div className={clsx(GRID_CLASSNAME, className)}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (!snippets?.length) {
    return null;
  }

  return (
    <div className={clsx(GRID_CLASSNAME, className)}>
      {snippets.map((snippet) => (
        <SnippetCard key={snippet._id ?? snippet.id} snippet={snippet} />
      ))}
    </div>
  );
}

export default SnippetGrid;
