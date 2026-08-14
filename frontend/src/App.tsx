import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { AppShell } from "./components/Layout/AppShell";
import { AppStateProvider } from "./context/AppStateContext";
import { AboutPage } from "./pages/AboutPage";
import { AlertsPage } from "./pages/AlertsPage";
import { HomePage } from "./pages/HomePage";
import { MapPage } from "./pages/MapPage";
import { NavigatePage } from "./pages/NavigatePage";
import { QuietSpacesPage } from "./pages/QuietSpacesPage";

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route element={<AppShell />}>
            <Route path="/map" element={<MapPage />} />
            <Route path="/navigate" element={<NavigatePage />} />
            <Route path="/quiet-spaces" element={<QuietSpacesPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStateProvider>
  );
}
