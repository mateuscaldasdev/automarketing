'use client';

import { useEffect, useState } from 'react';
import { Estrutura } from '../../componentes/Estrutura';
import { Icone } from '../../../lib/icones';
import { listarProdutos, criarProduto, lancarMovimentacao } from '../../../lib/dados-estoque';
import { sessaoAtual } from '../../../lib/dados';
import { abaixoDoMinimo, TIPOS_MOVIMENTACAO } from '../../../lib/estoque';

const ROTULO = { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' };

export default function Estoque() {
  const [sessao, setSessao] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [erro, setErro] = useState('');
  const [novo, setNovo] = useState({ nome: '', sku: '', unidade: 'un', minimo: 0 });
  const [lancamento, setLancamento] = useState({ id: '', tipo: 'entrada', quantidade: '', motivo: '' });

  async function recarregar() {
    try { setProdutos(await listarProdutos()); setErro(''); }
    catch (e) { setErro(e.message); }
  }

  useEffect(() => { sessaoAtual().then(setSessao); recarregar(); }, []);

  async function adicionar(e) {
    e.preventDefault();
    try { await criarProduto(novo); setNovo({ nome: '', sku: '', unidade: 'un', minimo: 0 }); await recarregar(); }
    catch (er) { setErro(er.message); }
  }

  async function lancar(e) {
    e.preventDefault();
    try { await lancarMovimentacao(lancamento.id, lancamento); setLancamento({ ...lancamento, quantidade: '', motivo: '' }); await recarregar(); }
    catch (er) { setErro(er.message); }
  }

  const emAlerta = produtos.filter(abaixoDoMinimo);

  // Mesmo desenho dos campos de busca do resto do CRM. Fica aqui em objeto
  // porque o globals.css não tem classe de formulário solto — e nenhuma cor
  // literal entra: tudo sai das custom properties do :root.
  const campo = {
    background: 'var(--superficie)', border: '1px solid var(--linha)',
    color: 'var(--texto)', padding: '9px 14px', borderRadius: 'var(--raio)',
  };
  const campoTexto = { ...campo, outline: 'none' };

  return (
    <Estrutura sessao={sessao} secao="Clientes" titulo="Estoque" subtitulo="Controle interno de produtos">
      {erro && <div className="aviso">{erro}</div>}

      <div className="metricas">
        <div className="metrica">
          <div className="rotulo">Produtos</div>
          <div className="valor">{produtos.length}</div>
        </div>
        <div className="metrica">
          <div className="rotulo">Abaixo do mínimo</div>
          <div className="valor" style={{ color: emAlerta.length ? 'var(--vermelho)' : 'inherit' }}>
            {emAlerta.length}
          </div>
          <div className="nota">{emAlerta.length ? emAlerta.map((p) => p.nome).join(', ') : 'nenhum'}</div>
        </div>
      </div>

      <form className="barra" onSubmit={adicionar}>
        <input placeholder="Nome do produto" value={novo.nome}
          onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          style={campoTexto} />
        <input placeholder="SKU" value={novo.sku}
          onChange={(e) => setNovo({ ...novo, sku: e.target.value })}
          style={{ ...campoTexto, width: 110 }} />
        <input type="number" placeholder="Mínimo" value={novo.minimo}
          onChange={(e) => setNovo({ ...novo, minimo: e.target.value })}
          style={{ ...campoTexto, width: 100 }} />
        <button className="botao-branco" type="submit"><Icone.mais width={15} height={15} />Produto</button>
      </form>

      <form className="barra" onSubmit={lancar}>
        <select value={lancamento.id} onChange={(e) => setLancamento({ ...lancamento, id: e.target.value })}
          style={campo}>
          <option value="">Escolha o produto…</option>
          {produtos.filter((p) => p.ativo !== false).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={lancamento.tipo} onChange={(e) => setLancamento({ ...lancamento, tipo: e.target.value })}
          style={campo}>
          {TIPOS_MOVIMENTACAO.map((t) => <option key={t} value={t}>{ROTULO[t]}</option>)}
        </select>
        <input type="number" step="any" placeholder="Quantidade" value={lancamento.quantidade}
          onChange={(e) => setLancamento({ ...lancamento, quantidade: e.target.value })}
          style={{ ...campoTexto, width: 130 }} />
        <button className="botao-secundario" type="submit" disabled={!lancamento.id}>Lançar</button>
      </form>

      {produtos.length === 0 ? (
        <div className="vazio">Nenhum produto cadastrado ainda.</div>
      ) : (
        <table className="tabela">
          <thead><tr><th>Produto</th><th>SKU</th><th>Unidade</th><th>Saldo</th><th>Mínimo</th></tr></thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.nome}</td>
                <td style={{ color: 'var(--texto-3)' }}>{p.sku || '—'}</td>
                <td style={{ color: 'var(--texto-2)' }}>{p.unidade}</td>
                <td style={{ color: Number(p.saldo) < 0 ? 'var(--vermelho)' : 'var(--texto)', fontWeight: 600 }}>
                  {p.saldo}
                </td>
                <td>
                  {abaixoDoMinimo(p)
                    ? <span className="tag baixo">abaixo de {p.minimo}</span>
                    : <span style={{ color: 'var(--texto-3)' }}>{p.minimo || '—'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Estrutura>
  );
}
