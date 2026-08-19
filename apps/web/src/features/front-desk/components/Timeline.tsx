import { useActivityTimeline } from '../hooks/useActivityTimeline';
import type { TimelineEntry } from '../../../types/front-desk';

interface TimelineProps {
  inquiryId: string | null;
  maxEntries?: number;
}

export function Timeline({ inquiryId, maxEntries = 50 }: TimelineProps) {
  const { timeline, loading, error } = useActivityTimeline(inquiryId);

  if (!inquiryId) {
    return <div className="p-4 text-gray-500 text-sm">Select an inquiry to view timeline</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">Error: {error}</div>;
  }

  const displayedTimeline = timeline.slice(0, maxEntries);

  const getActionBadgeColor = (desk: string, action: string): string => {
    if (desk === 'front') {
      if (action.includes('call')) return 'bg-purple-100 text-purple-800';
      if (action.includes('escalat')) return 'bg-red-100 text-red-800';
      if (action.includes('categor')) return 'bg-yellow-100 text-yellow-800';
      return 'bg-gray-100 text-gray-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 p-4 border-b">
        <h3 className="font-bold text-lg">Activity Timeline</h3>
        <span className="text-xs text-gray-500">{timeline.length} entries</span>
      </div>

      {loading ? (
        <div className="p-4 text-center text-gray-500">Loading timeline...</div>
      ) : timeline.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">No activity recorded</div>
      ) : (
        <div className="space-y-4 p-4 max-h-96 overflow-y-auto">
          {displayedTimeline.map((entry: TimelineEntry, index: number) => (
            <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1"></div>
                {index < displayedTimeline.length - 1 && <div className="w-0.5 h-12 bg-gray-300 my-1"></div>}
              </div>

              {/* Entry content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getActionBadgeColor(
                        entry.desk,
                        entry.action
                      )}`}
                    >
                      {entry.action}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {entry.ts
                      ? new Date(entry.ts).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </div>
                </div>

                {/* Performer */}
                <div className="text-xs text-gray-600 mt-1">
                  By <span className="font-semibold">{entry.performed_by || 'System'}</span>
                </div>

                {/* Notes */}
                {entry.notes && (
                  <div className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                    {entry.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {timeline.length > maxEntries && (
        <div className="p-4 text-center text-xs text-gray-500 border-t">
          Showing {maxEntries} of {timeline.length} entries
        </div>
      )}
    </div>
  );
}
