'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Estrutura } from '../componentes/Estrutura';
import { Icone } from '../../lib/icones';
import { ETAPAS, ORIGENS, faixaDoScore, iniciais, telefoneBonito } from '../../lib/dominio';
import { listarLeads, criarLead, moverLead, removerLead, sessaoAtual, temSupabase } from '../../lib/dados';

export default function Pipeline() {
  const router = useRouter();
  const [sessao, setSessao] = useState(null);
  const [leads, setLeads] = useState([]);
  const [busca, setBusca] = useState('');
  const [origem, setOrigem] = useState('Todos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [arrastando, setArrastando] = useState(null);
  const [colunaAlvo, setColunaAlvo] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setLeads(await listarLeads());
      setErro('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const s = await sessaoAtual();
      if (!s) { router.push('/login'); return; }
      setSessao(s);
      carregar();
    })();
  }, [router, carregar]);

  const visiveis = leads.filter((l) => {
    const porOrigem = origem === 'Todos' || l.origem === origem;
    const termo = busca.trim().toLowerCase();
    const porBusca = !termo
      || l.nome?.toLowerCase().includes(termo)
      || l.telefone?.includes(termo.replace(/\D/g, ''))
      || l.email?.toLowerCase().includes(termo);
    return porOrigem && porBusca;
  });

  async function soltar(etapa) {
    setColunaAlvo(null);
    if (!arrastando) return;
    const id = arrastando;
    setArrastando(null);
    // Otimista: move na tela na hora, reverte se a gravação falhar.
    const antes = leads;
    setLeads((atual) => atual.map((l) => (String(l.id) === String(id) ? { ...l, etapa } : l)));
    try {
      await moverLead(id, etapa);
    } catch (e) {
      setLeads(antes);
      setErro(e.message);
    }
  }

  async function novoLead() {
    const nome = window.prompt('Nome do lead:');
    if (!nome) return;
    const telefone = window.prompt('Telefone (só números, com DDI):', '55') || '';
    try {
      await criarLead({ nome, telefone, origem: 'Manual', score: 30 });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function excluir(id) {
    if (!window.confirm('Remover este lead?')) return;
    try {
      await removerLead(id);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const acoes = (
    <>
      <div className="barra">
        <div className="busca">
          <Icone.lupa width={15} height={15} />
          <input
            placeholder="Buscar lead..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <button className="botao-secundario" type="button">
          <Icone.faisca width={14} height={14} />
          Etapas
        </button>
        <button className="botao-branco" onClick={novoLead} type="button">
          <Icone.mais width={14} height={14} />
          Novo lead
        </button>
      </div>

      <div className="chips">
        <button
          className={`chip ${origem === 'Todos' ? 'ativo' : ''}`}
          onClick={() => setOrigem('Todos')}
          type="button"
        >
          Todos <span className="contador">{leads.length}</span>
        </button>
        {ORIGENS.map((o) => (
          <button
            key={o}
            className={`chip ${origem === o ? 'ativo' : ''}`}
            onClick={() => setOrigem(o)}
            type="button"
          >
            {o}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <Estrutura
      sessao={sessao}
      secao="Clientes"
      titulo="CRM"
      subtitulo="Pipeline de leads e acompanhamento"
      acoes={acoes}
    >
      {!temSupabase && (
        <div className="faixa-demo">
          Modo demonstração — os dados ficam só neste navegador. Preencha
          <code style={{ margin: '0 4px' }}>NEXT_PUBLIC_SUPABASE_URL</code>
          no <code>.env.local</code> para usar o Supabase.
        </div>
      )}
      {erro && <div className="aviso">{erro}</div>}

      {carregando ? (
        <div className="vazio">Carregando…</div>
      ) : (
        <div className="kanban">
          {ETAPAS.map((etapa) => {
            const daEtapa = visiveis.filter((l) => l.etapa === etapa.id);
            return (
              <div
                key={etapa.id}
                className={`coluna ${colunaAlvo === etapa.id ? 'destino' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setColunaAlvo(etapa.id); }}
                onDragLeave={() => setColunaAlvo(null)}
                onDrop={() => soltar(etapa.id)}
              >
                <div className="coluna-topo">
                  <span className="ponto" style={{ background: etapa.cor }} />
                  <span className="nome">{etapa.nome}</span>
                  <span className="qtd">{daEtapa.length}</span>
                </div>

                {daEtapa.map((lead) => {
                  const faixa = faixaDoScore(lead.score || 0);
                  return (
                    <article
                      key={lead.id}
                      className={`card ${String(arrastando) === String(lead.id) ? 'arrastando' : ''}`}
                      draggable
                      onDragStart={() => setArrastando(lead.id)}
                      onDragEnd={() => setArrastando(null)}
                      onDoubleClick={() => excluir(lead.id)}
                      title="Arraste para mudar de etapa · duplo clique para remover"
                    >
                      <div className="card-topo">
                        <div className="avatar">{iniciais(lead.nome)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="nome">{lead.nome}</div>
                          <div className="sub">
                            {lead.cargo || telefoneBonito(lead.telefone) || 'sem telefone'}
                          </div>
                        </div>
                      </div>
                      <div className="tags">
                        <span className="tag canal">
                          <Icone.whatsapp width={10} height={10} />
                          {lead.origem}
                        </span>
                        <span className={`tag ${faixa.classe}`}>{faixa.rotulo}</span>
                      </div>
                    </article>
                  );
                })}

                <button className="adicionar" onClick={novoLead} type="button">
                  <Icone.mais width={13} height={13} />
                  Adicionar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Estrutura>
  );
}
