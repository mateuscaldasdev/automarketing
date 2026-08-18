/** Ícones inline — sem biblioteca externa, sem CDN. */

const base = {
  width: 16, height: 16, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
};

export const Icone = {
  grade: (p) => (
    <svg {...base} {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  ),
  faisca: (p) => (
    <svg {...base} {...p}><path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></svg>
  ),
  grafico: (p) => (
    <svg {...base} {...p}><path d="M3 3v18h18" /><path d="M7 15l3.5-4 3 2.5L20 7" /></svg>
  ),
  pessoas: (p) => (
    <svg {...base} {...p}><path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" /><circle cx="9" cy="7" r="3.2" /><path d="M22 20v-1.5a4 4 0 0 0-3-3.85" /><path d="M16 3.6a4 4 0 0 1 0 6.8" /></svg>
  ),
  calendario: (p) => (
    <svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>
  ),
  funil: (p) => (
    <svg {...base} {...p}><path d="M3 4h18l-7 8v7l-4 2v-9z" /></svg>
  ),
  whatsapp: (p) => (
    <svg {...base} {...p}><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.2-5.2A8.5 8.5 0 1 1 21 11.5z" /></svg>
  ),
  documento: (p) => (
    <svg {...base} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
  ),
  imagem: (p) => (
    <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-5 5" /></svg>
  ),
  chapeu: (p) => (
    <svg {...base} {...p}><path d="M22 9L12 4 2 9l10 5 10-5z" /><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" /></svg>
  ),
  lupa: (p) => (
    <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
  ),
  mais: (p) => (
    <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
  ),
  sino: (p) => (
    <svg {...base} {...p}><path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></svg>
  ),
  link: (p) => (
    <svg {...base} {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg>
  ),
  sair: (p) => (
    <svg {...base} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
  ),
  caixa: (p) => (
    <svg {...base} {...p}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>
  ),
};
