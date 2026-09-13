import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { Icon } from '@/components/icons';

const leads = [
  { name: 'Rahul Sharma', company: 'Acme Technologies', status: 'Qualified', tone: 'green', time: '2 min ago', initials: 'RS' },
  { name: 'Priya Mehta', company: 'Northstar Labs', status: 'No answer', tone: 'amber', time: '8 min ago', initials: 'PM' },
  { name: 'Arjun Kapoor', company: 'Orbit Systems', status: 'Follow-up', tone: 'purple', time: '14 min ago', initials: 'AK' },
  { name: 'Sneha Rao', company: 'Vertex Digital', status: 'Not interested', tone: 'red', time: '21 min ago', initials: 'SR' },
];

export default function HomePage() {
  return <AppShell active="Overview">
    <main className="content">
      <section className="page-head">
        <div><div className="eyebrow">Command center</div><h1>Good afternoon, Amar.</h1><p className="subtitle">Here’s what’s happening with your leads today.</p></div>
        <Link className="primary-button" href="/leads"><Icon name="plus" size={15}/> Add leads</Link>
      </section>
      <section className="stat-grid">
        <Stat label="Total leads" value="1,284" meta="+18.4% this month" up icon="users" />
        <Stat label="Calls today" value="84" meta="71 connected · 13 missed" icon="phone" />
        <Stat label="Qualified leads" value="23" meta="27.4% of answered calls" up icon="chart" />
        <Stat label="Appointments" value="9" meta="4 booked today" up icon="calendar" />
      </section>
      <section className="grid-2">
        <div className="card table-card">
          <div className="card-head"><div><div className="card-title">Recent leads</div><div className="card-subtitle">The latest activity across your lead pipeline</div></div><Link href="/leads" className="card-link">View all</Link></div>
          <table className="table"><thead><tr><th>Lead</th><th>Status</th><th>Updated</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.name}><td><div className="lead-name"><div className="lead-avatar">{lead.initials}</div><div><div>{lead.name}</div><div className="muted" style={{fontSize:10,marginTop:2}}>{lead.company}</div></div></div></td><td><span className={`badge ${lead.tone}`}>{lead.status}</span></td><td className="muted">{lead.time}</td></tr>)}</tbody></table>
        </div>
        <div className="card">
          <div className="card-head"><div><div className="card-title">Live activity</div><div className="card-subtitle">Latest events from your workspace</div></div><span className="badge green">Live</span></div>
          <div className="activity">
            <Activity icon="phone" title="Call completed" detail="Rahul Sharma was qualified by Maya." time="2m" />
            <Activity icon="message" title="WhatsApp pending" detail="Priya Mehta did not answer the first call." time="8m" />
            <Activity icon="phone" title="Call connected" detail="Arjun Kapoor is speaking with Maya." time="14m" />
            <Activity icon="users" title="Lead imported" detail="42 new leads added from CSV." time="31m" />
          </div>
        </div>
      </section>
      <section className="quick">
        <Quick href="/leads" icon="upload" title="Import a lead list" text="Upload CSV or Excel and map your columns." />
        <Quick href="/agents" icon="bot" title="Create an AI agent" text="Give your agent a goal, context and tone." />
        <Quick href="/campaigns" icon="megaphone" title="Start a campaign" text="Choose leads and send your first calls." />
      </section>
    </main>
  </AppShell>;
}
function Stat({ label, value, meta, up, icon }: { label:string; value:string; meta:string; up?:boolean; icon:string }) { return <div className="card stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon name={icon} size={15}/></span></div><div className="stat-value">{value}</div><div className={`stat-meta ${up ? 'up' : ''}`}>{up ? '↗ ' : ''}{meta}</div></div>; }
function Activity({ icon, title, detail, time }: {icon:string; title:string; detail:string; time:string}) { return <div className="activity-item"><div className="activity-dot"><Icon name={icon} size={14}/></div><div className="activity-copy"><strong>{title}</strong><span>{detail}</span></div><div className="activity-time">{time}</div></div>; }
function Quick({ href, icon, title, text }: {href:string; icon:string; title:string; text:string}) { return <Link href={href} className="card quick-card"><div className="quick-icon"><Icon name={icon} size={17}/></div><div><strong>{title}</strong><span>{text}</span></div><span style={{marginLeft:'auto',color:'var(--muted-2)'}}><Icon name="arrow" size={15}/></span></Link>; }
