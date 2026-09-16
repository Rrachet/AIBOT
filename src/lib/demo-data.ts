import type { LeadStatus, LeadSource } from '@/domain/types';
import type { IconName } from '@/components/icons';

/**
 * ============================================================================
 * PHASE 1 PLACEHOLDER DATA — NOT A DATA LAYER
 * ============================================================================
 *
 * Static sample records used to design and review the interface before any
 * backend exists. Nothing here calls a network, and no view should ever treat
 * these as real workspace data.
 *
 * Each view is migrated off this module as its API is built. Leads, Agents,
 * Campaigns, Calls and WhatsApp have all moved and read from the database;
 * what is left here is used only by Overview and Analytics, which have not.
 * `DEMO_LEADS` is the dashboard's "Recent leads" card and is NOT what /leads
 * renders.
 *
 * The topbar shows a "Sample figures" pill on every route not yet marked
 * `live` in `src/config/navigation.ts`, so a page still reading from here says
 * so on screen.
 *
 * When the last view is migrated, DELETE THIS FILE — a passing type-check
 * afterwards proves no view still depends on sample data.
 *
 * The shapes below intentionally mirror `src/domain/types.ts` so swapping in
 * real rows is a change of source, not a rewrite of the views.
 * ============================================================================
 */

export const WORKSPACE = {
  name: 'Thrii Workspace',
  plan: 'Personal workspace',
  initial: 'T',
  userName: 'Amar',
  userInitials: 'AM',
} as const;

/* -------------------------------------------------------------------------- */
/* Leads                                                                      */
/* -------------------------------------------------------------------------- */

export interface DemoLead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  updatedLabel: string;
}

