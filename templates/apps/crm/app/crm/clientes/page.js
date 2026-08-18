'use client';

import { useEffect, useState } from 'react';
import { Estrutura } from '../../componentes/Estrutura';
import { Icone } from '../../../lib/icones';
import { ETAPAS, brl, iniciais, telefoneBonito, faixaDoScore } from '../../../lib/dominio';
import { listarLeads, sessaoAtual } from '../../../lib/dados';

export default function Clientes() {
  const [sessao, setSessao] = useState(null);
  const [leads, setLeads] = useState([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    (async () => {
      setSessao(await sessaoAtual());
      setLeads(await listarLeads().catch(() => []));
    })();
  }, []);

  const termo = busca.trim().toLowerCase();
  const visiveis = leads.filter((l) =>
    !termo || l.nome?.toLowerCase().includes(termo) || l.email?.toLowerCase().includes(termo)
    || l.telefone?.includes(termo.replace(/\D/g, '')));

  const acoes = (
    <div className="barra">
      <div className="busca">
        <Icone.lupa width={15} height={15} />
        <input placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
    </div>
  );

  return (
    <Estrutura
      sessao={sessao}
      secao="Clientes"
      titulo="CRM"
      subtitulo="Pipeline de leads e acompanhamento"
      acoes={acoes}
    >
      <table className="tabela">
        <thead>
          <tr><th>Cliente</th><th>Contato</th><th>Origem</th><th>Etapa</th><th>Score</th><th>Valor</th></tr>
        </thead>
        <tbody>
          {visiveis.map((l) => {
            const etapa = ETAPAS.find((e) => e.id === l.etapa);
            const faixa = faixaDoScore(l.score || 0);
            return (
              <tr key={l.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{iniciais(l.nome)}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{l.nome}</div>
                      {l.cargo && <div style={{ fontSize: 11.5, color: 'var(--texto-3)' }}>{l.cargo}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--texto-2)' }}>
                  {telefoneBonito(l.telefone) || '—'}
                  {l.email && <div style={{ fontSize: 11.5, color: 'var(--texto-3)' }}>{l.email}</div>}
                </td>
                <td><span className="tag canal">{l.origem}</span></td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--texto-2)' }}>
                    <span className="ponto" style={{ background: etapa?.cor || 'var(--texto-3)' }} />
                    {etapa?.nome || l.etapa}
                  </span>
                </td>
                <td><span className={`tag ${faixa.classe}`}>{l.score || 0}</span></td>
                <td>{brl(l.valor)}</td>
              </tr>
            );
          })}
          {!visiveis.length && <tr><td colSpan={6}>Nenhum cliente encontrado.</td></tr>}
        </tbody>
      </table>
    </Estrutura>
  );
}
