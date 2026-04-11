import { Routes, Route, Link } from "react-router-dom";
import { CaptureProvider, useCapture } from "./context/CaptureContext";
import { Dashboard } from "./pages/Dashboard";
import { ObservationDetail } from "./pages/ObservationDetail";
import { ObservationsList } from "./pages/ObservationsList";
import { PersonDetail } from "./pages/PersonDetail";
import { PeopleList } from "./pages/PeopleList";
import { PersonNew } from "./pages/PersonNew";
import { BackupPage } from "./pages/BackupPage";
import { LocationDetail } from "./pages/LocationDetail";
import { LocationNew } from "./pages/LocationNew";
import { LocationsList } from "./pages/LocationsList";
import { SearchPage } from "./pages/SearchPage";
import { SystemDetail } from "./pages/SystemDetail";
import { SystemsList } from "./pages/SystemsList";
import { SystemNew } from "./pages/SystemNew";

function Layout({ children }: { children: React.ReactNode }) {
  const { openCapture } = useCapture();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to="/" className="font-semibold text-slate-800 shrink-0">
          Command Atlas
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm min-w-0">
          <Link to="/" className="text-slate-600 hover:text-slate-900">Dashboard</Link>
          <Link to="/observations" className="text-slate-600 hover:text-slate-900">Observations</Link>
          <Link to="/people" className="text-slate-600 hover:text-slate-900">People</Link>
          <Link to="/systems" className="text-slate-600 hover:text-slate-900">Systems</Link>
          <Link to="/locations" className="text-slate-600 hover:text-slate-900">Locations</Link>
          <Link to="/search" className="text-slate-600 hover:text-slate-900">Search</Link>
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2 shrink-0">
          <Link
            to="/backup"
            className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50"
          >
            Backup
          </Link>
          <button type="button" onClick={openCapture} className="px-3 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700">
            Capture
          </button>
        </div>
      </header>
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <CaptureProvider>
    <Routes>
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/observations" element={<Layout><ObservationsList /></Layout>} />
      <Route path="/observations/:id" element={<Layout><ObservationDetail /></Layout>} />
      <Route path="/people" element={<Layout><PeopleList /></Layout>} />
      <Route path="/people/new" element={<Layout><PersonNew /></Layout>} />
      <Route path="/people/:id" element={<Layout><PersonDetail /></Layout>} />
      <Route path="/systems" element={<Layout><SystemsList /></Layout>} />
      <Route path="/systems/new" element={<Layout><SystemNew /></Layout>} />
      <Route path="/systems/:id" element={<Layout><SystemDetail /></Layout>} />
      <Route path="/locations" element={<Layout><LocationsList /></Layout>} />
      <Route path="/locations/new" element={<Layout><LocationNew /></Layout>} />
      <Route path="/locations/:code" element={<Layout><LocationDetail /></Layout>} />
      <Route path="/search" element={<Layout><SearchPage /></Layout>} />
      <Route path="/backup" element={<Layout><BackupPage /></Layout>} />
    </Routes>
    </CaptureProvider>
  );
}
