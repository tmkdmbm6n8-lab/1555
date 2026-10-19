import { useEffect, useState, useTransition } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { businessQuery } from "@/lib/business-query";
import {
  saveSiteColor,
  saveSiteSetting,
  clearSiteColors,
  updateButtonLink,
  permanentlyDeleteHidden,
} from "@/lib/business.functions";
import { elementColorKey } from "@/lib/site-colors";
import { HIDEABLE, hideKey, parseInfo } from "@/lib/editor-history";
import { SiteColorEditor, readElementColors, type ColorTarget } from "./site-color-editor";
import { EditorTypographyToolbar } from "./site-typography-toolbar";
import {
  Palette,
  Type,
  MousePointerClick,
  Trash2,
  ArrowUpRight,
  Video,
  Move,
  Moon,
  Sun,
  Smartphone,
  Tablet,
  Monitor,
  RotateCw,
  Sparkles,
  Wifi,
  Battery,
  X,
  Minus,
  ShieldAlert,
} from "lucide-react";

type Mode = "none" | "colors" | "typography" | "buttons" | "delete" | "permanent-delete" | "history" | "media" | "move";

type Audience = "all" | "client" | "admin";

type DeviceView = "desktop" | "tablet" | "mobile";

type PendingLink = {
  key: string;
  label: string;
};

type PendingMedia = {
  key: string;
  label: string;
};

type PendingMove = {
  key: string;
  label: string;
  element: HTMLElement;
};

