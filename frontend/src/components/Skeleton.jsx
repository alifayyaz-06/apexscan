import React from 'react';

export function SkeletonBlock({ className = '' }) {
  return <div className={`bg-slate-200 animate-pulse rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm animate-fade-in">
      <SkeletonBlock className="w-full h-32 mb-3 rounded-lg" />
      <SkeletonBlock className="w-3/4 h-4 mb-2" />
      <SkeletonBlock className="w-1/2 h-3 mb-2" />
      <SkeletonBlock className="w-1/3 h-4" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }) {
  return (
    <tr className="animate-fade-in">
      {Array.from({ length: cols }, (_, i) => (
        <td key={i} className="py-3 px-4">
          <SkeletonBlock className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonList({ count = 4, type = 'card' }) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <table className="w-full">
        <tbody>
          {Array.from({ length: count }, (_, i) => (
            <SkeletonTableRow key={i} />
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
