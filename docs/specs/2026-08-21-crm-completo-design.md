# CRM completo — design

**Data:** 2026-08-21
**Estado:** aprovado, aguardando plano de implementação
**Escopo:** o CRM instalável do catálogo. Não cobre o modelo de agente (spec própria) nem o método de trabalho interno.

---

## 1. A barra

> **Tudo tem que estar funcionando. O usuário faz apenas as integrações.**

Isso é um critério, não um desejo. Ele reprova o CRM atual em dois pontos antes de qualquer
funcionalidade nova:

1. Ligar o Supabase exige **colar SQL à mão** no painel.
2. Exige rodar um bloco extra para se promover a `super_admin`. Quem esquece loga e **não vê
   nada** — parece defeito, é a RLS funcionando.

Enquanto esses dois existirem, nenhuma tela nova salva o critério. Por isso a Onda 1 começa
pela instalação, não pelas funcionalidades.

## 2. A restrição técnica que define o desenho

As chaves `anon` e `service_role` conversam com o Supabase pelo **PostgREST**, que expõe
tabelas e funções — **não executa DDL**. Nenhuma das duas cria tabela. Os caminhos para
aplicar schema são o SQL Editor, a CLI ou uma **conexão Postgres direta**.

Como o SQL Editor é exatamente o que se quer eliminar, a conexão direta é o único caminho
honesto. Custo: uma linha a mais no `.env`, tirada da mesma tela do painel do Supabase.

```
DATABASE_URL=postgresql://...   # Settings → Database → Connection string
```

**Consequências obrigatórias:**

- `DATABASE_URL` é credencial de superusuário do banco. **Nunca** prefixada com
  `NEXT_PUBLIC_`, nunca importada em componente de cliente, usada só em código de servidor.
- As migrações precisam de **sessão**, não de pooling por transação. O pooler de transação
  do Supabase (porta 6543) não sustenta `advisory lock` nem toda DDL. Migração usa a conexão
  direta ou o pooler de sessão; o resto da aplicação segue pelo PostgREST normalmente.
- Entra a dependência `pg` no CRM. O CLI continua sem dependência nenhuma; o CRM é uma
  aplicação Next e já tem as suas.

## 3. O primeiro acesso

```
1. sobe            procura a tabela schema_versao
2. não existe?     pega advisory lock, aplica as migrações pendentes em ordem, solta o lock
3. sem super admin? redireciona tudo para /bem-vindo
4. /bem-vindo      cria o usuário no Auth, a organização e o perfil super_admin
5. pronto          cai no pipeline, com dado real
```

### Regras da migração

- Arquivos numerados em `supabase/migracoes/NNN_nome.sql`, aplicados em ordem crescente.
- Cada arquivo roda **dentro de uma transação**: ou aplica inteiro, ou não aplica.
- `schema_versao` guarda o que já rodou. Migração aplicada nunca roda de novo.
- **Nada destrutivo.** Sem `DROP`, sem `ALTER ... DROP COLUMN`. Só adição.
- `pg_advisory_lock` antes de aplicar: em deploy com mais de uma réplica, duas instâncias
  sobem juntas e tentariam migrar ao mesmo tempo.
- Falhou? A aplicação **sobe assim mesmo, em modo somente leitura**, com o erro na tela.
  Um CRM que não abre é pior que um CRM que abre avisando o que houve.

### Segurança do `/bem-vindo`

A rota só responde enquanto **não existir nenhum `super_admin`**. Assim que o primeiro é
criado, ela deixa de existir para sempre. Sem essa trava, seria uma porta aberta para
qualquer um criar o dono do sistema.

## 4. O schema

### Já existe

`organizacoes` · `perfis` · `leads` · `movimentacoes_lead`

### Entra agora

**Estoque** — controle interno do cliente, sem ligação com o agente ou com o funil.

```
produtos                id · organizacao_id · nome · sku · unidade
                        saldo · minimo · ativo · criado_em
movimentacoes_estoque   id · produto_id · organizacao_id
                        tipo (entrada|saida|ajuste) · quantidade
                        motivo · autor · criado_em
```

`movimentacoes_estoque` é **append-only**: correção é lançamento de ajuste, não edição. Um
trigger mantém `produtos.saldo` coerente a cada lançamento — o saldo é derivado, mas fica
materializado para a tela não somar o histórico toda vez.

**Agente** — consome o contrato da spec do modelo.

```
agentes                 id · organizacao_id · nome
                        definicao (jsonb: o manifesto inteiro) · atualizado_em
agente_prompts          id · agente_id · chave · conteudo · atualizado_em · atualizado_por
agente_prompt_versoes   id · prompt_id · conteudo · criado_em · criado_por
```

`canal` e `destino_seguro` **não viram coluna**, mesmo sendo cômodo para consultar: eles já
vivem dentro de `definicao`. Duplicar criaria duas fontes de verdade para o mesmo dado —
exatamente a deriva que o modelo se dá ao trabalho de tornar impossível. Quem precisa deles
lê do jsonb.

`chave` usa exatamente os nomes do modelo — `classificador`, `etapa-<id>`, `desvio-<id>` —
para que `semear` e `exportar` não precisem traduzir nada.

