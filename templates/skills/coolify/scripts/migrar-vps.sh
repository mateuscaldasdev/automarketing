#!/usr/bin/env bash
# Migração de VPS sem perder dado — Automarketing.
#
# Use quando as duas VPS NÃO estão na mesma Coolify (se estiverem, use a migração
# nativa: node coolify.mjs migrar <uuid> --destino <uuid-do-servidor>).
#
# Filosofia deste script: ele NUNCA apaga nada na origem. Só lê, empacota e restaura
# no destino. A origem continua de pé até você mandar desligar — é o seu rollback.
#
# Uso:
#   ./migrar-vps.sh inventario   root@origem
#   ./migrar-vps.sh backup       root@origem  ./backup-cliente
#   ./migrar-vps.sh restaurar    root@destino ./backup-cliente
#   ./migrar-vps.sh conferir     root@destino
#
set -euo pipefail

COMANDO="${1:-}"
ALVO="${2:-}"
PASTA="${3:-./backup-$(date +%Y%m%d-%H%M)}"

if [ -z "$COMANDO" ] || [ -z "$ALVO" ]; then
  sed -n '2,16p' "$0"
  exit 1
fi

ssh_() { ssh -o StrictHostKeyChecking=accept-new "$ALVO" "$@"; }

case "$COMANDO" in

inventario)
  echo "== Containers em execução =="
  ssh_ "docker ps --format '  {{.Names}}\t{{.Image}}\t{{.Status}}'"
  echo
  echo "== Volumes (o que precisa viajar) =="
  ssh_ "docker volume ls --format '  {{.Name}}'"
  echo
  echo "== Tamanho dos volumes =="
  ssh_ "du -sh /var/lib/docker/volumes/* 2>/dev/null | sort -rh | head -20" || true
  echo
  echo "== Bancos Postgres encontrados =="
  ssh_ "for c in \$(docker ps --filter ancestor=postgres --format '{{.Names}}'; docker ps --format '{{.Names}}' | grep -i postgres || true); do
          echo \"  container: \$c\";
          docker exec \$c psql -U postgres -lqt 2>/dev/null | cut -d'|' -f1 | sed 's/^/    banco: /' | grep -v '^\s*$' || true;
        done" || true
  echo
  echo "Anote o que aqui é indispensável. Em seguida: ./migrar-vps.sh backup $ALVO ./backup-cliente"
  ;;

backup)
  mkdir -p "$PASTA"
  echo "Salvando em $PASTA (a origem NÃO é alterada)"

  echo "-- dump de todos os bancos Postgres"
  for c in $(ssh_ "docker ps --format '{{.Names}}' | grep -iE 'postgres|postgresql' || true"); do
    echo "   pg_dumpall do container $c"
    ssh_ "docker exec $c pg_dumpall -U postgres" | gzip > "$PASTA/pgdump-$c.sql.gz"
    echo "   ✔ $PASTA/pgdump-$c.sql.gz ($(du -h "$PASTA/pgdump-$c.sql.gz" | cut -f1))"
  done

  echo "-- empacotando volumes"
  for v in $(ssh_ "docker volume ls --format '{{.Name}}'"); do
    echo "   volume $v"
    ssh_ "docker run --rm -v $v:/dados:ro -v /tmp:/saida alpine \
          tar czf /saida/vol-$v.tar.gz -C /dados . 2>/dev/null" || { echo "   ! pulei $v"; continue; }
    scp -q "$ALVO:/tmp/vol-$v.tar.gz" "$PASTA/"
    ssh_ "rm -f /tmp/vol-$v.tar.gz"
    echo "   ✔ $PASTA/vol-$v.tar.gz ($(du -h "$PASTA/vol-$v.tar.gz" | cut -f1))"
  done

  echo "-- variáveis de ambiente dos containers (inclui segredos: guarde com cuidado)"
  ssh_ "for c in \$(docker ps --format '{{.Names}}'); do
          echo \"### \$c\"; docker inspect \$c --format '{{range .Config.Env}}{{println .}}{{end}}';
        done" > "$PASTA/variaveis.txt"
  echo "   ✔ $PASTA/variaveis.txt"

  echo
  echo "⚠️  Confira em variaveis.txt, ANTES de restaurar:"
  echo "     N8N_ENCRYPTION_KEY  — se mudar, todas as credenciais do n8n morrem"
  echo "     GLOBAL_API_KEY      — a Evolution rejeita chamadas se mudar"
  echo "   Esses valores têm que ser IDÊNTICOS no destino."
  echo
  echo "Backup completo. Guarde $PASTA fora das duas VPS antes de continuar."
  ;;

