# Prompt para Claude Code — Job Tracker

Quero criar um projeto pessoal de agregação de vagas de emprego, para me ajudar na procura de trabalho. Não é para escalar nem mostrar a terceiros — uso pessoal, local, com possibilidade de deploy simples no Vercel mais tarde.

## Contexto sobre mim

- Developer full-stack self-taught (React, Next.js, TypeScript, Node/Express, MySQL, Python, PHP, Tailwind)
- Sem licenciatura, à procura de emprego júnior/trainee em desenvolvimento web ou TI, mas também aberto a helpdesk, backoffice e funções administrativas dado o mercado difícil
- Baseado em Portugal (zona de Viana do Castelo / Porto)

## Objetivo do projeto

Criar uma app local que agregue vagas de várias plataformas de emprego num único sítio, com um botão de refresh para procurar vagas novas, filtros por área/localização/modalidade, e um histórico de candidaturas.

## Funcionalidades principais

1. Gestão de "fontes" de vagas: cada fonte tem tipo (API, RSS, ou entrada manual), nome, área associada, e estado ativo/inativo
2. Fetch/refresh de vagas: puxar vagas novas das fontes configuradas, com dedup (por link ou combinação título+empresa) para não duplicar
3. Listagem de vagas com filtros: área (dev/TI, helpdesk, backoffice, admin...), remoto vs presencial, Portugal vs internacional, fonte, data, e se é estágio ou não
4. Cada vaga tem: título, empresa, localização, modalidade, país, área, link, data de publicação, estado (nova/vista/aplicada/rejeitada/entrevista/etc.), notas pessoais, e flag de "estágio"
5. Histórico de candidaturas: mudar estado de uma vaga e ver todas as que já apliquei, com timeline

## Fontes a integrar

(discutimos a abordagem técnica para cada uma à medida que avançamos, incluindo scraping onde fizer sentido, sem restrições à partida)

- LinkedIn
- Net-Empregos
- ITJobs.pt
- Páginas de programas de estágio de empresas específicas (ex: Natixis, e outras grandes empresas/bancos/consultoras com programas de estágio em Portugal que faça sentido acompanhar)
- Plataformas agregadoras tipo TeamLyzer (e outras semelhantes que agreguem vagas/estágios de várias empresas num só sítio) — vale a pena investigar quais existem e fazem sentido para Portugal
- Outras que fizerem sentido (APIs como Adzuna, Jooble, Remotive, Arbeitnow, ou RSS onde existir)

## Stack

Sugere tu a mais simples e rápida de montar para este caso (algo tipo Next.js + SQLite é uma opção razoável, mas estou aberto a alternativas mais leves).

## Primeiro passo

Começa por propor a estrutura de dados (schema) e a arquitetura geral do projeto antes de escreveres código, para eu validar.
