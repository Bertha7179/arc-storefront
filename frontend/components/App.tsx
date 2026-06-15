"use client";
/* Arc Storefront — standalone mini-storefront dApp (dark, lime grid). Self-contained.
   ABI preserved: create(label,price)/pay(id)/get/getMine/total. */
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
const C = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const CHAIN = 5042002, HEX = "0x4CEF52";
const ABI = [
  { name: "create", type: "function", stateMutability: "nonpayable", inputs: [{ name: "label", type: "string" }, { name: "price", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "pay", type: "function", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "get", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "owner", type: "address" }, { name: "label", type: "string" }, { name: "price", type: "uint256" }, { name: "paid", type: "bool" }, { name: "payer", type: "address" }, { name: "at", type: "uint256" }] }] },
  { name: "getMine", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { name: "total", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const cut = (a?: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
const usd = (w?: bigint) => w === undefined ? "0.00" : Number(formatEther(w)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMO = ["🖼️", "📷", "🎟️", "🎨", "📦", "🎧", "🕹️", "📚"];
async function toArc() { const e = (window as any).ethereum; if (!e) return; try { await e.request({ method: "wallet_addEthereumChain", params: [{ chainId: HEX, chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"] }] }); } catch { try { await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HEX }] }); } catch {} } }
const CSS = `
.sf{--bg:#0d0d0f;--card:#141417;--card2:#1c1c22;--bd:#1d1d22;--bd2:#2c2c34;--mut:#8b8b96;--txt:#f0f0f2;--acc:#a3e635;--ink:#1a2208;min-height:100vh;background:var(--bg);color:var(--txt);font-family:'Space Grotesk','Segoe UI',system-ui,sans-serif}
.sf *{box-sizing:border-box}.sf a{color:var(--acc);text-decoration:none}
.sf header{display:flex;align-items:center;gap:10px;padding:15px 22px;border-bottom:1px solid var(--bd)}
.sf .logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16px}
.sf .mark{width:32px;height:32px;border-radius:9px;background:var(--txt);color:var(--bg);display:grid;place-items:center;font-weight:900;font-size:15px}
.sf .chip{font-size:11px;color:var(--mut);border:1px solid var(--bd2);border-radius:99px;padding:3px 10px}
.sf .btn{border:0;border-radius:9px;font:inherit;font-weight:700;cursor:pointer;padding:9px 16px;transition:.15s}.sf .btn:disabled{opacity:.5;cursor:not-allowed}
.sf .pri{background:var(--acc);color:var(--ink)}.sf .pri:hover:not(:disabled){filter:brightness(1.05)}.sf .red{background:#dc2626;color:#fff}
.sf .wrap{max-width:920px;margin:0 auto;padding:22px 22px 60px}
.sf .tabs{display:inline-flex;gap:4px;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:4px;margin-bottom:18px}
.sf .tab{border:0;background:none;color:var(--mut);font:inherit;font-weight:700;font-size:13px;padding:8px 16px;border-radius:9px;cursor:pointer}.sf .tab.on{background:var(--acc);color:var(--ink)}
.sf .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.sf .prod{background:var(--card);border:1px solid var(--bd);border-radius:14px;overflow:hidden}
.sf .cov{height:96px;background:var(--card2);display:grid;place-items:center;font-size:38px}
.sf .pb{padding:12px}
.sf .card{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:18px;max-width:440px;margin:0 auto}
.sf label{display:block;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin:8px 0 5px}
.sf input{width:100%;background:var(--bg);border:1px solid var(--bd2);border-radius:10px;padding:11px 13px;font:inherit;font-size:14px;color:var(--txt);outline:none}.sf input:focus{border-color:var(--acc)}
.sf .menu{position:absolute;right:0;top:118%;background:var(--card2);border:1px solid var(--bd2);border-radius:11px;padding:6px;min-width:190px;z-index:30;box-shadow:0 14px 34px rgba(0,0,0,.5)}
.sf .menu button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--txt);font:inherit;font-weight:600;font-size:13.5px;padding:9px 12px;border-radius:8px;cursor:pointer}.sf .menu button:hover{background:rgba(255,255,255,.05)}
`;
function Prod({ id, busy, pay }: { id: bigint; busy: boolean; pay: (id: bigint, v: bigint) => void }) {
  const { data: it } = useReadContract({ address: C, abi: ABI, functionName: "get", args: [id] });
  if (!it) return null; const x = it as any;
  return (
    <div className="prod">
      <div className="cov">{EMO[Number(id) % EMO.length]}</div>
      <div className="pb">
        <div style={{ fontWeight: 600, fontSize: 14 }}>{x.label || `Item #${id}`}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontWeight: 800 }}>${usd(x.price)}</span>
          {x.paid ? <span style={{ fontSize: 12, color: "var(--mut)" }}>Sold ✓</span> : <button className="btn pri" style={{ padding: "5px 12px", fontSize: 12 }} disabled={busy} onClick={() => pay(id, x.price)}>{busy ? "…" : "Buy"}</button>}
        </div>
      </div>
    </div>
  );
}
export default function App() {
  const { address, isConnected } = useAccount(); const net = useChainId();
  const { connectors, connect } = useConnect(); const { disconnect } = useDisconnect();
  const [pop, setPop] = useState(false); const [tab, setTab] = useState<"shop" | "list">("shop");
  const [form, setForm] = useState({ label: "", price: "" });
  const tx = useWriteContract(); const rcpt = useWaitForTransactionReceipt({ hash: tx.data, query: { enabled: !!tx.data } });
  const busy = tx.isPending || rcpt.isLoading;
  const total = useReadContract({ address: C, abi: ABI, functionName: "total" });
  const mine = useReadContract({ address: C, abi: ABI, functionName: "getMine", args: address ? [address] : undefined, query: { enabled: !!address } });
  useEffect(() => { if (rcpt.isSuccess) { tx.reset(); setForm({ label: "", price: "" }); total.refetch(); mine.refetch(); } }, [rcpt.isSuccess]); // eslint-disable-line
  const wrong = isConnected && net !== CHAIN; const n = total.data !== undefined ? Number(total.data) : 0;
  const pay = (id: bigint, v: bigint) => tx.writeContract({ address: C, abi: ABI, functionName: "pay", args: [id], value: v });
  return (
    <div className="sf">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header>
        <div className="logo"><span className="mark">◧</span>Arc Storefront</div>
        <span className="chip">store.arc · {n} listings</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {wrong && <button className="btn red" onClick={toArc}>Switch to Arc</button>}
          <div style={{ position: "relative" }}><button className="btn pri" onClick={() => setPop(p => !p)}>{isConnected ? cut(address) : "Connect"}</button>
            {pop && <div className="menu">{isConnected ? <button onClick={() => { disconnect(); setPop(false); }} style={{ color: "#f87171" }}>Disconnect</button> : connectors.map(c => <button key={c.uid} onClick={() => { connect({ connector: c }); setPop(false); }}>{c.name}</button>)}</div>}</div>
        </div>
      </header>
      <div className="wrap">
        <div style={{ marginBottom: 6 }}><div style={{ fontSize: 22, fontWeight: 800 }}>The Studio Shop</div><div style={{ color: "var(--mut)", fontSize: 13, marginBottom: 14 }}>Pay any item in USDC · ships worldwide</div></div>
        <div className="tabs">{([["shop", "Shop"], ["list", "List item"]] as const).map(([t, l]) => <button key={t} className={"tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{l}</button>)}</div>
        {tab === "shop" && <div className="grid">{n > 0 ? Array.from({ length: n }, (_, i) => BigInt(n - 1 - i)).map(id => <Prod key={id.toString()} id={id} busy={busy} pay={pay} />) : <div style={{ gridColumn: "1/-1", color: "var(--mut)", textAlign: "center", padding: "40px 0" }}>No listings yet — add one in List item</div>}</div>}
        {tab === "list" && <div className="card">
          <label>Product name</label><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Art print" />
          <label>Price (USDC)</label><input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} type="number" placeholder="0.00" style={{ fontSize: 18, fontWeight: 800 }} />
          <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || busy || !(Number(form.price) > 0)} onClick={() => tx.writeContract({ address: C, abi: ABI, functionName: "create", args: [form.label, parseEther(form.price || "0")] })}>{busy ? "…" : "List product 🏪"}</button>
          {mine.data && (mine.data as readonly bigint[]).length > 0 && <div style={{ fontSize: 11, color: "var(--mut)", textAlign: "center", marginTop: 8 }}>Your listing IDs: {(mine.data as readonly bigint[]).map(x => x.toString()).join(", ")}</div>}
        </div>}
        <div style={{ textAlign: "center", color: "#5a5a64", fontSize: 12, marginTop: 24 }}>Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer">Arc Network</a></div>
      </div>
    </div>
  );
}
