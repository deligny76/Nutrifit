// ── CONFIG — REMPLACE CES VALEURS ────────────────────────────
const SUPABASE_URL = "COLLE_TON_URL_ICI";
const SUPABASE_ANON_KEY = "COLLE_TA_CLE_ICI";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── COULEURS ─────────────────────────────────────────────────
const C = {
  bg: "#F7F3EE", green: "#2D6A4F", greenLight: "#52B788", greenPale: "#D8F3DC",
  orange: "#E76F51", orangeLight: "#F4A261", cream: "#FEFAE0",
  text: "#1B1B1B", muted: "#6B7280", border: "#E5E0D8", white: "#FFFFFF",
};

// ── DONNÉES ──────────────────────────────────────────────────
const FOOD_CATS = [
  { id: "viandes", label: "Viandes & Poissons", icon: "🥩", items: ["Poulet", "Bœuf haché", "Dinde", "Saumon", "Thon (boîte)", "Jambon", "Œufs", "Crevettes", "Sardines", "Steak"] },
  { id: "laitiers", label: "Produits laitiers", icon: "🥛", items: ["Lait", "Yaourt nature", "Fromage blanc", "Beurre", "Crème fraîche", "Gruyère", "Mozzarella", "Skyr", "Lait végétal"] },
  { id: "legumes", label: "Légumes", icon: "🥦", items: ["Tomates", "Épinards", "Courgettes", "Brocoli", "Carottes", "Poivrons", "Oignons", "Ail", "Haricots verts", "Champignons", "Concombre", "Salade", "Aubergine"] },
  { id: "fruits", label: "Fruits", icon: "🍎", items: ["Banane", "Pomme", "Orange", "Fraises", "Myrtilles", "Kiwi", "Avocat", "Citron", "Mangue", "Raisin"] },
  { id: "feculents", label: "Féculents & Céréales", icon: "🌾", items: ["Riz", "Pâtes", "Pain", "Pommes de terre", "Quinoa", "Flocons d'avoine", "Lentilles", "Pois chiches", "Farine"] },
  { id: "epicerie", label: "Épicerie & Autres", icon: "🫙", items: ["Huile d'olive", "Sauce tomate", "Miel", "Noix", "Amandes", "Chocolat noir", "Protéine en poudre", "Sel", "Poivre", "Herbes"] },
];

const RESTRICTIONS = ["Végétarien", "Vegan", "Sans gluten", "Sans lactose", "Sans noix", "Halal", "Casher", "Pas de porc"];
const ACTIVITIES = [
  { id: "sedentaire", label: "Sédentaire", desc: "Peu ou pas de sport", icon: "🪑" },
  { id: "leger", label: "Légèrement actif", desc: "Sport 1-2x/semaine", icon: "🚶" },
  { id: "modere", label: "Modérément actif", desc: "Sport 3-4x/semaine", icon: "🏃" },
  { id: "actif", label: "Très actif", desc: "Sport 5-6x/semaine", icon: "⚡" },
  { id: "extreme", label: "Athlète", desc: "Sport intense quotidien", icon: "🏆" },
];
const OBJECTIVES = [
  { id: "fat_loss", icon: "🔥", label: "Perdre du gras" },
  { id: "muscle", icon: "💪", label: "Prendre du muscle" },
  { id: "health", icon: "🌿", label: "Manger sainement" },
  { id: "budget", icon: "💰", label: "Petit budget" },
];

// ── HELPERS ──────────────────────────────────────────────────
async function callClaude(prompt, max_tokens = 1200) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

function buildProfileText(p) {
  return `Profil : ${p.sexe === "homme" ? "Homme" : "Femme"}, ${p.age} ans, ${p.poids} kg, ${p.taille} cm.
Activité physique : ${ACTIVITIES.find(a => a.id === p.activite)?.label}.
Objectif : ${OBJECTIVES.find(o => o.id === p.objectif)?.label}.
Restrictions alimentaires : ${p.restrictions ? p.restrictions : "aucune"}.`;
}

