import type { ReactNode } from 'react';
import { AppShell } from './app-shell';
import { Icon } from './icons';

export function SectionPage({ active, title, eyebrow, subtitle, action, children }: { active:string; title:string; eyebrow:string; subtitle:string; action?:string; children?:ReactNode }) {
  return <AppShell active={active}><main className="content"><section className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{action && <button className="primary-button"><Icon name="plus" size={15}/>{action}</button>}</section>{children ?? <div className="card"><div className="empty"><div className="empty-icon"><Icon name="grid" size={20}/></div><strong>{title} is ready for your data</strong><span>We’ll connect this view to Supabase after the product UI is finalized.</span></div></div>}</main></AppShell>;
}
