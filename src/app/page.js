import Header from "./components/Header";
import Hero from "./components/Hero";
import MarketJourney from "./components/MarketJourney";
import Footer from "./components/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <section className="intro" id="businesses">
          <div className="eyebrow"><i /> A better way to work local <i /></div>
          <h2>Good people make<br />great markets.</h2>
          <p>Find nearby workers when business gets busy, or find flexible work close to home. Sahalak helps both sides connect.</p>
          <div className="audiences">
            <a className="audience" href="#journey"><span>For businesses</span><strong>Bring in the help you need.</strong><b>Post a shift or longer role <i>→</i></b></a>
            <a className="audience" id="workers" href="#journey"><span>For workers</span><strong>Find work that fits your life.</strong><b>Explore nearby opportunities <i>→</i></b></a>
          </div>
        </section>
        <MarketJourney />
      </main>
      <Footer />
    </>
  );
}