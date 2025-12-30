import Header from '@/components/header';
import Hero from '@/components/hero';
import OurServices from '@/components/services';
import Footer from '@/components/footer';
import Join from '@/components/Join';
import Partners from '@/components/partners';
import ContactUs from '@/components/contactUs';
import MarketSummary from '@/components/market';
import { MarketHero } from '@/components/market-hero';
import MarketCardGrid from '@/components/market-card-grid';
import BackToTop from '@/components/back-to-top';

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white" id="home">
      <Header />
      <Hero />
      <MarketSummary />
      <MarketHero />
      <div id="securities" className="-mt-12 relative z-10">
        <MarketCardGrid />
      </div>
      <OurServices />
      <Join />
      <Partners />
      <ContactUs />
      <Footer />
      <BackToTop />
    </div>
  );
}