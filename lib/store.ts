import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { BusinessConfig, DiscoveryResult, SessionAnswers } from './engine/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const LEADS_PATH = path.join(DATA_DIR, 'leads.json');

export interface Lead {
  id: string;
  createdAt: string;
  contact: { name?: string; email?: string; phone?: string };
  session: SessionAnswers;
  result: Pick<DiscoveryResult, 'estimate' | 'profile' | 'complexityScore'> & {
    packageId: string;
    packageName: string;
  };
}

export async function readConfig(): Promise<BusinessConfig> {
  return JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
}

export async function writeConfig(config: BusinessConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

export async function readLeads(): Promise<Lead[]> {
  try {
    return JSON.parse(await fs.readFile(LEADS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

export async function appendLead(lead: Lead): Promise<void> {
  const leads = await readLeads();
  leads.unshift(lead);
  await fs.writeFile(LEADS_PATH, JSON.stringify(leads, null, 2), 'utf8');
}
