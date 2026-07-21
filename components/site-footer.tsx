import Link from "next/link";
import { NotZeroMark } from "@/components/notzero-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-grid">
        <div className="footer-brand">
          <Link className="wordmark" href="/" aria-label="NotZero home">
            <NotZeroMark className="wordmark-mark" />
            <span className="wordmark-text">Not<span>Zero</span></span>
          </Link>
          <p>You are not starting from zero.</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/method">Method</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/demo">Try the demo</Link>
        </nav>
      </div>
      <div className="page-shell footer-meta">
        <p>The prepared demo uses fictional evidence. Bring only material you can safely share.</p>
        <p>MIT licensed prototype · 2026</p>
      </div>
    </footer>
  );
}
