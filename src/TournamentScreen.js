// src/TournamentScreen.js
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, doc, setDoc, getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const inputStyle = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, padding: "12px 14px", color: "#e8f5e2",
  fontFamily: "inherit", fontSize: 14, outline: "none", width: "100%",
};

export default function TournamentScreen({ onSelect }) {
  const { user, logout } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState(new Set());
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "users", user.uid, "enrollments"), (snap) => {
      setMyEnrollments(new Set(snap.docs.map((d) => d.id)));
    });
  }, [user.uid]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const docRef = await addDoc(collection(db, "tournaments"), {
      name: newName.trim(),
      createdBy: user.uid,
      createdByName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "tournaments", docRef.id, "members", user.uid), {
      uid: user.uid,
      name: user.displayName || user.email,
      role: "admin",
      paid: false,
      amount: 10,
      joinedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "users", user.uid, "enrollments", docRef.id), { name: newName.trim() });
    setNewName("");
    setShowForm(false);
    setLoading(false);
    onSelect({ id: docRef.id, name: newName.trim(), role: "admin" });
  };

  const handleJoin = async (t) => {
    setJoiningId(t.id);
    const memberDoc = await getDoc(doc(db, "tournaments", t.id, "members", user.uid));
    if (!memberDoc.exists()) {
      await setDoc(doc(db, "tournaments", t.id, "members", user.uid), {
        uid: user.uid,
        name: user.displayName || user.email,
        role: "player",
        paid: false,
        amount: 10,
        joinedAt: serverTimestamp(),
      });
    }
    await setDoc(doc(db, "users", user.uid, "enrollments", t.id), { name: t.name });
    setJoiningId(null);
    onSelect({ ...t, role: t.createdBy === user.uid ? "admin" : "player" });
  };

  const filtered = tab === "mine"
    ? tournaments.filter((t) => myEnrollments.has(t.id))
    : tournaments;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a2e1f 0%, #0d3d28 60%, #092918 100%)",
      fontFamily: "'Sora', sans-serif", color: "#e8f5e2", paddingBottom: 40,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');`}</style>

      <div style={{ padding: "40px 24px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 28 }}>🎾</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>Beach Tennis Pro</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{user.displayName || user.email}</p>
        </div>
        <button onClick={logout} style={{
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "8px 14px", color: "rgba(255,255,255,0.5)",
          fontFamily: "inherit", fontSize: 13, cursor: "pointer",
        }}>Sair</button>
      </div>

      <div style={{ padding: "0 24px", maxWidth: 480, margin: "0 auto" }}>
        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={{
            width: "100%", background: "#2ecc71", color: "#0a2e1f", border: "none",
            padding: "14px", borderRadius: 14, fontFamily: "inherit", fontWeight: 700,
            fontSize: 15, cursor: "pointer", marginBottom: 20,
          }}>+ Criar Novo Torneio</button>
        ) : (
          <div style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: 20, marginBottom: 20,
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 }}>NOME DO TORNEIO</p>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Ex: Torneio de Verão 2025" style={{ ...inputStyle, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleCreate} disabled={loading} style={{
                flex: 1, background: "#2ecc71", color: "#0a2e1f", border: "none",
                padding: "12px", borderRadius: 10, fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>{loading ? "Criando..." : "Criar"}</button>
              <button onClick={() => { setShowForm(false); setNewName(""); }} style={{
                background: "rgba(255,255,255,0.07)", border: "none", padding: "12px 16px",
                borderRadius: 10, color: "rgba(255,255,255,0.5)", fontFamily: "inherit", fontSize: 14, cursor: "pointer",
              }}>Cancelar</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
          {[["all", "Todos os Torneios"], ["mine", "Meus Torneios"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: "10px 4px", background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === key ? "#2ecc71" : "transparent"}`,
              color: tab === key ? "#2ecc71" : "rgba(255,255,255,0.4)",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            {tab === "mine" ? "Você ainda não entrou em nenhum torneio." : "Nenhum torneio criado ainda."}
          </div>
        ) : filtered.map((t) => {
          const enrolled = myEnrollments.has(t.id);
          const isAdmin = t.createdBy === user.uid;
          return (
            <div key={t.id} style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${enrolled ? "rgba(46,204,113,0.25)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 14, padding: "16px 18px", marginBottom: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{t.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 3 }}>
                    por {t.createdByName} · {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString("pt-BR") : ""}
                  </div>
                </div>
                {isAdmin && (
                  <span style={{ background: "rgba(255,215,0,0.15)", color: "#ffd700", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>ADMIN</span>
                )}
                {!isAdmin && enrolled && (
                  <span style={{ background: "rgba(46,204,113,0.15)", color: "#2ecc71", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>INSCRITO</span>
                )}
              </div>
              {enrolled ? (
                <button onClick={() => handleJoin(t)} style={{
                  width: "100%", background: "rgba(46,204,113,0.12)", color: "#2ecc71",
                  border: "1px solid rgba(46,204,113,0.3)", padding: "10px", borderRadius: 10,
                  fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}>Abrir Torneio →</button>
              ) : (
                <button onClick={() => handleJoin(t)} disabled={joiningId === t.id} style={{
                  width: "100%", background: "#2ecc71", color: "#0a2e1f", border: "none",
                  padding: "10px", borderRadius: 10, fontFamily: "inherit", fontWeight: 700,
                  fontSize: 14, cursor: "pointer", opacity: joiningId === t.id ? 0.6 : 1,
                }}>{joiningId === t.id ? "Entrando..." : "🎾 Entrar no Torneio"}</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
