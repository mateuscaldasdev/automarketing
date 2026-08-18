'use client';

import { useEffect, useState } from 'react';
import { Estrutura } from '../../componentes/Estrutura';
import { ETAPAS, brl } from '../../../lib/dominio';
import { listarLeads, sessaoAtual } from '../../../lib/dados';

export default function Analytics() {
  const [sessao, setSessao] = useState(null);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    (async () => {
      setSessao(await sessaoAtual());
      setLeads(await listarLeads().catch(() => []));
    })();
  }, []);

  const abertos = leads.filter((l) => !['ganho', 'perdido'].includes(l.etapa));
  const ganhos = leads.filter((l) => l.etapa === 'ganho');
  const perdidos = leads.filter((l) => l.etapa === 'perdido');
  const fechados = ganhos.length + perdidos.length;
  const conversao = fechados ? Math.round((ganhos.length / fechados) * 100) : 0;
  const maior = Math.max(1, ...ETAPAS.map((e) => leads.filter((l) => l.etapa === e.id).length));

  const porOrigem = leads.reduce((acc, l) => {
    acc[l.origem] = (acc[l.origem] || 0) + 1;
    return acc;
  }, {});

  return (
    <Estrutura sessao={sessao} secao="Clientes" titulo="CRM" subtitulo="Pipeline de leads e acompanhamento">
      <div className="metricas">
        <div className="metrica">
          <div className="rotulo">Leads</div>
          <div className="valor">{leads.length}</div>
          <div className="nota">{abertos.length} em aberto</div>
        </div>
        <div className="metrica">
          <div className="rotulo">Pipeline aberto</div>
          <div className="valor">{brl(abertos.reduce((s, l) => s + (l.valor || 0), 0))}</div>
          <div className="nota">soma dos leads não fechados</div>
        </div>
        <div className="metrica">
          <div className="rotulo">Receita ganha</div>
          <div className="valor">{brl(ganhos.reduce((s, l) => s + (l.valor || 0), 0))}</div>
          <div className="nota">{ganhos.length} fechados</div>
        </div>
        <div className="metrica">
          <div className="rotulo">Conversão</div>
          <div className="valor">{conversao}%</div>
          <div className="nota">ganhos ÷ fechados</div>
        </div>
      </div>

      <h2 style={{ fontSize: 13, color: 'var(--texto-2)', margin: '4px 0 14px' }}>Funil por etapa</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 30 }}>
        {ETAPAS.map((etapa) => {
          const qtd = leads.filter((l) => l.etapa === etapa.id).length;
          return (
            <div key={etapa.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 138, fontSize: 12.5, color: 'var(--texto-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="ponto" style={{ background: etapa.cor }} />
                {etapa.nome}
              </div>
              <div style={{ flex: 1, height: 26, background: 'var(--superficie)', borderRadius: 7, overflow: 'hidden', border: '1px solid var(--linha)' }}>
                <div
                  style={{
                    width: `${(qtd / maior) * 100}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${etapa.cor} 0%, transparent 220%)`,
                    minWidth: qtd ? 8 : 0,
                    transition: 'width .3s',
                  }}
                />
              </div>
              <div style={{ width: 26, textAlign: 'right', fontSize: 12.5, color: 'var(--texto-2)' }}>{qtd}</div>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 13, color: 'var(--texto-2)', margin: '4px 0 14px' }}>Origem dos leads</h2>
      <table className="tabela">
        <thead><tr><th>Origem</th><th>Leads</th><th>Participação</th></tr></thead>
        <tbody>
          {Object.entries(porOrigem).sort((a, b) => b[1] - a[1]).map(([nome, qtd]) => (
            <tr key={nome}>
              <td>{nome}</td>
              <td>{qtd}</td>
              <td>{leads.length ? Math.round((qtd / leads.length) * 100) : 0}%</td>
            </tr>
          ))}
          {!Object.keys(porOrigem).length && <tr><td colSpan={3}>Nenhum lead ainda.</td></tr>}
        </tbody>
      </table>
    </Estrutura>
  );
}
