// src/TournamentScreen.js
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, doc, setDoc, getDoc, updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const inputStyle = {
  background: "#f5f8f5", border: "1px solid #c8dcc8",
  borderRadius: 10, padding: "12px 14px", color: "#0a2e1f",
  fontFamily: "inherit", fontSize: 14, outline: "none", width: "100%",
};

export default function TournamentScreen({ onSelect }) {
  const { user, logout, updateName } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState(new Set());
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [tab, setTab] = useState("all");

  // Edição de nome do torneio
  const [editingTournament, setEditingTournament] = useState(null); // { id, name }
  const [editTournamentName, setEditTournamentName] = useState("");

  // Edição do nome do usuário
  const [editingUserName, setEditingUserName] = useState(false);
  const [newUserName, setNewUserName] = useState("");

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
      rules: { minWins: 3, minGames: 5, weeklyFee: 10 },
    });
    await setDoc(doc(db, "tournaments", docRef.id, "members", user.uid), {
      uid: user.uid,
      name: user.displayName || user.email,
      role: "admin",
      paidWeeks: [],
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
    const isAdmin = t.createdBy === user.uid;
    const memberRef = doc(db, "tournaments", t.id, "members", user.uid);
    const memberDoc = await getDoc(memberRef);
    if (!memberDoc.exists()) {
      await setDoc(memberRef, {
        uid: user.uid,
        name: user.displayName || user.email,
        role: isAdmin ? "admin" : "player",
        paidWeeks: [],
        joinedAt: serverTimestamp(),
      });
    }
    await setDoc(doc(db, "users", user.uid, "enrollments", t.id), { name: t.name });
    setJoiningId(null);
    onSelect({ ...t, role: isAdmin ? "admin" : "player" });
  };

  const handleRenameTournament = async () => {
    if (!editTournamentName.trim()) return;
    await updateDoc(doc(db, "tournaments", editingTournament.id), { name: editTournamentName.trim() });
    setEditingTournament(null);
    setEditTournamentName("");
  };

  const handleUpdateUserName = async () => {
    if (!newUserName.trim()) return;
    await updateName(newUserName.trim());
    setEditingUserName(false);
    setNewUserName("");
  };

  const filtered = tab === "mine"
    ? tournaments.filter((t) => myEnrollments.has(t.id))
    : tournaments;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0f4f0",
      fontFamily: "'Sora', sans-serif", color: "#0a2e1f", paddingBottom: 40,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');`}</style>

      <div style={{ padding: "40px 24px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 28 }}>🎾</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "#0a2e1f" }}>Beach Tennis Pro</h1>
          {editingUserName ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
              <input
                autoFocus
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUpdateUserName(); if (e.key === "Escape") setEditingUserName(false); }}
                placeholder={user.displayName || user.email}
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 13, width: 160 }}
              />
              <button onClick={handleUpdateUserName} style={{
                background: "#1a9e4a", color: "#fff", border: "none",
                borderRadius: 8, padding: "6px 10px", fontFamily: "inherit",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>✓</button>
              <button onClick={() => setEditingUserName(false)} style={{
                background: "#f5f8f5", border: "1px solid #c8dcc8", borderRadius: 8,
                padding: "6px 10px", fontFamily: "inherit", fontSize: 12, cursor: "pointer", color: "#5a7a65",
              }}>✕</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <p style={{ color: "#5a7a65", fontSize: 13 }}>{user.displayName || user.email}</p>
              <button onClick={() => { setEditingUserName(true); setNewUserName(user.displayName || ""); }} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#a0b8a5",
              }} title="Editar nome">✏️</button>
            </div>
          )}
        </div>
        <button onClick={logout} style={{
          background: "#fff", border: "1px solid #c8dcc8",
          borderRadius: 10, padding: "8px 14px", color: "#5a7a65",
          fontFamily: "inherit", fontSize: 13, cursor: "pointer",
        }}>Sair</button>
      </div>

      <div style={{ padding: "0 24px", maxWidth: 480, margin: "0 auto" }}>

        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={{
            width: "100%", background: "#1a9e4a", color: "#fff", border: "none",
            padding: "14px", borderRadius: 14, fontFamily: "inherit", fontWeight: 700,
            fontSize: 15, cursor: "pointer", marginBottom: 20,
          }}>+ Criar Novo Torneio</button>
        ) : (
          <div style={{
            background: "#fff", border: "1px solid #c8dcc8",
            borderRadius: 16, padding: 20, marginBottom: 20,
            boxShadow: "0 2px 12px rgba(10,46,31,0.08)",
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "#5a7a65", letterSpacing: 0.5 }}>
              NOME DO TORNEIO
            </p>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Ex: Torneio de Verão 2025"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleCreate} disabled={loading} style={{
                flex: 1, background: "#1a9e4a", color: "#fff", border: "none",
                padding: "12px", borderRadius: 10, fontFamily: "inherit", fontWeight: 700,
                fontSize: 14, cursor: "pointer",
              }}>{loading ? "Criando..." : "Criar"}</button>
              <button onClick={() => { setShowForm(false); setNewName(""); }} style={{
                background: "#f5f8f5", border: "1px solid #c8dcc8", padding: "12px 16px",
                borderRadius: 10, color: "#5a7a65", fontFamily: "inherit",
                fontSize: 14, cursor: "pointer",
              }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #c8dcc8", marginBottom: 16 }}>
          {[["all", "Todos os Torneios"], ["mine", "Meus Torneios"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: "10px 4px", background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === key ? "#1a9e4a" : "transparent"}`,
              color: tab === key ? "#1a9e4a" : "#7a9a80",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#a0b8a5", fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            {tab === "mine" ? "Você ainda não entrou em nenhum torneio." : "Nenhum torneio criado ainda."}
          </div>
        ) : filtered.map((t) => {
          const enrolled = myEnrollments.has(t.id);
          const isAdmin = t.createdBy === user.uid;
          return (
            <div key={t.id} style={{
              background: "#fff",
              border: `1px solid ${enrolled ? "#8ecfa8" : "#d4e4d4"}`,
              borderRadius: 14, padding: "16px 18px", marginBottom: 12,
              boxShadow: "0 1px 6px rgba(10,46,31,0.06)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  {editingTournament?.id === t.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        autoFocus
                        value={editTournamentName}
                        onChange={(e) => setEditTournamentName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRenameTournament(); if (e.key === "Escape") setEditingTournament(null); }}
                        style={{ ...inputStyle, padding: "6px 10px", fontSize: 14, flex: 1 }}
                      />
                      <button onClick={handleRenameTournament} style={{
                        background: "#1a9e4a", color: "#fff", border: "none",
                        borderRadius: 8, padding: "7px 10px", fontFamily: "inherit",
                        fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0,
                      }}>✓</button>
                      <button onClick={() => setEditingTournament(null)} style={{
                        background: "#f5f8f5", border: "1px solid #c8dcc8", borderRadius: 8,
                        padding: "7px 10px", fontFamily: "inherit", fontSize: 13, cursor: "pointer", color: "#5a7a65", flexShrink: 0,
                      }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#0a2e1f" }}>{t.name}</div>
                      {isAdmin && (
                        <button onClick={() => { setEditingTournament(t); setEditTournamentName(t.name); }} style={{
                          background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#a0b8a5",
                        }} title="Renomear torneio">✏️</button>
                      )}
                    </div>
                  )}
                  <div style={{ color: "#7a9a80", fontSize: 12, marginTop: 3 }}>
                    por {t.createdByName} · {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString("pt-BR") : ""}
                  </div>
                </div>
                {isAdmin && (
                  <span style={{ background: "#fff8e1", color: "#b8860b", border: "1px solid #f0d060", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    ADMIN
                  </span>
                )}
                {!isAdmin && enrolled && (
                  <span style={{ background: "#f0faf4", color: "#1a7a40", border: "1px solid #a8dbb8", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    INSCRITO
                  </span>
                )}
              </div>
              <button onClick={() => handleJoin(t)} disabled={joiningId === t.id} style={{
                width: "100%",
                background: enrolled ? "#f0faf4" : "#1a9e4a",
                color: enrolled ? "#1a7a40" : "#fff",
                border: enrolled ? "1px solid #a8dbb8" : "none",
                padding: "10px", borderRadius: 10, fontFamily: "inherit", fontWeight: 700,
                fontSize: 14, cursor: "pointer", opacity: joiningId === t.id ? 0.6 : 1,
              }}>
                {joiningId === t.id ? "Entrando..." : enrolled ? "Abrir Torneio →" : "🎾 Entrar no Torneio"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
