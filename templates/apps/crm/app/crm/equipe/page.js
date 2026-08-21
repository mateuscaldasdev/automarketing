'use client';

import { useEffect, useState } from 'react';
import { Estrutura } from '../../componentes/Estrutura';
import { listarEquipe, trocarPapel, convidar, listarConvites } from '../../../lib/dados-equipe';
import { sessaoAtual } from '../../../lib/dados';
import { PAPEIS, papeisQuePossoDefinir } from '../../../lib/dominio';

export default function Equipe() {
  const [sessao, setSessao] = useState(null);
  const [pessoas, setPessoas] = useState([]);
  const [convites, setConvites] = useState([]);
  const [erro, setErro] = useState('');
  const [convite, setConvite] = useState({ email: '', papel: 'usuario' });

  async function recarregar() {
    try {
      setPessoas(await listarEquipe());
      setConvites(await listarConvites());
      setErro('');
    } catch (e) { setErro(e.message); }
  }

  useEffect(() => { sessaoAtual().then(setSessao); recarregar(); }, []);

  const permitidos = papeisQuePossoDefinir(sessao?.papel);

  async function enviarConvite(e) {
    e.preventDefault();
    try { await convidar(convite.email, convite.papel); setConvite({ email: '', papel: 'usuario' }); await recarregar(); }
    catch (er) { setErro(er.message); }
  }

  async function mudar(id, papel) {
    try { await trocarPapel(id, papel); await recarregar(); }
    catch (er) { setErro(er.message); }
  }

  const estilo = {
    background: 'var(--superficie)', border: '1px solid var(--linha)',
    color: 'var(--texto)', padding: '9px 14px', borderRadius: 'var(--raio)', outline: 'none',
  };

  return (
    <Estrutura sessao={sessao} secao="Clientes" titulo="Equipe" subtitulo="Quem acessa e com qual permissão">
      {erro && <div className="aviso">{erro}</div>}

      {permitidos.length === 0 ? (
        <div className="vazio">Você não tem permissão para gerenciar a equipe.</div>
      ) : (
        <>
          <form className="barra" onSubmit={enviarConvite}>
            <input type="email" placeholder="e-mail do funcionário" value={convite.email}
              onChange={(e) => setConvite({ ...convite, email: e.target.value })}
              style={{ ...estilo, width: 260 }} />
            <select value={convite.papel} onChange={(e) => setConvite({ ...convite, papel: e.target.value })} style={estilo}>
              {permitidos.map((p) => <option key={p} value={p}>{PAPEIS[p].nome}</option>)}
            </select>
            <button className="botao-branco" type="submit">Convidar</button>
          </form>

          <table className="tabela">
            <thead><tr><th>Pessoa</th><th>Papel</th><th>O que pode</th></tr></thead>
            <tbody>
              {pessoas.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.nome || '—'}</div>
                    {p.email && <div style={{ fontSize: 11.5, color: 'var(--texto-3)' }}>{p.email}</div>}
                  </td>
                  <td>
                    <select value={p.papel} onChange={(e) => mudar(p.id, e.target.value)} style={estilo}>
                      {permitidos.map((r) => <option key={r} value={r}>{PAPEIS[r].nome}</option>)}
                    </select>
                  </td>
                  <td style={{ color: 'var(--texto-3)', fontSize: 12.5 }}>{PAPEIS[p.papel]?.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {convites.length > 0 && (
            <>
              <h2 style={{ fontSize: 13, color: 'var(--texto-2)', margin: '22px 0 10px' }}>Convites pendentes</h2>
              <table className="tabela">
                <thead><tr><th>E-mail</th><th>Papel</th></tr></thead>
                <tbody>
                  {convites.map((c) => (
                    <tr key={c.token || c.email}>
                      <td>{c.email}</td>
                      <td style={{ color: 'var(--texto-2)' }}>{PAPEIS[c.papel]?.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </Estrutura>
  );
}
