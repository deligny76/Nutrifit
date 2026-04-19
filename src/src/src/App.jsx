import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── CONFIG ───────────────────────────────────────────────────
const SUPABASE_URL = "COLLE_TON_URL_ICI";
const SUPABASE_ANON_KEY = "COLLE_TA_CLE_ICI";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── COULEURS ─────────────────────────────────────────────────
const C = {
  bg: "#F7F3EE",
  green: "#2D6A4F",
  greenLight: "#52B788",
  greenPale: "#D8F3DC",
  orange: "#E76F51",
  orangeLight: "#F4A261",
  cream: "#FEFAE0",
  text: "#1B1B1B",
  muted: "#6B7280",
  border: "#E5E0D8",
  white: "#FFFFFF",
};

// ── HELPERS ──────────────────────────────────────────────────
function calcBMR(p) {
  if (!p) return null;
  const w = parseFloat(p.poids);
  const h = parseFloat(p.taille);
  const a = parseFloat(p.age);
  if (!w || !h || !a) return null;

  const bmr =
    p.sexe === "homme"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;

  const factors = {
    sedentaire: 1.2,
    leger: 1.375,
    modere: 1.55,
    actif: 1.725,
    extreme: 1.9,
  };

  const tdee = Math.round(bmr * (factors[p.activite] || 1.2));

  const target =
    p.objectif === "fat_loss"
      ? tdee - 400
      : p.objectif === "muscle"
      ? tdee + 300
      : tdee;

  return { tdee, target };
}

function buildProfileText(p) {
  if (!p) return "";
  return `Profil : ${p.sexe}, ${p.age} ans, ${p.poids} kg, ${p.taille} cm.
Activité : ${p.activite}.
Objectif : ${p.objectif}.
Restrictions : ${p.restrictions || "aucune"}.`;
}

// ── API IA ───────────────────────────────────────────────────
async function callClaude(prompt, max_tokens = 1200) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // ⚠️ normalement tu dois mettre ta clé ici via env variable
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ── APP ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        setUser(data.session.user);
        loadProfile(data.session.user.id);
      } else {
        setLoadingAuth(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setLoadingAuth(false);
        }
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) setProfile(data);
    setLoadingAuth(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (loadingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: C.bg,
        }}
      >
        Chargement...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Login screen (à compléter)</h1>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Onboarding (à compléter)</h1>
      </div>
    );
  }

  const cal = calcBMR(profile);

  return (
    <div style={{ padding: 20 }}>
      <h1>NutriFit 🥗</h1>

      <p>Bonjour 👋</p>

      {cal && (
        <div>
          <strong>{cal.target} kcal / jour</strong>
        </div>
      )}

      <button onClick={logout}>Logout</button>
    </div>
  );
}