**Observabilidade**

```
conversas    id · organizacao_id · agente_id · contato · canal
             etapa_atual · iniciada_em · ultima_em
mensagens    id · conversa_id · direcao (entrada|saida) · texto
             etapa_classificada · criado_em
execucoes    id · conversa_id · mensagem_id · etapa · tool
             status · erro · duracao_ms · criado_em
```

`etapa_classificada` guardada por mensagem é o que torna a classificação auditável: dá para
ver onde o classificador errou, que é a informação que faz o agente melhorar.

**Equipe**

```
convites     id · organizacao_id · email · papel · token
             expira_em · aceito_em · criado_por
```

### RLS

Mesmo padrão das quatro tabelas atuais: isolamento por organização, com as funções
`meu_papel()`, `minha_organizacao()` e `sou_super_admin()` como `security definer` — sem
isso a policy de `perfis` consultaria `perfis` e entraria em recursão.

Todas as tabelas novas nascem com RLS ligada. Nenhuma exceção "para facilitar".

## 5. As telas

| Rota | O que faz | Onda |
|---|---|---|
| `/bem-vindo` | primeiro acesso: cria super admin e organização | 1 |
| `/crm/estoque` | produtos, saldo, entrada e saída, alerta de mínimo | 1 |
| `/crm/equipe` | convidar funcionário, trocar papel, remover | 1 |
| `/crm/agente` | etapas, tools e roteamento | 2 |
| `/crm/agente/prompts` | editor com histórico e volta atrás | 2 |
| `/crm/conversas` | atendimento acontecendo, classificação e erros | 2 |

Já existentes: `/crm`, `/crm/clientes`, `/crm/analytics`, `/crm/captura`, `/login`.

## 6. O que o usuário coloca no `.env`

**Obrigatório** — todos da mesma tela do painel do Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
CRM_API_KEY=
```

**Opcional** — cada bloco liga uma integração; ausente, a tela correspondente explica o que
falta em vez de quebrar:

```
N8N_URL= / N8N_API_KEY=
EVOLUTION_URL= / EVOLUTION_KEY= / EVOLUTION_INSTANCIA=
```

**Sem nada preenchido**, o CRM abre em modo demonstração, como hoje — sem login, dados no
navegador. É o que permite apresentar na hora.

## 7. Ordem de construção

**Onda 1 — não depende do modelo de agente**
Boot automático, migrações, `/bem-vindo`, estoque, equipe.
Ao fim dela o critério da Seção 1 está atendido: o usuário só preenche o `.env`.

**Onda 2 — depende do contrato do modelo**
Agente, prompts, conversas.

As duas ondas não se bloqueiam: a 1 mexe em instalação e tabelas próprias, a 2 entra quando
o modelo fechar.

## 8. Fronteiras

| Este projeto | Fora daqui |
|---|---|
| hospeda, edita e observa o agente | **definir** o formato do agente → spec do modelo |
| lê e escreve as tabelas do agente | **gerar** o workflow do n8n → spec do modelo |
| mostra o que aconteceu na conversa | **executar** a conversa no n8n → o próprio n8n |
| guarda as chaves de integração | subir servidor, domínio e SSL → skills `coolify` e `cloudflare` |

O interpretador que roda a conversa dentro do CRM — a alternativa ao n8n — **fica para
depois da Onda 2**. É um motor de execução inteiro; misturá-lo aqui atrasaria as duas ondas
e nada hoje depende dele.

## 9. Fora de escopo

- Interpretador de conversa dentro do CRM (adiado, não cancelado)
- Baixa automática de estoque quando o lead fecha — decisão explícita: estoque é controle
  interno, desligado do funil
- Estoque como ferramenta do agente
- Relatórios exportáveis, metas, previsão de receita
- Aplicativo móvel

## 10. Como a gente sabe que terminou

> Alguém instala o CRM, preenche cinco linhas no `.env`, abre o navegador, cria a própria
> conta na tela de boas-vindas e cadastra um produto e um lead — **sem rodar um SQL, sem ler
> documentação e sem perguntar nada.**

## 11. Riscos conhecidos

**`DATABASE_URL` é a credencial mais perigosa do pacote.** Vaza o banco inteiro, ignorando
RLS. Mitigação: só em servidor, nunca `NEXT_PUBLIC_`, no `.gitignore`, e um aviso explícito
no `.env.example`. Vale um teste que reprove o build se ela aparecer em bundle de cliente.

**Migração automática assusta quem já tem dado.** Mitigação: nada destrutivo, transação por
arquivo, versão registrada e o aviso do que será aplicado antes de aplicar.

**Duas réplicas subindo juntas** tentam migrar ao mesmo tempo. Mitigação: advisory lock.

**Pooler errado quebra a migração em silêncio.** O pooler de transação não sustenta advisory
lock. Mitigação: detectar a porta na `DATABASE_URL` e avisar quando estiver na 6543.

**A tela de estoque é fácil de subestimar.** Saldo materializado com histórico append-only
tem casos chatos: lançamento retroativo, ajuste negativo, produto desativado com saldo. Vale
decidir cada um no plano, não na hora de codar.
