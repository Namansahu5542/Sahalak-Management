export default function Footer() {
    return (
        <footer className="footer" id="signup">
            <div className="footer-inner">
                <div>
                    <div className="eyebrow eyebrow-light"><i /> Your market is waiting</div>
                    <h2>Good work<br />starts nearby.</h2>
                    <p>Bring local businesses and local talent together, one shift at a time.</p>
                    <div className="footer-actions">
                        <a className="footer-cta" href="#businesses">I need a worker →</a>
                        <a className="footer-cta secondary" href="#workers">I’m looking for work</a>
                    </div>
                </div>
                <nav aria-label="Footer navigation"><a href="#top">About Sahalak</a><a href="#businesses">For businesses</a><a href="#workers">For workers</a><a href="mailto:hello@sahalak.example">Contact</a><a id="login" href="#top">Log in</a></nav>
            </div>
            <div className="footer-bottom"><span>© 2026 Sahalak Management</span><span>Made for the markets we call home.</span></div>
        </footer>
    );
}