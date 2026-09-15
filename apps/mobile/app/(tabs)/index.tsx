import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarScreen } from '../../src/screens/CalendarScreen';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { fetchMasterSchedule, type ScheduleEvent } from '../../src/lib/scheduleClient';
import { fetchPublishedNews, type NewsArticle } from '../../src/lib/newsClient';

export default function HomeTab() {
  const router = useRouter();
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      const { events, error } = await fetchMasterSchedule('');
      if (!cancelled) {
        setScheduleEvents(events);
        setScheduleError(error);
      }
    }

    loadSchedule();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      setNewsLoading(true);
      const { articles, error } = await fetchPublishedNews(5);
      if (!cancelled) {
        setNewsArticles(articles);
        setNewsLoading(false);
      }
    }

    loadNews();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <HomeScreen
        onNavigateToCalendar={() => setCalendarVisible(true)}
        onNavigateToDevotional={() => router.push('/devotional')}
        scheduleEvents={scheduleEvents}
        scheduleError={scheduleError}
        newsArticles={newsArticles}
        newsLoading={newsLoading}
      />
      <Modal visible={calendarVisible} animationType="slide" presentationStyle="fullScreen">
        <CalendarScreen
          onBack={() => setCalendarVisible(false)}
          onNavigateToClass={() => setCalendarVisible(false)}
          onNavigateToProfile={() => setCalendarVisible(false)}
        />
      </Modal>
    </>
  );
}
