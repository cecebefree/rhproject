import { CommunityLife } from '../components/home/CommunityLife';
import { CorePreview } from '../components/home/CorePreview';
import { FinalCTA } from '../components/home/FinalCTA';
import { Hero } from '../components/home/Hero';
import { ThreePillars } from '../components/home/ThreePillars';
import { TrustSignals } from '../components/home/TrustSignals';

export function Home() {
  return (
    <>
      <Hero />
      <ThreePillars />
      <CorePreview />
      <CommunityLife />
      <TrustSignals />
      <FinalCTA />
    </>
  );
}
