import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Registration {
  id: string;
  tenant_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  course_name: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type ZoneKey = 'front-desk' | 'office-desk' | 'school-desk' | 'crm';

interface CalendarEvent {
  id: string;
  title: string;
  zone: ZoneKey;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  dayOfWeek: number; // 0=Mon, 4=Fri
  raw: Registration;
}

interface ZoneConfig {
  key: ZoneKey;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ZONES: ZoneConfig[] = [
  {
    key: 'front-desk',
    label: 'Front Desk',
    icon: 'concierge',
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.08)',
    borderColor: 'rgba(59,130,246,0.25)',
  },
  {
    key: 'office-desk',
    label: 'Office Desk',
    icon: 'business_center',
    color: '#22C55E',
    bgColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.25)',
  },
  {
    key: 'school-desk',
    label: 'School Desk',
    icon: 'school',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  {
    key: 'crm',
    label: 'CRM',
    icon: 'person_search',
    color: '#A855F7',
    bgColor: 'rgba(168,85,247,0.08)',
    borderColor: 'rgba(168,85,247,0.25)',
  },
];

const STATUS_TO_ZONE: Record<string, ZoneKey> = {
  pending_init: 'front-desk',
  pending_review: 'office-desk',
  approved: 'school-desk',
  active: 'crm',
};

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 8 AM – 5 PM
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // getDay(): 0=Sun, 1=Mon … 6=Sat → shift to Mon-start
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`;
}

function mapRegistrationToEvent(reg: Registration, weekStart: Date): CalendarEvent | null {
  const zone = STATUS_TO_ZONE[reg.status] ?? 'front-desk';
  const createdAt = new Date(reg.created_at);

  // Determine which day of the week this falls on (0=Mon..4=Fri)
  const dayOfWeek = Math.floor((createdAt.getTime() - weekStart.getTime()) / 86400000);
  if (dayOfWeek < 0 || dayOfWeek > 4) return null;

  // Use created_at hour for start, clamp to 8-16 range
  const rawHour = createdAt.getHours();
  const startHour = Math.max(8, Math.min(rawHour, 16));
  const startMinute = createdAt.getMinutes();
  const endHour = Math.min(startHour + 1, 17);
  const endMinute = startMinute;

  const familyName = reg.student_name || 'Unknown';
  const courseLabel = reg.course_name ? ` — ${reg.course_name}` : '';

  return {
    id: reg.id,
    title: familyName,
    zone,
    startHour,
    startMinute,
    endHour,
    endMinute,
    dayOfWeek,
    raw: reg,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EventBlock({
  event,
  zone,
  onClick,
}: { event: CalendarEvent; zone: ZoneConfig; onClick: () => void }) {
  const topPx = (event.startHour - 8) * 64 + (event.startMinute / 60) * 64;
  const heightPx = Math.max(
    (((event.endHour - event.startHour) * 60 + (event.endMinute - event.startMinute)) / 60) * 64,
    24
  );

  return (
    <button type="button"
      onClick={onClick}
      className="absolute left-1 right-1 rounded-md text-left overflow-hidden transition-all duration-150 hover:shadow-md cursor-pointer group"
      style={{
        top: `${topPx}px`,
        height: `${heightPx}px`,
        backgroundColor: zone.bgColor,
        borderLeft: `3px solid ${zone.color}`,
        border: `1px solid ${zone.borderColor}`,
        borderLeftWidth: '3px',
        zIndex: 10,
      }}
    >
      <div className="px-2 py-1 h-full flex flex-col">
        <span
          className="text-xs font-semibold truncate leading-tight"
          style={{ color: zone.color, fontSize: '11px' }}
        >
          {event.title}
        </span>
        {heightPx > 32 && (
          <span className="text-xs truncate" style={{ color: '#54626C', fontSize: '10px' }}>
            {String(event.startHour).padStart(2, '0')}:{String(event.startMinute).padStart(2, '0')}
          </span>
        )}
        {heightPx > 48 && event.raw.course_name && (
          <span className="text-xs truncate mt-0.5" style={{ color: '#9CA3AF', fontSize: '10px' }}>
            {event.raw.course_name}
          </span>
        )}
      </div>
    </button>
  );
}

function EventDetailModal({
  event,
  zone,
  onClose,
}: {
  event: CalendarEvent;
  zone: ZoneConfig;
  onClose: () => void;
}) {
  const reg = event.raw;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="absolute inset-0 bg-black/40" onKeyDown={(e) => e.stopPropagation()} />
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
        style={{ border: `1px solid ${zone.borderColor}` }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: zone.bgColor, border: `1px solid ${zone.borderColor}` }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px', color: zone.color }}
              >
                {zone.icon}
              </span>
            </div>
            <div>
              <h3
                style={{
                  fontFamily: '"EB Garamond", serif',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#1A242B',
                }}
              >
                {reg.student_name}
              </h3>
              <p className="text-xs" style={{ color: '#54626C' }}>
                {zone.label}
              </p>
            </div>
          </div>
          <button type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: '#54626C' }}
            >
              close
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Email" value={reg.student_email} />
            <DetailField label="Phone" value={reg.student_phone || '—'} />
            <DetailField label="Course" value={reg.course_name || '—'} />
            <DetailField label="Status" value={reg.status.replace(/_/g, ' ')} />
            <DetailField
              label="Created"
              value={new Date(reg.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            />
            <DetailField
              label="Updated"
              value={new Date(reg.updated_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            />
          </div>
          {reg.notes && (
            <div>
              <p
                className="text-xs uppercase tracking-wider mb-1"
                style={{
                  color: '#54626C',
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                }}
              >
                Notes
              </p>
              <p
                className="text-sm rounded-lg p-3"
                style={{
                  backgroundColor: '#f4f3f0',
                  color: '#1A242B',
                  border: '1px solid rgba(195,199,204,0.2)',
                }}
              >
                {reg.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-end gap-3"
          style={{ borderTop: '1px solid rgba(195,199,204,0.2)', backgroundColor: '#faf9f6' }}
        >
          <button type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium transition-colors cursor-pointer"
            style={{
              border: '1px solid rgba(195,199,204,0.5)',
              backgroundColor: '#fff',
              color: '#1A242B',
              fontSize: '11px',
              letterSpacing: '0.12em',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-xs uppercase tracking-wider mb-0.5"
        style={{ color: '#54626C', fontSize: '10px', letterSpacing: '0.12em', fontWeight: 600 }}
      >
        {label}
      </p>
      <p className="text-sm" style={{ color: '#1A242B' }}>
        {value}
      </p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ZonesCalendarPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeZones, setActiveZones] = useState<Set<ZoneKey>>(new Set(ZONES.map((z) => z.key)));
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const weekStart = useMemo(() => {
    const now = new Date();
    const start = getWeekStart(now);
    start.setDate(start.getDate() + weekOffset * 7);
    return start;
  }, [weekOffset]);

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 5); // Mon + 5 = Sat (exclusive upper bound)
    end.setHours(0, 0, 0, 0);
    return end;
  }, [weekStart]);

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('office_desk.registrations')
        .select('*')
        .eq('tenant_id', import.meta.env.VITE_DEFAULT_TENANT_ID)
        .is('deleted_at', null)
        .gte('created_at', weekStart.toISOString())
        .lt('created_at', weekEnd.toISOString())
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setRegistrations((data as Registration[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const events = useMemo(
    () =>
      registrations
        .map((r) => mapRegistrationToEvent(r, weekStart))
        .filter((e): e is CalendarEvent => e !== null && activeZones.has(e.zone)),
    [registrations, weekStart, activeZones]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.dayOfWeek) || [];
      list.push(ev);
      map.set(ev.dayOfWeek, list);
    }
    return map;
  }, [events]);

  const toggleZone = useCallback((zoneKey: ZoneKey) => {
    setActiveZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneKey)) {
        if (next.size > 1) next.delete(zoneKey);
      } else {
        next.add(zoneKey);
      }
      return next;
    });
  }, []);

  const goToPrevWeek = useCallback(() => setWeekOffset((w) => w - 1), []);
  const goToNextWeek = useCallback(() => setWeekOffset((w) => w + 1), []);
  const goToToday = useCallback(() => setWeekOffset(0), []);

  const selectedZone = selectedEvent ? ZONES.find((z) => z.key === selectedEvent.zone) : null;

  return (
    <AdminLayout activeDesk="office-desk">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: '"EB Garamond", serif',
              fontSize: '28px',
              fontWeight: 500,
              color: '#1A242B',
            }}
          >
            Zones & Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: '#54626C' }}>
            Zone management and weekly scheduling overview.
          </p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={goToPrevWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(195,199,204,0.3)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px', color: '#273946' }}
            >
              chevron_left
            </span>
          </button>
          <button type="button"
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            style={{
              fontSize: '11px',
              letterSpacing: '0.12em',
              border: '1px solid rgba(195,199,204,0.3)',
              backgroundColor: weekOffset === 0 ? '#273946' : '#fff',
              color: weekOffset === 0 ? '#fff' : '#273946',
            }}
          >
            Today
          </button>
          <button type="button"
            onClick={goToNextWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(195,199,204,0.3)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px', color: '#273946' }}
            >
              chevron_right
            </span>
          </button>
          <span
            className="ml-3 text-sm font-medium"
            style={{ color: '#1A242B', fontFamily: '"EB Garamond", serif' }}
          >
            {formatDateRange(weekStart)}
          </span>
        </div>
      </div>

      {/* Zone Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {ZONES.map((zone) => {
          const isActive = activeZones.has(zone.key);
          return (
            <button type="button"
              key={zone.key}
              onClick={() => toggleZone(zone.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer"
              style={{
                fontSize: '11px',
                letterSpacing: '0.12em',
                backgroundColor: isActive ? zone.bgColor : '#fff',
                border: `1px solid ${isActive ? zone.borderColor : 'rgba(195,199,204,0.3)'}`,
                color: isActive ? zone.color : '#54626C',
                opacity: isActive ? 1 : 0.6,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {zone.icon}
              </span>
              {zone.label}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <span
            className="material-symbols-outlined animate-spin"
            style={{ fontSize: '24px', color: '#54626C' }}
          >
            progress_activity
          </span>
          <span className="ml-3 text-sm" style={{ color: '#54626C' }}>
            Loading calendar…
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-16">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '24px', color: '#dc3545' }}
          >
            error
          </span>
          <span className="ml-3 text-sm" style={{ color: '#dc3545' }}>
            {error}
          </span>
        </div>
      )}

      {/* Calendar Grid */}
      {!loading && !error && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: '1px solid rgba(39,57,70,0.1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Day Headers */}
              <div className="grid" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
                <div
                  style={{
                    borderRight: '1px solid rgba(195,199,204,0.2)',
                    borderBottom: '1px solid rgba(195,199,204,0.2)',
                    backgroundColor: '#faf9f6',
                  }}
                />
                {DAY_NAMES.map((day, i) => {
                  const date = new Date(weekStart);
                  date.setDate(date.getDate() + i);
                  const isToday = new Date().toDateString() === date.toDateString();
                  return (
                    <div
                      key={day}
                      className="text-center py-3"
                      style={{
                        borderRight: i < 4 ? '1px solid rgba(195,199,204,0.2)' : undefined,
                        borderBottom: '1px solid rgba(195,199,204,0.2)',
                        backgroundColor: isToday ? 'rgba(232,160,32,0.05)' : '#faf9f6',
                      }}
                    >
                      <span
                        className="text-xs font-semibold uppercase"
                        style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#54626C' }}
                      >
                        {day}
                      </span>
                      <span
                        className="block text-lg font-medium mt-0.5"
                        style={{
                          fontFamily: '"EB Garamond", serif',
                          color: isToday ? '#E8A020' : '#1A242B',
                        }}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Time Grid */}
              <div className="grid" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
                {HOURS.map((hour) => (
                  <div key={hour} className="contents">
                    {/* Time Label */}
                    <div
                      className="text-right pr-3 pt-1"
                      style={{
                        height: '64px',
                        borderRight: '1px solid rgba(195,199,204,0.2)',
                        borderBottom: '1px solid rgba(195,199,204,0.1)',
                      }}
                    >
                      <span className="text-xs" style={{ color: '#54626C', fontSize: '11px' }}>
                        {String(hour).padStart(2, '0')}:00
                      </span>
                    </div>

                    {/* Day Cells */}
                    {Array.from({ length: 5 }, (_, dayIdx) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: grid position is stable
                        key={`${hour}-${dayIdx}`}
                        className="relative"
                        style={{
                          height: '64px',
                          borderRight: dayIdx < 4 ? '1px solid rgba(195,199,204,0.2)' : undefined,
                          borderBottom: '1px solid rgba(195,199,204,0.1)',
                          backgroundColor: dayIdx === 4 ? 'rgba(195,199,204,0.03)' : undefined,
                        }}
                      >
                        {/* Events in this cell */}
                        {hour === HOURS[0] &&
                          (eventsByDay.get(dayIdx) || [])
                            .filter((ev) => ev.startHour === hour)
                            .map((ev) => {
                              const zone = ZONES.find((z) => z.key === ev.zone)!;
                              return (
                                <EventBlock
                                  key={ev.id}
                                  event={ev}
                                  zone={zone}
                                  onClick={() => setSelectedEvent(ev)}
                                />
                              );
                            })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Bar */}
      {!loading && !error && (
        <div className="flex flex-wrap items-center gap-6 text-xs" style={{ color: '#54626C' }}>
          <span
            className="font-semibold uppercase"
            style={{ fontSize: '11px', letterSpacing: '0.12em' }}
          >
            {events.length} event{events.length !== 1 ? 's' : ''} this week
          </span>
          {ZONES.filter((z) => activeZones.has(z.key)).map((zone) => {
            const count = events.filter((e) => e.zone === zone.key).length;
            return (
              <span key={zone.key} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: zone.color }}
                />
                {zone.label}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && selectedZone && (
        <EventDetailModal
          event={selectedEvent}
          zone={selectedZone}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </AdminLayout>
  );
}
