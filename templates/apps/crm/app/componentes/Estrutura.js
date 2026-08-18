'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Icone } from '../../lib/icones';
import { sair } from '../../lib/dados';

const RAIL = [
  { icone: 'grade', titulo: 'Visão geral' },
  { icone: 'faisca', titulo: 'Dona IA' },
  { icone: 'grafico', titulo: 'Campanhas' },
  { icone: 'pessoas', titulo: 'CRM', ativo: true },
  { icone: 'calendario', titulo: 'Agenda' },
  { icone: 'funil', titulo: 'Funis' },
  { icone: 'whatsapp', titulo: 'WhatsApp' },
  { icone: 'documento', titulo: 'Documentos' },
  { icone: 'imagem', titulo: 'Criativos' },
  { icone: 'chapeu', titulo: 'Treinamentos' },
];

const ABAS = [
  { id: 'dashboard', nome: 'Dashboard', icone: 'grade' },
  { id: 'ia', nome: 'Dona IA', icone: 'faisca' },
  { id: 'campanhas', nome: 'Campanhas', icone: 'grafico' },
  { id: 'crm', nome: 'CRM', icone: 'pessoas' },
];

const SECOES = [
  { id: 'pipeline', nome: 'Pipeline', icone: 'grade', href: '/crm' },
  { id: 'clientes', nome: 'Clientes', icone: 'pessoas', href: '/crm/clientes' },
  { id: 'analytics', nome: 'Analytics', icone: 'grafico', href: '/crm/analytics' },
  { id: 'captura', nome: 'Captura', icone: 'link', href: '/crm/captura' },
];

export function Estrutura({ sessao, titulo, secao, subtitulo, acoes, children }) {
  const router = useRouter();
  const caminho = usePathname();

  async function encerrar() {
    await sair();
    router.push('/login');
  }

  return (
    <div className="app">
      <nav className="rail">
        <div className="rail-logo">A</div>
        {RAIL.map((item, i) => {
          const Desenho = Icone[item.icone];
          return (
            <button
              key={i}
              className={`rail-item ${item.ativo ? 'ativo' : ''}`}
              title={item.titulo}
              type="button"
            >
              <Desenho width={17} height={17} />
            </button>
          );
        })}
        <button className="rail-item" title="Sair" onClick={encerrar} style={{ marginTop: 'auto' }} type="button">
          <Icone.sair width={17} height={17} />
        </button>
      </nav>

      <div className="conteudo">
        <header className="topo">
          <div style={{ width: 40 }} />
          <div className="abas">
            {ABAS.map((aba) => {
              const Desenho = Icone[aba.icone];
              return (
                <button key={aba.id} className={`aba ${aba.id === 'crm' ? 'ativa' : ''}`} type="button">
                  <Desenho width={15} height={15} />
                  {aba.nome}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="icone-topo" title="Notificações" type="button">
              <Icone.sino width={16} height={16} />
            </button>
            <button className="botao-topo" type="button">
              <Icone.faisca width={15} height={15} />
              Falar com a Dona
            </button>
          </div>
        </header>

        <main className="pagina">
          <div className="cabecalho">
            <div className="secao">{secao}</div>
            <h1>{titulo}</h1>
            <p>{subtitulo}</p>

            <div className="menu-lateral">
              {SECOES.map((s) => {
                const Desenho = Icone[s.icone];
                const ativo = caminho === s.href;
                return (
                  <button
                    key={s.id}
                    className={`menu-item ${ativo ? 'ativo' : ''}`}
                    onClick={() => router.push(s.href)}
                    type="button"
                  >
                    <Desenho width={15} height={15} />
                    {s.nome}
                  </button>
                );
              })}
            </div>

            {sessao && (
              <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--linha)' }}>
                <div style={{ fontSize: 12, color: 'var(--texto-2)', fontWeight: 600 }}>{sessao.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--texto-3)', marginTop: 2 }}>{sessao.organizacao}</div>
                <div className="tag canal" style={{ marginTop: 8 }}>
                  {sessao.papel === 'super_admin' ? 'Super admin' : sessao.papel === 'admin' ? 'Admin' : 'Usuário'}
                </div>
              </div>
            )}
          </div>

          <div className="painel">
            {acoes}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
