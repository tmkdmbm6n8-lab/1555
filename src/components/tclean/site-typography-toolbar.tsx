import { useState } from "react";

type Audience = "all" | "client" | "admin";

export function EditorTypographyToolbar({ audience }: { audience: Audience }) {
  const [fontSize, setFontSize] = useState("inherit");
  const [message, setMessage] = useState("Sélectionnez un texte sur la page, puis choisissez son style.");

  const applyStyle = (styles: Partial<CSSStyleDeclaration>) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setMessage("Sélectionnez d’abord un texte sur la page.");
      return;
    }

    let node = selection.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode as Node;
    const element = node instanceof HTMLElement ? node : null;
    if (!element) {
      setMessage("Impossible d’appliquer le style à cette sélection.");
      return;
    }

    Object.entries(styles).forEach(([key, value]) => {
      if (value !== undefined) (element.style as unknown as Record<string, string>)[key] = value as string;
    });
    setMessage("Style appliqué à l’élément sélectionné. Cette version ne l’enregistre pas encore.");
  };

  return (
    <div
      className="tc-site-editor-panel"
      style={{
        position: "fixed",
        zIndex: 10000,
        left: "50%",
        bottom: "84px",
        transform: "translateX(-50%)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "8px",
        maxWidth: "calc(100vw - 24px)",
        padding: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "12px",
        background: "white",
        color: "#111827",
        boxShadow: "0 8px 28px rgba(0,0,0,.18)",
      }}
      aria-label="Outils de typographie"
    >
      <strong style={{ fontSize: "13px" }}>Texte</strong>
      <select
        aria-label="Taille du texte"
        value={fontSize}
        onChange={(event) => {
          const value = event.target.value;
          setFontSize(value);
          if (value !== "inherit") applyStyle({ fontSize: value });
        }}
        style={{ padding: "7px", border: "1px solid #d1d5db", borderRadius: "6px" }}
      >
        <option value="inherit">Taille</option>
        <option value="12px">12 px</option>
        <option value="14px">14 px</option>
        <option value="16px">16 px</option>
        <option value="18px">18 px</option>
        <option value="20px">20 px</option>
        <option value="24px">24 px</option>
        <option value="32px">32 px</option>
        <option value="40px">40 px</option>
      </select>
      <button type="button" onClick={() => applyStyle({ fontWeight: "700" })} style={buttonStyle}>Gras</button>
      <button type="button" onClick={() => applyStyle({ fontStyle: "italic" })} style={buttonStyle}>Italique</button>
      <button type="button" onClick={() => applyStyle({ textDecoration: "underline" })} style={buttonStyle}>Souligné</button>
      <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px" }}>
        Couleur
        <input
          type="color"
          aria-label="Couleur du texte"
          onChange={(event) => applyStyle({ color: event.target.value })}
          style={{ width: "30px", height: "30px", padding: "0", border: "0", background: "transparent" }}
        />
      </label>
      <span style={{ flexBasis: "100%", fontSize: "11px", color: "#4b5563" }}>{message} Public : {audience === "all" ? "tous" : audience === "client" ? "clients" : "administration"}.</span>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  background: "#f9fafb",
  color: "#111827",
  cursor: "pointer",
  fontSize: "12px",
};
