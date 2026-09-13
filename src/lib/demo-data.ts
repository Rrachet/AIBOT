import type { CallOutcome, CallStatus, LeadStatus, LeadSource } from '@/domain/types';
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
 * Phase 3 (Supabase) replaces every import of this module with a real,
 * workspace-scoped query. When that lands, DELETE THIS FILE — a passing
 * type-check afterwards proves no view still depends on sample data.
 *
 * The shapes below intentionally mirror `src/domain/types.ts` so swapping in
 * real rows is a change of source, not a rewrite of the views.
 * ============================================================================
 */

/** Rendered in the topbar so sample data is never mistaken for live data. */
export const IS_SAMPLE_DATA = true;

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

export const TOTAL_LEADS = 1284;

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
/* Calls                                                                      */
/* -------------------------------------------------------------------------- */

export interface DemoCall {
  id: string;
  leadName: string;
  leadCompany: string;
  agentName: string;
  timeLabel: string;
  durationSeconds: number;
  status: CallStatus;
  outcome: CallOutcome | null;
}

export const DEMO_CALLS: readonly DemoCall[] = [
  {
    id: 'cl_01',
    leadName: 'Rahul Sharma',
    leadCompany: 'Acme Technologies',
    agentName: 'Maya',
    timeLabel: 'Today, 2:18 PM',
    durationSeconds: 272,
    status: 'COMPLETED',
    outcome: 'QUALIFIED',
  },
  {
    id: 'cl_02',
    leadName: 'Karan Malhotra',
    leadCompany: 'Bluepeak Retail',
    agentName: 'Maya',
    timeLabel: 'Today, 2:14 PM',
    durationSeconds: 96,
    status: 'IN_PROGRESS',
    outcome: null,
  },
  {
    id: 'cl_03',
    leadName: 'Priya Mehta',
    leadCompany: 'Northstar Labs',
    agentName: 'Maya',
    timeLabel: 'Today, 2:06 PM',
    durationSeconds: 0,
    status: 'NO_ANSWER',
    outcome: 'NO_ANSWER',
  },
  {
    id: 'cl_04',
    leadName: 'Arjun Kapoor',
    leadCompany: 'Orbit Systems',
    agentName: 'Maya',
    timeLabel: 'Today, 1:52 PM',
    durationSeconds: 188,
    status: 'COMPLETED',
    outcome: 'FOLLOW_UP',
  },
  {
    id: 'cl_05',
    leadName: 'Sneha Rao',
    leadCompany: 'Vertex Digital',
    agentName: 'Maya',
    timeLabel: 'Today, 1:37 PM',
    durationSeconds: 141,
    status: 'COMPLETED',
    outcome: 'NOT_INTERESTED',
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
