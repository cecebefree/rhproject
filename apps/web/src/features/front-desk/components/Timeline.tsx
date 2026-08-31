import { TimelineEvent } from '../index';

export function Timeline({ events = [], inquiryId }: { events?: TimelineEvent[]; inquiryId?: string | null }) {
  return <div>{events.map((e, i) => <div key={i}>{e.type}</div>)}</div>;
}
