export default function Header() {
    return (
        <header className="topbar">
            <a className="brand" href="#top" aria-label="Sahalak home">
                <span className="brand-mark">S</span>Sahalak
            </a>
            <nav className="nav" aria-label="Main navigation">
                <a href="#journey">How it works</a>
                <a href="#businesses">For businesses</a>
                <a href="#workers">For workers</a>
            </nav>
            <div className="auth">
                <a className="login" href="#login">Log in</a>
                <a className="signup" href="#signup">Sign up</a>
            </div>
            <details className="mobile-menu">
                <summary aria-label="Open menu">☰</summary>
                <nav aria-label="Mobile navigation">
                    <a href="#journey">How it works</a>
                    <a href="#businesses">For businesses</a>
                    <a href="#workers">For workers</a>
                </nav>
            </details>
        </header>
    );
}