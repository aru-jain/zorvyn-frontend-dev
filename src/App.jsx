import { useState, useMemo, createContext, useContext, useCallback, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = { ADMIN: "admin", VIEWER: "viewer" };
const CATEGORIES = ["Food","Housing","Transport","Health","Shopping","Entertainment","Salary","Freelance","Investment"];
const TYPES = ["income","expense"];
const PIE_COLORS = ["#e76f51","#f4a261","#e9c46a","#2a9d8f","#264653","#8ecae6","#219ebc","#ffb703"];
const CAT_ICONS  = { Food:"🍜",Housing:"🏠",Transport:"🚗",Health:"💊",Shopping:"🛍️",Entertainment:"🎬",Salary:"💼",Freelance:"💻",Investment:"📈" };
const LS = { TXS:"ft_txs", THEME:"ft_theme", ROLE:"ft_role" };

// ─── Seed ─────────────────────────────────────────────────────────────────────

const SEED = [
  {id:1, date:"2025-01-05",amount:4800,category:"Salary",       type:"income", note:"Monthly salary"},
  {id:2, date:"2025-01-08",amount:1200,category:"Housing",      type:"expense",note:"Rent payment"},
  {id:3, date:"2025-01-12",amount:340, category:"Food",         type:"expense",note:"Groceries"},
  {id:4, date:"2025-01-15",amount:650, category:"Freelance",    type:"income", note:"Design project"},
  {id:5, date:"2025-01-18",amount:89,  category:"Transport",    type:"expense",note:"Fuel"},
  {id:6, date:"2025-01-22",amount:210, category:"Shopping",     type:"expense",note:"Clothing"},
  {id:7, date:"2025-01-28",amount:55,  category:"Entertainment",type:"expense",note:"Streaming services"},
  {id:8, date:"2025-02-05",amount:4800,category:"Salary",       type:"income", note:"Monthly salary"},
  {id:9, date:"2025-02-09",amount:1200,category:"Housing",      type:"expense",note:"Rent payment"},
  {id:10,date:"2025-02-13",amount:290, category:"Food",         type:"expense",note:"Groceries"},
  {id:11,date:"2025-02-16",amount:420, category:"Investment",   type:"income", note:"Dividend"},
  {id:12,date:"2025-02-20",amount:145, category:"Health",       type:"expense",note:"Gym membership"},
  {id:13,date:"2025-02-24",amount:320, category:"Shopping",     type:"expense",note:"Electronics"},
  {id:14,date:"2025-03-05",amount:4800,category:"Salary",       type:"income", note:"Monthly salary"},
  {id:15,date:"2025-03-07",amount:1200,category:"Housing",      type:"expense",note:"Rent payment"},
  {id:16,date:"2025-03-10",amount:410, category:"Food",         type:"expense",note:"Dining & groceries"},
  {id:17,date:"2025-03-14",amount:800, category:"Freelance",    type:"income", note:"Web project"},
  {id:18,date:"2025-03-19",amount:230, category:"Transport",    type:"expense",note:"Monthly pass + fuel"},
  {id:19,date:"2025-03-25",amount:170, category:"Entertainment",type:"expense",note:"Concert tickets"},
  {id:20,date:"2025-03-29",amount:95,  category:"Health",       type:"expense",note:"Pharmacy"},
  {id:21,date:"2025-04-05",amount:5200,category:"Salary",       type:"income", note:"Salary + bonus"},
  {id:22,date:"2025-04-08",amount:1200,category:"Housing",      type:"expense",note:"Rent payment"},
  {id:23,date:"2025-04-12",amount:375, category:"Food",         type:"expense",note:"Groceries"},
  {id:24,date:"2025-04-18",amount:550, category:"Investment",   type:"income", note:"ETF gains"},
  {id:25,date:"2025-04-21",amount:280, category:"Shopping",     type:"expense",note:"Home decor"},
];

// ─── Mock API ─────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));
const mockApi = {
  async fetchTransactions() {
    await sleep(800);
    try { const s=localStorage.getItem(LS.TXS); return s?JSON.parse(s):SEED; } catch { return SEED; }
  },
  async saveTransaction(tx) {
    await sleep(380);
    if (Math.random() < 0.04) throw new Error("Network error — please retry");
    return { ...tx, synced:true, id: tx.id||Date.now() };
  },
  async deleteTransaction() { await sleep(240); },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt     = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const fmtDate = d => new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});

