import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { Home } from './pages/Home';
import { PlaceholderPage } from './pages/PlaceholderPage';

function App() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/cambridge-curriculum"
            element={<PlaceholderPage title="Cambridge Curriculum" />}
          />
          <Route path="/ib-curriculum" element={<PlaceholderPage title="IB Curriculum" />} />
          <Route path="/homeschool" element={<PlaceholderPage title="Home School" />} />
          <Route path="/sup/devotional" element={<PlaceholderPage title="Devotional" />} />
          <Route path="/sup/enrichment" element={<PlaceholderPage title="Enrichment Courses" />} />
          <Route path="/sup/clubs" element={<PlaceholderPage title="Clubs" />} />
          <Route path="/sup/music-art" element={<PlaceholderPage title="Music & Art" />} />
          <Route path="/social/life-events" element={<PlaceholderPage title="Life Events" />} />
          <Route
            path="/social/student-council"
            element={<PlaceholderPage title="Student Council" />}
          />
          <Route path="/social/students" element={<PlaceholderPage title="Students" />} />
          <Route path="/social/families" element={<PlaceholderPage title="Families" />} />
          <Route path="/social/alumni" element={<PlaceholderPage title="Alumni" />} />
          <Route
            path="/social/travel-outings"
            element={<PlaceholderPage title="Travel & Outings" />}
          />
          <Route path="/services/experts" element={<PlaceholderPage title="Experts" />} />
          <Route
            path="/services/university"
            element={<PlaceholderPage title="University Guidance" />}
          />
          <Route path="/about" element={<PlaceholderPage title="About Us" />} />
          <Route path="/registration" element={<PlaceholderPage title="Registration" />} />
          <Route path="/pricing" element={<PlaceholderPage title="Pricing & Fees" />} />
          <Route path="/zones-calendar" element={<PlaceholderPage title="Zones & Calendar" />} />
          <Route path="/faq" element={<PlaceholderPage title="FAQ" />} />
          <Route path="/knowledge-base" element={<PlaceholderPage title="Knowledge Base" />} />
          <Route path="/blog" element={<PlaceholderPage title="Blog & News" />} />
          <Route path="/careers" element={<PlaceholderPage title="Careers & Teachers" />} />
          <Route path="/main-contact" element={<PlaceholderPage title="Contact Us" />} />
          <Route
            path="/schedule-meeting"
            element={<PlaceholderPage title="Schedule a Meeting" />}
          />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
