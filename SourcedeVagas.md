# Radar de Vagas — Fontes a integrar

Lista de trabalho com todas as plataformas de emprego investigadas, agrupadas por como podem entrar no agregador. Versão local do artifact publicado em 2026-08-19 (endpoints e condições podem mudar — confirmar sempre na fonte antes de integrar).

## API pronta a usar

| Plataforma | Cobertura | Endpoint / condições | Prioridade |
|---|---|---|---|
| ITJobs.pt | Portugal, foco IT | `api.itjobs.pt` — chave grátis e imediata por email, sem limite documentado | Alta |
| Remotive | Remoto, tech global | `remotive.com/api/remote-jobs` — sem auth, máx. ~4 pedidos/dia | Alta |
| Arbeitnow | Europa, forte em dev | `arbeitnow.com/api/job-board-api` — sem auth | Alta |
| RemoteOK | Remoto, forte em dev | `remoteok.com/api` — sem auth, exige link direto de atribuição | Média |
| Jobicy | Remoto, generalista | `jobicy.com/api` — sem auth | Média |
| EURES | Portugal + toda a UE | `europa.eu/eures/api` — sem auth, documentação de comunidade (não oficial), pode mudar sem aviso | Média |
| Jooble | Portugal (chave regional) | `jooble.org/api` — grátis mas **500 pedidos vitalícios** por chave, não mensal — usar a conta-gotas | Baixa |

## RSS pronto

| Plataforma | Cobertura | Feed |
|---|---|---|
| Net-Empregos | Portugal, todas as áreas | `net-empregos.com/feed/` |
| Emprego XL | Portugal, todas as áreas | `empregoxl.com/rss/` — feeds separados por setor, inclui administração |
| Emprego Justo | Portugal, todas as áreas | `empregojusto.com/rss/` — feeds por setor |
| Expresso Emprego | Portugal, todas as áreas | `expressoemprego.pt/rss` |
| WeWorkRemotely | Remoto, global | `weworkremotely.com/remote-jobs.rss` — + feeds por categoria (back-end, front-end, suporte...) |

## Padrão de ATS por empresa

Não é uma plataforma — é uma técnica que se repete: descobre-se que sistema de recrutamento uma empresa usa (separador de rede do browser na página de carreira) e usa-se o mesmo padrão de endpoint para qualquer empresa nesse sistema.

| Sistema | Aplica-se quando | Endpoint / condições |
|---|---|---|
| Greenhouse | A empresa recruta via Greenhouse | `api.greenhouse.io/v1/boards/{empresa}/jobs?content=true` — sem auth |
| Personio | A empresa recruta via Personio | feed XML público por cliente, sem auth |
| SmartRecruiters | A empresa recruta via SmartRecruiters | API pública existe, endpoint exato a confirmar por empresa |

**Como usar:** para cada empresa-alvo (Natixis e outras com programas de estágio), abre a página de carreira e vê no separador de rede que sistema está por trás. Se for um destes três, ganhas um feed estruturado grátis em vez de escrever um scraper à medida.

## Precisa de scraping

| Plataforma | Cobertura | Nota | Prioridade |
|---|---|---|---|
| Landing.Jobs | Portugal/Europa, tech curado | Maior marketplace tech de Portugal — Volkswagen, Cloudflare, Pipedrive recrutam por ali. Vale o esforço do scraper. Sem API pública. | Alta |
| TeamLyzer | Portugal, TI + estágios | `pt.teamlyzer.com/companies/jobs` agrega vagas e estágios de várias empresas de TI | Alta |
| Sapo Emprego | Portugal, generalista | Bom para helpdesk/backoffice/admin, não só IT | Média |
| CareerJet PT | Portugal, agregador | Já agrega Sapo e outros — redundante se essas fontes já estiverem cobertas | Baixa |

## Evitar automatizar (tratar como fonte manual)

| Plataforma | Motivo |
|---|---|
| LinkedIn | Sem API de vagas para terceiros; scraping viola os Termos de Serviço e arrisca restrição de conta. Adicionar por link quando encontrares uma vaga. |
| Indeed | Publisher API descontinuada, sem chaves novas desde 2024; scraping bloqueado por proteção anti-bot |
| Glassdoor | API pública encerrada em 2022 |
| Wellfound / AngelList | Sem API oficial, só scrapers pagos de terceiros — baixa prioridade, revisitar mais tarde |

## Fora de scope

| Plataforma | Motivo |
|---|---|
| Adzuna | API não cobre Portugal (confirmado na lista oficial de países) |
| IEFP / Netemprego | Descartado — já tentado (formação Python, 350h) sem retorno real de mercado |