function getMonthlyData(txs) {
  const map={};
  txs.forEach(({date,amount,type})=>{
    const k=date.slice(0,7);
    if(!map[k]) map[k]={month:k,income:0,expense:0,balance:0};
    type==="income"?map[k].income+=amount:map[k].expense+=amount;
  });
  return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month)).map((m,i,arr)=>{
    m.balance=(i>0?arr[i-1].balance:0)+m.income-m.expense;
    m.label=new Date(m.month+"-01").toLocaleString("en-IN",{month:"short",year:"2-digit"});
    return m;
  });
}
function getCategoryData(txs) {
  const map={};
  txs.filter(t=>t.type==="expense").forEach(({category,amount})=>{map[category]=(map[category]||0)+amount;});
  return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
}
function exportCSV(txs) {
  const rows=["ID,Date,Note,Category,Type,Amount",...txs.map(t=>`${t.id},${t.date},"${t.note}",${t.category},${t.type},${t.amount}`)];
  Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([rows.join("\n")],{type:"text/csv"})),download:`fintrack_${Date.now()}.csv`}).click();
}
function exportJSON(txs) {
  Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([JSON.stringify(txs,null,2)],{type:"application/json"})),download:`fintrack_${Date.now()}.json`}).click();
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext(null);
function AppProvider({children}) {
  const [transactions, setTxs]   = useState([]);
  const [apiStatus, setApiStatus] = useState("loading");
  const [theme, setThemeState]    = useState(()=>{ try{return localStorage.getItem(LS.THEME)||"dark";}catch{return "dark";} });
  const [role,  setRoleState]     = useState(()=>{ try{return localStorage.getItem(LS.ROLE)||ROLES.ADMIN;}catch{return ROLES.ADMIN;} });
  const [toast, setToast]         = useState(null);
  const [searchQuery,    setSQ]   = useState("");
  const [filterType,     setFT]   = useState("all");
  const [filterCategory, setFC]   = useState("all");
  const [filterMonth,    setFM]   = useState("all");
  const [filterMinAmt,   setFMin] = useState("");
  const [filterMaxAmt,   setFMax] = useState("");
  const [sortField,      setSF]   = useState("date");
  const [sortDir,        setSD]   = useState("desc");
  const [groupBy,        setGB]   = useState("none");

  const showToast = useCallback((msg,type="success")=>{ setToast({msg,type,id:Date.now()}); setTimeout(()=>setToast(null),3000); },[]);

  useEffect(()=>{
    setApiStatus("loading");
    mockApi.fetchTransactions()
      .then(d=>{ setTxs(d.map(t=>({...t,synced:true}))); setApiStatus("idle"); })
      .catch(()=>{ setTxs(SEED.map(t=>({...t,synced:true}))); setApiStatus("idle"); showToast("Using cached data","warn"); });
  },[]);

  useEffect(()=>{ if(transactions.length) try{localStorage.setItem(LS.TXS,JSON.stringify(transactions));}catch{} },[transactions]);

  const setTheme = useCallback(t=>{setThemeState(t);try{localStorage.setItem(LS.THEME,t);}catch{}},[]);
  const setRole  = useCallback(r=>{setRoleState(r); try{localStorage.setItem(LS.ROLE,r); }catch{}},[]);

  const addTransaction = useCallback(async tx=>{
    const opt={...tx,id:Date.now(),synced:false};
    setTxs(p=>[opt,...p]); setApiStatus("syncing");
    try{ const s=await mockApi.saveTransaction(opt); setTxs(p=>p.map(t=>t.id===opt.id?s:t)); setApiStatus("idle"); showToast("Transaction added ✓"); }
    catch(e){ setTxs(p=>p.map(t=>t.id===opt.id?{...t,syncError:true}:t)); setApiStatus("error"); showToast(e.message,"error"); }
  },[showToast]);

  const editTransaction = useCallback(async(id,u)=>{
    setTxs(p=>p.map(t=>t.id===id?{...t,...u,synced:false}:t)); setApiStatus("syncing");
    try{ const s=await mockApi.saveTransaction({...u,id}); setTxs(p=>p.map(t=>t.id===id?{...t,...s}:t)); setApiStatus("idle"); showToast("Saved ✓"); }
    catch(e){ setApiStatus("error"); showToast(e.message,"error"); }
  },[showToast]);

  const deleteTransaction = useCallback(async id=>{
    setTxs(p=>p.filter(t=>t.id!==id));
    try{await mockApi.deleteTransaction(id); showToast("Deleted");}catch(e){showToast(e.message,"error");}
  },[showToast]);

  const availableMonths = useMemo(()=>[...new Set(transactions.map(t=>t.date.slice(0,7)))].sort((a,b)=>b.localeCompare(a)),[transactions]);

  const filteredTransactions = useMemo(()=>{
    let l=[...transactions];
    if(filterType!=="all") l=l.filter(t=>t.type===filterType);
    if(filterCategory!=="all") l=l.filter(t=>t.category===filterCategory);
    if(filterMonth!=="all") l=l.filter(t=>t.date.startsWith(filterMonth));
    if(filterMinAmt) l=l.filter(t=>t.amount>=Number(filterMinAmt));
    if(filterMaxAmt) l=l.filter(t=>t.amount<=Number(filterMaxAmt));
    if(searchQuery){ const q=searchQuery.toLowerCase(); l=l.filter(t=>t.note.toLowerCase().includes(q)||t.category.toLowerCase().includes(q)); }
    l.sort((a,b)=>{
      let va=a[sortField],vb=b[sortField];
      if(sortField==="amount"){va=Number(va);vb=Number(vb);}
      if(sortField==="date"){va=new Date(va);vb=new Date(vb);}
      return sortDir==="asc"?(va>vb?1:-1):(va<vb?1:-1);
    });
    return l;
  },[transactions,filterType,filterCategory,filterMonth,filterMinAmt,filterMaxAmt,searchQuery,sortField,sortDir]);

  const groupedTransactions = useMemo(()=>{
    if(groupBy==="none") return null;
    const g={};
    filteredTransactions.forEach(t=>{
      const k=groupBy==="month"?t.date.slice(0,7):groupBy==="category"?t.category:t.type;
      if(!g[k]) g[k]=[];
      g[k].push(t);
    });
    return Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0]));
  },[filteredTransactions,groupBy]);

  const resetFilters = useCallback(()=>{setSQ("");setFT("all");setFC("all");setFM("all");setFMin("");setFMax("");},[]);
  const activeFilterCount = [filterType!=="all",filterCategory!=="all",filterMonth!=="all",filterMinAmt,filterMaxAmt,searchQuery].filter(Boolean).length;

  return (
    <Ctx.Provider value={{
      transactions,filteredTransactions,groupedTransactions,apiStatus,
      theme,setTheme,role,setRole,toast,
      searchQuery,setSearchQuery:setSQ,filterType,setFilterType:setFT,
      filterCategory,setFilterCategory:setFC,filterMonth,setFilterMonth:setFM,
      filterMinAmt,setFilterMinAmt:setFMin,filterMaxAmt,setFilterMaxAmt:setFMax,
      sortField,setSortField:setSF,sortDir,setSortDir:setSD,
      groupBy,setGroupBy:setGB,availableMonths,activeFilterCount,resetFilters,
      addTransaction,editTransaction,deleteTransaction,
    }}>
      {children}
    </Ctx.Provider>
  );
}
const useApp = ()=>useContext(Ctx);

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCountUp(target,duration=900){
  const [v,setV]=useState(0); const raf=useRef(null);
  useEffect(()=>{
    const s=performance.now();
    const tick=n=>{ const p=Math.min((n-s)/duration,1); setV(Math.round(target*(1-Math.pow(1-p,3)))); if(p<1) raf.current=requestAnimationFrame(tick); };
    raf.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf.current);
  },[target,duration]);
  return v;
}
function useInView(opts={}){
  const ref=useRef(null); const [inView,setInView]=useState(false);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const obs=new IntersectionObserver(([e])=>{ if(e.isIntersecting){setInView(true);obs.disconnect();} },{threshold:0.15,...opts});
    obs.observe(el); return()=>obs.disconnect();
  },[]);
  return [ref,inView];
}
function useIsMobile(){ const [m,setM]=useState(()=>window.innerWidth<=768); useEffect(()=>{ const h=()=>setM(window.innerWidth<=768); window.addEventListener("resize",h); return()=>window.removeEventListener("resize",h); },[]); return m; }

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = theme => `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root {
    ${theme==="dark"?`
    --bg:#0d0f14; --surface:#161922; --surface2:#1e2330; --surface3:#252b3b;
    --border:rgba(255,255,255,0.07); --text:#f0f2f7; --text2:#c8cdd8; --muted:#7a8399;
    --accent:#c8a96e; --accentbg:rgba(200,169,110,0.12); --accent2:#4f8ef7;
    --green:#4ade80; --red:#f87171; --warn:#fbbf24;
    --shadow:0 8px 32px rgba(0,0,0,0.45); --shadow-sm:0 2px 8px rgba(0,0,0,0.3);
    `:`
    --bg:#f4f6fb; --surface:#ffffff; --surface2:#f0f2f8; --surface3:#e4e8f2;
    --border:rgba(0,0,0,0.08); --text:#111827; --text2:#374151; --muted:#6b7280;
    --accent:#9a6f35; --accentbg:rgba(154,111,53,0.09); --accent2:#2563eb;
    --green:#16a34a; --red:#dc2626; --warn:#d97706;
    --shadow:0 8px 32px rgba(0,0,0,0.10); --shadow-sm:0 2px 8px rgba(0,0,0,0.06);
    `}
    --radius:16px; --tr:all 0.22s cubic-bezier(0.4,0,0.2,1);
  }
  html{scroll-behavior:smooth;}
  body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;transition:background 0.35s,color 0.35s;-webkit-font-smoothing:antialiased;}

  /* Layout */
  .app{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}
  .main{padding:36px 44px;overflow-y:auto;}

  /* Sidebar */
  .sidebar{background:var(--surface);border-right:1px solid var(--border);padding:28px 18px;display:flex;flex-direction:column;gap:5px;position:sticky;top:0;height:100vh;overflow-y:auto;transition:background 0.35s;z-index:20;}
  .sidebar-logo{font-family:'DM Serif Display',serif;font-size:22px;color:var(--accent);padding:0 10px 22px;border-bottom:1px solid var(--border);margin-bottom:10px;animation:fadeSlideDown 0.5s ease both;transition:color 0.3s;}
  .sidebar-logo span{color:var(--text);transition:color 0.3s;}
  .nav-item{display:flex;align-items:center;gap:11px;padding:11px 14px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;color:var(--muted);border:none;background:none;width:100%;text-align:left;transition:background 0.18s,color 0.18s,transform 0.18s;animation:fadeSlideRight 0.45s ease both;}
  .nav-item:hover{background:var(--surface2);color:var(--text);transform:translateX(4px);}
  .nav-item.active{background:var(--accentbg);color:var(--accent);}
  .nav-icon{font-size:17px;width:22px;text-align:center;}
  .sidebar-footer{margin-top:auto;padding-top:18px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:10px;animation:fadeIn 0.6s 0.3s ease both;}

  /* Theme toggle */
  .theme-row{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--surface2);border-radius:10px;font-size:13px;color:var(--muted);cursor:pointer;transition:var(--tr);user-select:none;}
  .theme-row:hover{background:var(--surface3);}
  .track{width:36px;height:20px;border-radius:10px;background:var(--surface3);border:1px solid var(--border);position:relative;transition:background 0.28s;flex-shrink:0;}
  .track.on{background:var(--accent);}
  .thumb{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);box-shadow:0 1px 4px rgba(0,0,0,0.25);}
  .track.on .thumb{transform:translateX(16px);}

  /* Role badge */
  .role-badge{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;transition:background 0.3s,color 0.3s;}
  .role-badge.admin{background:var(--accentbg);color:var(--accent);}
  .role-badge.viewer{background:rgba(79,142,247,0.12);color:var(--accent2);}

  /* API status */
  .api-status{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);padding:8px 12px;background:var(--surface2);border-radius:8px;}
  .sdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;background:var(--green);}
  .sdot.loading,.sdot.syncing{animation:blink 0.9s infinite;}
  .sdot.loading{background:var(--warn);} .sdot.syncing{background:var(--accent2);} .sdot.error{background:var(--red);}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}

  /* Mobile header */
  .mob-header{display:none;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:30;animation:fadeSlideDown 0.4s ease both;}
  .mob-logo{font-family:'DM Serif Display',serif;font-size:20px;color:var(--accent);}
  .mob-logo span{color:var(--text);}
  .mob-right{display:flex;align-items:center;gap:10px;}
  .ico-btn-round{background:var(--surface2);border:1px solid var(--border);color:var(--muted);width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;transition:var(--tr);border:none;}
  .ico-btn-round:hover{background:var(--surface3);color:var(--text);}

  /* Bottom nav */
  .bot-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:50;background:var(--surface);border-top:1px solid var(--border);padding:6px 0 max(6px,env(safe-area-inset-bottom));animation:slideUpNav 0.35s ease both;}
  .bot-nav-row{display:flex;justify-content:space-around;}
  .bn{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 12px;border:none;background:none;cursor:pointer;font-family:inherit;color:var(--muted);font-size:10px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;transition:color 0.18s;min-width:60px;}
  .bn.active{color:var(--accent);}
  .bn-icon{font-size:19px;}

  /* Mobile role modal */
  .mob-role-row{display:flex;align-items:center;gap:8px;padding:10px 16px;background:var(--surface);border-top:1px solid var(--border);}
  .mob-role-row label{color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;}
  .mob-role-row select{background:transparent;border:none;color:var(--text);font-size:13px;font-family:inherit;cursor:pointer;outline:none;flex:1;}

  /* Page header */
  .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:14px;animation:fadeSlideDown 0.45s ease both;}
  .page-title{font-family:'DM Serif Display',serif;font-size:30px;color:var(--text);margin-bottom:4px;transition:color 0.3s;}
  .page-sub{color:var(--muted);font-size:14px;}
  .page-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
  .role-sw{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 14px;transition:var(--tr);}
  .role-sw:hover{border-color:var(--accent);}
  .role-sw label{color:var(--muted);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;}
  .role-sw select{background:var(--surface);border:none;color:var(--text);font-size:13px;font-family:inherit;cursor:pointer;outline:none;}

  /* ── Fix all native <select> / <option> elements to honour the current theme ── */
  select {
    color-scheme: ${theme === "dark" ? "dark" : "light"};
    background-color: var(--surface2) !important;
    color: var(--text) !important;
  }
  select option {
    background-color: var(--surface2) !important;
    color: var(--text) !important;
  }
  /* The inline-borderless selects (role-sw, mob-role-row) stay transparent */
  .role-sw select, .mob-role-row select {
    background-color: transparent !important;
  }

  /* Summary cards */
  .cards-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:28px;}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:26px;position:relative;overflow:hidden;cursor:default;transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.22s,border-color 0.22s;animation:fadeSlideUp 0.5s ease both;}
  .card:hover{transform:translateY(-5px) scale(1.01);box-shadow:var(--shadow);border-color:rgba(200,169,110,0.3);}
  .card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
  .card.balance::before{background:linear-gradient(90deg,var(--accent),#e8c88a);}
  .card.income::before{background:linear-gradient(90deg,var(--green),#86efac);}
  .card.expense::before{background:linear-gradient(90deg,var(--red),#fca5a5);}
  .card::after{content:'';position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,0.05) 50%,transparent 70%);transform:translateX(-100%);transition:transform 0.55s ease;}
  .card:hover::after{transform:translateX(100%);}
  .card-label{font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:var(--muted);margin-bottom:14px;}
  .card-value{font-family:'DM Serif Display',serif;font-size:30px;color:var(--text);transition:color 0.3s;}
  .card.income .card-value{color:var(--green);} .card.expense .card-value{color:var(--red);}
  .card-sub{margin-top:6px;font-size:12px;color:var(--muted);}
  .card-icon{position:absolute;right:22px;top:50%;transform:translateY(-50%);font-size:38px;opacity:0.12;transition:opacity 0.3s,transform 0.3s;}
  .card:hover .card-icon{opacity:0.22;transform:translateY(-50%) scale(1.15) rotate(-8deg);}

  /* Charts */
  .charts-row{display:grid;grid-template-columns:2fr 1fr;gap:18px;margin-bottom:28px;}
  .chart-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:26px;transition:transform 0.2s ease,box-shadow 0.2s,background 0.3s;animation:fadeSlideUp 0.55s ease both;}
  .chart-card:hover{transform:translateY(-3px);box-shadow:var(--shadow);}
  .chart-title{font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:20px;}
  .custom-tooltip{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;font-size:13px;animation:fadeIn 0.15s ease;box-shadow:var(--shadow-sm);}
  .tooltip-label{color:var(--muted);margin-bottom:6px;font-weight:500;font-size:12px;}
  .tooltip-row{display:flex;gap:10px;align-items:center;}
  .tooltip-dot{width:8px;height:8px;border-radius:50%;}

  /* Filters */
  .filters-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px;animation:fadeIn 0.4s 0.1s ease both;}
  .filter-input{background:var(--surface);border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:10px;font-size:14px;font-family:inherit;outline:none;flex:1;min-width:150px;transition:border-color 0.2s,box-shadow 0.2s,background 0.3s;}
  .filter-input::placeholder{color:var(--muted);}
  .filter-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accentbg);}
  .filter-select{background:var(--surface);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:10px;font-size:13px;font-family:inherit;cursor:pointer;outline:none;transition:border-color 0.2s,background 0.3s;}
  .filter-select:focus{border-color:var(--accent);}
  .sort-btn{background:var(--surface2);border:1px solid var(--border);color:var(--muted);padding:10px 13px;border-radius:10px;font-size:12px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;transition:color 0.18s,border-color 0.18s,background 0.18s,transform 0.15s;white-space:nowrap;}
  .sort-btn:hover{transform:translateY(-1px);}
  .sort-btn.active{color:var(--accent);border-color:var(--accent);background:var(--accentbg);}
  .icon-btn{background:var(--surface2);border:1px solid var(--border);color:var(--muted);padding:10px 14px;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:7px;transition:var(--tr);white-space:nowrap;}
  .icon-btn:hover,.icon-btn.open{color:var(--accent);border-color:var(--accent);background:var(--accentbg);}
  .badge{background:var(--accent);color:#0d0f14;font-size:10px;font-weight:700;border-radius:10px;padding:1px 6px;}

  /* Advanced filter panel */
  .adv-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:18px;animation:panelSlide 0.25s cubic-bezier(0.4,0,0.2,1);}
  @keyframes panelSlide{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
  .adv-title{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;}
  .adv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;}
  .adv-field label{font-size:10px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px;}
  .adv-field .filter-select,.adv-field .filter-input{width:100%;min-width:0;}

  /* Transactions */
  .section{margin-bottom:36px;}
  .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;}
  .section-title{font-family:'DM Serif Display',serif;font-size:21px;color:var(--text);transition:color 0.3s;}
  .tx-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;animation:fadeSlideUp 0.5s ease both;transition:background 0.3s;}
  .tx-header{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 90px;padding:12px 22px;background:var(--surface2);border-bottom:1px solid var(--border);}
  .tx-header span{font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);}
  .tx-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 90px;padding:14px 22px;border-bottom:1px solid var(--border);align-items:center;transition:background 0.15s,transform 0.15s;animation:fadeIn 0.28s ease both;}
  .tx-row:last-child{border-bottom:none;}
  .tx-row:hover{background:var(--surface2);transform:translateX(3px);}
  .tx-note{font-size:14px;font-weight:500;color:var(--text);}
  .tx-date{font-size:12px;color:var(--muted);}
  .tx-cat{display:inline-flex;align-items:center;gap:5px;background:var(--surface2);border-radius:6px;padding:3px 9px;font-size:12px;color:var(--muted);width:fit-content;transition:background 0.15s;}
  .tx-row:hover .tx-cat{background:var(--surface3);}
  .tx-type{font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;}
  .tx-type.income{color:var(--green);} .tx-type.expense{color:var(--red);}
  .tx-amount{font-size:14px;font-weight:600;}
  .tx-amount.income{color:var(--green);} .tx-amount.expense{color:var(--red);}
  .sync-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);display:inline-block;margin-left:5px;animation:blink 1s infinite;vertical-align:middle;}
  .sync-dot.err{background:var(--red);animation:none;}
  .row-acts{display:flex;gap:5px;}
  .edit-btn,.del-btn{background:none;border:1px solid var(--border);padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-family:inherit;transition:border-color 0.15s,color 0.15s,transform 0.15s;color:var(--muted);}
  .edit-btn:hover{border-color:var(--accent);color:var(--accent);transform:scale(1.06);}
  .del-btn:hover{border-color:var(--red);color:var(--red);transform:scale(1.06);}
  .group-hdr{display:flex;align-items:center;justify-content:space-between;padding:9px 22px;background:var(--surface2);border-bottom:1px solid var(--border);font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);}
  .group-amts{display:flex;gap:14px;align-items:center;}
  .tx-count{margin-top:10px;font-size:12px;color:var(--muted);}

  /* Mobile card list */
  .mob-tx-list{display:none;}
  .mob-tx{padding:16px 18px;border-bottom:1px solid var(--border);animation:fadeIn 0.25s ease both;transition:background 0.12s;}
  .mob-tx:last-child{border-bottom:none;}
  .mob-tx:active{background:var(--surface2);}
  .mob-tx-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;}
  .mob-tx-note{font-size:14px;font-weight:600;color:var(--text);}
  .mob-tx-amt{font-size:16px;font-weight:700;}
  .mob-tx-amt.income{color:var(--green);} .mob-tx-amt.expense{color:var(--red);}
  .mob-tx-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .mob-tx-acts{display:flex;gap:8px;margin-top:10px;}
  .mob-tx-acts .edit-btn,.mob-tx-acts .del-btn{flex:1;text-align:center;padding:8px 12px;font-size:12px;}

  /* Export */
  .export-wrap{position:relative;}
  .export-menu{position:absolute;top:calc(100% + 8px);right:0;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);z-index:60;min-width:158px;animation:fadeSlideDown 0.2s ease;overflow:hidden;}
  .export-item{display:flex;align-items:center;gap:10px;padding:12px 16px;font-size:13px;color:var(--text2);cursor:pointer;transition:background 0.12s;border:none;background:none;width:100%;text-align:left;font-family:inherit;}
  .export-item:hover{background:var(--surface2);}

  /* Toast */
  .toast{position:fixed;bottom:80px;right:24px;z-index:200;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:13px 18px;display:flex;align-items:center;gap:11px;box-shadow:var(--shadow);font-size:13.5px;color:var(--text);animation:toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1);max-width:320px;}
  @keyframes toastIn{from{opacity:0;transform:translateX(20px) scale(0.95)}to{opacity:1;transform:translateX(0) scale(1)}}

  /* Modal */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.72);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:100;animation:fadeIn 0.2s ease;padding:20px;}
  .modal{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:34px;width:480px;max-width:100%;animation:modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 24px 64px rgba(0,0,0,0.5);max-height:90vh;overflow-y:auto;}
  @keyframes modalIn{from{opacity:0;transform:scale(0.88) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
  .modal-title{font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:24px;color:var(--text);}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
  .form-group{margin-bottom:16px;}
  .form-label{font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);margin-bottom:7px;display:block;}
  .form-input,.form-select{width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:11px 14px;border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:border-color 0.2s,box-shadow 0.2s,background 0.3s;}
  .form-input:focus,.form-select:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accentbg);}
  .modal-actions{display:flex;gap:10px;margin-top:24px;}
  .btn-primary{background:var(--accent);color:#0d0f14;border:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;flex:1;transition:opacity 0.15s,transform 0.15s;}
  .btn-primary:hover{opacity:0.88;transform:translateY(-1px);} .btn-primary:active{transform:translateY(0);}
  .btn-secondary{background:var(--surface2);color:var(--muted);border:1px solid var(--border);padding:12px 22px;border-radius:10px;font-size:14px;cursor:pointer;font-family:inherit;transition:background 0.15s,color 0.15s;}
  .btn-secondary:hover{background:var(--surface3);color:var(--text);}
  .add-btn{background:var(--accent);color:#0d0f14;border:none;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:7px;transition:opacity 0.15s,transform 0.15s;white-space:nowrap;}
  .add-btn:hover{opacity:0.88;transform:translateY(-1px);} .add-btn:active{transform:translateY(0);}

  /* Insights */
  .insights-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-bottom:28px;}
  .insight-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.22s,background 0.3s;animation:fadeSlideUp 0.5s ease both;}
  .insight-card:hover{transform:translateY(-4px);box-shadow:var(--shadow);}
  .insight-label{font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
  .insight-value{font-family:'DM Serif Display',serif;font-size:24px;color:var(--text);margin-bottom:4px;transition:color 0.3s;}
  .insight-sub{font-size:12px;color:var(--muted);}
  .trend-up{color:var(--green);} .trend-down{color:var(--red);}

  /* Empty */
  .empty-state{padding:56px;text-align:center;color:var(--muted);animation:fadeIn 0.4s ease;}
  .empty-icon{font-size:44px;margin-bottom:12px;}
  .empty-text{font-size:14px;}

  /* Page anim */
  .page-content{animation:pageFade 0.32s ease both;}

  /* Scrollbar */
  ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:var(--surface3);border-radius:3px;}

  /* Keyframes */
  @keyframes fadeIn        {from{opacity:0}to{opacity:1}}
  @keyframes fadeSlideDown {from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeSlideRight{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}
  @keyframes fadeSlideUp   {from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pageFade      {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUpNav    {from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}

  /* Responsive */
  @media(max-width:1100px){.charts-row{grid-template-columns:1fr;}}
  @media(max-width:900px) {.insights-grid{grid-template-columns:repeat(2,1fr);}}
  @media(max-width:768px){
    .app{grid-template-columns:1fr;}
    .sidebar{display:none!important;}
    .bot-nav{display:block;}
    .mob-header{display:flex;}
    .main{padding:0 0 96px;}
    .page-content{padding:16px 16px 0;}
    .page-header{padding:16px 16px 0;margin-bottom:16px;}
    .page-title{font-size:24px;}
    .cards-grid{grid-template-columns:1fr;gap:12px;}
    .card{padding:20px;}
    .card-value{font-size:26px;}
    .charts-row{grid-template-columns:1fr;gap:14px;}
    .insights-grid{grid-template-columns:1fr;gap:12px;}
    .tx-header{display:none;}
    .tx-row{display:none;}
    .mob-tx-list{display:block;}
    .adv-grid{grid-template-columns:1fr 1fr;}
    .page-right{display:none;}
    .toast{bottom:88px;right:12px;left:12px;max-width:100%;}
    .section-header{padding:0;}
    .filters-bar{padding:0;}
  }
  @media(max-width:480px){
    .adv-grid{grid-template-columns:1fr;}
    .form-row{grid-template-columns:1fr;}
    .modal{padding:24px 18px;}
    .insights-grid{grid-template-columns:1fr;}
    .cards-grid{grid-template-columns:1fr;}
    .charts-row{grid-template-columns:1fr;}
  }
`;

