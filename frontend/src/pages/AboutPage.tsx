import { PanelHeader } from "../components/Layout/PanelHeader";

// About tab: data source disclosure and known limitations, kept close to README.md for consistency.
export function AboutPage() {
  return (
    <div className="page page-about">
      <PanelHeader title="About" />

      <section>
        <h3 className="section-title">Data sources</h3>
        <p className="hint">City of Melbourne open data (data.melbourne.vic.gov.au):</p>
        <ul className="about-list">
          <li>Pedestrian Counting System — Sensor Locations</li>
          <li>Pedestrian Counting System — Monthly Counts per Hour</li>
          <li>Landmarks and Places of Interest (quiet spaces)</li>
        </ul>
      </section>

      <section>
        <h3 className="section-title">Known limitations</h3>
        <ul className="about-list">
          <li>The pedestrian-count dataset is published monthly, so the "live" heatmap uses each sensor's most recently published hourly reading rather than minute-by-minute telemetry.</li>
          <li>Routing uses the public OSRM demo server plus a sensor-density scoring pass, rather than a self-hosted road network with custom edge weights.</li>
          <li>Predictive alerts need a few days of accumulated history for a given sensor/hour before they can trigger.</li>
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
    </div>
  );
}