restaurar)
  [ -d "$PASTA" ] || { echo "Pasta de backup não encontrada: $PASTA"; exit 1; }
  echo "Restaurando $PASTA em $ALVO"
  echo "Pré-requisito: as stacks já criadas na Coolify do destino, com as MESMAS"
  echo "chaves (N8N_ENCRYPTION_KEY, GLOBAL_API_KEY), e PARADAS."
  read -r -p "As stacks estão criadas e paradas no destino? [s/N] " ok
  [ "$ok" = "s" ] || { echo "Abortado."; exit 1; }

  echo "-- restaurando volumes"
  for arq in "$PASTA"/vol-*.tar.gz; do
    [ -e "$arq" ] || continue
    v=$(basename "$arq" .tar.gz); v=${v#vol-}
    echo "   volume $v"
    scp -q "$arq" "$ALVO:/tmp/"
    ssh_ "docker volume create $v >/dev/null;
          docker run --rm -v $v:/dados -v /tmp:/entrada alpine \
          sh -c 'tar xzf /entrada/$(basename "$arq") -C /dados';
          rm -f /tmp/$(basename "$arq")"
    echo "   ✔ $v restaurado"
  done

  echo "-- restaurando bancos"
  for arq in "$PASTA"/pgdump-*.sql.gz; do
    [ -e "$arq" ] || continue
    nome=$(basename "$arq" .sql.gz); nome=${nome#pgdump-}
    echo "   dump $nome — informe o container Postgres do destino:"
    ssh_ "docker ps --format '     {{.Names}}' | grep -i postgres || echo '     (nenhum rodando — suba a stack do banco primeiro)'"
    read -r -p "   container destino: " destino
    [ -n "$destino" ] || { echo "   pulado"; continue; }
    gunzip -c "$arq" | ssh_ "docker exec -i $destino psql -U postgres" > /dev/null
    echo "   ✔ restaurado em $destino"
  done

  echo
  echo "Agora, na Coolify do destino: deploy de cada stack."
  echo "Depois: ./migrar-vps.sh conferir $ALVO"
  ;;

conferir)
  echo "== Containers =="
  ssh_ "docker ps --format '  {{.Names}}\t{{.Status}}'"
  echo
  echo "== Healthchecks =="
  ssh_ "for c in \$(docker ps --format '{{.Names}}'); do
          s=\$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}sem healthcheck{{end}}' \$c);
          echo \"  \$c: \$s\";
        done"
  echo
  echo "Confira à mão, antes de virar o DNS:"
  echo "  [ ] n8n abre e os workflows aparecem"
  echo "  [ ] uma credencial do n8n abre sem erro de descriptografia"
  echo "  [ ] Evolution lista as instâncias e elas estão 'open' (sem pedir QR)"
  echo "  [ ] o banco tem a contagem de registros esperada"
  echo
  echo "Só então vire o DNS — e é um comando só, porque tudo é CNAME:"
  echo "  node .../cloudflare.mjs vps cliente.com.br <IP-NOVO>"
  echo
  echo "Deu errado? Volte o IP antigo no mesmo comando. A origem continua intacta."
  ;;

*)
  echo "Comando desconhecido: $COMANDO"
  sed -n '2,16p' "$0"
  exit 1
  ;;
esac