// ─── Small Components ─────────────────────────────────────────────────────────

function CustomTooltip({active,payload,label}){
  if(!active||!payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p,i)=>(
        <div key={i} className="tooltip-row">
          <span className="tooltip-dot" style={{background:p.color}}/>
          <span style={{color:p.color,fontWeight:600}}>{fmt(p.value)}</span>
          <span style={{color:"var(--muted)",fontSize:11}}>{p.name}</span>
        </div>
      ))}
    </div>
  );
}

function Toast(){
  const {toast}=useApp();
  if(!toast) return null;
  const icon=toast.type==="error"?"⚠️":toast.type==="warn"?"💡":"✅";
  return <div className="toast" key={toast.id}><span>{icon}</span><span>{toast.msg}</span></div>;
}

function ApiStatus(){
  const {apiStatus}=useApp();
  const labels={loading:"Loading…",idle:"All synced",syncing:"Saving…",error:"Sync error"};
  return <div className="api-status"><span className={`sdot ${apiStatus}`}/><span>{labels[apiStatus]}</span></div>;
}

function ThemeToggle(){
  const {theme,setTheme}=useApp(); const dark=theme==="dark";
  return (
    <div className="theme-row" onClick={()=>setTheme(dark?"light":"dark")}>
      <span>{dark?"🌙 Dark mode":"☀️ Light mode"}</span>
      <div className={`track${dark?" on":""}`}><div className="thumb"/></div>
    </div>
  );
}

