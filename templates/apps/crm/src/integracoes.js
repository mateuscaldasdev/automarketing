/** Integrações externas: n8n (webhook de saída) e WhatsApp via Evolution API. */

const N8N_WEBHOOK_URL = () => process.env.N8N_WEBHOOK_URL || '';
const EVOLUTION_URL = () => (process.env.EVOLUTION_URL || '').replace(/\/$/, '');
const EVOLUTION_KEY = () => process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = () => process.env.EVOLUTION_INSTANCE || '';

/**
 * Dispara um evento do CRM para o n8n. Nunca derruba a requisição do usuário:
 * falha de integração vira log, não erro 500.
 */
export async function notificarN8n(evento, dados) {
  const url = N8N_WEBHOOK_URL();
  if (!url) return { enviado: false, motivo: 'N8N_WEBHOOK_URL não configurada' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento, dados, em: new Date().toISOString() }),
    });
    console.log(`[n8n] ${evento} -> ${res.status}`);
    return { enviado: res.ok, status: res.status };
  } catch (err) {
    console.warn(`[n8n] falha ao enviar ${evento}: ${err.message}`);
    return { enviado: false, motivo: err.message };
  }
}

/** Envia texto pelo WhatsApp via Evolution API. */
export async function enviarWhatsapp(telefone, texto) {
  const base = EVOLUTION_URL();
  const instancia = EVOLUTION_INSTANCE();
  if (!base || !instancia) {
    return { enviado: false, motivo: 'EVOLUTION_URL / EVOLUTION_INSTANCE não configuradas' };
  }
  const numero = String(telefone).replace(/\D/g, '');
  try {
    const res = await fetch(`${base}/message/sendText/${instancia}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY() },
      body: JSON.stringify({ number: numero, text: texto }),
    });
    const body = await res.text();
    console.log(`[whatsapp] -> ${numero} status ${res.status}`);
    return { enviado: res.ok, status: res.status, resposta: body.slice(0, 500) };
  } catch (err) {
    console.warn(`[whatsapp] falha: ${err.message}`);
    return { enviado: false, motivo: err.message };
  }
}

/** Normaliza o payload de mensagem recebida da Evolution API. */
export function parseMensagemEvolution(payload) {
  const d = payload?.data || payload || {};
  const remoteJid = d?.key?.remoteJid || d?.remoteJid || '';
  const telefone = String(remoteJid).split('@')[0].replace(/\D/g, '');
  const texto =
    d?.message?.conversation ||
    d?.message?.extendedTextMessage?.text ||
    d?.text ||
    '';
  const nome = d?.pushName || '';
  const deMim = Boolean(d?.key?.fromMe);
  return { telefone, texto, nome, deMim };
}