export const DEMO_LEADS: readonly DemoLead[] = [
  {
    id: 'ld_01',
    name: 'Rahul Sharma',
    company: 'Acme Technologies',
    phone: '+91 98765 43210',
    email: 'rahul@acmetech.in',
    source: 'CSV',
    status: 'QUALIFIED',
    updatedLabel: '2 min ago',
  },
  {
    id: 'ld_02',
    name: 'Priya Mehta',
    company: 'Northstar Labs',
    phone: '+91 98450 11220',
    email: 'priya@northstarlabs.io',
    source: 'CSV',
    status: 'NO_ANSWER',
    updatedLabel: '8 min ago',
  },
  {
    id: 'ld_03',
    name: 'Arjun Kapoor',
    company: 'Orbit Systems',
    phone: '+91 99880 22110',
    email: 'arjun@orbitsystems.com',
    source: 'MANUAL',
    status: 'FOLLOW_UP',
    updatedLabel: '14 min ago',
  },
  {
    id: 'ld_04',
    name: 'Sneha Rao',
    company: 'Vertex Digital',
    phone: '+91 99001 88442',
    email: 'sneha@vertexdigital.in',
    source: 'EXCEL',
    status: 'NOT_INTERESTED',
    updatedLabel: '21 min ago',
  },
  {
    id: 'ld_05',
    name: 'Karan Malhotra',
    company: 'Bluepeak Retail',
    phone: '+91 98200 55310',
    email: 'karan@bluepeak.co',
    source: 'CSV',
    status: 'CALLING',
    updatedLabel: '24 min ago',
  },
  {
    id: 'ld_06',
    name: 'Ananya Iyer',
    company: 'Lumen Health',
    phone: '+91 90040 71180',
    email: 'ananya@lumenhealth.in',
    source: 'MANUAL',
    status: 'NEW',
    updatedLabel: '1 hr ago',
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Agents                                                                     */
/* -------------------------------------------------------------------------- */

export interface DemoAgent {
  id: string;
  name: string;
  role: string;
  company: string;
  voice: string;
  language: string;
  active: boolean;
  callsHandled: number;
}

export const DEMO_AGENTS: readonly DemoAgent[] = [
  {
    id: 'ag_01',
    name: 'Maya',
    role: 'Sales qualifier',
    company: 'Thrii',
    voice: 'Warm · Female',
    language: 'English',
    active: true,
    callsHandled: 312,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Campaigns                                                                  */
/* -------------------------------------------------------------------------- */

/** The breakdown a running campaign reports, in display order. */
export interface CampaignBreakdown {
  total: number;
  queued: number;
  calling: number;
  completed: number;
  noAnswer: number;
  qualified: number;
  followUp: number;
}

export interface DemoCampaign {
  id: string;
  name: string;
  agentName: string;
  startedLabel: string;
  running: boolean;
  breakdown: CampaignBreakdown;
}

export const DEMO_CAMPAIGNS: readonly DemoCampaign[] = [
  {
    id: 'cp_01',
    name: 'March enterprise list',
    agentName: 'Maya',
    startedLabel: 'Started 42 min ago',
    running: true,
    breakdown: {
      total: 240,
      queued: 96,
      calling: 4,
      completed: 140,
      noAnswer: 38,
      qualified: 31,
      followUp: 22,
    },
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export interface DemoActivity {
  id: string;
  icon: IconName;
  title: string;
  detail: string;
  timeLabel: string;
}

export const DEMO_ACTIVITY: readonly DemoActivity[] = [
  { id: 'ac_01', icon: 'phone', title: 'Call completed', detail: 'Rahul Sharma was qualified by Maya.', timeLabel: '2m' },
  { id: 'ac_02', icon: 'message', title: 'Follow-up queued', detail: 'Priya Mehta did not answer the first call.', timeLabel: '8m' },
  { id: 'ac_03', icon: 'phone', title: 'Call connected', detail: 'Arjun Kapoor is speaking with Maya.', timeLabel: '14m' },
  { id: 'ac_04', icon: 'users', title: 'Leads imported', detail: '42 new leads added from CSV.', timeLabel: '31m' },
] as const;

/** "What needs my attention?" — the dashboard triage surface. */
export interface AttentionItem {
  id: string;
  icon: IconName;
  tone: 'amber' | 'purple' | 'gray';
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
}

export const DEMO_ATTENTION: readonly AttentionItem[] = [
  {
    id: 'at_01',
    icon: 'message',
    tone: 'amber',
    title: '38 leads did not answer',
    detail: 'WhatsApp follow-up is not connected, so these are waiting.',
    actionLabel: 'Set up WhatsApp',
    href: '/whatsapp',
  },
  {
    id: 'at_02',
    icon: 'clock',
    tone: 'purple',
    title: '22 leads marked follow-up',
    detail: 'Maya flagged these for a second conversation.',
    actionLabel: 'Review leads',
    href: '/leads',
  },
  {
    id: 'at_03',
    icon: 'alert',
    tone: 'gray',
    title: '96 leads still queued',
    detail: 'The March enterprise campaign is still working through them.',
    actionLabel: 'View campaign',
    href: '/campaigns',
  },
] as const;

/**
 * Guided setup for a new workspace. `done` is sample state; Phase 3 derives it
 * from real workspace records (lead count, agent count, campaign count).
 */
export interface SetupStep {
  id: string;
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
  done: boolean;
}

export const SETUP_STEPS: readonly SetupStep[] = [
  { id: 'st_01', title: 'Import your leads', detail: 'Add leads manually or upload a CSV or Excel file.', href: '/leads', actionLabel: 'Import leads', done: true },
  { id: 'st_02', title: 'Create an AI agent', detail: 'Give your agent a goal, a voice and business context.', href: '/agents', actionLabel: 'Create agent', done: true },
  { id: 'st_03', title: 'Build a campaign', detail: 'Pick the leads to call and the agent that calls them.', href: '/campaigns', actionLabel: 'New campaign', done: false },
  { id: 'st_04', title: 'Connect WhatsApp', detail: 'Follow up automatically when a lead does not answer.', href: '/whatsapp', actionLabel: 'Connect', done: false },
] as const;

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */

export interface DemoMetric {
  label: string;
  value: string;
  meta: string;
  trend?: 'up' | 'down';
  icon: IconName;
}

export const DEMO_DASHBOARD_METRICS: readonly DemoMetric[] = [
  { label: 'Total leads', value: '1,284', meta: '+18.4% this month', trend: 'up', icon: 'users' },
  { label: 'Calls today', value: '84', meta: '71 connected · 13 missed', icon: 'phone' },
  { label: 'Qualified leads', value: '23', meta: '27.4% of answered calls', trend: 'up', icon: 'target' },
  { label: 'Appointments', value: '9', meta: '4 booked today', trend: 'up', icon: 'calendar' },
] as const;

export const DEMO_ANALYTICS_METRICS: readonly DemoMetric[] = [
  { label: 'Calls placed', value: '1,042', meta: 'Last 30 days', icon: 'phone' },
  { label: 'Connect rate', value: '84.5%', meta: '+6.2% vs. previous 30 days', trend: 'up', icon: 'link' },
  { label: 'Qualification rate', value: '27.4%', meta: '+3.1% vs. previous 30 days', trend: 'up', icon: 'target' },
  { label: 'Avg. call length', value: '4:32', meta: 'Across answered calls', icon: 'clock' },
] as const;

export interface AgentPerformanceRow {
  agentName: string;
  calls: number;
  connectRate: string;
  qualificationRate: string;
  avgDurationSeconds: number;
}

export const DEMO_AGENT_PERFORMANCE: readonly AgentPerformanceRow[] = [
  { agentName: 'Maya', calls: 1042, connectRate: '84.5%', qualificationRate: '27.4%', avgDurationSeconds: 272 },
] as const;
