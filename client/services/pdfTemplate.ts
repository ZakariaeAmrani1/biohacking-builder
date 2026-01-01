import { Entreprise } from "@/services/entrepriseService";

function readCssVar(name: string): string {
  if (typeof window === "undefined") return "";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v;
}

export function getPdfCssVariables(): string {
  const vars = {
    background: readCssVar("--background"),
    foreground: readCssVar("--foreground"),
    primary: readCssVar("--primary"),
    primaryForeground: readCssVar("--primary-foreground"),
    secondary: readCssVar("--secondary"),
    secondaryForeground: readCssVar("--secondary-foreground"),
    muted: readCssVar("--muted"),
    mutedForeground: readCssVar("--muted-foreground"),
    accent: readCssVar("--accent"),
    accentForeground: readCssVar("--accent-foreground"),
    destructive: readCssVar("--destructive"),
    destructiveForeground: readCssVar("--destructive-foreground"),
    border: readCssVar("--border"),
    input: readCssVar("--input"),
    ring: readCssVar("--ring"),
    card: readCssVar("--card"),
    cardForeground: readCssVar("--card-foreground"),
  };

  return `:root{--pdf-background:${vars.background};--pdf-foreground:${vars.foreground};--pdf-primary:${vars.primary};--pdf-primary-foreground:${vars.primaryForeground};--pdf-secondary:${vars.secondary};--pdf-secondary-foreground:${vars.secondaryForeground};--pdf-muted:${vars.muted};--pdf-muted-foreground:${vars.mutedForeground};--pdf-accent:${vars.accent};--pdf-accent-foreground:${vars.accentForeground};--pdf-destructive:${vars.destructive};--pdf-destructive-foreground:${vars.destructiveForeground};--pdf-border:${vars.border};--pdf-input:${vars.input};--pdf-ring:${vars.ring};--pdf-card:${vars.card};--pdf-card-foreground:${vars.cardForeground};}`;
}

export function buildPdfBaseStyles(): string {
  return `
  ${getPdfCssVariables()}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;line-height:1.5;color:hsl(var(--pdf-foreground));background:white;padding:20px}
  .pdf-container{max-width:800px;margin:0 auto;background:white}
  .pdf-header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid hsl(var(--pdf-primary));padding-bottom:16px;margin-bottom:24px}
  .pdf-brand{display:flex;align-items:center;gap:12px}.pdf-title-block{text-align:center;flex:1}
  .pdf-logo{display:block}
  .pdf-logo img{display:block;max-height:60px;width:auto;height:auto;object-fit:contain}
  .pdf-company-lines{font-size:11px;color:hsl(var(--pdf-muted-foreground));text-align:right;max-width:40%}
  .pdf-title{font-size:24px;font-weight:700;color:hsl(var(--pdf-primary))}
  .pdf-subtitle{font-size:12px;color:hsl(var(--pdf-muted-foreground))}
  .pdf-section{margin-bottom:20px}
  .pdf-card{background:hsl(var(--pdf-muted));padding:16px;border-radius:8px}
  .pdf-section-title{font-weight:700;font-size:14px;color:hsl(var(--pdf-primary));margin-bottom:8px;border-bottom:1px solid hsl(var(--pdf-border));padding-bottom:6px}
  .pdf-grid{display:grid;gap:24px}
  .pdf-grid-2{grid-template-columns:1fr 1fr}
  .pdf-row{display:flex;justify-content:space-between;margin-bottom:6px}
  .pdf-label{color:hsl(var(--pdf-muted-foreground));font-weight:600}
  .pdf-value{font-weight:600}
  .pdf-table{width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid hsl(var(--pdf-border))}
  .pdf-table th{background:hsl(var(--pdf-primary));color:hsl(var(--pdf-primary-foreground));font-weight:600;padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase}
  .pdf-table td{padding:10px 8px;border-bottom:1px solid hsl(var(--pdf-border));vertical-align:top}
  .pdf-table tbody tr:nth-child(even){background:hsl(var(--pdf-muted))}
  .pdf-amount{font-family:'Courier New',monospace;text-align:right;font-weight:700}
  .pdf-totals{margin-top:12px;border-top:2px solid hsl(var(--pdf-border));padding-top:12px}
  .pdf-totals-table{width:100%;max-width:420px;margin-left:auto}
  .pdf-totals-table td{padding:8px 12px;border-bottom:1px solid hsl(var(--pdf-border))}
  .pdf-totals-label{text-align:left;font-weight:600;color:hsl(var(--pdf-muted-foreground))}
  .pdf-totals-final{background:hsl(var(--pdf-accent));border-top:2px solid hsl(var(--pdf-primary));font-size:16px;font-weight:700;color:hsl(var(--pdf-primary))}
  .pdf-note{margin-top:16px;padding:14px;background:hsl(var(--pdf-muted));border-left:4px solid hsl(var(--pdf-primary));border-radius:6px}
  .pdf-footer{margin-top:28px;text-align:center;color:hsl(var(--pdf-muted-foreground));font-size:10px;border-top:1px solid hsl(var(--pdf-border));padding-top:12px}
  .pdf-footer small{display:block;margin-top:6px}
  @page{size:A4;margin:12mm}
  @media print{body{padding:0;background:white}.pdf-container{box-shadow:none;padding-bottom:120px}.pdf-footer{position:fixed;bottom:12mm;left:0;right:0;margin:0 auto;max-width:800px;background:transparent;border-top:1px solid hsl(var(--pdf-border));padding-top:8px}}
  `;
}

