import { useState } from 'react';
import { Modal } from 'react-native';
import { CalendarScreen } from '../../src/screens/CalendarScreen';
import { HomeScreen } from '../../src/screens/HomeScreen';

export default function HomeTab() {
  const [calendarVisible, setCalendarVisible] = useState(false);

  return (
    <>
      <HomeScreen onNavigateToCalendar={() => setCalendarVisible(true)} />
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
