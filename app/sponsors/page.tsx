import Link from "next/link";

const sponsors = [
  { name: "Frontier Tower", contribution: "Venue", logo: "/sponsors/frontiertower.png", url: "https://frontiertower.io", invert: false },
  { name: "Amazon AGI Labs", contribution: "Project Sponsor", logo: "/sponsors/amazon.svg", url: "https://labs.amazon.science/", invert: true },
  { name: "Bee", contribution: "Lobster Rolls", logo: "/sponsors/bee.svg", url: "https://www.bee.computer/", invert: false },
  { name: "Convex", contribution: "Pizza", logo: "/sponsors/convex.svg", url: "https://convex.dev", invert: false },
  { name: "CRS Credit API", contribution: "Mediterranean", logo: "/sponsors/crs.svg", url: "https://crscreditapi.com/", invert: true },
  { name: "Kilo.ai", contribution: "Crab", logo: "/sponsors/kilo.svg", url: "https://kilo.ai", invert: false },
  { name: "Greycroft", contribution: "Drinks & Snacks", logo: "/sponsors/greycroft.svg", url: "https://www.greycroft.com/", invert: true },
  { name: "CodeRabbit", contribution: "Drinks & Snacks", logo: "/sponsors/coderabbit.svg", url: "https://www.coderabbit.ai/", invert: true },
  { name: "Cua", contribution: "Drinks & Snacks", logo: "/sponsors/cua.svg", url: "https://cua.ai/", invert: false },
  { name: "Cline", contribution: "Drinks & Utensils", logo: "/sponsors/cline.svg", url: "https://cline.bot/", invert: true },
  { name: "Render", contribution: "Claws, Chips, Cola & Credits", logo: "/sponsors/render.svg", url: "https://render.com", invert: false },
  { name: "ElevenLabs", contribution: "Drinks & Snacks", logo: "/sponsors/elevenlabs.svg", url: "https://elevenlabs.io/", invert: false },
  { name: "DigitalOcean", contribution: "Drinks", logo: "/sponsors/digitalocean.svg", url: "https://www.digitalocean.com/", invert: false },
  { name: "Rippling", contribution: "Lobster Plushies", logo: "/sponsors/rippling.svg", url: "https://www.rippling.com/", invert: true },
  { name: "Dabl Club", contribution: "Event Support", logo: "/sponsors/dabl.svg", url: "https://dabl.club", invert: false },
  { name: "Love Haight Computers", contribution: "Mac Mini Giveaway", logo: "", url: "https://www.lovehaightcomputers.com/", invert: false, textOnly: true },
];

export const metadata = {
  title: "Sponsors – ClawCon SF",
  description: "Thank you to the sponsors of the 1st OpenClaw SF Show & Tell.",
};

export default function SponsorsPage() {
  return (
    <>
      <style>{`
        .sp-body { min-height: 100vh; background: #0b0b12; font-family: 'Inter', -apple-system, system-ui, sans-serif; }
        .sp-header { background: #ff6600; padding: 4px 8px; display: flex; align-items: center; gap: 12px; }
        .sp-header a, .sp-header span { font-family: Verdana, Geneva, sans-serif; text-decoration: none; color: #000; }
        .sp-logo { display: flex; align-items: center; gap: 6px; font-weight: bold; font-size: 11pt; }
        .sp-nav-link { font-size: 10pt; }
        .sp-nav-active { color: #fff !important; font-weight: bold; font-size: 10pt; }
        .sp-hero { text-align: center; padding: 60px 24px 40px; }
        .sp-emoji { font-size: 56px; margin-bottom: 8px; }
        .sp-title { font-size: clamp(28px, 5vw, 48px); font-weight: 900; letter-spacing: -1.5px; background: linear-gradient(135deg, #ff6b5a 0%, #ff4530 50%, #ff6b5a 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1.15; margin: 0 0 12px; }
        .sp-subtitle { font-size: 18px; font-weight: 500; color: rgba(255,255,255,0.4); letter-spacing: 6px; text-transform: uppercase; margin: 0; }
        .sp-grid { max-width: 1200px; margin: 0 auto; padding: 0 24px 60px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .sp-card { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px 16px 20px; min-height: 160px; text-decoration: none; transition: background 0.2s, border-color 0.2s, transform 0.2s; }
        .sp-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .sp-logo-wrap { width: 160px; height: 70px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
        .sp-logo-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .sp-logo-wrap img.invert { filter: brightness(0) invert(1); opacity: 0.85; }
        .sp-logo-wrap img.white { opacity: 0.9; }
        .sp-text-logo { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.85); text-align: center; line-height: 1.2; letter-spacing: -0.3px; }
        .sp-name { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7); text-align: center; }
        .sp-contrib { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 4px; text-align: center; }
        .sp-footer { text-align: center; padding: 24px; font-size: 13px; color: rgba(255,255,255,0.2); letter-spacing: 1px; }
      `}</style>
      <div className="sp-body">
        <header className="sp-header">
          <Link href="/" className="sp-logo">
            <span style={{ fontSize: "14pt" }}>🦞</span>
            <span>Claw Con</span>
          </Link>
          <Link href="/" className="sp-nav-link">submissions</Link>
          <span>|</span>
          <span className="sp-nav-active">sponsors</span>
          <span>|</span>
          <Link href="/molt" className="sp-nav-link" style={{ color: "#000", fontFamily: "Verdana, Geneva, sans-serif", fontSize: "10pt", textDecoration: "none" }}>molt</Link>
        </header>

        <div style={{ height: "40px" }}></div>

        <div className="sp-grid">
          {sponsors.map((sponsor) => (
            <a
              key={sponsor.name}
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="sp-card"
            >
              <div className="sp-logo-wrap">
                {"textOnly" in sponsor && sponsor.textOnly ? (
                  <span className="sp-text-logo">{sponsor.name}</span>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={sponsor.logo}
                    alt={sponsor.name}
                    className={sponsor.invert ? "invert" : "white"}
                  />
                )}
              </div>
              <div className="sp-name">{sponsor.name}</div>
              <div className="sp-contrib">{sponsor.contribution}</div>
            </a>
          ))}
        </div>

        <div className="sp-footer">February 4, 2026 · Frontier Tower · San Francisco</div>
      </div>
    </>
  );
}
