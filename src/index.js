// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider, useAuth } from "./AuthContext";
import LoginScreen from "./LoginScreen";
import TournamentScreen from "./TournamentScreen";
import App from "./App";

function Root() {
  const { user } = useAuth();
  const [tournament, setTournament] = React.useState(null);

  if (!user) return <LoginScreen />;
  if (!tournament) return <TournamentScreen onSelect={setTournament} />;
  return <App tournament={tournament} onBack={() => setTournament(null)} />;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
