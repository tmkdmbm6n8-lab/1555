import { useEffect, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { businessQuery } from "@/lib/business-query";
import {
  activeSeasonalTheme,
  audienceCanSeeTheme,
  defaultSeasonalThemeSettings,
  type SeasonalTheme as SeasonalThemeType,
} from "@/lib/seasonal-theme";

function useSeasonalState(): {
  theme: SeasonalThemeType | null;
  canView: boolean;
} {
  const { data: config } = useSuspenseQuery(businessQuery);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const admin = useQuery({
    queryKey: ["seasonal-theme-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false;
      const result = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      return result.data === true;
    },
  });

  const viewer = admin.data === true ? "admin" : "client";
  const settings = { ...defaultSeasonalThemeSettings, ...(config.seasonalTheme ?? {}) };
  const theme = activeSeasonalTheme(settings);
  const canView = Boolean(theme && audienceCanSeeTheme(settings.audience, viewer));

  return { theme, canView };
}

/**
 * Décorations saisonnières du site TClean
 */
export function SeasonalLogoHat() {
  const { theme, canView } = useSeasonalState();

  if (!canView || !theme) {
    return null;
  }

  if (theme.id === "christmas") {
    return (
      <div
        className="logo-seasonal-hat santa-hat"
        style={{
          position: "absolute",
          top: -14,
          left: -8,
          zIndex: 10,
          pointerEvents: "none",
          transform: "rotate(-12deg)",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
        }}
        aria-hidden="true"
      >
        <svg width="42" height="34" viewBox="0 0 50 40" fill="none">
          {/* Bonnet rouge */}
          <path
            d="M 6 30 Q 18 10 38 18 Q 45 22 42 26 Q 30 20 18 30 Z"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="1.2"
          />
          {/* Bordure blanche en fourrure */}
          <rect x="4" y="28" width="34" height="8" rx="4" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
          {/* Pompon blanc */}
          <circle cx="43" cy="27" r="5.5" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  if (theme.id === "halloween") {
    return (
      <div
        className="logo-seasonal-hat witch-hat"
        style={{
          position: "absolute",
          top: -16,
          left: -8,
          zIndex: 10,
          pointerEvents: "none",
          transform: "rotate(-10deg)",
          filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.35))",
        }}
        aria-hidden="true"
      >
        <svg width="44" height="36" viewBox="0 0 50 42" fill="none">
          {/* Bord large du chapeau */}
          <ellipse cx="25" cy="36" rx="22" ry="5.5" fill="#1e1b4b" stroke="#0f172a" strokeWidth="1.2" />
          {/* Pointe courbée de sorcière */}
          <path
            d="M 12 34 Q 22 18 28 6 Q 32 4 30 8 Q 28 18 38 34 Z"
            fill="#312e81"
            stroke="#1e1b4b"
            strokeWidth="1.2"
          />
          {/* Ruban orange Halloween */}
          <path d="M 13 33 Q 25 31 37 33 L 36.5 30 Q 25 28 13.5 30 Z" fill="#ea580c" />
          {/* Boucle dorée */}
          <rect x="23" y="28.5" width="5" height="5" rx="1" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
        </svg>
      </div>
    );
  }

  return null;
}

function SeasonalDecorations({ themeId }: { themeId: string }) {
  if (themeId === "christmas") {
    return (
      <aside className="seasonal-decorations seasonal-snow" aria-hidden="true">
        <span className="snowflake">❄</span>
        <span className="snowflake">❅</span>
        <span className="snowflake">❆</span>
        <span className="snowflake">❄</span>
        <span className="snowflake">❅</span>
        <span className="snowflake">❆</span>
        <span className="snowflake">❄</span>
        <span className="snowflake">❅</span>
      </aside>
    );
  }

  if (themeId === "halloween") {
    return (
      <aside className="seasonal-decorations seasonal-spooky" aria-hidden="true">
        {/* Fantômes flottants */}
        <div className="floating-ghost ghost-1">
          <svg viewBox="0 0 40 50" width="36" height="45">
            <path
              d="M 5 25 C 5 10, 35 10, 35 25 L 35 45 C 31 42, 27 47, 24 43 C 20 47, 16 42, 12 45 C 9 42, 5 45, 5 43 Z"
              fill="rgba(255,255,255,0.85)"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="1.5"
            />
            <circle cx="15" cy="22" r="3" fill="#1e1e1e" />
            <circle cx="25" cy="22" r="3" fill="#1e1e1e" />
            <ellipse cx="20" cy="30" rx="2.5" ry="4" fill="#1e1e1e" />
          </svg>
        </div>
        <div className="floating-ghost ghost-2">
          <svg viewBox="0 0 40 50" width="28" height="36">
            <path
              d="M 5 25 C 5 10, 35 10, 35 25 L 35 45 C 31 42, 27 47, 24 43 C 20 47, 16 42, 12 45 C 9 42, 5 45, 5 43 Z"
              fill="rgba(255,255,255,0.75)"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="1.5"
            />
            <circle cx="15" cy="22" r="2.5" fill="#1e1e1e" />
            <circle cx="25" cy="22" r="2.5" fill="#1e1e1e" />
          </svg>
        </div>

        {/* Chauves-souris */}
        <div className="bat bat-1">🦇</div>
        <div className="bat bat-2">🦇</div>

        {/* Cercueil flottant */}
        <div
          className="spooky-coffin"
          style={{
            position: "fixed",
            bottom: "12%",
            left: "2%",
            zIndex: 3,
            pointerEvents: "none",
            filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))",
          }}
        >
          <svg width="40" height="60" viewBox="0 0 40 60" fill="none">
            {/* Forme du cercueil */}
            <polygon points="12,2 28,2 38,18 30,58 10,58 2,18" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />
            {/* Croix dorée discrète */}
            <line x1="20" y1="14" x2="20" y2="34" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
            <line x1="14" y1="21" x2="26" y2="21" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Citrouille lumineuse */}
        <div
          className="spooky-pumpkin"
          style={{
            position: "fixed",
            bottom: "10%",
            right: "2.5%",
            fontSize: "30px",
            zIndex: 3,
            pointerEvents: "none",
            filter: "drop-shadow(0 0 10px rgba(249, 115, 22, 0.5))",
          }}
        >
          🎃
        </div>
      </aside>
    );
  }

  if (themeId === "valentine") {
    return (
      <aside className="seasonal-decorations seasonal-hearts" aria-hidden="true">
        <span className="heart heart-1">♥</span>
        <span className="heart heart-2">♥</span>
        <span className="heart heart-3">♥</span>
      </aside>
    );
  }

  return null;
}

export function SeasonalTheme() {
  const { theme, canView } = useSeasonalState();

  useEffect(() => {
    const allSeasons = [
      "season-new-year",
      "season-valentine",
      "season-spring",
      "season-easter",
      "season-summer",
      "season-back-to-school",
      "season-autumn",
      "season-halloween",
      "season-black-friday",
      "season-christmas",
    ];

    document.documentElement.classList.remove(...allSeasons);

    if (theme && canView) {
      document.documentElement.classList.add(theme.className);
    }

    return () => {
      document.documentElement.classList.remove(...allSeasons);
    };
  }, [theme, canView]);

  if (!theme || !canView) {
    return null;
  }

  return <SeasonalDecorations themeId={theme.id} />;
}
