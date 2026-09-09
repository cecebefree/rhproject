import type { TimelineEvent } from '../index';

export function Timeline({
  events = [],
  inquiryId,
}: { events?: TimelineEvent[]; inquiryId?: string | null }) {
  return (
    <div>
      {events.map((e, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={`${e.type}-${i}`}>{e.type}</div>
      ))}
    </div>
  );
}
