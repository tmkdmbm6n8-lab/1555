import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Moon, Sun, Smartphone, Tablet, Monitor, RotateCw, Wifi, Battery, X, Minus } from "lucide-react";

type DeviceView = "desktop" | "tablet" | "mobile";

// Anciennes modifications en attente de la version précédente : on les retire
const LEGACY_KEYS = ["tc-editor-pending-ops", "tc-editor-pending-link"];

export function SiteEditor() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [deviceView, setDeviceView] = useState<DeviceView>("desktop");
  const [darkMode, setDarkMode] = useState(false);
  const [timeStr, setTimeStr] = useState("12:00");

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  useEffect(() => {
    LEGACY_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
  }, []);

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

  // Si on est à l'intérieur de l'iframe de simulation ou si l'utilisateur n'est pas admin, on n'affiche rien
  const isInsideIframe = typeof window !== "undefined" && window.self !== window.top;
  if (isInsideIframe || !isAdmin) {
    return null;
  }

  return (
    <>
      {/* Simulateur responsive avec iframe isolée (déclenche les vraies media queries) */}
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
            <span>{enabled ? "Éditeur" : "Mode édition"}</span>
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

      {/* Interface smartphone de l'éditeur */}
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
                <span>Aucun outil pour le moment</span>
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

            {/* Grille d'applications : seul le mode sombre pour l'instant */}
            <div className="tc-phone-app-grid">
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

            {/* Dock du smartphone : bouton Quitter */}
            <div className="tc-phone-dock">
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
    </>
  );
}