export function buildCompanyHeaderHtml(
  entreprise: Entreprise | null,
  opts?: { logoUrl?: string; title?: string; subtitle?: string },
): string {
  const logoUrl =
    opts?.logoUrl ||
    "https://cdn.builder.io/api/v1/image/assets%2F16493a39c179465f9ca598ede9454dc8%2Fcceedcfad29a48b9a90d85058157ec8d?format=webp&width=800";

  const lines: string[] = [];
  if (entreprise?.adresse) lines.push(escapeHtml(entreprise.adresse));
  if (entreprise?.numero_telephone)
    lines.push(`Tél: ${escapeHtml(entreprise.numero_telephone)}`);
  if (entreprise?.email) lines.push(`Email: ${escapeHtml(entreprise.email)}`);

  return `
  <div class="pdf-header">
    <div class="pdf-logo"><img src="${logoUrl}" alt="Logo" /></div>
    <div class="pdf-title-block">
      ${opts?.title ? `<div class="pdf-title">${escapeHtml(opts.title)}</div>` : ""}
      ${opts?.subtitle ? `<div class="pdf-subtitle">${escapeHtml(opts.subtitle)}</div>` : ""}
    </div>
    <div class="pdf-company-lines">${lines.join("<br>")}</div>
  </div>`;
}

export function buildCompanyFooterHtml(entreprise: Entreprise | null): string {
  const details: string[] = [];
  if (entreprise?.ICE !== undefined) details.push(`ICE: ${entreprise.ICE}`);
  if (entreprise?.RC !== undefined) details.push(`RC: ${entreprise.RC}`);
  if (entreprise?.IF !== undefined) details.push(`IF: ${entreprise.IF}`);
  if (entreprise?.CNSS !== undefined) details.push(`CNSS: ${entreprise.CNSS}`);
  if (entreprise?.RIB !== undefined) details.push(`RIB: ${entreprise.RIB}`);
  if (entreprise?.patente !== undefined)
    details.push(`Patente: ${entreprise.patente}`);

  const addressLine = entreprise?.adresse
    ? `<div>${escapeHtml(entreprise.adresse)}</div>`
    : "";
  const contactLine =
    entreprise?.numero_telephone || entreprise?.email
      ? `<div>${[entreprise?.numero_telephone ? `Tél: ${escapeHtml(entreprise.numero_telephone)}` : null, entreprise?.email ? `Email: ${escapeHtml(entreprise.email)}` : null].filter(Boolean).join(" ")}</div>`
      : "";

  return `
  <div class="pdf-footer">
    ${addressLine}
    ${contactLine}
    ${details.length ? `<small>${details.join(" • ")}</small>` : ""}
  </div>`;
}

export function wrapPdfHtmlDocument(
  title: string,
  contentHtml: string,
  extraStyles?: string,
): string {
  const styles = buildPdfBaseStyles() + (extraStyles || "");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>${styles}</style></head><body><div class="pdf-container">${contentHtml}</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
