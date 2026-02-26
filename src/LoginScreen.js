// src/LoginScreen.js
import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
  const { login, register, resetPassword } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const switchMode = (m) => { setMode(m); setError(""); setSuccess(""); };

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (mode === "forgot") {
      if (!form.email) return setError("Informe seu e-mail.");
      setLoading(true);
      try {
        await resetPassword(form.email);
        setSuccess("E-mail de redefinição enviado! Verifique sua caixa de entrada.");
      } catch (e) {
        const msgs = {
          "auth/user-not-found": "Nenhuma conta encontrada com esse e-mail.",
          "auth/invalid-email": "E-mail inválido.",
        };
        setError(msgs[e.code] || "Erro ao enviar e-mail. Tente novamente.");
      }
      setLoading(false);
      return;
    }
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

  const titles = { login: "Entrar", register: "Criar conta", forgot: "Redefinir senha" };
  const btnLabels = { login: "Entrar →", register: "Criar conta →", forgot: "Enviar e-mail →" };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a2e1f 0%, #0d3d28 60%, #092918 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", fontFamily: "'Sora', sans-serif",
      color: "#e8f5e2",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');`}</style>

      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎾</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Beach Tennis Pro</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>Gestão de Torneios</p>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 380,
        backdropFilter: "blur(12px)",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{titles[mode]}</h2>

        {mode === "forgot" && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 16, lineHeight: 1.5 }}>
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <input style={inputStyle} placeholder="Seu nome" value={form.name} onChange={set("name")} />
          )}

          <input
            style={inputStyle} placeholder="E-mail" type="email" value={form.email}
            onChange={set("email")} onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          {mode !== "forgot" && (
            <input
              style={inputStyle} placeholder="Senha" type="password" value={form.password}
              onChange={set("password")} onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          )}

          {/* Link esqueci senha — só no modo login */}
          {mode === "login" && (
            <p style={{ textAlign: "right", fontSize: 12, marginTop: -6 }}>
              <span onClick={() => switchMode("forgot")}
                style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                Esqueci minha senha
              </span>
            </p>
          )}

          {error && (
            <div style={{
              background: "rgba(231,76,60,0.15)", border: "1px solid rgba(231,76,60,0.3)",
              borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#e74c3c",
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              background: "rgba(46,204,113,0.12)", border: "1px solid rgba(46,204,113,0.3)",
              borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#2ecc71",
            }}>{success}</div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{
            background: loading ? "rgba(46,204,113,0.5)" : "#2ecc71",
            color: "#0a2e1f", border: "none", padding: "14px",
            borderRadius: 12, fontFamily: "inherit", fontWeight: 700,
            fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity .15s", marginTop: 4,
          }}>
            {loading ? "Aguarde..." : btnLabels[mode]}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          {mode === "forgot" ? (
            <span onClick={() => switchMode("login")}
              style={{ color: "#2ecc71", cursor: "pointer", fontWeight: 600 }}>
              ← Voltar ao login
            </span>
          ) : (
            <>
              {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <span onClick={() => switchMode(mode === "login" ? "register" : "login")}
                style={{ color: "#2ecc71", cursor: "pointer", fontWeight: 600 }}>
                {mode === "login" ? "Criar conta" : "Entrar"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, padding: "12px 14px", color: "#e8f5e2",
  fontFamily: "inherit", fontSize: 14, outline: "none", width: "100%",
};
