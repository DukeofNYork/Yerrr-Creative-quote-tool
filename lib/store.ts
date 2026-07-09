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
  /** Stable workspace this lead belongs to (Step 2). Missing = pre-migration/legacy. */
  workspaceId?: string;
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

/* ============================================================================
 * WORKSPACES — the tenancy spine (Step 2)
 * ----------------------------------------------------------------------------
 * V1 is one workspace per user, but `workspaceId` and `slug` are decoupled from
 * `userId` so Organizations (V2) become an additive change instead of a re-key.
 *
 * Storage (no DB migration required — all in the existing app_config KV store):
 *   workspaces                → Workspace[] registry
 *   ws:{workspaceId}:draft    → BusinessConfig the admin edits / Preview serves
 *   ws:{workspaceId}:published→ BusinessConfig the public /d/{slug} serves
 *
 * Migration-on-read: if the new keys are absent, the legacy config key
 * ('main' for owner, 'workspace:{userId}' for users) is copied in on first
 * access. Legacy keys are never deleted — they are the fallback.
 * ==========================================================================*/

export interface Workspace {
  workspaceId: string;        // stable tenant key — never the userId
  slug: string;               // public handle for /d/{slug}
  ownerUserId: string;        // OWNER_USER_ID for the platform owner
  templateId?: string;        // which template this workspace started from
  createdAt: string;
  publishedAt?: string | null;// set when draft is first promoted to published
}

const WORKSPACES_KEY = 'workspaces';
const OWNER_WORKSPACE_ID = 'main'; // reuse the legacy owner config key base

const draftKey = (workspaceId: string) => `ws:${workspaceId}:draft`;
const publishedKey = (workspaceId: string) => `ws:${workspaceId}:published`;

/** The pre-Step-2 config key for a user, kept for migration/fallback only. */
function legacyConfigKeyFor(ownerUserId: string): string {
  return ownerUserId === OWNER_USER_ID ? 'main' : `workspace:${ownerUserId}`;
}

// ---- raw app_config helpers (generalize the existing config access) ----

async function readRaw<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('app_config')
    .select('config')
    .eq('id', key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.config as T | undefined) ?? null;
}

async function writeRaw(key: string, config: unknown): Promise<void> {
  const { error } = await supabase
    .from('app_config')
    .upsert({ id: key, config, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// ---- registry ----

export async function readWorkspaces(): Promise<Workspace[]> {
  return (await readRaw<Workspace[]>(WORKSPACES_KEY)) ?? [];
}

async function writeWorkspaces(list: Workspace[]): Promise<void> {
  await writeRaw(WORKSPACES_KEY, list);
}

function slugify(input: string): string {
  const base = input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'workspace';
}

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Lazily create-and-migrate the workspace for a user. Copies the legacy config
 * into draft (+ published, since legacy config was already live) or seeds the
 * default. Idempotent: returns the existing workspace if one is already present.
 */
async function provisionWorkspace(ownerUserId: string, list: Workspace[]): Promise<Workspace> {
  const existing = list.find(w => w.ownerUserId === ownerUserId);
  if (existing) return existing;

  const workspaceId = ownerUserId === OWNER_USER_ID
    ? OWNER_WORKSPACE_ID
    : `ws_${crypto.randomUUID().slice(0, 8)}`;

  const legacy = await readRaw<BusinessConfig>(legacyConfigKeyFor(ownerUserId));
  const seed = legacy ?? defaultConfig;

  const taken = new Set(list.map(w => w.slug));
  const slug = uniqueSlug(slugify(seed.business?.name ?? ownerUserId), taken);
  const now = new Date().toISOString();

  const ws: Workspace = {
    workspaceId, slug, ownerUserId, createdAt: now,
    publishedAt: legacy ? now : null,
  };

  await writeRaw(draftKey(workspaceId), seed);
  if (legacy) await writeRaw(publishedKey(workspaceId), seed);

  list.push(ws);
  await writeWorkspaces(list);
  return ws;
}

export async function getWorkspaceByOwner(ownerUserId: string): Promise<Workspace> {
  const list = await readWorkspaces();
  return provisionWorkspace(ownerUserId, list);
}

export async function getWorkspaceBySlug(slug: string): Promise<Workspace | undefined> {
  return (await readWorkspaces()).find(w => w.slug === slug);
}

export async function getWorkspaceById(workspaceId: string): Promise<Workspace | undefined> {
  return (await readWorkspaces()).find(w => w.workspaceId === workspaceId);
}

// ---- draft / published config ----

/** The config the admin edits and Preview renders. Migrates/seeds if absent. */
export async function readDraftConfig(workspaceId: string): Promise<BusinessConfig> {
  const draft = await readRaw<BusinessConfig>(draftKey(workspaceId));
  if (draft) return draft;
  // Fallbacks: an already-published copy, else default. (Legacy-key migration
  // happens in provisionWorkspace; this covers a workspace with no draft yet.)
  const published = await readRaw<BusinessConfig>(publishedKey(workspaceId));
  const seed = published ?? defaultConfig;
  await writeRaw(draftKey(workspaceId), seed);
  return seed;
}

export async function writeDraftConfig(workspaceId: string, config: BusinessConfig): Promise<void> {
  await writeRaw(draftKey(workspaceId), config);
}

/** The config the public /d/{slug} flow serves. Null until first publish. */
export async function readPublishedConfig(workspaceId: string): Promise<BusinessConfig | null> {
  return readRaw<BusinessConfig>(publishedKey(workspaceId));
}

/** Promote draft → published (Build → Preview → Publish → Share). */
export async function publishWorkspace(workspaceId: string): Promise<void> {
  const draft = await readRaw<BusinessConfig>(draftKey(workspaceId));
  if (!draft) throw new Error(`No draft config to publish for workspace "${workspaceId}".`);
  await writeRaw(publishedKey(workspaceId), draft);

  const list = await readWorkspaces();
  const ws = list.find(w => w.workspaceId === workspaceId);
  if (ws) {
    ws.publishedAt = new Date().toISOString();
    await writeWorkspaces(list);
  }
}

// ---- leads, workspace-scoped, filtered at the DB (no in-memory scan) ----

/** Leads for a single workspace, filtered in Postgres via JSONB (no full scan). */
export async function readLeadsByWorkspace(workspaceId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('data')
    .eq('data->>workspaceId', workspaceId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error.message);
    return [];
  }
  return (data ?? []).map(row => row.data as Lead);
}
