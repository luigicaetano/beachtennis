// src/App.js
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, doc, updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ── Regras de pontuação ──────────────────────────────────────────
// Para pontuar no ranking, o jogador precisa:
// ✅ Estar inscrito no torneio
// ✅ Ter a taxa paga
// ✅ Ter >= 3 vitórias no torneio
// ✅ Ter jogado >= 5 partidas no torneio

const TABS = ["🏆 Ranking", "📅 Partidas", "💰 Financeiro", "➕ Nova Partida"];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input, select { outline: none; }
  .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; }
  .badge-green { background: rgba(46,204,113,0.2); color: #2ecc71; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-red { background: rgba(231,76,60,0.2); color: #e74c3c; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-yellow { background: rgba(255,215,0,0.15); color: #ffd700; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .tab-btn { flex: 1; padding: 12px 2px; background: transparent; border: none; color: rgba(255,255,255,0.4); font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all .2s; white-space: nowrap; }
  .tab-btn.active { color: #2ecc71; border-bottom-color: #2ecc71; }
  .btn-green { background: #2ecc71; color: #0a2e1f; border: none; padding: 13px; border-radius: 12px; font-family: inherit; font-weight: 700; font-size: 14px; cursor: pointer; width: 100%; }
  .btn-green:disabled { opacity: 0.5; cursor: not-allowed; }
  .input-field { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 11px 14px; color: #e8f5e2; font-family: inherit; font-size: 14px; width: 100%; }
  .input-field::placeholder { color: rgba(255,255,255,0.3); }
  select.input-field option { background: #0a2e1f; }
  input[type="date"].input-field::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.5); }
`;

function label(txt) {
  return <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 6, letterSpacing: 0.5 }}>{txt}</label>;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function App({ tournament, onBack }) {
  const { user } = useAuth();
  const isAdmin = tournament.role === "admin";

  const [tab, setTab] = useState(0);
  const [members, setMembers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [saving, setSaving] = useState(false);

  const [newMatch, setNewMatch] = useState({
    player1: "", player2: "", score1: "", score2: "",
    date: new Date().toISOString().split("T")[0],
  });

  const basePath = `tournaments/${tournament.id}`;

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, `${basePath}/members`), orderBy("joinedAt", "asc")),
      (snap) => setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      query(collection(db, `${basePath}/matches`), orderBy("date", "asc")),
      (snap) => setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, [basePath]);

  // ── Stats per player ─────────────────────────────────────────────
  const statsFor = (name) => {
    const played = matches.filter((m) => m.player1 === name || m.player2 === name);
    const wins = played.filter((m) =>
      (m.player1 === name && m.score1 > m.score2) ||
      (m.player2 === name && m.score2 > m.score1)
    ).length;
    return { played: played.length, wins };
  };

  // ── Ranking with qualification check ────────────────────────────
  const ranking = members.map((m) => {
    const { played, wins } = statsFor(m.name);
    const qualified = m.paid && wins >= 3 && played >= 5;
    return { ...m, played, wins, qualified };
  }).sort((a, b) => {
    // Qualified first, then by wins, then by games played
    if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.played - a.played;
  });

  // ── Financial ───────────────────────────────────────────────────
  const totalPago = members.filter((m) => m.paid).reduce((a, m) => a + (m.amount || 0), 0);
  const totalPendente = members.filter((m) => !m.paid).reduce((a, m) => a + (m.amount || 0), 0);

  // ── Matches grouped by date ──────────────────────────────────────
  const matchesByDate = matches.reduce((acc, m) => {
    const key = m.date || "sem data";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const memberNames = members.map((m) => m.name);

  const handleAddMatch = async () => {
    const { player1, player2, score1, score2, date } = newMatch;
    if (!player1 || !player2 || score1 === "" || score2 === "" || !date) return;
    setSaving(true);
    await addDoc(collection(db, `${basePath}/matches`), {
      player1, player2,
      score1: Number(score1), score2: Number(score2),
      date,
      registeredBy: user.uid,
      createdAt: serverTimestamp(),
    });
    setNewMatch({ player1: "", player2: "", score1: "", score2: "", date: new Date().toISOString().split("T")[0] });
    setSaving(false);
    setTab(1);
  };

  const handleTogglePaid = async (member) => {
    if (!isAdmin) return;
    await updateDoc(doc(db, `${basePath}/members/${member.id}`), { paid: !member.paid });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a2e1f 0%, #0d3d28 50%, #092918 100%)",
      fontFamily: "'Sora', sans-serif", color: "#e8f5e2",
    }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ padding: "28px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10,
          padding: "8px 13px", color: "#e8f5e2", fontFamily: "inherit", fontSize: 18, cursor: "pointer",
        }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tournament.name}</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            {members.length} jogadores · {matches.length} partidas
            {isAdmin && <span style={{ color: "#ffd700", marginLeft: 6 }}>· Admin</span>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", margin: "0 16px" }}>
        {TABS.map((t, i) => (
          <button key={i} className={`tab-btn ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>

        {/* ── TAB 0: Ranking ── */}
        {tab === 0 && (
          <div>
            {/* Legenda das regras */}
            <div style={{
              background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.15)",
              borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 12,
              color: "rgba(255,255,255,0.6)", lineHeight: 1.6,
            }}>
              🏆 <strong style={{ color: "#ffd700" }}>Para pontuar:</strong> inscrito + taxa paga + mín. 3 vitórias + mín. 5 jogos
            </div>

            {ranking.length === 0 && (
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
                Nenhum jogador inscrito ainda.
              </p>
            )}

            {ranking.map((r, i) => {
              const medal = r.qualified
                ? (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`)
                : "—";
              return (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: r.qualified && i === 0 ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${r.qualified ? (i === 0 ? "rgba(255,215,0,0.2)" : "rgba(46,204,113,0.15)") : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 12, padding: "12px 14px", marginBottom: 10,
                  opacity: r.qualified ? 1 : 0.65,
                }}>
                  <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{medal}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      {r.wins}V · {r.played} jogos
                      {!r.paid && <span style={{ color: "#e74c3c", marginLeft: 6 }}>· taxa pendente</span>}
                      {r.paid && r.wins < 3 && <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>· precisa de {3 - r.wins}V</span>}
                      {r.paid && r.wins >= 3 && r.played < 5 && <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>· precisa de {5 - r.played} jogos</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {r.qualified
                      ? <span className="badge-green">Classificado</span>
                      : <span className="badge-red">Não classif.</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB 1: Partidas ── */}
        {tab === 1 && (
          <div>
            {Object.keys(matchesByDate).length === 0 && (
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
                Nenhuma partida registrada ainda.
              </p>
            )}
            {Object.entries(matchesByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dayMatches]) => (
                <div key={date} style={{ marginBottom: 24 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: "#2ecc71", letterSpacing: 0.5,
                    marginBottom: 10, paddingBottom: 6,
                    borderBottom: "1px solid rgba(46,204,113,0.2)",
                  }}>
                    📅 {date === "sem data" ? "Sem data" : formatDate(date)}
                    <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, marginLeft: 8 }}>
                      {dayMatches.length} {dayMatches.length === 1 ? "partida" : "partidas"}
                    </span>
                  </div>
                  {dayMatches.map((m) => (
                    <div key={m.id} style={{
                      display: "flex", alignItems: "center",
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12, padding: "13px 16px", marginBottom: 8,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{m.player1}</div>
                        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "2px 0" }}>vs</div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{m.player2}</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 48 }}>
                        <div style={{
                          fontSize: 22, fontWeight: 800, lineHeight: 1.1,
                          color: m.score1 > m.score2 ? "#2ecc71" : m.score1 < m.score2 ? "#e74c3c" : "#fff",
                        }}>{m.score1}</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", margin: "1px 0" }}>SET</div>
                        <div style={{
                          fontSize: 22, fontWeight: 800, lineHeight: 1.1,
                          color: m.score2 > m.score1 ? "#2ecc71" : m.score2 < m.score1 ? "#e74c3c" : "#fff",
                        }}>{m.score2}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}

        {/* ── TAB 2: Financeiro ── */}
        {tab === 2 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 6 }}>ARRECADADO</div>
                <div style={{ color: "#2ecc71", fontWeight: 800, fontSize: 22 }}>R$ {totalPago}</div>
              </div>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 6 }}>PENDENTE</div>
                <div style={{ color: "#e74c3c", fontWeight: 800, fontSize: 22 }}>R$ {totalPendente}</div>
              </div>
            </div>

            {!isAdmin && (
              <div style={{
                background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.15)",
                borderRadius: 10, padding: "10px 14px", fontSize: 12,
                color: "rgba(255,255,255,0.5)", marginBottom: 16,
              }}>
                💡 Apenas administradores podem alterar o status de pagamento.
              </div>
            )}

            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2ecc71", marginBottom: 14 }}>Jogadores</h2>

            {members.length === 0 && (
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Nenhum jogador inscrito ainda.</p>
            )}

            {members.map((m) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "13px 16px", marginBottom: 10,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: m.paid ? "rgba(46,204,113,0.18)" : "rgba(231,76,60,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 15, color: m.paid ? "#2ecc71" : "#e74c3c",
                  flexShrink: 0,
                }}>{m.name?.[0]?.toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    {m.name}
                    {m.role === "admin" && <span style={{ fontSize: 10, color: "#ffd700", fontWeight: 700 }}>ADMIN</span>}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>R$ {m.amount || 10} / fim de semana</div>
                </div>
                <button
                  onClick={() => handleTogglePaid(m)}
                  disabled={!isAdmin}
                  style={{ background: "none", border: "none", cursor: isAdmin ? "pointer" : "default" }}
                >
                  <span className={m.paid ? "badge-green" : "badge-red"}>
                    {m.paid ? "✓ Pago" : "⏳ Pendente"}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB 3: Nova Partida ── */}
        {tab === 3 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#2ecc71" }}>Registrar Partida</h2>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <div>
                {label("DATA DA PARTIDA")}
                <input className="input-field" type="date" value={newMatch.date}
                  onChange={(e) => setNewMatch((m) => ({ ...m, date: e.target.value }))} />
              </div>

              {[
                { lbl: "JOGADOR 1", key: "player1", exclude: newMatch.player2 },
                { lbl: "JOGADOR 2", key: "player2", exclude: newMatch.player1 },
              ].map(({ lbl, key, exclude }) => (
                <div key={key}>
                  {label(lbl)}
                  <select className="input-field" value={newMatch[key]}
                    onChange={(e) => setNewMatch((m) => ({ ...m, [key]: e.target.value }))}>
                    <option value="">Selecionar jogador...</option>
                    {memberNames.filter((n) => n !== exclude).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              ))}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[{ lbl: "SETS J1", key: "score1" }, { lbl: "SETS J2", key: "score2" }].map(({ lbl, key }) => (
                  <div key={key}>
                    {label(lbl)}
                    <input className="input-field" type="number" inputMode="numeric" min="0" max="99"
                      placeholder="0" value={newMatch[key]}
                      onChange={(e) => setNewMatch((m) => ({ ...m, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              {/* Preview resultado */}
              {newMatch.player1 && newMatch.player2 && newMatch.score1 !== "" && newMatch.score2 !== "" && (
                <div style={{
                  background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.2)",
                  borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#2ecc71", textAlign: "center",
                }}>
                  {Number(newMatch.score1) > Number(newMatch.score2)
                    ? `🏆 ${newMatch.player1} vence!`
                    : Number(newMatch.score2) > Number(newMatch.score1)
                    ? `🏆 ${newMatch.player2} vence!`
                    : "🤝 Empate!"}
                </div>
              )}

              <button className="btn-green" onClick={handleAddMatch} disabled={saving}>
                {saving ? "Salvando..." : "Salvar Partida 🎾"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
