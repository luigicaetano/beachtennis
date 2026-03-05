// src/App.js
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, doc, updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ── Helpers de semana ─────────────────────────────────────────────
function getMondayStr(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().split("T")[0];
}

function getWeekKey(dateStr) {
  return getMondayStr(dateStr);
}

function getWeekRange(mondayStr) {
  const mon = new Date(mondayStr + "T12:00:00");
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt) => dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

// ── CSS global ────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input, select { outline: none; }
  .card { background: #fff; border: 1px solid #d4e4d4; border-radius: 16px; padding: 16px; box-shadow: 0 1px 6px rgba(10,46,31,0.06); }
  .badge-green { background: #f0faf4; color: #1a7a40; border: 1px solid #a8dbb8; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-red { background: #fdf0f0; color: #c0392b; border: 1px solid #f5c0c0; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .tab-btn { flex: 1; padding: 11px 2px; background: transparent; border: none; color: #7a9a80; font-family: inherit; font-size: 11px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all .2s; white-space: nowrap; }
  .tab-btn.active { color: #1a9e4a; border-bottom-color: #1a9e4a; }
  .btn-green { background: #1a9e4a; color: #fff; border: none; padding: 13px; border-radius: 12px; font-family: inherit; font-weight: 700; font-size: 14px; cursor: pointer; width: 100%; }
  .btn-green:disabled { opacity: 0.5; cursor: not-allowed; }
  .input-field { background: #f5f8f5; border: 1px solid #c8dcc8; border-radius: 10px; padding: 11px 14px; color: #0a2e1f; font-family: inherit; font-size: 14px; width: 100%; }
  .input-field::placeholder { color: #a0b8a5; }
  select.input-field option { background: #fff; color: #0a2e1f; }
  input[type="date"].input-field::-webkit-calendar-picker-indicator { filter: none; opacity: 0.5; }
  input[type="number"].input-field { -moz-appearance: textfield; }
  input[type="number"].input-field::-webkit-outer-spin-button,
  input[type="number"].input-field::-webkit-inner-spin-button { -webkit-appearance: none; }
`;

function Lbl({ children }) {
  return (
    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 6, letterSpacing: 0.5 }}>
      {children}
    </label>
  );
}

const DEFAULT_RULES = { minWins: 3, minGames: 5, weeklyFee: 10 };
const TABS = ["🏆 Ranking", "📅 Partidas", "💰 Financeiro", "➕ Partida", "⚙️ Config"];

export default function App({ tournament, onBack }) {
  const { user } = useAuth();
  const isAdmin = tournament.role === "admin";
  const basePath = `tournaments/${tournament.id}`;

  const [tab, setTab] = useState(0);
  const [members, setMembers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [saving, setSaving] = useState(false);
  const [editRules, setEditRules] = useState(null);

  const emptyMatch = { date: todayStr(), p1a: "", p1b: "", p2a: "", p2b: "", score1: "", score2: "" };
  const [nm, setNm] = useState(emptyMatch);
  const setF = (k) => (e) => setNm((m) => ({ ...m, [k]: e.target.value }));

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, `${basePath}/members`), orderBy("joinedAt", "asc")),
      (snap) => setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      query(collection(db, `${basePath}/matches`), orderBy("date", "asc")),
      (snap) => setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u3 = onSnapshot(doc(db, basePath), (snap) => {
      if (snap.exists() && snap.data().rules) {
        setRules({ ...DEFAULT_RULES, ...snap.data().rules });
      }
    });
    return () => { u1(); u2(); u3(); };
  }, [basePath]);

  // ── Stats por jogador ─────────────────────────────────────────────
  const statsFor = (member) => {
    const myMatches = matches.filter((m) =>
      [m.p1a, m.p1b, m.p2a, m.p2b].includes(member.name)
    );
    const wins = myMatches.filter((m) => {
      const inD1 = m.p1a === member.name || m.p1b === member.name;
      return (inD1 && m.score1 > m.score2) || (!inD1 && m.score2 > m.score1);
    }).length;

    const weeksPlayed = [...new Set(myMatches.map((m) => getWeekKey(m.date || todayStr())))].sort();
    const paidWeeks = member.paidWeeks || [];
    const unpaidWeeks = weeksPlayed.filter((w) => !paidWeeks.includes(w));

    return { played: myMatches.length, wins, weeksPlayed, paidWeeks, unpaidWeeks };
  };

  // ── Ranking ───────────────────────────────────────────────────────
  const ranking = members.map((m) => {
    const stats = statsFor(m);
    const taxaOk = stats.weeksPlayed.length > 0 && stats.unpaidWeeks.length === 0;
    const qualified = taxaOk && stats.wins >= rules.minWins && stats.played >= rules.minGames;
    return { ...m, ...stats, taxaOk, qualified };
  }).sort((a, b) => {
    if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.played - a.played;
  });

  // ── Financeiro ────────────────────────────────────────────────────
  const totalPago = members.reduce((acc, m) => {
    return acc + ((m.paidWeeks || []).length * rules.weeklyFee);
  }, 0);
  const totalPendente = members.reduce((acc, m) => {
    const stats = statsFor(m);
    return acc + stats.unpaidWeeks.length * rules.weeklyFee;
  }, 0);

  // ── Partidas por data ─────────────────────────────────────────────
  const matchesByDate = matches.reduce((acc, m) => {
    const key = m.date || "sem-data";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const memberNames = members.map((m) => m.name);

  // ── Ações ─────────────────────────────────────────────────────────
  const handleAddMatch = async () => {
    const { date, p1a, p1b, p2a, p2b, score1, score2 } = nm;
    if (!date || !p1a || !p2a || score1 === "" || score2 === "") return;
    setSaving(true);
    await addDoc(collection(db, `${basePath}/matches`), {
      date,
      p1a, p1b: p1b || null,
      p2a, p2b: p2b || null,
      score1: Number(score1), score2: Number(score2),
      weekKey: getWeekKey(date),
      registeredBy: user.uid,
      createdAt: serverTimestamp(),
    });
    setNm(emptyMatch);
    setSaving(false);
    setTab(1);
  };

  const handleToggleWeekPaid = async (member, weekKey) => {
    if (!isAdmin) return;
    const current = member.paidWeeks || [];
    const updated = current.includes(weekKey)
      ? current.filter((w) => w !== weekKey)
      : [...current, weekKey];
    await updateDoc(doc(db, `${basePath}/members/${member.id}`), { paidWeeks: updated });
  };

  const handleToggleAdmin = async (member) => {
    if (!isAdmin) return;
    const newRole = member.role === "admin" ? "player" : "admin";
    await updateDoc(doc(db, `${basePath}/members/${member.id}`), { role: newRole });
  };

  const handleSaveRules = async () => {
    await updateDoc(doc(db, basePath), { rules: editRules });
    setRules(editRules);
    setEditRules(null);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0f4f0",
      fontFamily: "'Sora', sans-serif", color: "#0a2e1f",
    }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ padding: "28px 16px 12px", display: "flex", alignItems: "center", gap: 12, background: "#fff", borderBottom: "1px solid #d4e4d4", boxShadow: "0 1px 4px rgba(10,46,31,0.06)" }}>
        <button onClick={onBack} style={{
          background: "#f5f8f5", border: "1px solid #c8dcc8", borderRadius: 10,
          padding: "8px 13px", color: "#0a2e1f", fontFamily: "inherit", fontSize: 18, cursor: "pointer",
        }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#0a2e1f" }}>
            {tournament.name}
          </h1>
          <p style={{ fontSize: 12, color: "#7a9a80" }}>
            {members.length} jogadores · {matches.length} partidas
            {isAdmin && <span style={{ color: "#b8860b", marginLeft: 6 }}>· Admin</span>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #d4e4d4", margin: "0", background: "#fff" }}>
        {TABS.map((t, i) => {
          if (!isAdmin && i === 4) return null;
          return (
            <button key={i} className={`tab-btn ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>
              {t}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "18px 16px", maxWidth: 480, margin: "0 auto" }}>

        {/* ══════════════ TAB 0: RANKING ══════════════ */}
        {tab === 0 && (
          <div>
            <div style={{
              background: "#fff8e1", border: "1px solid #f0d060",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12,
              color: "#5a4a00", lineHeight: 1.7,
            }}>
              🏆 <strong style={{ color: "#b8860b" }}>Para classificar:</strong> taxa semanal paga + mín. {rules.minWins} vitórias + mín. {rules.minGames} jogos
            </div>

            {ranking.length === 0 && (
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
                Nenhum jogador inscrito ainda.
              </p>
            )}

            {ranking.map((r, i) => {
              const pos = r.qualified
                ? (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`)
                : "—";
              const missing = [];
              if (!r.taxaOk && r.weeksPlayed.length > 0) missing.push(`taxa pendente (${r.unpaidWeeks.length} sem.)`);
              if (r.wins < rules.minWins) missing.push(`faltam ${rules.minWins - r.wins}V`);
              if (r.played < rules.minGames) missing.push(`faltam ${rules.minGames - r.played} jogos`);

              return (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: r.qualified && i === 0 ? "#fffbea" : "#fff",
                  border: `1px solid ${r.qualified ? (i === 0 ? "#f0d060" : "#a8dbb8") : "#e0eae0"}`,
                  borderRadius: 12, padding: "12px 14px", marginBottom: 10,
                  opacity: r.qualified ? 1 : 0.75,
                  boxShadow: "0 1px 4px rgba(10,46,31,0.05)",
                }}>
                  <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{pos}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0a2e1f" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "#7a9a80", marginTop: 2 }}>
                      {r.wins}V · {r.played} jogos
                      {missing.length > 0 && (
                        <span style={{ color: "#c0392b", marginLeft: 4 }}>· {missing[0]}</span>
                      )}
                    </div>
                  </div>
                  <span className={r.qualified ? "badge-green" : "badge-red"}>
                    {r.qualified ? "Classif." : "Não classif."}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════ TAB 1: PARTIDAS ══════════════ */}
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
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1a9e4a", letterSpacing: 0.5, marginBottom: 2 }}>
                    📅 {date === "sem-data" ? "Sem data" : formatDate(date)}
                  </div>
                  <div style={{
                    fontSize: 11, color: "#7a9a80", marginBottom: 10,
                    paddingBottom: 8, borderBottom: "1px solid #d4e4d4",
                  }}>
                    Semana: {date === "sem-data" ? "—" : getWeekRange(getWeekKey(date))}
                  </div>

                  {dayMatches.map((m) => {
                    const d1w = m.score1 > m.score2;
                    const d2w = m.score2 > m.score1;
                    const d1name = m.p1b ? `${m.p1a} & ${m.p1b}` : m.p1a;
                    const d2name = m.p2b ? `${m.p2a} & ${m.p2b}` : m.p2a;
                    return (
                      <div key={m.id} style={{
                        background: "#fff", border: "1px solid #d4e4d4",
                        borderRadius: 12, padding: "12px 14px", marginBottom: 8,
                        boxShadow: "0 1px 4px rgba(10,46,31,0.05)",
                      }}>
                        {/* Dupla 1 */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: d1w ? "#1a7a40" : "#0a2e1f", flex: 1 }}>
                            {d1w && <span style={{ marginRight: 5 }}>🏆</span>}{d1name}
                          </div>
                          <div style={{
                            fontSize: 22, fontWeight: 800, minWidth: 36, textAlign: "right",
                            color: d1w ? "#1a9e4a" : d2w ? "#c0392b" : "#0a2e1f",
                          }}>{m.score1}</div>
                        </div>
                        <div style={{ borderTop: "1px solid #eef4ee", margin: "4px 0" }} />
                        {/* Dupla 2 */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: d2w ? "#1a7a40" : "#0a2e1f", flex: 1 }}>
                            {d2w && <span style={{ marginRight: 5 }}>🏆</span>}{d2name}
                          </div>
                          <div style={{
                            fontSize: 22, fontWeight: 800, minWidth: 36, textAlign: "right",
                            color: d2w ? "#1a9e4a" : d1w ? "#c0392b" : "#0a2e1f",
                          }}>{m.score2}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        )}

        {/* ══════════════ TAB 2: FINANCEIRO ══════════════ */}
        {tab === 2 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ color: "#7a9a80", fontSize: 11, marginBottom: 6 }}>ARRECADADO</div>
                <div style={{ color: "#1a9e4a", fontWeight: 800, fontSize: 22 }}>R$ {totalPago}</div>
              </div>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ color: "#7a9a80", fontSize: 11, marginBottom: 6 }}>PENDENTE</div>
                <div style={{ color: "#c0392b", fontWeight: 800, fontSize: 22 }}>R$ {totalPendente}</div>
              </div>
            </div>

            {!isAdmin && (
              <div style={{
                background: "#fff8e1", border: "1px solid #f0d060",
                borderRadius: 10, padding: "10px 14px", fontSize: 12,
                color: "#5a4a00", marginBottom: 16,
              }}>
                💡 Apenas administradores podem alterar o status de pagamento.
              </div>
            )}

            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1a9e4a", marginBottom: 14 }}>Jogadores</h2>

            {members.map((m) => {
              const stats = statsFor(m);
              return (
                <div key={m.id} style={{
                  background: "#fff", border: "1px solid #d4e4d4",
                  borderRadius: 14, padding: "14px 16px", marginBottom: 12,
                  boxShadow: "0 1px 4px rgba(10,46,31,0.05)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: stats.weeksPlayed.length > 0 ? 12 : 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: stats.unpaidWeeks.length === 0 && stats.weeksPlayed.length > 0 ? "#f0faf4" : "#fdf0f0",
                      border: `1px solid ${stats.unpaidWeeks.length === 0 && stats.weeksPlayed.length > 0 ? "#a8dbb8" : "#f5c0c0"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 14,
                      color: stats.unpaidWeeks.length === 0 && stats.weeksPlayed.length > 0 ? "#1a7a40" : "#c0392b",
                    }}>{m.name?.[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#0a2e1f", display: "flex", gap: 6, alignItems: "center" }}>
                        {m.name}
                        {m.role === "admin" && (
                          <span style={{ fontSize: 10, color: "#b8860b", fontWeight: 700 }}>ADMIN</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#7a9a80" }}>
                        {stats.weeksPlayed.length} {stats.weeksPlayed.length === 1 ? "semana" : "semanas"} · R$ {rules.weeklyFee}/sem
                      </div>
                    </div>
                  </div>

                  {stats.weeksPlayed.length === 0 && (
                    <div style={{ fontSize: 12, color: "#a0b8a5", fontStyle: "italic" }}>
                      Sem partidas registradas ainda
                    </div>
                  )}

                  {stats.weeksPlayed.map((wk) => {
                    const paid = (m.paidWeeks || []).includes(wk);
                    const refMatch = matches.find((mm) => getWeekKey(mm.date || todayStr()) === wk);
                    const displayRange = refMatch ? getWeekRange(getWeekKey(refMatch.date)) : wk;
                    return (
                      <div key={wk} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "#f5f8f5", border: "1px solid #e0eae0", borderRadius: 10,
                        padding: "8px 12px", marginBottom: 6,
                      }}>
                        <div style={{ fontSize: 12, color: "#5a7a65" }}>{displayRange}</div>
                        <button
                          onClick={() => handleToggleWeekPaid(m, wk)}
                          disabled={!isAdmin}
                          style={{ background: "none", border: "none", cursor: isAdmin ? "pointer" : "default" }}
                        >
                          <span className={paid ? "badge-green" : "badge-red"}>
                            {paid ? `✓ R$ ${rules.weeklyFee}` : `⏳ R$ ${rules.weeklyFee}`}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════ TAB 3: NOVA PARTIDA ══════════════ */}
        {tab === 3 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#1a9e4a" }}>Registrar Partida</h2>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <div>
                <Lbl>DATA DA PARTIDA</Lbl>
                <input className="input-field" type="date" value={nm.date} onChange={setF("date")} />
                {nm.date && (
                  <div style={{ fontSize: 11, color: "#7a9a80", marginTop: 5 }}>
                    📅 Semana: {getWeekRange(getWeekKey(nm.date))}
                  </div>
                )}
              </div>

              {/* Dupla 1 */}
              <div style={{
                background: "#f0faf4", border: "1px solid #a8dbb8",
                borderRadius: 12, padding: 12,
              }}>
                <div style={{ fontSize: 12, color: "#1a7a40", fontWeight: 700, marginBottom: 10 }}>🟢 DUPLA 1</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <Lbl>JOGADOR A</Lbl>
                    <select className="input-field" value={nm.p1a} onChange={setF("p1a")}>
                      <option value="">Selecionar...</option>
                      {memberNames.filter((n) => ![nm.p1b, nm.p2a, nm.p2b].includes(n)).map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Lbl>JOGADOR B (opcional)</Lbl>
                    <select className="input-field" value={nm.p1b} onChange={setF("p1b")}>
                      <option value="">— sem parceiro —</option>
                      {memberNames.filter((n) => ![nm.p1a, nm.p2a, nm.p2b].includes(n)).map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Placar central */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "end" }}>
                <div>
                  <Lbl>SETS D1</Lbl>
                  <input className="input-field" type="number" inputMode="numeric" min="0" placeholder="0"
                    value={nm.score1} onChange={setF("score1")}
                    style={{ textAlign: "center", fontSize: 20, fontWeight: 800 }} />
                </div>
                <div style={{ paddingBottom: 12, color: "#c8dcc8", fontSize: 18, textAlign: "center" }}>×</div>
                <div>
                  <Lbl>SETS D2</Lbl>
                  <input className="input-field" type="number" inputMode="numeric" min="0" placeholder="0"
                    value={nm.score2} onChange={setF("score2")}
                    style={{ textAlign: "center", fontSize: 20, fontWeight: 800 }} />
                </div>
              </div>

              {/* Dupla 2 */}
              <div style={{
                background: "#fdf0f0", border: "1px solid #f5c0c0",
                borderRadius: 12, padding: 12,
              }}>
                <div style={{ fontSize: 12, color: "#c0392b", fontWeight: 700, marginBottom: 10 }}>🔴 DUPLA 2</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <Lbl>JOGADOR A</Lbl>
                    <select className="input-field" value={nm.p2a} onChange={setF("p2a")}>
                      <option value="">Selecionar...</option>
                      {memberNames.filter((n) => ![nm.p1a, nm.p1b, nm.p2b].includes(n)).map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Lbl>JOGADOR B (opcional)</Lbl>
                    <select className="input-field" value={nm.p2b} onChange={setF("p2b")}>
                      <option value="">— sem parceiro —</option>
                      {memberNames.filter((n) => ![nm.p1a, nm.p1b, nm.p2a].includes(n)).map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview resultado */}
              {nm.p1a && nm.p2a && nm.score1 !== "" && nm.score2 !== "" && (
                <div style={{
                  background: "#f0faf4", border: "1px solid #a8dbb8",
                  borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#1a7a40", textAlign: "center",
                }}>
                  {Number(nm.score1) > Number(nm.score2)
                    ? `🏆 ${nm.p1a}${nm.p1b ? " & " + nm.p1b : ""} vencem!`
                    : Number(nm.score2) > Number(nm.score1)
                    ? `🏆 ${nm.p2a}${nm.p2b ? " & " + nm.p2b : ""} vencem!`
                    : "🤝 Empate!"}
                </div>
              )}

              <button className="btn-green" onClick={handleAddMatch}
                disabled={saving || !nm.p1a || !nm.p2a || nm.score1 === "" || nm.score2 === ""}>
                {saving ? "Salvando..." : "Salvar Partida 🎾"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ TAB 4: CONFIG (só admin) ══════════════ */}
        {tab === 4 && isAdmin && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "#1a9e4a" }}>Configurações</h2>
            <p style={{ fontSize: 12, color: "#7a9a80", marginBottom: 18 }}>
              Visível e editável apenas por admins.
            </p>

            {/* Regras */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#0a2e1f" }}>🏆 Regras de Classificação</div>
              {editRules ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { lbl: "MÍNIMO DE VITÓRIAS", key: "minWins" },
                    { lbl: "MÍNIMO DE JOGOS", key: "minGames" },
                    { lbl: "TAXA SEMANAL (R$)", key: "weeklyFee" },
                  ].map(({ lbl, key }) => (
                    <div key={key}>
                      <Lbl>{lbl}</Lbl>
                      <input className="input-field" type="number" inputMode="numeric" min="0"
                        value={editRules[key]}
                        onChange={(e) => setEditRules((r) => ({ ...r, [key]: Number(e.target.value) }))} />
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn-green" onClick={handleSaveRules}>Salvar</button>
                    <button onClick={() => setEditRules(null)} style={{
                      flex: 1, background: "#f5f8f5", border: "1px solid #c8dcc8", padding: "13px",
                      borderRadius: 12, color: "#5a7a65", fontFamily: "inherit",
                      fontSize: 14, cursor: "pointer",
                    }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div>
                  {[
                    ["Mínimo de vitórias", `${rules.minWins}V`],
                    ["Mínimo de jogos", `${rules.minGames} jogos`],
                    ["Taxa semanal", `R$ ${rules.weeklyFee}`],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 0", borderBottom: "1px solid #eef4ee", fontSize: 14,
                    }}>
                      <span style={{ color: "#5a7a65" }}>{lbl}</span>
                      <span style={{ fontWeight: 700, color: "#1a9e4a" }}>{val}</span>
                    </div>
                  ))}
                  <button onClick={() => setEditRules({ ...rules })} style={{
                    width: "100%", background: "#f5f8f5", border: "1px solid #c8dcc8", padding: "11px",
                    borderRadius: 10, color: "#0a2e1f", fontFamily: "inherit", fontSize: 13,
                    cursor: "pointer", marginTop: 14,
                  }}>✏️ Editar Regras</button>
                </div>
              )}
            </div>

            {/* Gerenciar admins */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#0a2e1f" }}>👑 Admins do Torneio</div>
              <p style={{ fontSize: 12, color: "#7a9a80", marginBottom: 12 }}>
                Admins podem marcar pagamentos e editar configurações.
              </p>
              {members.map((m) => (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", borderBottom: "1px solid #eef4ee",
                }}>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#0a2e1f" }}>{m.name}</div>
                  <button onClick={() => handleToggleAdmin(m)} style={{
                    background: m.role === "admin" ? "#fff8e1" : "#f5f8f5",
                    border: `1px solid ${m.role === "admin" ? "#f0d060" : "#c8dcc8"}`,
                    borderRadius: 8, padding: "6px 14px",
                    color: m.role === "admin" ? "#b8860b" : "#5a7a65",
                    fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>
                    {m.role === "admin" ? "👑 Admin" : "Tornar Admin"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
