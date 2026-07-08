import { createClient } from '@supabase/supabase-js';
import type { BusinessConfig, DiscoveryResult, SessionAnswers } from './engine/types';
import defaultConfig from '@/data/config.json';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function readConfig(): Promise<BusinessConfig> {
  const { data, error } = await supabase
    .from('app_config')
    .select('config')
    .eq('id', 'main')
    .single();

  if (error || !data) {
    await writeConfig(defaultConfig as BusinessConfig);
    return defaultConfig as BusinessConfig;
  }

  return data.config as BusinessConfig;
}

export async function writeConfig(config: BusinessConfig): Promise<void> {
  const { error } = await supabase
    .from('app_config')
    .upsert({
      id: 'main',
      config,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function readLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('data')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(row => row.data as Lead);
}

export async function appendLead(lead: Lead): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .insert({
      id: lead.id,
      data: lead,
      created_at: lead.createdAt,
    });

  if (error) {
    throw new Error(error.message);
  }
}