function ExportMenu({transactions}){
  const [open,setOpen]=useState(false); const ref=useRef();
  useEffect(()=>{ const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);}; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  return (
    <div className="export-wrap" ref={ref}>
      <button className={`icon-btn${open?" open":""}`} onClick={()=>setOpen(o=>!o)}>
        ⬇ Export {transactions.length>0&&<span className="badge">{transactions.length}</span>}
      </button>
      {open&&(
        <div className="export-menu">
          <button className="export-item" onClick={()=>{exportCSV(transactions);setOpen(false);}}>📄 Export CSV</button>
          <button className="export-item" onClick={()=>{exportJSON(transactions);setOpen(false);}}>📦 Export JSON</button>
        </div>
      )}
    </div>
  );
}

// ─── Animated Card ────────────────────────────────────────────────────────────

function SummaryCard({cls,label,value,sub,icon,delay}){
  const [ref,inView]=useInView(); const animated=useCountUp(inView?value:0,950);
  return (
    <div className={`card ${cls}`} ref={ref} style={{animationDelay:delay}}>
      <div className="card-label">{label}</div>
      <div className="card-value">{fmt(animated)}</div>
      <div className="card-sub">{sub}</div>
      <span className="card-icon">{icon}</span>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function TxModal({initial,onClose,onSave}){
  const isEdit=!!initial?.id;
  const [form,setForm]=useState(initial||{date:new Date().toISOString().slice(0,10),amount:"",category:"Food",type:"expense",note:""});
  const s=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const submit=()=>{ if(!form.amount||!form.note) return; onSave({...form,amount:Number(form.amount)}); onClose(); };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-title">{isEdit?"Edit Transaction":"Add Transaction"}</div>
        <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.note} onChange={s("note")} placeholder="e.g. Monthly rent"/></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Amount (₹)</label><input className="form-input" type="number" value={form.amount} onChange={s("amount")} placeholder="0"/></div>
          <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={s("date")}/></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={s("category")}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={s("type")}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary"   onClick={submit}>{isEdit?"Save Changes":"Add Transaction"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Advanced Filters ─────────────────────────────────────────────────────────

function AdvFilters({show}){
  const {filterType,setFilterType,filterCategory,setFilterCategory,filterMonth,setFilterMonth,filterMinAmt,setFilterMinAmt,filterMaxAmt,setFilterMaxAmt,groupBy,setGroupBy,availableMonths,activeFilterCount,resetFilters}=useApp();
  if(!show) return null;
  return (
    <div className="adv-panel">
      <div className="adv-title">
        <span>Filters {activeFilterCount>0&&<span className="badge" style={{marginLeft:8}}>{activeFilterCount}</span>}</span>
        {activeFilterCount>0&&<button className="icon-btn" style={{padding:"3px 10px",fontSize:11}} onClick={resetFilters}>✕ Clear</button>}
      </div>
      <div className="adv-grid">
        {[
          {lbl:"Type",     el:<select className="filter-select" value={filterType}     onChange={e=>setFilterType(e.target.value)}><option value="all">All Types</option><option value="income">Income</option><option value="expense">Expense</option></select>},
          {lbl:"Category", el:<select className="filter-select" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option value="all">All</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>},
          {lbl:"Month",    el:<select className="filter-select" value={filterMonth}    onChange={e=>setFilterMonth(e.target.value)}><option value="all">All Months</option>{availableMonths.map(m=><option key={m} value={m}>{new Date(m+"-01").toLocaleString("en-IN",{month:"long",year:"numeric"})}</option>)}</select>},
          {lbl:"Min ₹",    el:<input  className="filter-input"  type="number" placeholder="0"         value={filterMinAmt} onChange={e=>setFilterMinAmt(e.target.value)}/>},
          {lbl:"Max ₹",    el:<input  className="filter-input"  type="number" placeholder="Unlimited" value={filterMaxAmt} onChange={e=>setFilterMaxAmt(e.target.value)}/>},
          {lbl:"Group By", el:<select className="filter-select" value={groupBy} onChange={e=>setGroupBy(e.target.value)}><option value="none">None</option><option value="month">Month</option><option value="category">Category</option><option value="type">Type</option></select>},
        ].map(({lbl,el})=>(
          <div className="adv-field" key={lbl}><label>{lbl}</label>{el}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardPage(){
  const {transactions}=useApp();
  const monthly=useMemo(()=>getMonthlyData(transactions),[transactions]);
  const catData =useMemo(()=>getCategoryData(transactions),[transactions]);
  const income  =transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense =transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  return (
    <div className="page-content">
      <div className="cards-grid">
        <SummaryCard cls="balance" label="Net Balance"    value={income-expense} sub="Across all time"                                                          icon="💰" delay="0s"/>
        <SummaryCard cls="income"  label="Total Income"   value={income}         sub={`${transactions.filter(t=>t.type==="income").length} transactions`}        icon="📈" delay="0.08s"/>
        <SummaryCard cls="expense" label="Total Expenses" value={expense}        sub={`${transactions.filter(t=>t.type==="expense").length} transactions`}       icon="📉" delay="0.16s"/>
      </div>
      <div className="charts-row">
        <div className="chart-card" style={{animationDelay:"0.18s"}}>
          <div className="chart-title">Balance Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly} margin={{top:4,right:4,left:0,bottom:0}}>
              <defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25}/><stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="label" tick={{fill:"var(--muted)",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"var(--muted)",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="balance" name="Balance" stroke="var(--accent)" strokeWidth={2} fill="url(#bg1)" dot={{fill:"var(--accent)",r:4}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card" style={{animationDelay:"0.24s"}}>
          <div className="chart-title">Spending Breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart margin={{top:0,right:0,bottom:0,left:0}}>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={88} dataKey="value" paddingAngle={3}>
                {catData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v,name)=>[fmt(v), name]}/>
            </PieChart>
          </ResponsiveContainer>
          {/* Custom legend — never overlaps the donut */}
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px 14px",marginTop:14,paddingTop:12,borderTop:"1px solid var(--border)"}}>
            {catData.map((entry,i)=>(
              <div key={entry.name} style={{display:"flex",alignItems:"center",gap:6,minWidth:"calc(50% - 7px)"}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0,display:"inline-block"}}/>
                <span style={{fontSize:11,color:"var(--muted)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-card" style={{animationDelay:"0.28s"}}>
        <div className="chart-title">Monthly Income vs Expenses</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthly} margin={{top:4,right:4,left:0,bottom:0}}>
            <XAxis dataKey="label" tick={{fill:"var(--muted)",fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"var(--muted)",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Bar dataKey="income"  name="Income"  fill="var(--green)" radius={[5,5,0,0]}/>
            <Bar dataKey="expense" name="Expense" fill="var(--red)"   radius={[5,5,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function TransactionsPage(){
  const {filteredTransactions,groupedTransactions,groupBy,role,searchQuery,setSearchQuery,sortField,setSortField,sortDir,setSortDir,addTransaction,editTransaction,deleteTransaction,activeFilterCount}=useApp();
  const [showModal,setShowModal]=useState(false);
  const [editTx,setEditTx]=useState(null);
  const [showAdv,setShowAdv]=useState(false);
  const isMobile=useIsMobile();

  const ts=f=>{if(sortField===f)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortField(f);setSortDir("desc");}};

  const desktopRows=list=>list.map((tx,i)=>(
    <div className="tx-row" key={tx.id} style={{animationDelay:`${i*0.03}s`}}>
      <div><span className="tx-note">{tx.note}</span>{!tx.synced&&<span className={`sync-dot${tx.syncError?" err":""}`}/>}</div>
      <div className="tx-date">{fmtDate(tx.date)}</div>
      <div><span className="tx-cat">{CAT_ICONS[tx.category]} {tx.category}</span></div>
      <div className={`tx-type ${tx.type}`}>{tx.type}</div>
      <div className={`tx-amount ${tx.type}`}>{tx.type==="income"?"+":"-"}{fmt(tx.amount)}</div>
      <div className="row-acts">
        {role===ROLES.ADMIN&&<><button className="edit-btn" onClick={()=>setEditTx(tx)}>Edit</button><button className="del-btn" onClick={()=>deleteTransaction(tx.id)}>✕</button></>}
      </div>
    </div>
  ));

  const mobileRows=list=>list.map((tx,i)=>(
    <div className="mob-tx" key={tx.id} style={{animationDelay:`${i*0.03}s`}}>
      <div className="mob-tx-top">
        <div><div className="mob-tx-note">{tx.note}{!tx.synced&&<span className={`sync-dot${tx.syncError?" err":""}`}/>}</div></div>
        <div className={`mob-tx-amt ${tx.type}`}>{tx.type==="income"?"+":"-"}{fmt(tx.amount)}</div>
      </div>
      <div className="mob-tx-meta">
        <span className="tx-cat">{CAT_ICONS[tx.category]} {tx.category}</span>
        <span className={`tx-type ${tx.type}`}>{tx.type}</span>
        <span className="tx-date">{fmtDate(tx.date)}</span>
      </div>
      {role===ROLES.ADMIN&&(
        <div className="mob-tx-acts">
          <button className="edit-btn" onClick={()=>setEditTx(tx)}>Edit</button>
          <button className="del-btn"  onClick={()=>deleteTransaction(tx.id)}>Delete</button>
        </div>
      )}
    </div>
  ));

  const renderGroup=([key,txs])=>{
    const gi=txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
    const ge=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
    const lbl=groupBy==="month"?new Date(key+"-01").toLocaleString("en-IN",{month:"long",year:"numeric"}):`${CAT_ICONS[key]||""} ${key}`;
    return (
      <div key={key}>
        <div className="group-hdr">
          <span>{lbl} <span style={{fontWeight:400,color:"var(--muted)"}}>({txs.length})</span></span>
          <div className="group-amts">{gi>0&&<span style={{color:"var(--green)",fontSize:12}}>+{fmt(gi)}</span>}{ge>0&&<span style={{color:"var(--red)",fontSize:12}}>-{fmt(ge)}</span>}</div>
        </div>
        {isMobile?mobileRows(txs):desktopRows(txs)}
      </div>
    );
  };

  return (
    <div className="page-content">
      <div className="section">
        <div className="section-header">
          <div className="section-title">All Transactions</div>
          <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"center"}}>
            <ExportMenu transactions={filteredTransactions}/>
            {role===ROLES.ADMIN&&<button className="add-btn" onClick={()=>setShowModal(true)}>+ Add</button>}
          </div>
        </div>
        <div className="filters-bar">
          <input className="filter-input" placeholder="🔍  Search…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
          <button className={`icon-btn${showAdv?" open":""}`} onClick={()=>setShowAdv(o=>!o)}>
            ⚙ Filters {activeFilterCount>0&&<span className="badge">{activeFilterCount}</span>}
          </button>
          <button className={`sort-btn${sortField==="date"?" active":""}`}   onClick={()=>ts("date")}>Date {sortField==="date"&&(sortDir==="asc"?"↑":"↓")}</button>
          <button className={`sort-btn${sortField==="amount"?" active":""}`} onClick={()=>ts("amount")}>Amount {sortField==="amount"&&(sortDir==="asc"?"↑":"↓")}</button>
        </div>
        <AdvFilters show={showAdv}/>
        <div className="tx-card">
          <div className="tx-header"><span>Description</span><span>Date</span><span>Category</span><span>Type</span><span>Amount</span><span>Actions</span></div>
          {filteredTransactions.length===0?(
            <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-text">No transactions match your filters.</div></div>
          ):groupedTransactions?(
            groupedTransactions.map(renderGroup)
          ):(
            <>
              {!isMobile&&desktopRows(filteredTransactions)}
              <div className="mob-tx-list">{isMobile&&mobileRows(filteredTransactions)}</div>
            </>
          )}
        </div>
        <div className="tx-count">Showing {filteredTransactions.length} transaction{filteredTransactions.length!==1?"s":""}</div>
      </div>
      {showModal&&<TxModal onClose={()=>setShowModal(false)} onSave={addTransaction}/>}
      {editTx   &&<TxModal initial={editTx} onClose={()=>setEditTx(null)} onSave={u=>editTransaction(editTx.id,u)}/>}
    </div>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────

function InsightsPage(){
  const {transactions}=useApp();
  const monthly=useMemo(()=>getMonthlyData(transactions),[transactions]);
  const catData =useMemo(()=>getCategoryData(transactions),[transactions]);
  const top=catData[0];
  const [prev,curr]=monthly.length>=2?monthly.slice(-2):[null,monthly[0]];
  const sr  =curr&&curr.income>0?Math.round(((curr.income-curr.expense)/curr.income)*100):0;
  const ec  =curr&&prev?Math.round(((curr.expense-prev.expense)/prev.expense)*100):null;
  const avgI=monthly.length?monthly.reduce((s,m)=>s+m.income,0)/monthly.length:0;
  const cards=[
    {label:"Highest Spending Category",value:top?`${CAT_ICONS[top.name]} ${top.name}`:"—",    sub:top?`${fmt(top.value)} total`:"No data",    cls:""},
    {label:"Savings Rate (Latest Month)",value:curr?`${sr}%`:"—",                              sub:sr>20?"Great job!":sr>0?"Moderate":"Overspending", cls:sr>20?"trend-up":sr<0?"trend-down":""},
    {label:"Expense Δ vs Prior Month",  value:ec!=null?`${ec>0?"+":""}${ec}%`:"—",             sub:prev&&curr?`${fmt(prev.expense)} → ${fmt(curr.expense)}`:"Need 2+ months", cls:ec!=null?ec<0?"trend-up":"trend-down":""},
    {label:"Avg Monthly Income",        value:fmt(avgI),                                         sub:`Over ${monthly.length} month${monthly.length!==1?"s":""}`, cls:""},
  ];
  return (
    <div className="page-content">
      <div className="insights-grid">
        {cards.map((c,i)=>(
          <div className="insight-card" key={c.label} style={{animationDelay:`${i*0.09}s`}}>
            <div className="insight-label">{c.label}</div>
            <div className={`insight-value ${c.cls}`}>{c.value}</div>
            <div className="insight-sub">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="chart-card" style={{marginBottom:20,animationDelay:"0.28s"}}>
        <div className="chart-title">Category Spending Comparison</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={catData} layout="vertical" margin={{left:20,right:20}}>
            <XAxis type="number" tick={{fill:"var(--muted)",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
            <YAxis type="category" dataKey="name" tick={{fill:"var(--muted)",fontSize:11}} axisLine={false} tickLine={false} width={90} tickFormatter={v=>`${CAT_ICONS[v]} ${v}`}/>
            <Tooltip formatter={v=>fmt(v)}/>
            <Bar dataKey="value" name="Spent" radius={[0,6,6,0]}>{catData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card" style={{animationDelay:"0.34s"}}>
        <div className="chart-title">Monthly Net Flow</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={monthly.map(m=>({...m,net:m.income-m.expense}))} margin={{top:4,right:4,left:0,bottom:0}}>
            <XAxis dataKey="label" tick={{fill:"var(--muted)",fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"var(--muted)",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Bar dataKey="net" name="Net Flow" radius={[5,5,0,0]}>{monthly.map((m,i)=><Cell key={i} fill={m.income-m.expense>=0?"var(--green)":"var(--red)"}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const PAGES=[
  {id:"dashboard",    label:"Overview",     icon:"◈"},
  {id:"transactions", label:"Transactions", icon:"⇄"},
  {id:"insights",     label:"Insights",     icon:"◎"},
];
const PAGE_TITLES={
  dashboard:    {title:"Financial Overview",sub:"Your complete financial picture at a glance."},
  transactions: {title:"Transactions",      sub:"Filter, group, export and manage activity."},
  insights:     {title:"Insights",          sub:"Understand spending patterns and trends."},
};

export default function App(){
  const [page,setPage]=useState("dashboard");
  return <AppProvider><style id="ft-styles"/><AppInner page={page} setPage={setPage}/></AppProvider>;
}

function AppInner({page,setPage}){
  const {role,setRole,theme}=useApp();
  const {title,sub}=PAGE_TITLES[page];

  useEffect(()=>{
    const el=document.getElementById("ft-styles");
    if(el) el.textContent=makeStyles(theme);
  },[theme]);

  return (
    <>
      <div className="app">
        {/* Desktop sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">fin<span>track</span></div>
          {PAGES.map((p,i)=>(
            <button key={p.id} className={`nav-item${page===p.id?" active":""}`} style={{animationDelay:`${0.05+i*0.07}s`}} onClick={()=>setPage(p.id)}>
              <span className="nav-icon">{p.icon}</span>{p.label}
            </button>
          ))}
          <div className="sidebar-footer">
            <ThemeToggle/>
            <ApiStatus/>
            <span className={`role-badge ${role}`}>{role===ROLES.ADMIN?"⚙":"👁"} {role}</span>
          </div>
        </aside>

        <main className="main">
          {/* Mobile sticky header */}
          <div className="mob-header">
            <div className="mob-logo">fin<span>track</span></div>
            <div className="mob-right">
              <button className="ico-btn-round" onClick={()=>{ const {theme:t,setTheme}=useApp(); setTheme(t==="dark"?"light":"dark"); }} title="Toggle theme">
                {theme==="dark"?"☀️":"🌙"}
              </button>
              <span className={`role-badge ${role}`} style={{fontSize:10}}>{role===ROLES.ADMIN?"⚙":"👁"}</span>
            </div>
          </div>

          {/* Mobile role bar */}
          <div className="mob-role-row" style={{display:"none"}} id="mob-role">
            <label>Role:</label>
            <select value={role} onChange={e=>setRole(e.target.value)}>
              <option value={ROLES.ADMIN}>Admin — add & edit</option>
              <option value={ROLES.VIEWER}>Viewer — read only</option>
            </select>
          </div>

          <div className="page-header">
            <div><h1 className="page-title">{title}</h1><p className="page-sub">{sub}</p></div>
            <div className="page-right">
              <div className="role-sw">
                <label>Role</label>
                <select value={role} onChange={e=>setRole(e.target.value)}>
                  <option value={ROLES.ADMIN}>Admin — add & edit</option>
                  <option value={ROLES.VIEWER}>Viewer — read only</option>
                </select>
                <span className={`role-badge ${role}`}>{role===ROLES.ADMIN?"⚙":"👁"}</span>
              </div>
            </div>
          </div>

          {page==="dashboard"   &&<DashboardPage    key="dashboard"/>}
          {page==="transactions"&&<TransactionsPage key="transactions"/>}
          {page==="insights"    &&<InsightsPage     key="insights"/>}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bot-nav">
        <div className="bot-nav-row">
          {PAGES.map(p=>(
            <button key={p.id} className={`bn${page===p.id?" active":""}`} onClick={()=>setPage(p.id)}>
              <span className="bn-icon">{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
          <button className="bn" onClick={()=>setRole(role===ROLES.ADMIN?ROLES.VIEWER:ROLES.ADMIN)} title="Toggle role">
            <span className="bn-icon">{role===ROLES.ADMIN?"⚙":"👁"}</span>
            <span>{role}</span>
          </button>
        </div>
      </nav>

      <Toast/>
    </>
  );
}