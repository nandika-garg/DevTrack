import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const API_BASE = '/api';
const USER_ID = 2; // Keep the existing demo profile selection; replace with authenticated user context when available.
const PLATFORMS = {
  leetcode: { name: 'LeetCode', short: 'LC', color: '#f5a623', placeholder: 'LeetCode username', url: (h) => `https://leetcode.com/${encodeURIComponent(h)}/`, reliable: true },
  codeforces: { name: 'Codeforces', short: 'CF', color: '#67a9ff', placeholder: 'Codeforces handle', url: (h) => `https://codeforces.com/profile/${encodeURIComponent(h)}`, reliable: true },
  codechef: { name: 'CodeChef', short: 'CC', color: '#c6a27b', placeholder: 'CodeChef handle', reliable: false },
  atcoder: { name: 'AtCoder', short: 'AC', color: '#9da9bc', placeholder: 'AtCoder handle', reliable: false },
  gfg: { name: 'GeeksforGeeks', short: 'GfG', color: '#46c99a', placeholder: 'GeeksforGeeks username', reliable: false },
};
const number = (n) => Number.isFinite(Number(n)) ? Number(n) : 0;
const fmt = (n) => number(n).toLocaleString('en-IN');
const dateLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' });

export default function App() {
  const [profile, setProfile] = useState(null);
  const [platformData, setPlatformData] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [platform, setPlatform] = useState('leetcode');
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeNav, setActiveNav] = useState('Overview');

  const loadProfile = useCallback(async (manual = false) => {
    try {
      manual ? setSyncing(true) : setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/profile/${USER_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load profile');
      setProfile(data);
      const results = await Promise.all((data.accounts || []).map(async (account) => {
        const config = PLATFORMS[account.platform];
        if (!config?.reliable) return [account.platform, { platform: account.platform, username: account.handle, unavailable: true, error: 'Reliable public profile/history integration is not configured for this platform.' }];
        try {
          const response = await fetch(`${API_BASE}/${account.platform}/${encodeURIComponent(account.handle)}`);
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Could not fetch platform data');
          return [account.platform, { ...payload, lastSyncedAt: new Date().toISOString() }];
        } catch (err) { return [account.platform, { platform: account.platform, username: account.handle, error: err.message }]; }
      }));
      setPlatformData(Object.fromEntries(results));
    } catch (err) { setError(err.message || 'Something went wrong loading the profile.'); }
    finally { setLoading(false); setSyncing(false); }
  }, []);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function addAccount(e) {
    e.preventDefault(); if (!handle.trim()) return;
    try {
      setSaving(true); setError('');
      const res = await fetch(`${API_BASE}/accounts/${USER_ID}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform, handle: handle.trim() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not link platform');
      setHandle(''); setShowAdd(false); await loadProfile(true);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  const analytics = useMemo(() => {
    const connected = Object.entries(platformData).filter(([, d]) => !d.error);
    const problems = connected.flatMap(([key, d]) => (d.recentProblems || []).map((p) => ({ ...p, platform: p.platform || key, tags: p.tags || [] })));
    const unique = new Map();
    problems.forEach((p) => { if (p.problemId) { const k = `${p.platform}:${p.problemId}`; if (!unique.has(k) || number(p.timestamp) > number(unique.get(k).timestamp)) unique.set(k, p); } });
    const imported = [...unique.values()];
    const totals = connected.reduce((acc, [key, d]) => {
      if (key === 'leetcode') acc.reported += number(d.totals?.all);
      if (key === 'codeforces') acc.reported += number(d.stats?.distinctSolvedInFetchedSubmissions);
      if (key === 'leetcode') { acc.easy += number(d.totals?.easy); acc.medium += number(d.totals?.medium); acc.hard += number(d.totals?.hard); }
      return acc;
    }, { reported: 0, easy: 0, medium: 0, hard: 0 });
    const topicMap = new Map(), langMap = new Map(), activityMap = new Map();
    imported.forEach((p) => {
      p.tags.forEach((tag) => topicMap.set(tag, (topicMap.get(tag) || 0) + 1));
      if (p.language) langMap.set(p.language, (langMap.get(p.language) || 0) + 1);
      if (number(p.timestamp) > 0) { const day = new Date(number(p.timestamp)).toISOString().slice(0, 10); activityMap.set(day, (activityMap.get(day) || 0) + 1); }
    });
    const activity = [...activityMap].map(([date, count]) => ({ date, count }));
    const sortedDays = activity.map((a) => a.date).sort();
    let currentStreak = 0, longestStreak = 0, run = 0, previous = null;
    if (sortedDays.length) {
      const today = new Date(); today.setHours(0,0,0,0); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
      const latest = new Date(`${sortedDays.at(-1)}T00:00:00`); const start = latest.toDateString() === today.toDateString() ? today : yesterday;
      if (latest.toDateString() === start.toDateString()) { currentStreak = 1; const cur = new Date(start); while (true) { cur.setDate(cur.getDate()-1); if (!activityMap.has(cur.toISOString().slice(0,10))) break; currentStreak++; } }
      sortedDays.forEach((d) => { const current = new Date(`${d}T00:00:00`); run = previous && Math.round((current-previous)/86400000) === 1 ? run+1 : 1; longestStreak = Math.max(longestStreak, run); previous = current; });
    }
    const xp = imported.reduce((sum,p) => sum + ({ Easy:1, Medium:3, Hard:6 }[p.difficulty] || 0), 0);
    const monthMap = new Map(); activity.forEach(({date,count}) => { const m=date.slice(0,7); monthMap.set(m,(monthMap.get(m)||0)+count); });
    const languageData = [...langMap].map(([name,value]) => ({name,value})).sort((a,b)=>b.value-a.value).slice(0,6);
    const topicData = [...topicMap].map(([topic,solved])=>({topic,solved})).sort((a,b)=>b.solved-a.solved).slice(0,8);
    const radarData = topicData.slice(0,6).map((t)=>({ topic:t.topic, mastery:Math.min(100,Math.round(t.solved/Math.max(1,topicData[0]?.solved||1)*100)) }));
    const difficultyData = [{name:'Easy',value:totals.easy},{name:'Medium',value:totals.medium},{name:'Hard',value:totals.hard}];
    return { connected, imported, totals, activity, currentStreak, longestStreak, activeDays: activityMap.size, xp, level:Math.floor(xp/100)+1, xpProgress:xp%100, months:[...monthMap].map(([month,solved])=>({month:month.slice(5),solved})).slice(-12), topicData, radarData, difficultyData, languageData };
  }, [platformData]);

  if (loading) return <div className="loading-screen"><div className="loader-mark">⌘</div><div className="loading-title">Building your profile</div><div className="loading-subtitle">Syncing platform snapshots…</div><div className="skeleton-line"/><div className="skeleton-line short"/></div>;
  const accounts = profile?.accounts || [];
  const lastSync = Object.values(platformData).map((d) => d.lastSyncedAt).filter(Boolean).sort().at(-1);
  const recent = [...analytics.imported].sort((a,b)=>number(b.timestamp)-number(a.timestamp)).slice(0,6);
  const weakest = [...analytics.topicData].sort((a,b)=>a.solved-b.solved).slice(0,3);
  const heat = buildHeatmap(analytics.activity);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon">⌘</div><div><strong>devtrack<span>.</span></strong><small>DSA ANALYTICS</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      {['Overview','Problem history','Topic mastery','Contests'].map((item,i)=><button key={item} className={`nav-item ${activeNav===item?'active':''}`} onClick={()=>{setActiveNav(item); if(item!=='Overview') document.getElementById(item==='Problem history'?'activity':item==='Topic mastery'?'topics':'contests')?.scrollIntoView({behavior:'smooth'});}}><span className="nav-icon">{['◫','◷','⌁','↗'][i]}</span>{item}{item==='Overview'&&<span className="nav-dot"/>}</button>)}
      <div className="sidebar-bottom"><div className="sync-indicator"><span className="status-dot"/><span>Platform sync active</span></div><div className="sidebar-note">Your progress, in one place.</div><div className="sidebar-version">UNIVERSAL DSA DASHBOARD <span>v1.0</span></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{activeNav}</b></div><div className="top-actions"><span className="top-live"><i/> Live profile</span><button className="icon-button" aria-label="Refresh profile" onClick={()=>loadProfile(true)} disabled={syncing}>↻</button><div className="avatar">{(profile?.user?.display_name||'D').slice(0,1).toUpperCase()}</div></div></header>
      <div className="page-wrap">
        <section className="profile-heading"><div className="profile-ident"><div className="profile-avatar">{(profile?.user?.display_name||'D').slice(0,1).toUpperCase()}<span className="avatar-presence"/></div><div><div className="eyebrow">YOUR DEVELOPER PROFILE <span className="eyebrow-line"/></div><h1>{profile?.user?.display_name || 'Your DSA profile'}</h1><div className="handle-row">{accounts.length ? accounts.map((a)=><a key={a.id} className="platform-chip" href={PLATFORMS[a.platform]?.url?.(a.handle)||'#'} target="_blank" rel="noreferrer"><span style={{background:PLATFORMS[a.platform]?.color||'#8290a5'}}/>{PLATFORMS[a.platform]?.short||a.platform} <b>{a.handle}</b> ↗</a>) : <span className="muted">No platforms linked yet</span>}<button className="add-chip" onClick={()=>setShowAdd(!showAdd)}>+ Link platform</button></div></div></div><div className="profile-actions"><div className="sync-time"><span className="tiny-clock">◷</span><span>{lastSync ? `Synced ${new Date(lastSync).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : 'Not synced yet'}</span></div><button className="primary-button" onClick={()=>loadProfile(true)} disabled={syncing}><span className={syncing?'spin':''}>↻</span>{syncing?'Syncing…':'Sync profile'}</button></div></section>
        {showAdd&&<form className="connect-panel" onSubmit={addAccount}><div><strong>Connect a platform</strong><p>Use a public username or handle. Never enter a password or session cookie.</p></div><select aria-label="Platform" value={platform} onChange={e=>setPlatform(e.target.value)}>{Object.entries(PLATFORMS).map(([key,p])=><option key={key} value={key}>{p.name}{!p.reliable?' · status only':''}</option>)}</select><input aria-label="Username or handle" value={handle} onChange={e=>setHandle(e.target.value)} placeholder={PLATFORMS[platform].placeholder} required/><button className="primary-button" disabled={saving}>{saving?'Saving…':'Connect'}</button></form>}
        {error&&<div className="error-banner" role="alert"><span>!</span><div><b>Could not refresh profile</b><p>{error}</p></div><button onClick={()=>loadProfile(true)}>Try again</button></div>}
        <section className="hero-grid">
          <div className="score-card"><div className="score-card-top"><div><div className="section-kicker">DSA EXPERIENCE SCORE <span className="info-dot" title="XP = Easy × 1 + Medium × 3 + Hard × 6 for imported problems with known difficulty.">i</span></div><div className="score-caption">A weighted view of your practice</div></div><div className="score-pill"><span/> LEVEL {analytics.level}</div></div><div className="score-main"><div><div className="score-number">{fmt(analytics.xp)}<span> XP</span></div><div className="score-sub">{fmt(100-analytics.xpProgress)} XP to level {analytics.level+1}</div></div><div className="score-ring"><svg viewBox="0 0 100 100" aria-label={`${analytics.xpProgress}% to next level`}><circle className="ring-track" cx="50" cy="50" r="41"/><circle className="ring-value" cx="50" cy="50" r="41" strokeDasharray={`${analytics.xpProgress/100*257.6} 257.6`}/></svg><div><b>{analytics.xpProgress}%</b><span>TO NEXT</span></div></div></div><div className="xp-progress"><div style={{width:`${analytics.xpProgress}%`}}/></div><div className="xp-legend"><span><i className="easy-dot"/>Easy <b>1 XP</b></span><span><i className="medium-dot"/>Medium <b>3 XP</b></span><span><i className="hard-dot"/>Hard <b>6 XP</b></span></div><div className="score-footnote">Based on imported problems with known difficulty. Partial histories and missing metadata make this a practice indicator, not a standardized skill rating.</div></div>
          <div className="streak-card"><div className="section-kicker">CONSISTENCY <span className="spark-icon">✳</span></div><div className="streak-main"><div><div className="streak-value">{analytics.currentStreak}<span> days</span></div><div className="score-caption">Current streak</div></div><div className="flame">♨</div></div><div className="streak-divider"/><div className="streak-stats"><div><span className="muted">Longest streak</span><b>{analytics.longestStreak} <small>days</small></b></div><div><span className="muted">Active days</span><b>{fmt(analytics.activeDays)}</b></div></div><div className="streak-bottom"><span className="status-dot"/>Keep the streak alive. One problem counts.</div></div>
        </section>
        <section className="metric-grid"><Metric label="PLATFORM-REPORTED SOLVES" value={fmt(analytics.totals.reported)} detail="Sum of available platform totals" icon="▤"/><Metric label="IMPORTED PROBLEMS" value={fmt(analytics.imported.length)} detail="Individual records in fetched history" icon="⌘"/><Metric label="LINKED PLATFORMS" value={`${accounts.length}/5`} detail={`${analytics.connected.length} responding successfully`} icon="◎"/><Metric label="RECENT ACTIVITY" value={analytics.activity.length?dateLabel([...analytics.activity].sort((a,b)=>b.date.localeCompare(a.date))[0].date):'—'} detail="Latest imported solve date" icon="◷"/></section>
        <section className="section-block" id="activity"><div className="section-heading"><div><div className="section-kicker">PRACTICE HISTORY</div><h2>Every day compounds.</h2><p>Your imported solve activity over the last 12 months.</p></div><div className="heat-legend"><span>Less</span>{[0,1,2,3,4].map(n=><i key={n} className={`heat-cell heat-${n}`}/>)}<span>More</span></div></div><div className="panel heatmap-panel"><div className="heatmap-months">{heat.months.map((m)=><span key={m.label} style={{gridColumn:m.col}}>{m.label}</span>)}</div><div className="heatmap-body"><div className="heatmap-weekdays"><span>Mon</span><span/><span>Wed</span><span/><span>Fri</span><span/><span/></div><div className="heatmap-grid">{heat.cells.map((c,i)=><div key={i} className={`heat-cell heat-${c.level} ${c.future?'future':''}`} title={`${c.date}: ${c.count} imported solve${c.count===1?'':'s'}`}/>)}</div></div><div className="heatmap-footer"><span>{fmt(analytics.activity.reduce((s,a)=>s+a.count,0))} imported solves on {analytics.activeDays} active days</span><span>Only dates exposed by connected platforms are shown</span></div></div></section>
        <section className="chart-grid" id="topics"><div className="panel chart-panel"><div className="panel-heading"><div><h3>Monthly momentum</h3><p>Imported solves by month</p></div><span className="chart-icon">⌁</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.months} margin={{top:10,right:8,left:-22,bottom:0}}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b7cff" stopOpacity={0.28}/><stop offset="100%" stopColor="#8b7cff" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#252b39" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="month" tick={{fill:'#788397',fontSize:11}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fill:'#788397',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#141925',border:'1px solid #30384a',borderRadius:10,color:'#f3f5fb'}}/><Area type="monotone" dataKey="solved" name="Imported solves" stroke="#9b8cff" strokeWidth={2.5} fill="url(#activityFill)" activeDot={{r:4,fill:'#b4a8ff',stroke:'#141925',strokeWidth:2}}/></AreaChart></ResponsiveContainer></div></div>
          <div className="panel chart-panel"><div className="panel-heading"><div><h3>Difficulty mix</h3><p>Platform-reported LeetCode breakdown</p></div><span className="chart-icon">◉</span></div><div className="difficulty-content"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.difficultyData} dataKey="value" nameKey="name" innerRadius="67%" outerRadius="88%" paddingAngle={4} stroke="none">{analytics.difficultyData.map((entry,i)=><Cell key={entry.name} fill={['#46c99a','#8b7cff','#ff748b'][i]}/>)}</Pie><Tooltip contentStyle={{background:'#141925',border:'1px solid #30384a',borderRadius:10}}/></PieChart></ResponsiveContainer><div className="donut-center"><b>{fmt(analytics.totals.easy+analytics.totals.medium+analytics.totals.hard)}</b><span>solves</span></div></div><div className="difficulty-legend">{analytics.difficultyData.map((d,i)=><div key={d.name}><span><i style={{background:['#46c99a','#8b7cff','#ff748b'][i]}}/>{d.name}</span><b>{fmt(d.value)}</b></div>)}</div></div><div className="chart-note">Other platform difficulty labels are not converted unless they use the same scale.</div></div></section>
        <section className="chart-grid secondary-charts"><div className="panel chart-panel"><div className="panel-heading"><div><h3>Topic coverage</h3><p>Based on tags returned with imported problems</p></div><span className="chart-icon">⌘</span></div>{analytics.radarData.length?<div className="radar-wrap"><ResponsiveContainer width="100%" height="100%"><RadarChart data={analytics.radarData} outerRadius="72%"><PolarGrid stroke="#303747"/><PolarAngleAxis dataKey="topic" tick={{fill:'#9ba5b8',fontSize:10}}/><PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/><Radar dataKey="mastery" name="Relative coverage" stroke="#8b7cff" fill="#8b7cff" fillOpacity={0.2} strokeWidth={2}/><Tooltip contentStyle={{background:'#141925',border:'1px solid #30384a',borderRadius:10}}/></RadarChart></ResponsiveContainer></div>:<EmptyChart text="Topic tags will appear as problem metadata becomes available."/>}<div className="topic-list">{analytics.topicData.slice(0,4).map((t,i)=><div key={t.topic}><span className="topic-rank">0{i+1}</span><span className="topic-name">{t.topic}</span><div className="mini-bar"><i style={{width:`${Math.min(100,t.solved/Math.max(1,analytics.topicData[0]?.solved||1)*100)}%`}}/></div><b>{t.solved}</b></div>)}</div></div>
          <div className="panel chart-panel"><div className="panel-heading"><div><h3>Languages used</h3><p>From platforms that expose submission language</p></div><span className="chart-icon">{`</>`}</span></div>{analytics.languageData.length?<div className="language-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.languageData} layout="vertical" margin={{top:4,right:14,left:8,bottom:4}}><CartesianGrid stroke="#252b39" strokeDasharray="3 5" horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={90} tick={{fill:'#9ba5b8',fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#141925',border:'1px solid #30384a',borderRadius:10}}/><Bar dataKey="value" name="Imported submissions" fill="#57c9d8" radius={[0,5,5,0]} barSize={15}/></BarChart></ResponsiveContainer></div>:<EmptyChart text="Language metadata is not available in the current public submission feeds."/>}<div className="language-footnote">Language chart reflects imported submissions, not all historical coding activity.</div></div></section>
        <section className="bottom-grid" id="contests"><div className="panel platform-panel"><div className="panel-heading"><div><h3>Platform pulse</h3><p>Independent stats, never merged rating scales</p></div><button className="text-button" onClick={()=>setShowAdd(true)}>+ Add</button></div><div className="platform-table">{Object.entries(PLATFORMS).map(([key,p])=>{const account=accounts.find(a=>a.platform===key);const d=platformData[key];const rating=key==='codeforces'?d?.stats?.rating:key==='leetcode'?null:d?.stats?.rating;const total=key==='leetcode'?d?.totals?.all:key==='codeforces'?d?.stats?.distinctSolvedInFetchedSubmissions:d?.stats?.totalSolved;return <div className="platform-row" key={key}><div className="platform-symbol" style={{color:p.color,borderColor:`${p.color}55`}}>{p.short}</div><div className="platform-name-cell"><b>{p.name}</b><span>{account?account.handle:'Not linked'}</span></div><div className="platform-stat"><b>{rating!=null?fmt(rating):'—'}</b><span>{key==='codeforces'?'Rating': 'Rating'}</span></div><div className="platform-stat"><b>{total!=null?fmt(total):'—'}</b><span>{key==='codeforces'?'Fetched solves':'Reported solves'}</span></div><div className="platform-status"><i className={d?.error?'status-error':d?'status-dot':account?'status-wait':'status-off'}/><span>{!account?'Not linked':d?.error?(d.unavailable?'Unavailable':'Sync error'):d?'Synced':'Pending'}</span></div></div>})}</div><div className="platform-footnote">Codeforces rating is a separate rating system. Codeforces solve count covers the latest 10,000 submissions fetched, not a guaranteed lifetime total. Unsupported platforms are shown honestly.</div></div>
          <div className="panel recent-panel"><div className="panel-heading"><div><h3>Recently solved</h3><p>Latest imported accepted problems</p></div><span className="recent-count">{recent.length} shown</span></div>{recent.length?<div className="recent-list">{recent.map((p,i)=><div className="recent-row" key={`${p.platform}:${p.problemId}`}><div className="recent-index">{String(i+1).padStart(2,'0')}</div><div className="recent-problem"><b>{p.title||p.problemId}</b><span>{PLATFORMS[p.platform]?.name||p.platform} {p.timestamp?`· ${new Date(number(p.timestamp)).toLocaleDateString()}`:''}</span></div><span className={`difficulty-tag ${(p.difficulty||'unknown').toLowerCase()}`}>{p.difficulty||'Unrated'}</span>{p.url&&<a href={p.url} target="_blank" rel="noreferrer" aria-label={`Open ${p.title}`} className="open-problem">↗</a>}</div> )}</div>:<EmptyChart text="No recent problems were returned. Sync a linked account to populate your history."/>}<div className="recent-footer">{analytics.imported.length?`Showing ${Math.min(6,analytics.imported.length)} of ${analytics.imported.length} imported problem records`:'Waiting for platform data'}</div></div></section>
        <section className="improve-panel"><div className="improve-intro"><div className="improve-icon">✳</div><div><div className="section-kicker">YOUR NEXT MILESTONE</div><h2>Turn weak spots into strengths.</h2><p>Small, consistent sessions beat occasional marathons.</p></div></div><div className="improve-content"><div className="weak-topics"><h4>Topics to revisit</h4>{weakest.length?weakest.map(t=><div className="weak-topic" key={t.topic}><span>{t.topic}</span><span className="weak-tag">Lower coverage</span></div>):<p className="muted">Connect a platform that returns topic tags to identify weak spots.</p>}</div><div className="weekly-goal"><div className="goal-icon">◷</div><div><h4>Weekly practice goal</h4><p>Start with <b>5 problems / week</b>: 2 Easy, 2 Medium, 1 Hard. Adjust after two weeks based on your schedule.</p><div className="goal-track"><span/></div><small>Suggested target · Not a measured completion counter</small></div></div><div className="problem-picks"><h4>Try these next</h4><a href="https://leetcode.com/problems/valid-parentheses/" target="_blank" rel="noreferrer"><span className="pick-difficulty easy">E</span><span><b>Valid Parentheses</b><small>Stack · Fundamentals</small></span><span className="pick-arrow">↗</span></a><a href="https://leetcode.com/problems/number-of-islands/" target="_blank" rel="noreferrer"><span className="pick-difficulty medium">M</span><span><b>Number of Islands</b><small>Graph traversal · BFS/DFS</small></span><span className="pick-arrow">↗</span></a><a href="https://leetcode.com/problems/coin-change/" target="_blank" rel="noreferrer"><span className="pick-difficulty medium">M</span><span><b>Coin Change</b><small>Dynamic programming</small></span><span className="pick-arrow">↗</span></a></div></div></section>
        <footer className="page-footer"><span>devtrack<span className="brand-period">.</span> <span>Universal DSA analytics</span></span><span>Numbers reflect available public data, not a complete cross-platform record.</span></footer>
      </div>
    </main>
  </div>;
}

function Metric({label,value,detail,icon}) { return <div className="metric-card"><div className="metric-top"><span>{label}</span><i>{icon}</i></div><b>{value}</b><p>{detail}</p></div>; }
function EmptyChart({text}) { return <div className="empty-chart"><span>⌁</span><p>{text}</p></div>; }
function buildHeatmap(activity) {
  const counts = new Map(activity.map(a=>[a.date,a.count]));
  const end = new Date(); end.setHours(0,0,0,0); const start = new Date(end); start.setDate(start.getDate()-363); start.setDate(start.getDate()-((start.getDay()+6)%7));
  const cells=[]; const months=[]; let priorMonth=-1;
  for(let i=0;i<371;i++){ const d=new Date(start); d.setDate(start.getDate()+i); const date=d.toISOString().slice(0,10); const count=counts.get(date)||0; const level=count===0?0:count===1?1:count<=3?2:count<=6?3:4; cells.push({date,count,level,future:d>end}); if(d.getMonth()!==priorMonth){months.push({label:d.toLocaleDateString('en',{month:'short'}),col:Math.floor(i/7)+1});priorMonth=d.getMonth();} }
  return {cells,months};
}
