'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, temSupabase } from '../../lib/dados';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Sem Supabase configurado não existe login: o CRM abre em modo demo.
  useEffect(() => {
    if (!temSupabase) router.replace('/crm');
  }, [router]);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const { error } = await supabase().auth.signInWithPassword({ email, password: senha });
      if (error) throw new Error(traduzir(error.message));
      router.push('/crm');
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <div className="login-caixa">
        <div
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--roxo) 0%, #b06cff 100%)',
            display: 'grid', placeItems: 'center',
            fontWeight: 700, color: '#fff', marginBottom: 18,
          }}
        >
          A
        </div>
        <h1>Entrar no CRM</h1>
        <p className="sub">Automarketing</p>

        {erro && <div className="aviso">{erro}</div>}

        <form onSubmit={entrar}>
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com.br"
            />
          </div>
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha" type="password" required autoComplete="current-password"
              value={senha} onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="botao-principal" disabled={enviando} type="submit">
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p style={{ color: 'var(--texto-3)', fontSize: 12, marginTop: 18, marginBottom: 0 }}>
          Não tem acesso? Peça um convite ao administrador da sua organização.
        </p>
      </div>
    </div>
  );
}

function traduzir(mensagem) {
  if (/Invalid login credentials/i.test(mensagem)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(mensagem)) return 'Confirme seu e-mail antes de entrar.';
  return mensagem;
}
