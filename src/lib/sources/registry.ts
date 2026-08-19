import { fetchArbeitnow } from "./arbeitnow";
import { fetchExpressoEmprego } from "./expressoemprego";
import { fetchItJobs } from "./itjobs";
import { fetchJobicy } from "./jobicy";
import { fetchJooble } from "./jooble";
import { fetchNetEmpregos } from "./netempregos";
import { fetchRemoteOk } from "./remoteok";
import { fetchRemotive } from "./remotive";
import { fetchTeamlyzer } from "./teamlyzer";
import { fetchWeWorkRemotely } from "./weworkremotely";
import { fetchWorkingNomads } from "./workingnomads";
import type { Fetcher } from "./types";

export const FETCHERS: Record<string, Fetcher> = {
  itjobs: fetchItJobs,
  remotive: fetchRemotive,
  arbeitnow: fetchArbeitnow,
  jooble: fetchJooble,
  netempregos: fetchNetEmpregos,
  remoteok: fetchRemoteOk,
  jobicy: fetchJobicy,
  weworkremotely: fetchWeWorkRemotely,
  expressoemprego: fetchExpressoEmprego,
  workingnomads: fetchWorkingNomads,
  teamlyzer: fetchTeamlyzer,
};
