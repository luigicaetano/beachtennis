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

  const [showPassword, setShowPassword] = useState(false);
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
      background: "#f0f4f0",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", fontFamily: "'Sora', sans-serif",
      color: "#0a2e1f",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');`}</style>

      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎾</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: "#0a2e1f" }}>Beach Tennis Pro</h1>
        <p style={{ color: "#5a7a65", fontSize: 13, marginTop: 4 }}>Gestão de Torneios</p>
      </div>

      <div style={{
        background: "#fff", border: "1px solid #d4e4d4",
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 380,
        boxShadow: "0 4px 24px rgba(10,46,31,0.10)",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#0a2e1f" }}>{titles[mode]}</h2>

        {mode === "forgot" && (
          <p style={{ fontSize: 13, color: "#5a7a65", marginBottom: 16, lineHeight: 1.5 }}>
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
            <div style={{ position: "relative" }}>
              <input
                style={{ ...inputStyle, paddingRight: 44 }}
                placeholder="Senha"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 18, lineHeight: 1, color: "#7a9a80", padding: 4,
                }}
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          )}

          {mode === "login" && (
            <p style={{ textAlign: "right", fontSize: 12, marginTop: -6 }}>
              <span onClick={() => switchMode("forgot")}
                style={{ color: "#5a7a65", cursor: "pointer" }}>
                Esqueci minha senha
              </span>
            </p>
          )}

          {error && (
            <div style={{
              background: "#fdf0f0", border: "1px solid #f5c0c0",
              borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c0392b",
            }}>{error}</div>
          )}

          {success && (
            <div style={{
              background: "#f0faf4", border: "1px solid #a8dbb8",
              borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#1a7a40",
            }}>{success}</div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{
            background: loading ? "#8ecfa8" : "#1a9e4a",
            color: "#fff", border: "none", padding: "14px",
            borderRadius: 12, fontFamily: "inherit", fontWeight: 700,
            fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity .15s", marginTop: 4,
          }}>
            {loading ? "Aguarde..." : btnLabels[mode]}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#5a7a65" }}>
          {mode === "forgot" ? (
            <span onClick={() => switchMode("login")}
              style={{ color: "#1a9e4a", cursor: "pointer", fontWeight: 600 }}>
              ← Voltar ao login
            </span>
          ) : (
            <>
              {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <span onClick={() => switchMode(mode === "login" ? "register" : "login")}
                style={{ color: "#1a9e4a", cursor: "pointer", fontWeight: 600 }}>
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
  background: "#f5f8f5", border: "1px solid #c8dcc8",
  borderRadius: 10, padding: "12px 14px", color: "#0a2e1f",
  fontFamily: "inherit", fontSize: 14, outline: "none", width: "100%",
};
