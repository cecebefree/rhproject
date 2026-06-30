import { Hero } from '../components/home/Hero'
import { ThreePillars } from '../components/home/ThreePillars'
import { CorePreview } from '../components/home/CorePreview'
import { CommunityLife } from '../components/home/CommunityLife'
import { TrustSignals } from '../components/home/TrustSignals'
import { FinalCTA } from '../components/home/FinalCTA'

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
  )
}