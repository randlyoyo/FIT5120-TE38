import { PanelHeader } from "../components/Layout/PanelHeader";

// About tab: data source disclosure and known limitations, kept close to README.md for consistency.
export function AboutPage() {
  return (
    <div className="page page-about">
      <PanelHeader title="About" />

      <section>
        <h3 className="section-title">Data sources</h3>
        <p className="hint">
          Served from the team's shared database (101 CBD pedestrian sensors, sensory-refuge
          landmarks), itself built on City of Melbourne open data
          (data.melbourne.vic.gov.au):
        </p>
        <ul className="about-list">
          <li>Pedestrian Counting System — Sensor Locations</li>
          <li>Pedestrian Counting System — Monthly Counts per Hour</li>
          <li>Landmarks and Places of Interest (quiet spaces)</li>
        </ul>
      </section>

      <section>
        <h3 className="section-title">Known limitations</h3>
        <ul className="about-list">
          <li>Only pedestrian volume is measured — no noise or light data, so the "sensory load" score is a proxy, not a direct sensory measurement.</li>
          <li>Coverage is the 101 CBD pedestrian sensors only; routes outside that footprint can't be scored.</li>
          <li>Sensors are points, not road segments, so matching a route to nearby sensors is an approximation, not per-segment ground truth.</li>
          <li>Readings can be <code>live</code>, <code>stale</code>, or <code>estimated</code> (no recent live data) — the map and alerts always label which one you're looking at.</li>
        </ul>
      </section>

      <section>
        <h3 className="section-title">Goal</h3>
        <p className="hint">
          UNSDG Goal 11 — Sustainable Cities and Communities. Target 11.2 (accessible transit) & 11.7
          (inclusive public spaces), focused on neurodivergent / sensory-sensitive commuters in
          Melbourne CBD.
        </p>
      </section>

      <footer className="about-footer">
        Data © City of Melbourne, licensed under{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        .
      </footer>
    </div>
  );
}
