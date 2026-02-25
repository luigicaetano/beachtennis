// src/LoginScreen.js
import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) return setError("Preencha todos os campos.");
    if (mode === "register" && !form.name) return setError("Informe seu nome.");
    setLoading(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.email, form.password, form.name);
    } catch (e) {
      const msgs = {
        "auth/user-not-found": "Usuário não encontrado.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/email-already-in-use": "E-mail já cadastrado.",
        "auth/weak-password": "Senha muito fraca. Mínimo 6 caracteres.",
        "auth/invalid-email": "E-mail inválido.",
        "auth/invalid-credential": "E-mail ou senha incorretos.",
      };
      setError(msgs[e.code] || "Erro ao entrar. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a2e1f 0%, #0d3d28 60%, #092918 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", fontFamily: "'Sora', sans-serif",
      color: "#e8f5e2",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');`}</style>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎾</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Beach Tennis Pro</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>Gestão de Torneios</p>
      </div>

      {/* Card */}
      <div style={{
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 380,
        backdropFilter: "blur(12px)",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <input
              style={inputStyle} placeholder="Seu nome" value={form.name}
              onChange={set("name")}
            />
          )}
          <input
            style={inputStyle} placeholder="E-mail" type="email" value={form.email}
            onChange={set("email")} onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <input
            style={inputStyle} placeholder="Senha" type="password" value={form.password}
            onChange={set("password")} onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          {error && (
            <div style={{
              background: "rgba(231,76,60,0.15)", border: "1px solid rgba(231,76,60,0.3)",
              borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e74c3c",
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading ? "rgba(46,204,113,0.5)" : "#2ecc71",
              color: "#0a2e1f", border: "none", padding: "14px",
              borderRadius: 12, fontFamily: "inherit", fontWeight: 700,
              fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity .15s", marginTop: 4,
            }}
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar →" : "Criar conta →"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
          <span
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{ color: "#2ecc71", cursor: "pointer", fontWeight: 600 }}
          >
            {mode === "login" ? "Criar conta" : "Entrar"}
          </span>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, padding: "12px 14px", color: "#e8f5e2",
  fontFamily: "inherit", fontSize: 14, outline: "none", width: "100%",
};
