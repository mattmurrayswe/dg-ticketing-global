import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ClientCheckout } from './pages/ClientCheckout';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { TicketSuccess } from './pages/TicketSuccess';
import { Language } from './i18n/translations';

export function App() {
  const [currentLang, setCurrentLang] = useState<Language>('pt');

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            currentLang={currentLang}
            onLanguageChange={setCurrentLang}
          />
        }
      />
      <Route
        path="/checkout"
        element={
          <ClientCheckout
            currentLang={currentLang}
            onLanguageChange={setCurrentLang}
          />
        }
      />
      <Route
        path="/organizer"
        element={
          <OrganizerDashboard
            currentLang={currentLang}
            onLanguageChange={setCurrentLang}
          />
        }
      />
      <Route
        path="/success"
        element={
          <TicketSuccess
            currentLang={currentLang}
            onLanguageChange={setCurrentLang}
          />
        }
      />
    </Routes>
  );
}

export default App;
