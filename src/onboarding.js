/**
 * Onboarding: perguntas antes de instalar.
 *
 * Serve para dois fins:
 *  - sugerir (pré-marcar) as ferramentas prováveis na hora da escolha;
 *  - gravar `.automarketing/cliente.md`, que as skills leem depois em vez de
 *    perguntar tudo de novo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { c, text, select } from './ui.js';

const PARA_QUEM = [
  { value: 'cliente', label: 'Para um cliente meu' },
  { value: 'mim', label: 'Para mim / meu próprio negócio' },
];

/**
 * Tipo de negócio + as ferramentas que costumam fazer sentido nele.
 * É só uma sugestão: o cliente marca e desmarca o que quiser na pergunta seguinte.
 */
const NEGOCIOS = [
  {
    value: 'servico',
    label: 'Prestação de serviço',
    sugestao: ['crm', 'criacao-de-site', 'redes-sociais'],
  },
  {
    value: 'produto',
    label: 'Venda de produto / e-commerce',
    sugestao: ['crm', 'n8n', 'redes-sociais'],
  },
  {
    value: 'local',
    label: 'Negócio local (loja, clínica, salão)',
    sugestao: ['crm', 'redes-sociais', 'criacao-de-site'],
  },
  {
    value: 'infoproduto',
    label: 'Infoproduto / educação',
    sugestao: ['criacao-de-blog', 'redes-sociais', 'criacao-de-site'],
  },
  {
    value: 'software',
    label: 'Software / SaaS',
    sugestao: ['desenvolvedor-senior', 'engenheiro-arquitetura-software', 'coolify', 'cloudflare'],
  },
  {
    value: 'agencia',
    label: 'Agência / infra de clientes',
    sugestao: ['coolify', 'cloudflare', 'n8n', 'crm'],
  },
  { value: 'outro', label: 'Outro', sugestao: [] },
];

export function jaFezOnboarding(cwd) {
  return fs.existsSync(path.join(cwd, '.automarketing', 'cliente.md'));
}

export function lerPerfil(cwd) {
  const arquivo = path.join(cwd, '.automarketing', 'cliente.md');
  if (!fs.existsSync(arquivo)) return null;
  const conteudo = fs.readFileSync(arquivo, 'utf8');
  const campo = (nome) => (conteudo.match(new RegExp(`^- \\*\\*${nome}:\\*\\* (.+)$`, 'm')) || [])[1] || '';
  return {
    cliente: campo('Cliente'),
    para: campo('Projeto para'),
    negocio: campo('Negócio'),
    publico: campo('Público'),
  };
}

/**
 * Roda as perguntas de contexto (a escolha das ferramentas acontece depois, no menu).
 * Retorna { perfil, sugeridos }.
 */
export async function perguntar(cwd) {
  console.log(c.bold('  Antes de instalar, algumas perguntas rápidas.'));
  console.log(c.dim('  As skills usam isso depois para não perguntar de novo. Enter aceita o padrão.\n'));

  const para = await select('  1. Este projeto é para quem?', PARA_QUEM);

  const ehCliente = para === 'cliente';
  const padraoNome = path.basename(cwd);
  const cliente = await text(
    ehCliente ? '  2. Nome do cliente:' : '  2. Nome do seu projeto ou negócio:',
    padraoNome,
  );
  console.log('');

  const negocio = await select('  3. Que tipo de negócio é?', NEGOCIOS.map((n) => ({ value: n.value, label: n.label })));

  const publico = await text(
    ehCliente ? '  4. Quem é o cliente dele, em uma frase:' : '  4. Quem é o seu cliente, em uma frase:',
    'não informado',
  );
  console.log('');

  const escolhido = NEGOCIOS.find((n) => n.value === negocio);

  return {
    perfil: {
      cliente,
      para: ehCliente ? 'Cliente da Automarketing' : 'Projeto próprio',
      ehCliente,
      negocio: escolhido?.label || negocio,
      publico,
    },
    sugeridos: escolhido?.sugestao || [],
  };
}

/** Grava .automarketing/cliente.md com o perfil e o que foi instalado. */
export function salvarPerfil(cwd, perfil, itensInstalados) {
  const dir = path.join(cwd, '.automarketing');
  fs.mkdirSync(dir, { recursive: true });
  const arquivo = path.join(dir, 'cliente.md');

  const lista = itensInstalados.length
    ? itensInstalados.map((i) => `- ${i.name} (\`${i.id}\`)`).join('\n')
    : '- (nenhum)';

  const conteudo = `# Perfil do ${perfil.ehCliente ? 'cliente' : 'projeto'}

> Gerado pelo \`npx automarketing\`. As skills e agentes leem este arquivo antes de
> perguntar qualquer coisa. Mantenha atualizado.

- **Cliente:** ${perfil.cliente}
- **Projeto para:** ${perfil.para}
- **Negócio:** ${perfil.negocio}
- **Público:** ${perfil.publico}
- **Instalado em:** ${new Date().toISOString().slice(0, 10)}

## Ferramentas instaladas

${lista}

## Marca

Preencha para as skills de conteúdo pararem de perguntar:

- **Tom de voz:**
- **Cores:**
- **Nunca dizer:**
- **Site atual:**
- **WhatsApp:**
`;

  fs.writeFileSync(arquivo, conteudo);
  return arquivo;
}
