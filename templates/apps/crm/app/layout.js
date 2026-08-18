import './globals.css';

export const metadata = {
  title: 'CRM · Automarketing',
  description: 'Pipeline de leads, clientes e captura — com WhatsApp e n8n.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
