import { createClient } from '@supabase/supabase-js';
import type { BusinessConfig, DiscoveryResult, SessionAnswers } from './engine/types';
import defaultConfigJson from '@/data/config.json';

const defaultConfig = defaultConfigJson as unknown as BusinessConfig;

export const OWNER_USER_ID = 'owner';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  createdAt: string;
  contact: { name?: string; email?: string; phone?: string };
  session: SessionAnswers;
  result: Pick<DiscoveryResult, 'estimate' | 'profile' | 'complexityScore'> & {
    packageId: string;
    packageName: string;
  };
  /** Which user's workspace/discover flow produced this lead. Missing = owner (legacy). */
  workspaceUserId?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

function configKeyFor(userId: string): string {
  return userId === OWNER_USER_ID ? 'main' : `workspace:${userId}`;
}

export async function readConfig(userId: string = OWNER_USER_ID): Promise<BusinessConfig> {
  const key = configKeyFor(userId);
  const { data, error } = await supabase
    .from('app_config')
    .select('config')
    .eq('id', key)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    await writeConfig(defaultConfig, userId);
    return defaultConfig;
  }
  return data.config as BusinessConfig;
}

export async function writeConfig(config: BusinessConfig, userId: string = OWNER_USER_ID): Promise<void> {
  const key = configKeyFor(userId);
  const { error } = await supabase
    .from('app_config')
    .upsert({ id: key, config, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

const USERS_KEY = 'users';

export async function readUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('app_config')
    .select('config')
    .eq('id', USERS_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.config as AdminUser[] | undefined) ?? [];
}

export async function writeUsers(users: AdminUser[]): Promise<void> {
  const { error } = await supabase
    .from('app_config')
    .upsert({ id: USERS_KEY, config: users, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function findUserByUsername(username: string): Promise<AdminUser | undefined> {
  const users = await readUsers();
  const needle = username.trim().toLowerCase();
  return users.find(u => u.username.toLowerCase() === needle);
}

export async function findUserById(id: string): Promise<AdminUser | undefined> {
  const users = await readUsers();
  return users.find(u => u.id === id);
}

export async function createUser(user: AdminUser): Promise<void> {
  const users = await readUsers();
  users.push(user);
  await writeUsers(users);
}

export async function readLeads(userId?: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('data')
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error.message);
    return [];
  }
  const all = (data ?? []).map(row => row.data as Lead);
  if (!userId) return all;
  return all.filter(lead => (lead.workspaceUserId ?? OWNER_USER_ID) === userId);
}

export async function appendLead(lead: Lead): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .insert({
      id: lead.id,
      data: lead,
      created_at: lead.createdAt,
    });
  if (error) throw new Error(error.message);
}
