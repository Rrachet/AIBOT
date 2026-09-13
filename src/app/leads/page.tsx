import { SectionPage } from '@/components/section-page';

const rows = [
  ['Rahul Sharma','Acme Technologies','+91 98765 43210','Qualified','2 min ago'],
  ['Priya Mehta','Northstar Labs','+91 98450 11220','No answer','8 min ago'],
  ['Arjun Kapoor','Orbit Systems','+91 99880 22110','Follow-up','14 min ago'],
  ['Sneha Rao','Vertex Digital','+91 99001 88442','New','21 min ago'],
];
export default function LeadsPage() { return <SectionPage active="Leads" eyebrow="Pipeline" title="Leads" subtitle="Manage the people AIBOT should call." action="Add lead"><div className="card table-card"><div className="card-head"><div><div className="card-title">All leads</div><div className="card-subtitle">1,284 leads in this workspace</div></div><button className="secondary-button">Import CSV</button></div><table className="table"><thead><tr><th>Lead</th><th>Phone</th><th>Status</th><th>Updated</th></tr></thead><tbody>{rows.map(r=><tr key={r[0]}><td><div className="lead-name"><div className="lead-avatar">{r[0].split(' ').map(x=>x[0]).join('')}</div><div><div>{r[0]}</div><div className="muted" style={{fontSize:10}}>{r[1]}</div></div></div></td><td className="muted">{r[2]}</td><td><span className={`badge ${r[3]==='Qualified'?'green':r[3]==='No answer'?'amber':r[3]==='Follow-up'?'purple':'gray'}`}>{r[3]}</span></td><td className="muted">{r[4]}</td></tr>)}</tbody></table></div></SectionPage>; }
