'use client';

import { useEffect, useState } from 'react';
import { Estrutura } from '../../componentes/Estrutura';
import { ORIGENS } from '../../../lib/dominio';
import { sessaoAtual } from '../../../lib/dados';

export default function Captura() {
  const [sessao, setSessao] = useState(null);
  const [base, setBase] = useState('');

  useEffect(() => {
    (async () => {
      setSessao(await sessaoAtual());
      setBase(window.location.origin);
    })();
  }, []);

  const endpoint = `${base}/api/leads`;

  return (
    <Estrutura sessao={sessao} secao="Clientes" titulo="CRM" subtitulo="Pipeline de leads e acompanhamento">
      <div className="metrica" style={{ marginBottom: 18 }}>
        <div className="rotulo">Endpoint de captura</div>
        <div style={{ fontSize: 15, fontFamily: 'ui-monospace, monospace', marginTop: 8, color: 'var(--acento-claro)' }}>
          POST {endpoint}
        </div>
        <div className="nota" style={{ marginTop: 8 }}>
          Aponte para cá o formulário do site, o webhook do n8n ou o agente do WhatsApp.
        </div>
      </div>

      <h2 style={{ fontSize: 13, color: 'var(--texto-2)', margin: '18px 0 10px' }}>Corpo esperado</h2>
      <pre style={{
        background: 'var(--superficie)', border: '1px solid var(--linha)',
        borderRadius: 'var(--raio-g)', padding: 16, overflowX: 'auto',
        fontSize: 12.5, color: 'var(--texto-2)', margin: 0,
      }}>
{`{
  "nome": "Maria Souza",          // obrigatório
  "telefone": "5511988887777",
  "email": "maria@exemplo.com",
  "origem": "${ORIGENS.join('" | "')}",
  "valor": 1200,
  "score": 65
}`}
      </pre>

      <h2 style={{ fontSize: 13, color: 'var(--texto-2)', margin: '22px 0 10px' }}>No n8n</h2>
      <p style={{ color: 'var(--texto-3)', fontSize: 13, marginTop: 0 }}>
        Use um nó <strong>HTTP Request</strong>, método POST, com este endpoint. O lead entra
        direto na coluna <em>Novos leads</em> do pipeline.
      </p>

      <h2 style={{ fontSize: 13, color: 'var(--texto-2)', margin: '22px 0 10px' }}>Num formulário HTML</h2>
      <pre style={{
        background: 'var(--superficie)', border: '1px solid var(--linha)',
        borderRadius: 'var(--raio-g)', padding: 16, overflowX: 'auto',
        fontSize: 12.5, color: 'var(--texto-2)', margin: 0,
      }}>
{`fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nome, telefone, origem: "Orgânico" })
})`}
      </pre>
    </Estrutura>
  );
}