function calcBMR(p) {
  const w = parseFloat(p.poids), h = parseFloat(p.taille), a = parseFloat(p.age);
  if (!w || !h || !a) return null;
  const bmr = p.sexe === "homme" ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
  const factors = { sedentaire: 1.2, leger: 1.375, modere: 1.55, actif: 1.725, extreme: 1.9 };
  const tdee = Math.round(bmr * (factors[p.activite] || 1.2));
  const target = p.objectif === "fat_loss" ? tdee - 400 : p.objectif === "muscle" ? tdee + 300 : tdee;
  return { tdee, target };
}

// ── UI ATOMS ─────────────────────────────────────────────────
function Loader() {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "20px 0" }}>
      {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.greenLight, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  );
}

function Chip({ children, active, onClick, color }) {
  const bg = color === "orange" ? C.orangeLight : C.green;
  return (
    <button onClick={onClick} style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${active ? bg : C.border}`, background: active ? (color === "orange" ? "#FEE8E0" : C.greenPale) : "white", color: active ? bg : C.muted, fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: active ? 600 : 400 }}>
      {children}
    </button>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", marginBottom: 16 }}>
      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "11px 14px 11px 40px", borderRadius: 50, border: `1.5px solid ${C.border}`, fontFamily: "system-ui", fontSize: 14, outline: "none", background: "white", boxSizing: "border-box", color: C.text }} />
    </div>
  );
}

function CheckboxGrid({ selected, onToggle, search }) {
  return (
    <>
      {FOOD_CATS.map(cat => {
        const filtered = cat.items.filter(i => i.toLowerCase().includes(search.toLowerCase()));
        if (!filtered.length) return null;
        return (
          <div key={cat.id} style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.green, marginBottom: 8 }}>{cat.icon} {cat.label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {filtered.map(item => {
                const active = selected.includes(item);
                return (
                  <div key={item} onClick={() => onToggle(item)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, background: active ? C.greenPale : "white", border: `1.5px solid ${active ? C.green : C.border}`, cursor: "pointer" }}>
                    <div style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0, border: `2px solid ${active ? C.green : C.border}`, background: active ? C.green : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {active && <span style={{ color: "white", fontSize: 9, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? C.green : C.text }}>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

function formatText(text) {
  return text.split("\n").map((line, i) => {
    if (line.match(/^\*\*(.*)\*\*$/)) return <div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 12, marginBottom: 2, color: C.green }}>{line.replace(/\*\*/g, "")}</div>;
    if (line.match(/\*\*(.*)\*\*/)) return <div key={i} style={{ fontWeight: 700, marginTop: 8, marginBottom: 1 }}>{line.replace(/\*\*/g, "")}</div>;
    if (line.startsWith("- ") || line.match(/^\d+\./)) return <div key={i} style={{ paddingLeft: 8, marginBottom: 2, fontSize: 14 }}>{line}</div>;
    if (!line.trim()) return <div key={i} style={{ height: 4 }} />;
    return <div key={i} style={{ marginBottom: 2, fontSize: 14 }}>{line}</div>;
  });
}

function StickyBtn({ label, onClick, disabled, color = "green" }) {
  const bg = color === "orange" ? C.orange : C.green;
  const shadow = color === "orange" ? "0 4px 20px rgba(231,111,81,0.4)" : "0 4px 20px rgba(45,106,79,0.35)";
  return (
    <div style={{ position: "sticky", bottom: 80, zIndex: 10, marginTop: 12 }}>
      <button onClick={onClick} disabled={disabled} style={{ width: "100%", padding: 14, borderRadius: 50, background: disabled ? C.border : bg, color: "white", border: "none", fontSize: 16, fontWeight: 600, cursor: disabled ? "default" : "pointer", fontFamily: "system-ui", boxShadow: disabled ? "none" : shadow }}>
        {label}
      </button>
    </div>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: "home", icon: "🏠", label: "Accueil" },
    { id: "recettes", icon: "🍳", label: "Recettes" },
    { id: "courses", icon: "🛒", label: "Courses" },
    { id: "apprendre", icon: "📚", label: "Apprendre" },
    { id: "profil", icon: "👤", label: "Profil" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: `1px solid ${C.border}`, display: "flex", padding: "10px 0 18px", maxWidth: 480, margin: "0 auto", zIndex: 100 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, border: "none", background: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", fontFamily: "system-ui", color: active === t.id ? C.green : C.muted }}>
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: active === t.id ? 700 : 400 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── AUTH ─────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess("Compte créé ! Vérifie ton email pour confirmer.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Email ou mot de passe incorrect");
      else onAuth(data.user);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>🥗</div>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: C.green, margin: 0, fontFamily: "Georgia, serif" }}>Nutri<span style={{ color: C.orange }}>Fit</span></h1>
        <p style={{ color: C.muted, marginTop: 8, fontSize: 15 }}>Ton coach nutrition personnalisé</p>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: 24, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", marginBottom: 24, background: C.bg, borderRadius: 12, padding: 4 }}>
          {[["login", "Se connecter"], ["register", "S'inscrire"]].map(([id, label]) => (
            <button key={id} onClick={() => { setMode(id); setError(""); setSuccess(""); }}
              style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: mode === id ? "white" : "transparent", fontWeight: mode === id ? 700 : 400, color: mode === id ? C.green : C.muted, cursor: "pointer", fontFamily: "system-ui", fontSize: 14, boxShadow: mode === id ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.text }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com"
            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontFamily: "system-ui", fontSize: 15, outline: "none", boxSizing: "border-box", color: C.text }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.text }}>Mot de passe</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontFamily: "system-ui", fontSize: 15, outline: "none", boxSizing: "border-box", color: C.text }} />
        </div>

        {error && <div style={{ background: "#FEE2E2", color: "#DC2626", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>⚠️ {error}</div>}
        {success && <div style={{ background: C.greenPale, color: C.green, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>✅ {success}</div>}

        <button onClick={handleSubmit} disabled={loading || !email || !password}
          style={{ width: "100%", padding: 14, borderRadius: 50, background: loading || !email || !password ? C.border : C.green, color: "white", border: "none", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "system-ui", boxShadow: "0 4px 20px rgba(45,106,79,0.3)" }}>
          {loading ? "Chargement..." : mode === "login" ? "Se connecter →" : "Créer mon compte →"}
        </button>
      </div>
    </div>
  );
}

// ── ONBOARDING ───────────────────────────────────────────────
function Onboarding({ onDone, userId }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ sexe: "", age: "", poids: "", taille: "", activite: "", objectif: "", restrictions: [] });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }));
  const toggleR = r => setP(prev => ({ ...prev, restrictions: prev.restrictions.includes(r) ? prev.restrictions.filter(x => x !== r) : [...prev.restrictions, r] }));

  const saveAndDone = async () => {
    setSaving(true);
    const profileData = {
      user_id: userId,
      sexe: p.sexe,
      age: parseInt(p.age),
      poids: parseFloat(p.poids),
      taille: parseFloat(p.taille),
      activite: p.activite,
      objectif: p.objectif,
      restrictions: p.restrictions.join(", "),
    };
    await supabase.from("profiles").upsert(profileData, { onConflict: "user_id" });
    setSaving(false);
    onDone(p);
  };

  const inputStyle = { width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontFamily: "system-ui", fontSize: 15, outline: "none", background: "white", boxSizing: "border-box", color: C.text };

  const steps = [
    <div key={0} style={{ textAlign: "center" }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🥗</div>
      <h1 style={{ fontSize: 34, fontWeight: 700, color: C.green, margin: 0, fontFamily: "Georgia, serif" }}>Nutri<span style={{ color: C.orange }}>Fit</span></h1>
      <p style={{ color: C.muted, marginTop: 12, fontSize: 16, lineHeight: 1.6 }}>Ton coach nutrition personnalisé selon ton profil, ton corps et tes objectifs.</p>
      <button onClick={() => setStep(1)} style={{ marginTop: 40, padding: "16px 48px", borderRadius: 50, background: C.green, color: "white", border: "none", fontSize: 17, fontWeight: 600, cursor: "pointer", fontFamily: "system-ui", boxShadow: "0 4px 20px rgba(45,106,79,0.35)" }}>Commencer →</button>
    </div>,

    <div key={1}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", marginBottom: 6 }}>Ton profil de base</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>Pour calculer tes besoins caloriques précis</p>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Sexe</div>
        <div style={{ display: "flex", gap: 12 }}>
          {[{ id: "homme", icon: "👨", label: "Homme" }, { id: "femme", icon: "👩", label: "Femme" }].map(s => (
            <div key={s.id} onClick={() => set("sexe", s.id)} style={{ flex: 1, padding: "16px", borderRadius: 14, border: `2px solid ${p.sexe === s.id ? C.green : C.border}`, background: p.sexe === s.id ? C.greenPale : "white", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 28 }}>{s.icon}</div>
              <div style={{ fontWeight: 600, marginTop: 6, color: p.sexe === s.id ? C.green : C.text }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Âge</div>
        <input type="number" value={p.age} onChange={e => set("age", e.target.value)} placeholder="Ex : 21" style={inputStyle} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Poids (kg)</div>
          <input type="number" value={p.poids} onChange={e => set("poids", e.target.value)} placeholder="Ex : 75" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Taille (cm)</div>
          <input type="number" value={p.taille} onChange={e => set("taille", e.target.value)} placeholder="Ex : 178" style={inputStyle} />
        </div>
      </div>
      <NavBtns onBack={() => setStep(0)} onNext={() => setStep(2)} disabled={!p.sexe || !p.age || !p.poids || !p.taille} />
    </div>,

    <div key={2}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", marginBottom: 6 }}>Niveau d'activité physique</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Tes dépenses énergétiques</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ACTIVITIES.map(a => (
          <div key={a.id} onClick={() => set("activite", a.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, border: `2px solid ${p.activite === a.id ? C.green : C.border}`, background: p.activite === a.id ? C.greenPale : "white", cursor: "pointer" }}>
            <span style={{ fontSize: 26 }}>{a.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: p.activite === a.id ? C.green : C.text }}>{a.label}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{a.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <NavBtns onBack={() => setStep(1)} onNext={() => setStep(3)} disabled={!p.activite} />
    </div>,

    <div key={3}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", marginBottom: 6 }}>Ton objectif principal</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Tout le contenu sera adapté en conséquence</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {OBJECTIVES.map(o => (
          <div key={o.id} onClick={() => set("objectif", o.id)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", borderRadius: 14, border: `2px solid ${p.objectif === o.id ? C.green : C.border}`, background: p.objectif === o.id ? C.greenPale : "white", cursor: "pointer" }}>
            <span style={{ fontSize: 30 }}>{o.icon}</span>
            <div style={{ fontWeight: 700, fontSize: 16, color: p.objectif === o.id ? C.green : C.text }}>{o.label}</div>
          </div>
        ))}
      </div>
      <NavBtns onBack={() => setStep(2)} onNext={() => setStep(4)} disabled={!p.objectif} />
    </div>,

    <div key={4}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", marginBottom: 6 }}>Restrictions alimentaires</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Optionnel — laisse vide si aucune</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {RESTRICTIONS.map(r => (
          <Chip key={r} active={p.restrictions.includes(r)} onClick={() => toggleR(r)}>{r}</Chip>
        ))}
      </div>
      <NavBtns onBack={() => setStep(3)} onNext={saveAndDone} nextLabel={saving ? "Sauvegarde..." : "C'est parti 🚀"} disabled={saving} />
    </div>,
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "40px 24px 30px", fontFamily: "system-ui", display: "flex", flexDirection: "column", justifyContent: step === 0 ? "center" : "flex-start" }}>
      {step > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 10, background: i <= step ? C.green : C.border }} />
          ))}
        </div>
      )}
      {steps[step]}
    </div>
  );
}

function NavBtns({ onBack, onNext, disabled, nextLabel = "Continuer →" }) {
  return (
    <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
      <button onClick={onBack} style={{ padding: "14px 20px", borderRadius: 50, background: "white", border: `1.5px solid ${C.border}`, fontSize: 15, cursor: "pointer", fontFamily: "system-ui", color: C.muted }}>← Retour</button>
      <button onClick={onNext} disabled={disabled} style={{ flex: 1, padding: 14, borderRadius: 50, background: disabled ? C.border : C.green, color: "white", border: "none", fontSize: 16, fontWeight: 600, cursor: disabled ? "default" : "pointer", fontFamily: "system-ui" }}>{nextLabel}</button>
    </div>
  );
}

// ── HOME TAB ─────────────────────────────────────────────────
function HomeTab({ profile }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const cal = calcBMR(profile);
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const generate = async () => {
    setLoading(true); setRecipes([]); setExpanded(null);
    const profileText = buildProfileText(profile);
    const res = await callClaude(`${profileText}
Besoins caloriques estimés : ${cal?.target} kcal/jour (objectif).
Génère exactement 3 recettes variées (petit-déjeuner OU déjeuner OU dîner OU snack) pour aujourd'hui, adaptées à ce profil.
Réponds en JSON strict uniquement, sans backticks :
[
  {
    "meal": "Petit-déjeuner",
    "name": "Nom de la recette",
    "emoji": "🍳",
    "time": "10 min",
    "calories": 450,
    "proteines": 35,
    "ingredients": ["Ingrédient 1 (quantité)", "Ingrédient 2 (quantité)"],
    "steps": ["Étape 1", "Étape 2"],
    "tip": "Conseil adapté au profil en 1 phrase"
  }
]`, 1500);
    try {
      const cleaned = res.replace(/```json|```/g, "").trim();
      setRecipes(JSON.parse(cleaned));
    } catch { setRecipes([]); }
    setLoading(false);
  };

  const obj = OBJECTIVES.find(o => o.id === profile.objectif);
  const act = ACTIVITIES.find(a => a.id === profile.activite);

  return (
    <div style={{ padding: "24px 20px 100px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.muted, textTransform: "capitalize" }}>{today}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "Georgia, serif", color: C.text, margin: "4px 0" }}>Bonjour 👋</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <span style={{ background: C.greenPale, color: C.green, borderRadius: 10, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>{obj?.icon} {obj?.label}</span>
          <span style={{ background: "#EEF2FF", color: "#4F46E5", borderRadius: 10, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>{act?.icon} {act?.label}</span>
          {cal && <span style={{ background: "#FEF3C7", color: "#B45309", borderRadius: 10, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>🎯 {cal.target} kcal/jour</span>}
        </div>
      </div>

      <button onClick={generate} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 50, background: loading ? C.border : C.orange, color: "white", border: "none", fontSize: 16, fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: "system-ui", boxShadow: loading ? "none" : "0 4px 20px rgba(231,111,81,0.35)", marginBottom: 20 }}>
        {loading ? "Génération des recettes..." : recipes.length ? "🔄 Nouvelles recettes du jour" : "✨ Mes 3 recettes du jour"}
      </button>

      {loading && <Loader />}

      {recipes.map((r, i) => (
        <div key={i} style={{ background: "white", borderRadius: 16, marginBottom: 14, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div onClick={() => setExpanded(expanded === i ? null : i)} style={{ padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.orange, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{r.meal}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{r.emoji} {r.name}</div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 12, color: C.muted }}>⏱ {r.time}</span>
                <span style={{ fontSize: 12, color: C.muted }}>🔥 {r.calories} kcal</span>
                <span style={{ fontSize: 12, color: C.muted }}>💪 {r.proteines}g prot.</span>
              </div>
            </div>
            <span style={{ fontSize: 18, color: C.muted }}>{expanded === i ? "▲" : "▼"}</span>
          </div>
          {expanded === i && (
            <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 18px", background: C.bg }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.green, marginBottom: 8 }}>🧺 Ingrédients</div>
              {r.ingredients.map((ing, j) => <div key={j} style={{ fontSize: 14, marginBottom: 4, paddingLeft: 8 }}>• {ing}</div>)}
              <div style={{ fontWeight: 700, fontSize: 13, color: C.green, marginTop: 14, marginBottom: 8 }}>👨‍🍳 Préparation</div>
              {r.steps.map((s, j) => <div key={j} style={{ fontSize: 14, marginBottom: 6 }}>{j + 1}. {s}</div>)}
              <div style={{ marginTop: 14, background: C.cream, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400E", border: `1px solid ${C.orangeLight}` }}>
                💡 {r.tip}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── RECETTES TAB ─────────────────────────────────────────────
function RecettesTab({ profile }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState([]);
  const [recette, setRecette] = useState("");
  const [loading, setLoading] = useState(false);
  const filterOptions = ["Rapide (<20 min)", "Sans viande", "Pas cher", "Riche en protéines"];
  const toggle = item => setSelected(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);

  const generate = async () => {
    if (!selected.length) return;
    setLoading(true); setRecette("");
    const filterText = filters.length ? `Contraintes supplémentaires : ${filters.join(", ")}.` : "";
    const res = await callClaude(`${buildProfileText(profile)}
Ingrédients disponibles : ${selected.join(", ")}. ${filterText}
Propose UNE recette adaptée à ce profil précis (portions, calories, macros calculés pour ce poids/objectif).
Format :
**Nom de la recette** 🍽️
⏱️ Temps : X min | 👤 Pour 1 personne
**Ingrédients :**
- liste avec quantités précises
**Préparation :**
1. étapes
**Macros pour ce profil :**
- Calories : X kcal (sur ${calcBMR(profile)?.target || "?"} kcal recommandés)
- Protéines : Xg | Glucides : Xg | Lipides : Xg
**Pourquoi c'est adapté pour toi :** explication personnalisée.`);
    setRecette(res); setLoading(false);
  };

  return (
    <div style={{ padding: "24px 20px 100px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "Georgia, serif", color: C.text, marginBottom: 4 }}>Recettes 🍳</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>
        Adaptées à ton profil : <strong style={{ color: C.green }}>{profile.poids}kg • {ACTIVITIES.find(a => a.id === profile.activite)?.label}</strong>
        {selected.length > 0 && <span style={{ marginLeft: 10, background: C.orange, color: "white", borderRadius: 10, padding: "2px 8px", fontSize: 12 }}>{selected.length} sélectionné{selected.length > 1 ? "s" : ""}</span>}
      </p>
      <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un ingrédient..." />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Filtres</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filterOptions.map(f => <Chip key={f} active={filters.includes(f)} onClick={() => setFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}>{f}</Chip>)}
        </div>
      </div>
      <CheckboxGrid selected={selected} onToggle={toggle} search={search} />
      {selected.length > 0 && <StickyBtn label={loading ? "Génération..." : `Générer avec ${selected.length} ingrédient${selected.length > 1 ? "s" : ""} ✨`} onClick={generate} disabled={loading} color="orange" />}
      {loading && <Loader />}
      {recette && <div style={{ marginTop: 20, background: "white", borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", lineHeight: 1.7, color: C.text }}>{formatText(recette)}</div>}
    </div>
  );
}

// ── COURSES TAB ──────────────────────────────────────────────
function CoursesTab({ profile }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [liste, setListe] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState({});
  const [mode, setMode] = useState("select");
  const toggle = item => setSelected(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);

  const generate = async () => {
    if (!selected.length) return;
    setLoading(true); setListe([]); setChecked({});
    const res = await callClaude(`${buildProfileText(profile)}
Produits sélectionnés : ${selected.join(", ")}.
Génère une liste de courses organisée par rayon avec quantités pour une semaine, adaptées au profil.
Format STRICT :
🥩 VIANDES & PROTÉINES
- Poulet (700g)
🥦 LÉGUMES
- Tomates (x6)
...Seulement les rayons pertinents.`);
    const lines = res.split("\n").filter(l => l.trim());
    const sections = []; let cur = null;
    for (const line of lines) {
      if (!line.startsWith("-")) { cur = { title: line, items: [] }; sections.push(cur); }
      else if (cur) cur.items.push(line.replace("- ", "").trim());
    }
    setListe(sections); setLoading(false); setMode("list");
  };

  const toggleCheck = key => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  const total = liste.reduce((a, s) => a + s.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  if (mode === "list" && liste.length > 0) {
    return (
      <div style={{ padding: "24px 20px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "Georgia, serif", color: C.text, margin: 0 }}>Ma liste 🛒</h2>
          <button onClick={() => { setMode("select"); setListe([]); }} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: C.muted, fontFamily: "system-ui" }}>← Modifier</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{done}/{total}</span>
          <div style={{ height: 8, flex: 1, borderRadius: 10, background: C.border, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${total ? (done / total) * 100 : 0}%`, background: C.greenLight, transition: "width 0.3s", borderRadius: 10 }} />
          </div>
          <span style={{ fontSize: 13, color: C.muted }}>{total ? Math.round((done / total) * 100) : 0}%</span>
        </div>
        {liste.map((section, si) => (
          <div key={si} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.green, marginBottom: 8 }}>{section.title}</div>
            {section.items.map((item, ii) => {
              const key = `${si}-${ii}`;
              return (
                <div key={key} onClick={() => toggleCheck(key)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", marginBottom: 6, borderRadius: 12, background: checked[key] ? C.greenPale : "white", border: `1px solid ${C.border}`, cursor: "pointer" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked[key] ? C.green : C.border}`, background: checked[key] ? C.green : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {checked[key] && <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 14, color: checked[key] ? C.muted : C.text, textDecoration: checked[key] ? "line-through" : "none" }}>{item}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px 100px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "Georgia, serif", color: C.text, marginBottom: 4 }}>Liste de courses 🛒</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>
        Quantités adaptées à ton profil
        {selected.length > 0 && <span style={{ marginLeft: 10, background: C.green, color: "white", borderRadius: 10, padding: "2px 8px", fontSize: 12 }}>{selected.length} produit{selected.length > 1 ? "s" : ""}</span>}
      </p>
      <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un produit..." />
      <CheckboxGrid selected={selected} onToggle={toggle} search={search} />
      {selected.length > 0 && <StickyBtn label={loading ? "Génération..." : `Créer ma liste (${selected.length} produit${selected.length > 1 ? "s" : ""}) 🛒`} onClick={generate} disabled={loading} />}
      {loading && <Loader />}
    </div>
  );
}

// ── APPRENDRE TAB ────────────────────────────────────────────
function ApprendreTab({ profile }) {
  const [question, setQuestion] = useState("");
  const [reponse, setReponse] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestions = ["C'est quoi les macros ?", "Comment calculer mes calories ?", "Quels aliments pour mon objectif ?", "Protéines végétales vs animales ?", "Comment lire une étiquette ?"];

  const ask = async (q) => {
    const toAsk = q || question;
    if (!toAsk.trim()) return;
    setLoading(true); setReponse(""); setQuestion(toAsk);
    const res = await callClaude(`${buildProfileText(profile)}
Question : "${toAsk}"
Réponds de façon personnalisée à ce profil spécifique. Clair, simple, avec emojis. Max 220 mots. Conseil concret à la fin.`);
    setReponse(res); setLoading(false);
  };

  return (
    <div style={{ padding: "24px 20px 100px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "Georgia, serif", color: C.text, marginBottom: 4 }}>Apprendre 📚</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Réponses adaptées à ton profil personnel</p>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Questions fréquentes</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {suggestions.map(s => <Chip key={s} active={question === s} onClick={() => ask(s)}>{s}</Chip>)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && ask()} placeholder="Ta question ici..."
          style={{ flex: 1, padding: "12px 16px", borderRadius: 50, border: `1.5px solid ${C.border}`, fontFamily: "system-ui", fontSize: 15, outline: "none", background: "white", color: C.text }} />
        <button onClick={() => ask()} style={{ padding: "12px 20px", borderRadius: 50, background: C.green, color: "white", border: "none", fontSize: 16, cursor: "pointer" }}>→</button>
      </div>
      {loading && <Loader />}
      {reponse && <div style={{ marginTop: 20, background: C.cream, borderRadius: 16, padding: 20, border: `1px solid ${C.orangeLight}`, fontSize: 15, lineHeight: 1.75, color: C.text, whiteSpace: "pre-wrap" }}>{reponse}</div>}
    </div>
  );
}

// ── PROFIL TAB ───────────────────────────────────────────────
function ProfilTab({ profile, onEdit, onLogout }) {
  const cal = calcBMR(profile);
  const act = ACTIVITIES.find(a => a.id === profile.activite);
  const obj = OBJECTIVES.find(o => o.id === profile.objectif);
  const rows = [
    ["👤 Sexe", profile.sexe === "homme" ? "Homme" : "Femme"],
    ["🎂 Âge", `${profile.age} ans`],
    ["⚖️ Poids", `${profile.poids} kg`],
    ["📏 Taille", `${profile.taille} cm`],
    ["🏃 Activité", act?.label],
    ["🎯 Objectif", obj?.label],
    ["🚫 Restrictions", profile.restrictions || "Aucune"],
  ];
  return (
    <div style={{ padding: "24px 20px 100px" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "Georgia, serif", color: C.text, marginBottom: 20 }}>Mon profil 👤</h2>
      {cal && (
        <div style={{ background: C.greenPale, borderRadius: 16, padding: "16px 20px", marginBottom: 20, border: `1px solid ${C.greenLight}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.green, marginBottom: 8 }}>🔥 Tes besoins caloriques estimés</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.green }}>{cal.target} kcal/jour</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Maintenance : {cal.tdee} kcal • Objectif : {cal.target} kcal</div>
        </div>
      )}
      <div style={{ background: "white", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {rows.map(([label, value], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "13px 18px", borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ color: C.muted, fontSize: 14 }}>{label}</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{value}</span>
          </div>
        ))}
      </div>
      <button onClick={onEdit} style={{ width: "100%", padding: 14, marginTop: 20, borderRadius: 50, background: "white", border: `2px solid ${C.green}`, color: C.green, fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "system-ui" }}>
        ✏️ Modifier mon profil
      </button>
      <button onClick={onLogout} style={{ width: "100%", padding: 14, marginTop: 12, borderRadius: 50, background: "white", border: `1.5px solid ${C.border}`, color: C.muted, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "system-ui" }}>
        🚪 Se déconnecter
      </button>
    </div>
  );
}

// ── APP ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("home");
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setLoadingAuth(false);
      }
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (data) setProfile(data);
    setLoadingAuth(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleProfileSaved = async (p) => {
    // Recharger le profil depuis Supabase après sauvegarde
    if (user) await loadProfile(user.id);
    else setProfile(p);
  };

  if (loadingAuth) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🥗</div>
        <Loader />
      </div>
    );
  }

  if (!user) return <AuthScreen onAuth={setUser} />;
  if (!profile) return <Onboarding onDone={handleProfileSaved} userId={user.id} />;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto", fontFamily: "system-ui" }}>
      {tab === "home" && <HomeTab profile={profile} />}
      {tab === "recettes" && <RecettesTab profile={profile} />}
      {tab === "courses" && <CoursesTab profile={profile} />}
      {tab === "apprendre" && <ApprendreTab profile={profile} />}
      {tab === "profil" && <ProfilTab profile={profile} onEdit={() => setProfile(null)} onLogout={handleLogout} />}
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
