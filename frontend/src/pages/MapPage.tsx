// The Map tab has no panel content of its own - MapCanvas (rendered at the shell level) is the
// page. This route only exists so the nav can point at "/map" and the panel collapses via CSS.
export function MapPage() {
  return null;
}
