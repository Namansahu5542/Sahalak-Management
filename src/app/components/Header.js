import Link from "next/link";
export default function Header() {
    return (
        <header className="topbar">
            <a className="brand" href="#top" aria-label="Sahalak home">
                <span className="brand-mark">S</span>Sahalak
            </a>
            <nav className="nav" aria-label="Main navigation">
                <Link href="#journey">How it works</Link>
                <Link href="#businesses">For businesses</Link>
                <Link href="#workers">For workers</Link>
            </nav>
            <div className="auth">
                <Link className="login" href="./choose-role/login">Log in</Link>
                <Link className="signup" href="./choose-role/signup">Sign up</Link>
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