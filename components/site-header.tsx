import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="page-shell header-inner">
        <Link className="wordmark" href="/" aria-label="NotZero home">
          Not<span>Zero</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/method">Method</Link>
          <Link href="/privacy">Privacy</Link>
          <Link className="nav-cta" href="/demo">Try the demo</Link>
        </nav>
      </div>
    </header>
  );
}
