export default function Hero() {
    return (
        <section className="hero" aria-labelledby="hero-title">
            <div className="hero-inner">
                <div className="hero-content">
                    <div className="eyebrow"><i /> Flexible work for a thriving market</div>
                    <h1 id="hero-title">Find trusted help<br /><em>for every shift.</em></h1>
                    <p className="hero-copy">
                        Need an extra pair of hands for today, the busy season, or a longer role?
                        Sahalak connects market businesses with nearby workers. Set the dates,
                        share the details, and find the right help—or discover your next local opportunity.
                    </p>
                    <div className="actions">
                        <a className="primary" href="#businesses">Find a worker <span aria-hidden="true">→</span></a>
                        <a className="watch" href="#workers"><span className="play" aria-hidden="true">↗</span> Find work</a>
                    </div>
                    <div className="hero-proof"><span>✓</span> Short shifts and longer roles, all in one place</div>
                </div>
                <div className="hero-scene" aria-hidden="true">
                    <div className="sun" />
                    <div className="scene-ground" />
                    <div className="scene-road" />
                    <div className="floating-tag"> Market <span>● Hiring</span></div>
                    <div className="scene-shop">
                        <div className="scene-roof" />
                        <div className="scene-sign">LOCAL BUSINESS</div>
                        <div className="scene-windows"><div className="scene-window" /><div className="scene-door" /><div className="scene-window" /></div>
                    </div>
                    <div className="scene-person"><span className="person-head" /><span className="person-body" /><span className="person-leg left" /><span className="person-leg right" /></div>
                    <div className="plant one">🪴</div><div className="plant two">🌿</div>
                </div>
            </div>
            <div className="hero-bottom">People and opportunity, closer to home</div>
        </section>
    );
}