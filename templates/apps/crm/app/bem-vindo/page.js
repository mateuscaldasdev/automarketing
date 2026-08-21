'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BemVindo() {
  const router = useRouter();
  const [estado, setEstado] = useState(null);
  const [form, setForm] = useState({ nome: '', organizacao: '', email: '', senha: '' });
  const [problemas, setProblemas] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch('/api/instalacao').then((r) => r.json()).then(setEstado);
  }, []);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setProblemas([]);
    const r = await fetch('/api/instalacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const dados = await r.json();
    setEnviando(false);
    if (r.ok) return router.push('/login');
    setProblemas(dados.problemas || [dados.erro || 'Não foi possível concluir.']);
  }

  if (!estado) return <div className="login"><div className="vazio">Carregando…</div></div>;

  if (estado.estado === 'erro') {
    return (
      <div className="login">
        <div className="login-caixa">
          <h1>O banco não subiu</h1>
          <p className="sub">A aplicação abriu para você poder ver o erro.</p>
          <div className="aviso">{estado.erro}</div>
          {estado.aviso && <div className="faixa-demo">{estado.aviso}</div>}
        </div>
      </div>
    );
  }

  if (!estado.precisaDeDono) {
    return (
      <div className="login">
        <div className="login-caixa">
          <h1>Tudo pronto</h1>
          <p className="sub">Este sistema já tem administrador.</p>
          <button className="botao-principal" onClick={() => router.push('/login')} type="button">
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <form className="login-caixa" onSubmit={enviar}>
        <h1>Bem-vindo</h1>
        <p className="sub">Crie a sua conta de administrador. É o primeiro e único passo.</p>

        {problemas.map((p) => <div className="aviso" key={p}>{p}</div>)}
        {estado.aviso && <div className="faixa-demo">{estado.aviso}</div>}

        <div className="campo">
          <label htmlFor="org">Nome da empresa</label>
          <input id="org" value={form.organizacao}
            onChange={(e) => setForm({ ...form, organizacao: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="nome">Seu nome</label>
          <input id="nome" value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })} />
        </div>

        <button className="botao-principal" disabled={enviando} type="submit">
          {enviando ? 'Criando…' : 'Criar minha conta'}
        </button>
      </form>
    </div>
  );
}
