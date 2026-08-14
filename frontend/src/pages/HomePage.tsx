import { AlertTriangle, Footprints, MapPinned, Route, Trees } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FEATURES = [
  {
    icon: Route,
    title: "Fastest vs quietest routes",
    description:
      "Every trip gets two walking routes side by side - the quickest one, and the calmest one - each rated Low or High for sensory load.",
  },
  {
    icon: MapPinned,
    title: "Live sensory map",
    description:
      "A real-time crowd-density field over Melbourne CBD, built from 101 pedestrian sensors, so you can see busy corridors before you walk into them.",
  },
  {
    icon: Trees,
    title: "Quiet spaces nearby",
    description:
      "Parks, libraries and galleries flagged as sensory refuges, sorted by distance, with one tap to navigate there.",
  },
  {
    icon: AlertTriangle,
    title: "Predictive crowd alerts",
    description:
      "Get a heads-up when a spot is trending busier than usual for this day and hour - and a nudge mid-walk if your route gets worse.",
  },
];

// Landing page ("/"): first thing a new visitor sees, separate from the app shell (no map/nav
// chrome) - a quick pitch for what ChillGo does, then a single clear way into the app.
export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-brand">
          <div className="home-brand-icon" aria-hidden="true">
            <Footprints size={20} strokeWidth={2.25} />
          </div>
          <span className="home-brand-title">ChillGo</span>
        </div>
      </header>

      <main className="home-hero">
        <p className="home-eyebrow">Sensory-aware navigation for Melbourne CBD</p>
        <h1 className="home-headline">Walk the city at your own pace, minus the sensory overload</h1>
        <p className="home-subhead">
          ChillGo plans two routes for every trip - the fastest, and the quietest - using
          real-time pedestrian-density data, so neurodivergent and sensory-sensitive commuters can
          choose the walk that actually feels okay.
        </p>
        <button className="home-cta" onClick={() => navigate("/navigate")}>
          <Route size={18} />
          Start navigating
        </button>
      </main>

      <section className="home-features" aria-label="What ChillGo does">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div className="home-feature-card" key={title}>
            <div className="home-feature-icon" aria-hidden="true">
              <Icon size={20} strokeWidth={2} />
            </div>
            <h3 className="home-feature-title">{title}</h3>
            <p className="home-feature-desc">{description}</p>
          </div>
        ))}
      </section>

      <footer className="home-footer">
        Built for FIT5120 Onboarding · UNSDG 11.2/11.7 · Data © City of Melbourne, licensed under
        CC BY 4.0
      </footer>
    </div>
  );
}
