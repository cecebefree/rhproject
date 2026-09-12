// SchoolDeskCommunicationPage — Calls, Meetings, Emails to enrolled profiles only
// Tabs: Inbox (inbound), Outbox (outbound), Meetings, Compose

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseUntyped as supabase } from '../services/supabase';
import {
  type Communication,
  type Meeting,
  type MeetingParticipant,
  type CommType,
  type CallOutcome,
  type MeetingType,
  type MeetingStatus,
  selectCommunications,
  insertCommunication,
  deleteCommunication,
  selectMeetings,
  insertMeeting,
  updateMeeting,
  deleteMeeting,
  selectMeetingParticipants,
  insertMeetingParticipant,
  selectProfilesByRole,
} from '../services/supabase';

type Tab = 'inbox' | 'outbox' | 'meetings' | 'compose';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
}

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  video: 'Video Call',
  phone: 'Phone Call',
  in_person: 'In Person',
};

const MEETING_STATUS_COLORS: Record<MeetingStatus, { bg: string; text: string }> = {
  scheduled: { bg: '#DBEAFE', text: '#1E40AF' },
  in_progress: { bg: '#D1FAE5', text: '#065F46' },
  completed: { bg: '#F3F4F6', text: '#374151' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  no_show: { bg: '#FEF3C7', text: '#92400E' },
};

export default function SchoolDeskCommunicationPage() {
  const { deskId } = useParams<{ deskId: string }>();
  const tenantId = deskId || import.meta.env.VITE_DEFAULT_TENANT_ID;

  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compose state
  const [composeType, setComposeType] = useState<'call' | 'email'>('email');
  const [composeProfileId, setComposeProfileId] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeOutcome, setComposeOutcome] = useState<CallOutcome>('answered');
  const [composeDuration, setComposeDuration] = useState('');
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  // Meeting state
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>('video');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingDuration, setMeetingDuration] = useState('30');
  const [meetingMaxParticipants, setMeetingMaxParticipants] = useState('15');
  const [meetingParticipantIds, setMeetingParticipantIds] = useState<string[]>([]);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    const { data, error: fetchError } = await selectProfilesByRole(tenantId);
    if (fetchError) setError(fetchError.message);
    else if (data) setProfiles(data as Profile[]);
  }, [tenantId]);

  const fetchCommunications = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectCommunications(tenantId, { limit: 100 });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCommunications((data ?? []) as Communication[]);
    }
    setLoading(false);
  }, [tenantId]);

  const fetchMeetings = useCallback(async () => {
    const { data, error: fetchError } = await selectMeetings(tenantId, { limit: 50 });
    if (fetchError) setError(fetchError.message);
    else if (data) setMeetings(data as Meeting[]);
  }, [tenantId]);

  useEffect(() => {
    fetchProfiles();
    fetchCommunications();
    fetchMeetings();
  }, [fetchProfiles, fetchCommunications, fetchMeetings]);

  // Real-time for communications
  useEffect(() => {
    const channel = supabase
      .channel('school-comm-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'school_desk', table: 'communications', filter: `tenant_id=eq.${tenantId}` },
        () => { fetchCommunications(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'school_desk', table: 'meetings', filter: `tenant_id=eq.${tenantId}` },
        () => { fetchMeetings(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'school_desk', table: 'meeting_participants' },
        () => { fetchMeetings(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchCommunications, fetchMeetings]);

  async function handleSendCommunication() {
    if (!composeProfileId) {
      setComposeError('Select a profile');
      return;
    }
    setComposing(true);
    setComposeError(null);

    const user = (await supabase.auth.getUser()).data.user;
    const { error: insertError } = await insertCommunication({
      tenant_id: tenantId,
      comm_type: composeType,
      direction: 'outbound',
      profile_id: composeProfileId,
      call_duration: composeType === 'call' ? parseInt(composeDuration || '0', 10) : undefined,
      call_outcome: composeType === 'call' ? composeOutcome : undefined,
      call_notes: composeType === 'call' ? composeBody : undefined,
      email_subject: composeType === 'email' ? composeSubject : undefined,
      email_body: composeType === 'email' ? composeBody : undefined,
      email_to: composeType === 'email' ? profiles.find((p) => p.id === composeProfileId)?.email : undefined,
      email_from: composeType === 'email' ? user?.email : undefined,
      email_status: composeType === 'email' ? 'sent' : undefined,
      recorded_by: user?.id,
    });

    setComposing(false);
    if (insertError) {
      setComposeError(insertError.message);
    } else {
      setComposeProfileId('');
      setComposeSubject('');
      setComposeBody('');
      setComposeDuration('');
      setActiveTab('outbox');
      fetchCommunications();
    }
  }

  async function handleCreateMeeting() {
    if (!meetingTitle || !meetingDate || !meetingTime) return;

    const scheduledAt = new Date(`${meetingDate}T${meetingTime}`);
    if (scheduledAt <= new Date()) {
      setMeetingError('Meeting must be scheduled for a future date/time');
      return;
    }

    setCreatingMeeting(true);
    setMeetingError(null);

    const user = (await supabase.auth.getUser()).data.user;

    const { data: meeting, error } = await insertMeeting({
      tenant_id: tenantId,
      title: meetingTitle,
      description: meetingDescription || undefined,
      meeting_type: meetingType,
      meeting_url: meetingUrl || undefined,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: parseInt(meetingDuration, 10),
      organizer_id: user?.id || '',
      max_participants: parseInt(meetingMaxParticipants, 10),
    });

    if (!error && meeting) {
      const results = await Promise.allSettled(
        meetingParticipantIds.map((profileId) =>
          insertMeetingParticipant({
            meeting_id: (meeting as Meeting).id,
            profile_id: profileId,
          })
        )
      );
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        setMeetingError(`${failures.length} participant(s) failed to add`);
      }
      setShowMeetingForm(false);
      setMeetingTitle('');
      setMeetingDescription('');
      setMeetingUrl('');
      setMeetingDate('');
      setMeetingTime('');
      setMeetingDuration('30');
      setMeetingMaxParticipants('15');
      setMeetingParticipantIds([]);
      fetchMeetings();
    } else if (error) {
      setMeetingError(error.message);
    }
    setCreatingMeeting(false);
  }

  const inboundComms = communications.filter((c) => c.direction === 'inbound');
  const outboundComms = communications.filter((c) => c.direction === 'outbound');

  const filteredComms = activeTab === 'inbox' ? inboundComms : outboundComms;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
          <p className="mt-1 text-sm text-gray-500">Internal calls, emails, and online meeting schedules</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {(['inbox', 'outbox', 'meetings', 'compose'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-[#E8A020] text-[#273946]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'inbox' && `📥 Inbox (${inboundComms.length})`}
                {tab === 'outbox' && `📤 Outbox (${outboundComms.length})`}
                {tab === 'meetings' && `📅 Meetings (${meetings.length})`}
                {tab === 'compose' && '✏️ Compose'}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">Error: {error}</div>
        ) : (
          <>
            {/* INBOX / OUTBOX */}
            {(activeTab === 'inbox' || activeTab === 'outbox') && (
              <div className="space-y-3">
                {filteredComms.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No {activeTab === 'inbox' ? 'incoming' : 'outgoing'} communications
                  </div>
                ) : (
                  filteredComms.map((comm) => {
                    const profile = profiles.find((p) => p.id === comm.profile_id);
                    return (
                      <div key={comm.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{comm.comm_type === 'call' ? '📞' : '✉️'}</span>
                            <div>
                              <div className="font-medium text-gray-900">
                                {comm.comm_type === 'call'
                                  ? `${comm.direction === 'inbound' ? 'Call from' : 'Call to'} ${profile?.name || 'Unknown'}`
                                  : `${comm.direction === 'inbound' ? 'Email from' : 'Email to'} ${profile?.name || 'Unknown'}`
                                }
                              </div>
                              {comm.comm_type === 'call' && comm.call_outcome && (
                                <div className="text-sm text-gray-500">
                                  Outcome: {comm.call_outcome}
                                  {comm.call_duration ? ` • ${Math.round(comm.call_duration / 60)}m` : ''}
                                </div>
                              )}
                              {comm.comm_type === 'email' && comm.email_subject && (
                                <div className="text-sm text-gray-500">Subject: {comm.email_subject}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(comm.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Delete this communication?')) {
                                await deleteCommunication(comm.id);
                                fetchCommunications();
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* MEETINGS */}
            {activeTab === 'meetings' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={() => setShowMeetingForm(true)}
                    className="px-4 py-2 bg-[#273946] text-white rounded text-sm font-medium hover:bg-[#112430]"
                  >
                    + Schedule Meeting
                  </button>
                </div>
                <div className="space-y-3">
                  {meetings.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No meetings scheduled</div>
                  ) : (
                    meetings.map((meeting) => {
                      const statusColors = MEETING_STATUS_COLORS[meeting.status];
                      return (
                        <div key={meeting.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{meeting.title}</span>
                                <span
                                  className="px-2 py-0.5 text-xs font-semibold rounded-full"
                                  style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
                                >
                                  {meeting.status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {MEETING_TYPE_LABELS[meeting.meeting_type]} • {meeting.duration_minutes}min • Max {meeting.max_participants}
                              </div>
                              {meeting.meeting_url && (
                                <div className="text-xs text-blue-600 mt-1">
                                  🔗 <a href={meeting.meeting_url} target="_blank" rel="noreferrer" className="underline">{meeting.meeting_url}</a>
                                </div>
                              )}
                            </div>
                            <div className="text-right text-xs text-gray-400">
                              <div>{new Date(meeting.scheduled_at).toLocaleDateString()}</div>
                              <div>{new Date(meeting.scheduled_at).toLocaleTimeString()}</div>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            {meeting.status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateMeeting(meeting.id, { status: 'cancelled' });
                                  fetchMeetings();
                                }}
                                className="text-xs text-yellow-600 hover:text-yellow-800"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm('Delete this meeting?')) {
                                  await deleteMeeting(meeting.id);
                                  fetchMeetings();
                                }
                              }}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* COMPOSE */}
            {activeTab === 'compose' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 max-w-2xl">
                <h2 className="text-lg font-semibold mb-4">Compose Communication</h2>
                {composeError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded text-sm mb-4">{composeError}</div>
                )}

                {/* Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setComposeType('email')}
                      className={`px-4 py-2 rounded text-sm font-medium border ${
                        composeType === 'email'
                          ? 'bg-[#273946] text-white border-[#273946]'
                          : 'bg-white text-gray-600 border-gray-300'
                      }`}
                    >
                      ✉️ Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposeType('call')}
                      className={`px-4 py-2 rounded text-sm font-medium border ${
                        composeType === 'call'
                          ? 'bg-[#273946] text-white border-[#273946]'
                          : 'bg-white text-gray-600 border-gray-300'
                      }`}
                    >
                      📞 Call Log
                    </button>
                  </div>
                </div>

                {/* Profile */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient (Enrolled Profile)
                  </label>
                  <select
                    value={composeProfileId}
                    onChange={(e) => setComposeProfileId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select profile...</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role}) — {p.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email fields */}
                {composeType === 'email' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        placeholder="Email subject"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                      <textarea
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        placeholder="Write your email..."
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Call fields */}
                {composeType === 'call' && (
                  <>
                    <div className="mb-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                        <select
                          value={composeOutcome}
                          onChange={(e) => setComposeOutcome(e.target.value as CallOutcome)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="answered">Answered</option>
                          <option value="missed">Missed</option>
                          <option value="voicemail">Voicemail</option>
                          <option value="busy">Busy</option>
                          <option value="no_answer">No Answer</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
                        <input
                          type="number"
                          value={composeDuration}
                          onChange={(e) => setComposeDuration(e.target.value)}
                          placeholder="120"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        placeholder="Call notes..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleSendCommunication}
                  disabled={composing}
                  className="px-6 py-2 bg-[#273946] text-white rounded text-sm font-medium hover:bg-[#112430] disabled:opacity-50"
                >
                  {composing ? 'Sending...' : composeType === 'email' ? 'Send Email' : 'Log Call'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Schedule Meeting Modal */}
      {showMeetingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowMeetingForm(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Schedule Online Meeting</h2>
              <p className="text-xs text-gray-500">Max 15 participants for online meetings</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              {meetingError && (
                <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{meetingError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Meeting title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="video">Video Call</option>
                    <option value="phone">Phone Call</option>
                    <option value="in_person">In Person</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={meetingDuration}
                    onChange={(e) => setMeetingDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting URL</label>
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participants ({meetingParticipantIds.length}/{meetingMaxParticipants})
                </label>
                <select
                  multiple
                  value={meetingParticipantIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (o) => o.value);
                    if (selected.length <= parseInt(meetingMaxParticipants, 10)) {
                      setMeetingParticipantIds(selected);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  size={5}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowMeetingForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateMeeting}
                disabled={creatingMeeting}
                className="px-4 py-2 bg-[#273946] text-white rounded text-sm font-medium hover:bg-[#112430] disabled:opacity-50"
              >
                {creatingMeeting ? 'Creating...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
