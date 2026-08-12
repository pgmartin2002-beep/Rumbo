import { NavLink, Route, Routes } from 'react-router-dom';
import MyEvents from './pages/MyEvents.js';
import ImportEvent from './pages/ImportEvent.js';
import EventReview from './pages/EventReview.js';
import Goals from './pages/Goals.js';
import Agenda from './pages/Agenda.js';
import Logistics from './pages/Logistics.js';

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<MyEvents />} />
        <Route path="/importar" element={<ImportEvent />} />
        <Route path="/eventos/:id" element={<EventReview />} />
        <Route path="/eventos/:id/objetivos" element={<Goals />} />
        <Route path="/eventos/:id/agenda" element={<Agenda />} />
        <Route path="/eventos/:id/logistica" element={<Logistics />} />
      </Routes>
      <nav className="bottom-nav">
        <NavLink to="/" end>
          Mis eventos
        </NavLink>
        <NavLink to="/importar">Importar</NavLink>
      </nav>
    </div>
  );
}