export function SiteEditor() {
  const { data: c } = useSuspenseQuery(businessQuery);

  const save = useServerFn(saveSiteSetting);
  const saveColors = useServerFn(saveSiteColor);
  const clearColors = useServerFn(clearSiteColors);
  const linkRedirect = useServerFn(updateButtonLink);
  const permDelete = useServerFn(permanentlyDeleteHidden);

  const [isAdmin, setIsAdmin] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState<Mode>("none");
  const [audience, setAudience] = useState<Audience>("all");
  const [deviceView, setDeviceView] = useState<DeviceView>("desktop");

  const [darkMode, setDarkMode] = useState(false);
  const [timeStr, setTimeStr] = useState("12:00");

  const [pending, setPending] = useState<PendingLink | null>(null);
  const [mediaPending, setMediaPending] = useState<PendingMedia | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaLayer, setMediaLayer] = useState<"behind" | "above" | "front">("behind");
  const [mediaOpacity, setMediaOpacity] = useState(1);

  const [movePending, setMovePending] = useState<PendingMove | null>(null);
  const [moveX, setMoveX] = useState(0);
  const [moveY, setMoveY] = useState(0);
  const [moveAlign, setMoveAlign] = useState<"left" | "center" | "right">("center");

  const [colorTarget, setColorTarget] = useState<ColorTarget | "theme" | null>(null);
  const [isPending, startTransition] = useTransition();

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const navigate = useNavigate();

  // Heure dynamique dans la barre d'état du smartphone
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialisation du mode sombre depuis le cache
  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains("tclean-dark-mode") ||
      localStorage.getItem("tclean-dark-mode") === "true";
    if (isDark) {
      document.documentElement.classList.add("tclean-dark-mode");
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  const changeDeviceView = (view: DeviceView) => {
    setDeviceView(view);
    if (view === "tablet") {
      toast.info("Aperçu iPad (768 px) actif");
    } else if (view === "mobile") {
      toast.info("Aperçu iPhone (390 px) actif");
    } else {
      toast.info("Aperçu Ordinateur (Plein écran)");
    }
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("tclean-dark-mode");
        document.documentElement.classList.add("dark");
        localStorage.setItem("tclean-dark-mode", "true");
        toast.success("Mode sombre activé");
      } else {
        document.documentElement.classList.remove("tclean-dark-mode");
        document.documentElement.classList.remove("dark");
        localStorage.setItem("tclean-dark-mode", "false");
        toast.success("Mode clair activé");
      }
      return next;
    });
  };

  useEffect(() => {
    let alive = true;
    let currentUserId: string | null = null;

    const checkAdminRole = async (userId: string) => {
      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });

        if (!alive || currentUserId !== userId) return;

        if (error) {
          console.error("Vérification du rôle administrateur impossible :", error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data === true);
      } catch (error) {
        if (alive && currentUserId === userId) {
          console.error("Erreur lors de la vérification administrateur :", error);
          setIsAdmin(false);
        }
      }
    };

    const refreshSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!alive) return;

        if (error) {
          console.error("Impossible de récupérer la session :", error);
          currentUserId = null;
          setIsAdmin(false);
          return;
        }

        const userId = session?.user.id ?? null;
        currentUserId = userId;

        if (!userId) {
          setIsAdmin(false);
          return;
        }

        await checkAdminRole(userId);
      } catch (error) {
        if (alive) {
          console.error("Erreur de session :", error);
          setIsAdmin(false);
        }
      }
    };

    void refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      currentUserId = userId;

      if (!userId) {
        setIsAdmin(false);
        return;
      }

      queueMicrotask(() => {
        if (alive && currentUserId === userId) {
          void checkAdminRole(userId);
        }
      });
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const hidden = (c.hidden ?? {}) as Record<string, string>;
  const permanentHidden = (c.permanentHidden ?? {}) as Record<string, boolean>;
  const allHidden = { ...hidden, ...permanentHidden };

  useEffect(() => {
    if (!enabled) {
      setPending(null);
      setMediaPending(null);
      setMovePending(null);
      setColorTarget(null);
      return;
    }

    const stored = window.sessionStorage.getItem("tc-editor-pending-link");

    if (stored) {
      try {
        setPending(JSON.parse(stored) as PendingLink);
      } catch {
        // Ignore invalid stored data.
      }
    }
  }, [enabled]);

  const choosePending = (next: PendingLink | null) => {
    setPending(next);

    if (next) {
      window.sessionStorage.setItem("tc-editor-pending-link", JSON.stringify(next));
    } else {
      window.sessionStorage.removeItem("tc-editor-pending-link");
    }
  };

  const clickable = (el: Element): HTMLAnchorElement | HTMLButtonElement | null => {
    const a = el.closest("a");
    if (a) return a;
    const b = el.closest("button");
    if (b) return b;
    return null;
  };

  const run = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      try {
        await fn();
        navigate({ reloadDocument: true });
      } catch (e) {
        toast.error((e as Error).message || "Erreur d'enregistrement");
      }
    });
  };

  const mediaKey = (el: HTMLElement): string => {
    const id = el.id ? `#${el.id}` : "";
    const testId = el.getAttribute("data-testid") ? `[data-testid="${el.getAttribute("data-testid")}"]` : "";
    const aria = el.getAttribute("aria-label") ? `[aria-label="${el.getAttribute("aria-label")}"]` : "";
    const tag = el.tagName.toLowerCase();
    const textSnippet = (el.textContent ?? "").trim().slice(0, 30).replace(/\s+/g, " ");

    return `${pathname}::${tag}${id}${testId}${aria}::${textSnippet}`;
  };

  useEffect(() => {
    if (!enabled) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;

      if (!target) return;

      if (
        target.closest(".tc-site-editor-phone") ||
        target.closest(".tc-phone-floating-pill") ||
        target.closest(".tc-device-simulator-overlay") ||
        target.closest(".tc-typography-toolbar") ||
        target.closest(".tc-color-editor-modal")
      ) {
        return;
      }

      if (mode === "colors") {
        e.preventDefault();
        e.stopPropagation();

        const el = (target.closest(
          "header, nav, footer, section, main, article, aside, .tc-colorable, [data-tc-colorable]",
        ) ?? target) as HTMLElement;

        const key = elementColorKey(el, pathname);
        if (!key) {
          toast.error("Impossible d'identifier cet élément pour modifier ses couleurs.");
          return;
        }

        const label = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || el.tagName.toLowerCase();

        setColorTarget({
          key,
          label,
          initial: readElementColors(el),
        });

        return;
      }

      if (mode === "delete" || mode === "permanent-delete") {
        e.preventDefault();
        e.stopPropagation();

        const el = target.closest(HIDEABLE) as HTMLElement | null;

        if (!el) {
          toast.error("Cliquez sur un bouton, un titre, un texte ou une image");
          return;
        }

        const key = hideKey(el);

        if (!key) {
          toast.error("Impossible d'identifier cet élément");
          return;
        }

        const label = (el.textContent ?? "").trim().slice(0, 40) || el.tagName.toLowerCase();

        if (mode === "permanent-delete") {
          void run(() =>
            permDelete({
              data: {
                key,
                label,
                page: pathname,
              },
            }),
          );
          toast.success(`Élément « ${label} » supprimé définitivement`);
          return;
        }

        const next = { ...hidden };
        next[key] = JSON.stringify({
          label,
          page: pathname,
          at: new Date().toISOString(),
          audience,
        });

        void run(() =>
          save({
            data: {
              hidden: next,
            },
          }),
        );

        toast.success(`Élément masqué (${audience === "all" ? "tout le monde" : audience})`);
        return;
      }

      if (mode === "buttons") {
        const btn = clickable(target);

        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        const originalHref = btn.tagName.toLowerCase() === "a" ? (btn as HTMLAnchorElement).getAttribute("href") : "";
        const label = (btn.textContent ?? "").trim().slice(0, 50) || "Bouton sans texte";
        const key = `${label}|${originalHref ?? ""}`;

        choosePending({ key, label });
        toast.info(`Bouton sélectionné : « ${label} ». Naviguez vers la page de destination.`);
        return;
      }

      const el = target.closest("h1, h2, h3, h4, p, span, div, section, img, video") as HTMLElement | null;

      if (!el) return;

      if (mode === "media") {
        e.preventDefault();
        e.stopPropagation();

        const key = mediaKey(el);

        setMediaPending({
          key,
          label: (el.textContent ?? "").trim().slice(0, 50) || el.tagName.toLowerCase(),
        });

        return;
      }

      if (mode === "move") {
        e.preventDefault();
        e.stopPropagation();

        const key = mediaKey(el);

        setMovePending({
          key,
          label: (el.textContent ?? "").trim().slice(0, 50) || el.tagName.toLowerCase(),
          element: el,
        });

        return;
      }
    };

    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, [enabled, mode, audience, pathname, hidden, permanentHidden, allHidden, c.elementColors, permDelete, save]);

  // Si on est à l'intérieur de l'iframe de simulation ou si l'utilisateur n'est pas admin, on n'affiche rien
  const isInsideIframe = typeof window !== "undefined" && window.self !== window.top;
  if (isInsideIframe || !isAdmin) {
    return null;
  }

  // Label de l'application active pour le badge réduit
  const activeLabelMap: Record<Mode, string> = {
    none: "Aucun outil",
    colors: colorTarget === "theme" ? "Thème site" : "Couleurs",
    typography: "Textes & photos",
    buttons: "Redirections",
    delete: "Supprimer",
    "permanent-delete": "Suppr. déf.",
    history: "Historique",
    media: "Médias",
    move: "Déplacer",
  };

  return (
    <>
      {/* Vrai simulateur avec iframe isolée (déclenche les vrais media queries mobiles) */}
      {enabled && deviceView !== "desktop" && (
        <aside className="tc-device-simulator-overlay" aria-label="Simulateur responsive">
          <div className="tc-simulator-topbar">
            <div className="tc-simulator-switcher">
              <button
                type="button"
                className={deviceView === "mobile" ? "active" : ""}
                onClick={() => changeDeviceView("mobile")}
              >
                <Smartphone size={14} />
                <span>iPhone (390 px)</span>
              </button>
              <button
                type="button"
                className={deviceView === "tablet" ? "active" : ""}
                onClick={() => changeDeviceView("tablet")}
              >
                <Tablet size={14} />
                <span>iPad (768 px)</span>
              </button>
            </div>

            <div className="tc-simulator-actions">
              <button
                type="button"
                className="tc-simulator-btn"
                onClick={() => {
                  const iframe = document.getElementById("tc-device-iframe") as HTMLIFrameElement;
                  if (iframe) iframe.src = iframe.src;
                }}
                title="Actualiser la page"
              >
                <RotateCw size={13} />
                <span>Recharger</span>
              </button>

              <button type="button" className="tc-simulator-close-btn" onClick={() => changeDeviceView("desktop")}>
                <X size={14} />
                <span>Quitter l'aperçu</span>
              </button>
            </div>
          </div>

          <div className={`tc-device-frame tc-frame-${deviceView}`}>
            {deviceView === "mobile" && (
              <div className="tc-frame-island">
                <span className="tc-frame-camera" />
              </div>
            )}
            <iframe
              id="tc-device-iframe"
              src={pathname}
              title={`Simulation ${deviceView}`}
              className="tc-device-iframe"
            />
            <div className="tc-frame-home-bar" />
          </div>
        </aside>
      )}

      {/* Bouton capsule flottant quand le smartphone d'édition est réduit */}
      {(!enabled || isMinimized) && (
        <div className="tc-phone-floating-pill">
          <button
            type="button"
            className={enabled ? "tc-phone-pill-toggle active" : "tc-phone-pill-toggle"}
            onClick={() => {
              if (!enabled) {
                setEnabled(true);
              }
              setIsMinimized(false);
            }}
          >
            <Smartphone size={16} />
            <span>{enabled ? `Éditeur : ${activeLabelMap[mode]}` : "Mode édition"}</span>
            {enabled && (
              <span
                role="button"
                className="tc-pill-quick-dark"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDarkMode();
                }}
                title={darkMode ? "Passer en mode clair" : "Passer en mode sombre"}
              >
                {darkMode ? <Sun size={13} /> : <Moon size={13} />}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Interface smartphone complète de l'éditeur */}
      {enabled && !isMinimized && (
        <aside className="tc-site-editor-phone" aria-label="Studio d'édition TClean">
          <div className="tc-phone-body">
            {/* Dynamic Island */}
            <div className="tc-phone-island">
              <span className="tc-phone-camera" />
              <span className="tc-phone-sensor" />
            </div>

            {/* Barre de statut du smartphone */}
            <div className="tc-phone-status-bar">
              <span className="tc-phone-time">{timeStr}</span>
              <div className="tc-phone-status-icons">
                <button
                  type="button"
                  className="tc-phone-quick-theme"
                  onClick={toggleDarkMode}
                  title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
                >
                  {darkMode ? <Sun size={12} className="tc-icon-sun" /> : <Moon size={12} className="tc-icon-moon" />}
                </button>
                <Wifi size={12} />
                <Battery size={13} />
                <button
                  type="button"
                  className="tc-phone-minimize-btn"
                  onClick={() => setIsMinimized(true)}
                  title="Réduire l'interface smartphone"
                >
                  <Minus size={13} />
                </button>
              </div>
            </div>

            {/* En-tête de l'écran du smartphone */}
            <div className="tc-phone-screen-header">
              <div className="tc-phone-app-title">
                <strong>Studio TClean</strong>
                <span>Appuyez sur un outil puis cliquez sur votre site</span>
              </div>
            </div>

            {/* Sélecteur de format d'écran (Ordi, Tablette, Mobile) */}
            <div className="tc-phone-devices-bar" role="group" aria-label="Choisir le format d'affichage">
              <button
                type="button"
                className={deviceView === "desktop" ? "tc-device-btn is-active" : "tc-device-btn"}
                onClick={() => changeDeviceView("desktop")}
                title="Format Ordinateur (Plein écran)"
              >
                <Monitor size={13} />
                <span>Ordi</span>
              </button>
              <button
                type="button"
                className={deviceView === "tablet" ? "tc-device-btn is-active" : "tc-device-btn"}
                onClick={() => changeDeviceView("tablet")}
                title="Format Tablette (768 px)"
              >
                <Tablet size={13} />
                <span>Tablette</span>
              </button>
              <button
                type="button"
                className={deviceView === "mobile" ? "tc-device-btn is-active" : "tc-device-btn"}
                onClick={() => changeDeviceView("mobile")}
                title="Format Mobile (390 px)"
              >
                <Smartphone size={13} />
                <span>Mobile</span>
              </button>
            </div>

            {/* Grille d'applications comme sur un téléphone */}
            <div className="tc-phone-app-grid">
              {/* App 1: Couleurs */}
              <button
                type="button"
                className={mode === "colors" && colorTarget !== "theme" ? "tc-app-item is-active" : "tc-app-item"}
                onClick={() => {
                  setMode("colors");
                  setColorTarget(null);
                }}
              >
                <div className="tc-app-icon gradient-purple">
                  <Palette size={20} />
                </div>
                <span className="tc-app-name">Couleurs</span>
              </button>

              {/* App 2: Thème du site */}
              <button
                type="button"
                className={mode === "colors" && colorTarget === "theme" ? "tc-app-item is-active" : "tc-app-item"}
                onClick={() => {
                  setMode("colors");
                  setColorTarget("theme");
                }}
              >
                <div className="tc-app-icon gradient-emerald">
                  <Sparkles size={20} />
                </div>
                <span className="tc-app-name">Thème site</span>
              </button>

              {/* App 3: Textes & Photos */}
              <button
                type="button"
                className={mode === "typography" ? "tc-app-item is-active" : "tc-app-item"}
                onClick={() => {
                  setMode("typography");
                  setColorTarget(null);
                }}
              >
                <div className="tc-app-icon gradient-blue">
                  <Type size={20} />
                </div>
                <span className="tc-app-name">Textes</span>
              </button>

              {/* App 4: Boutons & Liens */}
              <button
                type="button"
                className={mode === "buttons" ? "tc-app-item is-active" : "tc-app-item"}
                onClick={() => {
                  setMode("buttons");
                  setColorTarget(null);
                }}
              >
                <div className="tc-app-icon gradient-amber">
                  <MousePointerClick size={20} />
                </div>
                <span className="tc-app-name">Boutons</span>
              </button>

              {/* App 5: Supprimer un élément */}
              <button
                type="button"
                className={mode === "delete" ? "tc-app-item is-active" : "tc-app-item"}
                onClick={() => {
                  setMode("delete");
                  setColorTarget(null);
                }}
              >
                <div className="tc-app-icon gradient-red">
                  <Trash2 size={20} />
                </div>
                <span className="tc-app-name">Supprimer</span>
              </button>

              {/* App 6: Corbeille / Historique */}
              <button
                type="button"
                className={mode === "history" ? "tc-app-item is-active" : "tc-app-item"}
                onClick={() => {
                  setMode("history");
                  setColorTarget(null);
                }}
              >
                <div className="tc-app-icon gradient-slate">
                  <ShieldAlert size={20} />
                </div>
                <span className="tc-app-name">Corbeille ({Object.keys(allHidden).length})</span>
              </button>

              {/* App 7: Médias & Arrière-plans */}
              <button
                type="button"
                className={mode === "media" ? "tc-app-item is-active" : "tc-app-item"}
                onClick={() => {
                  setMode("media");
                  setColorTarget(null);
                }}
              >
                <div className="tc-app-icon gradient-indigo">
                  <Video size={20} />
                </div>
                <span className="tc-app-name">Médias</span>
              </button>

              {/* App 8: Déplacer un élément */}
              <button
                type="button"
                className={mode === "move" ? "tc-app-item is-active" : "tc-app-item"}
                onClick={() => {
                  setMode("move");
                  setColorTarget(null);
                }}
              >
                <div className="tc-app-icon gradient-cyan">
                  <Move size={20} />
                </div>
                <span className="tc-app-name">Déplacer</span>
              </button>

              {/* App 9: Mode sombre / Mode clair */}
              <button
                type="button"
                className={darkMode ? "tc-app-item is-active" : "tc-app-item"}
                onClick={toggleDarkMode}
              >
                <div className={darkMode ? "tc-app-icon gradient-dark" : "tc-app-icon gradient-amber"}>
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                <span className="tc-app-name">{darkMode ? "Mode clair" : "Mode sombre"}</span>
              </button>
            </div>

            {/* Bannière de redirection en attente */}
            {pending && (
              <div className="tc-phone-pending-banner">
                <div className="tc-phone-pending-copy">
                  <span>Bouton :</span>
                  <strong>{pending.label}</strong>
                </div>
                <div className="tc-phone-pending-actions">
                  <button
                    type="button"
                    className="tc-phone-pending-confirm"
                    onClick={() => {
                      void run(() =>
                        linkRedirect({
                          data: {
                            key: pending.key,
                            target: pathname,
                          },
                        }),
                      );
                      choosePending(null);
                    }}
                  >
                    <ArrowUpRight size={13} /> Rediriger vers {pathname}
                  </button>
                  <button type="button" className="tc-phone-pending-cancel" onClick={() => choosePending(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Dock du smartphone : Choix de visibilité et bouton Quitter */}
            <div className="tc-phone-dock">
              <div className="tc-phone-audience-box">
                <label htmlFor="tc-audience-select">Visibilité :</label>
                <select
                  id="tc-audience-select"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as Audience)}
                >
                  <option value="all">Tout le monde</option>
                  <option value="client">Clients & visiteurs</option>
                  <option value="admin">Admin uniquement</option>
                </select>
              </div>

              <button
                type="button"
                className="tc-phone-exit-btn"
                onClick={() => setEnabled(false)}
                title="Quitter le mode édition"
              >
                <X size={14} /> Quitter
              </button>
            </div>

            {/* Barre d'accueil iPhone (Home indicator) pour réduire */}
            <button
              type="button"
              className="tc-phone-home-indicator"
              onClick={() => setIsMinimized(true)}
              title="Réduire l'interface"
            />
          </div>
        </aside>
      )}

      {/* Barres d'options secondaires */}
      {enabled && mode === "typography" && <EditorTypographyToolbar audience={audience} />}

      {enabled && mode === "colors" && colorTarget && (
        <SiteColorEditor config={c} pathname={pathname} target={colorTarget} onClose={() => setColorTarget(null)} />
      )}
    </>
  );
}
