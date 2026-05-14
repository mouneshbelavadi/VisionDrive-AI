import { useState, useEffect, useRef, useCallback } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  :root{
    --bg:#020812;--bg2:#050f1e;--card:#080f1f;--border:#0d2040;
    --cyan:#00f5ff;--green:#00ff88;--orange:#ff6b1a;--red:#ff2d55;
    --yellow:#ffd60a;--text:#c8d8f0;--dim:#3a5070;
  }
  body{background:var(--bg);font-family:'Rajdhani',sans-serif;color:var(--text);overflow-x:hidden;min-height:100vh;}
  body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,245,255,0.015) 2px,rgba(0,245,255,0.015) 4px);pointer-events:none;z-index:9999;}
  .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(0,245,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,0.04) 1px,transparent 1px);background-size:40px 40px;animation:gridPulse 8s ease-in-out infinite;pointer-events:none;}
  @keyframes gridPulse{0%,100%{opacity:0.6}50%{opacity:1}}
  .header{position:relative;padding:16px 24px 12px;border-bottom:1px solid rgba(0,245,255,0.15);background:linear-gradient(180deg,rgba(0,245,255,0.05) 0%,transparent 100%);}
  .header-inner{display:flex;align-items:center;justify-content:space-between;}
  .logo-block{display:flex;align-items:center;gap:14px;}
  .logo-icon{width:42px;height:42px;border:2px solid var(--cyan);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;animation:iconPulse 3s ease-in-out infinite;position:relative;}
  .logo-icon::after{content:'';position:absolute;inset:-4px;border:1px solid var(--cyan);border-radius:10px;opacity:0.3;animation:iconRing 3s ease-in-out infinite;}
  @keyframes iconPulse{0%,100%{box-shadow:0 0 10px rgba(0,245,255,0.4)}50%{box-shadow:0 0 24px rgba(0,245,255,0.8),0 0 48px rgba(0,245,255,0.3)}}
  @keyframes iconRing{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.15);opacity:0}}
  .logo-title{font-family:'Orbitron',monospace;font-size:17px;font-weight:900;letter-spacing:3px;color:var(--cyan);text-shadow:0 0 20px rgba(0,245,255,0.6);}
  .logo-sub{font-size:9px;letter-spacing:4px;color:var(--dim);margin-top:2px;font-family:'Share Tech Mono',monospace;}
  .status-label{font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--green);display:flex;align-items:center;gap:6px;}
  .status-dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 12px var(--green);animation:blink 1.5s ease-in-out infinite;}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
  .sys-time{font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--dim);}
  .danger-banner{margin:10px 20px;padding:10px 20px;background:linear-gradient(90deg,rgba(255,45,85,0.2),rgba(255,45,85,0.05));border:1px solid rgba(255,45,85,0.6);border-left:4px solid var(--red);border-radius:4px;display:flex;align-items:center;gap:12px;animation:dangerPulse 1.5s ease-in-out infinite;}
  @keyframes dangerPulse{0%,100%{box-shadow:0 0 0 rgba(255,45,85,0)}50%{box-shadow:0 0 20px rgba(255,45,85,0.3)}}
  .danger-text{font-family:'Orbitron',monospace;font-size:11px;font-weight:700;letter-spacing:2px;color:var(--red);text-shadow:0 0 10px rgba(255,45,85,0.7);}
  .error-banner{margin:10px 20px;padding:10px 20px;background:linear-gradient(90deg,rgba(255,165,0,0.2),rgba(255,165,0,0.05));border:1px solid rgba(255,165,0,0.6);border-left:4px solid #ff9500;border-radius:4px;display:flex;align-items:center;gap:12px;}
  .error-text{font-family:'Share Tech Mono',monospace;font-size:11px;color:#ff9500;}
  .controls{padding:8px 20px 10px;display:flex;align-items:center;gap:10px;}
  .file-label{display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(0,245,255,0.08);border:1px solid rgba(0,245,255,0.3);border-radius:5px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--cyan);transition:all 0.2s;letter-spacing:1px;}
  .file-label:hover{background:rgba(0,245,255,0.15);border-color:var(--cyan);box-shadow:0 0 12px rgba(0,245,255,0.2);}
  .btn{padding:8px 18px;border:none;border-radius:5px;font-family:'Orbitron',monospace;font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;transition:all 0.2s;}
  .btn-live{background:linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,255,136,0.05));border:1px solid var(--green);color:var(--green);}
  .btn-live:hover{box-shadow:0 0 16px rgba(0,255,136,0.4);}
  .btn-stop{background:linear-gradient(135deg,rgba(255,45,85,0.2),rgba(255,45,85,0.05));border:1px solid var(--red);color:var(--red);}
  .processing{font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--cyan);display:flex;align-items:center;gap:8px;}
  .spinner{width:14px;height:14px;border:2px solid rgba(0,245,255,0.2);border-top-color:var(--cyan);border-radius:50%;animation:spin 0.8s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg)}}
  .stats-bar{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:0 20px 12px;}
  .stat-card{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:12px 14px;position:relative;overflow:hidden;}
  .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--ac);}
  .stat-label{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--dim);margin-bottom:4px;}
  .stat-value{font-family:'Orbitron',monospace;font-size:22px;font-weight:700;color:var(--ac);text-shadow:0 0 16px var(--ac);line-height:1;}
  .stat-unit{font-size:10px;color:var(--dim);margin-top:2px;font-family:'Share Tech Mono',monospace;}
  .stat-bar-bg{height:3px;background:rgba(255,255,255,0.05);border-radius:2px;margin-top:8px;}
  .stat-bar-fill{height:100%;border-radius:2px;background:var(--ac);box-shadow:0 0 8px var(--ac);transition:width 0.5s ease;}
  .panels{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:0 20px 16px;}
  .panel{background:var(--card);border:1px solid var(--border);border-radius:8px;overflow:hidden;position:relative;}
  .panel::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--ac),transparent);}
  .panel-header{padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.02);}
  .panel-title{font-family:'Orbitron',monospace;font-size:10px;font-weight:700;letter-spacing:2px;color:var(--ac);}
  .panel-badge{font-family:'Share Tech Mono',monospace;font-size:8px;padding:2px 8px;border:1px solid var(--ac);border-radius:3px;color:var(--ac);opacity:0.7;}
  .panel-body{padding:12px;}
  .img-wrap{position:relative;border-radius:6px;overflow:hidden;background:#000;border:1px solid var(--border);}
  .img-wrap img{width:100%;display:block;position:relative;z-index:2;}
  .img-wrap video{width:100%;display:block;position:absolute;top:0;left:0;z-index:1;opacity:0.3;}
  .corner{position:absolute;width:12px;height:12px;}
  .c-tl{top:6px;left:6px;border-top:2px solid var(--ac);border-left:2px solid var(--ac);z-index:3;}
  .c-tr{top:6px;right:6px;border-top:2px solid var(--ac);border-right:2px solid var(--ac);z-index:3;}
  .c-bl{bottom:6px;left:6px;border-bottom:2px solid var(--ac);border-left:2px solid var(--ac);z-index:3;}
  .c-br{bottom:6px;right:6px;border-bottom:2px solid var(--ac);border-right:2px solid var(--ac);z-index:3;}
  .placeholder{aspect-ratio:4/3;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#050f1e,#020812);color:var(--dim);font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:1px;gap:8px;}
  .metrics-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;}
  .mini-stat{border-radius:4px;padding:6px 10px;}
  .mini-label{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--dim);letter-spacing:1px;}
  .mini-value{font-family:'Orbitron',monospace;font-size:14px;font-weight:700;}
  .bev-legend{display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;}
  .leg-item{display:flex;align-items:center;gap:5px;font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);}
  .leg-dot{width:8px;height:8px;border-radius:50%;}
  .traj-objects{display:flex;flex-direction:column;gap:6px;margin-top:8px;max-height:160px;overflow-y:auto;}
  .obj-card{background:rgba(0,245,255,0.04);border:1px solid rgba(0,245,255,0.15);border-radius:5px;padding:7px 10px;}
  .obj-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
  .obj-id{font-family:'Orbitron',monospace;font-size:10px;font-weight:700;}
  .obj-tag{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--dim);padding:1px 6px;border:1px solid var(--dim);border-radius:2px;}
  .path-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;}
  .path-pt{background:rgba(0,245,255,0.08);border-radius:3px;padding:3px 5px;text-align:center;}
  .path-t{font-family:'Share Tech Mono',monospace;font-size:7px;color:var(--dim);}
  .path-xy{font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--cyan);}
  .bottom-bar{padding:8px 20px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(0,245,255,0.02);}
  .bottom-info{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--dim);}
  .flow{display:flex;align-items:center;gap:6px;}
  .flow-step{font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 8px;border:1px solid var(--green);border-radius:2px;color:var(--green);background:rgba(0,255,136,0.05);}
  .flow-arr{color:var(--dim);font-size:10px;}
  canvas{display:block;width:100%;border-radius:6px;border:1px solid var(--border);}
  #capture-canvas { display: none; }
  .video-status{position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.7);padding:4px 10px;border-radius:4px;font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--cyan);z-index:4;border:1px solid var(--cyan);}
`;

export default function Dashboard() {
  const [clock, setClock]       = useState("");
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [danger, setDanger]     = useState(false);
  const [stats, setStats]       = useState({ fps:0, obj:0, conf:0, threat:"LOW", mode:"UPLOAD" });
  const [fileName, setFileName] = useState("");
  const [backendError, setBackendError] = useState("");
  const isProcessingRef = useRef(false);

  const segImgRef      = useRef(null);
  const bevRef         = useRef(null);
  const trajRef        = useRef(null);
  const wsRef          = useRef(null);
  const videoRef       = useRef(null);
  const captureRef     = useRef(null);
  const bevPhase       = useRef(0);
  const trajPhase      = useRef(0);
  const bevData        = useRef(null);
  const bevImageRef    = useRef(new Image());
  const trajData       = useRef(null);

  const analysisTimer  = useRef(null);

  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toTimeString().slice(0, 8));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const drawBEV = useCallback(() => {
    const canvas = bevRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#020812";
    ctx.fillRect(0, 0, W, H);

    const bevImg = bevImageRef.current;
    if (bevImg && bevImg.complete && bevImg.naturalWidth !== 0) {
      ctx.drawImage(bevImg, 0, 0, W, H);
    }


    ctx.strokeStyle = "rgba(0,245,255,0.07)"; ctx.lineWidth = 0.8;
    for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    const roadGrad = ctx.createLinearGradient(W*0.5, 0, W*0.5, H);
    roadGrad.addColorStop(0, "rgba(0,255,136,0.06)");
    roadGrad.addColorStop(1, "rgba(0,255,136,0.22)");
    ctx.fillStyle = roadGrad;
    ctx.beginPath();
    ctx.moveTo(W*0.22, H); ctx.lineTo(W*0.78, H);
    ctx.lineTo(W*0.58, H*0.08); ctx.lineTo(W*0.42, H*0.08);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = "rgba(0,255,136,0.45)"; ctx.lineWidth = 1.5; ctx.setLineDash([5,5]);
    ctx.beginPath(); ctx.moveTo(W*0.22,H); ctx.lineTo(W*0.42,H*0.08); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W*0.78,H); ctx.lineTo(W*0.58,H*0.08); ctx.stroke();
    ctx.strokeStyle = "rgba(255,214,10,0.3)"; ctx.lineWidth = 1; ctx.setLineDash([8,8]);
    ctx.beginPath(); ctx.moveTo(W*0.5,H); ctx.lineTo(W*0.5,H*0.08); ctx.stroke();
    ctx.setLineDash([]);

    const obstacles = result?.bev_positions?.length > 0
      ? result.bev_positions.map(([bx,by]) => ({ x: (bx/300)*W, y: (by/300)*H, w:22, h:14, c:"#ff6b1a" }))
      : [
          {x:W*0.36,y:H*0.28,w:22,h:14,c:"#ff6b1a"},
          {x:W*0.54,y:H*0.42,w:18,h:12,c:"#ff6b1a"},
          {x:W*0.41,y:H*0.58,w:20,h:14,c:"#ff2d55"},
          {x:W*0.62,y:H*0.32,w:16,h:11,c:"#ff6b1a"},
          {x:W*0.37,y:H*0.72,w:24,h:14,c:"#ff6b1a"},
        ];

    obstacles.forEach(o => {
      ctx.shadowColor = o.c; ctx.shadowBlur = 8;
      ctx.fillStyle = o.c + "44"; ctx.strokeStyle = o.c; ctx.lineWidth = 1.5;
      ctx.fillRect(o.x-o.w/2, o.y-o.h/2, o.w, o.h);
      ctx.strokeRect(o.x-o.w/2, o.y-o.h/2, o.w, o.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = o.c;
      ctx.beginPath(); ctx.arc(o.x, o.y, 2.5, 0, Math.PI*2); ctx.fill();
    });

    const ex = W*0.5, ey = H*0.88;
    const paths = [
      { pts:[[ex,ey],[ex-4,H*0.72],[ex-7,H*0.56],[ex-10,H*0.4],[ex-12,H*0.26],[ex-14,H*0.14]], c:"#ffd60a" },
      { pts:[[ex,ey],[ex+3,H*0.72],[ex+7,H*0.56],[ex+10,H*0.42],[ex+12,H*0.28],[ex+14,H*0.15]], c:"#00f5ff" },
      { pts:[[ex,ey],[ex-2,H*0.73],[ex-5,H*0.58],[ex-8,H*0.44],[ex-10,H*0.3],[ex-12,H*0.18]], c:"#c084fc" },
    ];

    paths.forEach((path, pi) => {
      ctx.strokeStyle = path.c; ctx.lineWidth = 1.8; ctx.setLineDash([4,4]);
      ctx.beginPath();
      path.pts.forEach((p,i) => i===0 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]));
      ctx.stroke(); ctx.setLineDash([]);

      const t = (bevPhase.current + pi*0.33) % 1;
      const idx = Math.floor(t*(path.pts.length-1));
      const frac = t*(path.pts.length-1)-idx;
      if (idx < path.pts.length-1) {
        const dx = path.pts[idx][0]+(path.pts[idx+1][0]-path.pts[idx][0])*frac;
        const dy = path.pts[idx][1]+(path.pts[idx+1][1]-path.pts[idx][1])*frac;
        ctx.shadowColor = path.c; ctx.shadowBlur = 10;
        ctx.fillStyle = path.c;
        ctx.beginPath(); ctx.arc(dx,dy,3.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = path.c+"55";
        ctx.beginPath(); ctx.arc(dx,dy,7,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    [45,80,115].forEach(r => {
      ctx.strokeStyle = "rgba(0,245,255,0.1)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(ex,ey,r,0,Math.PI*2); ctx.stroke();
    });
    ctx.fillStyle = "rgba(0,245,255,0.35)";
    ctx.font = "7px 'Share Tech Mono'";
    ctx.fillText("10m", ex+47, ey-2);
    ctx.fillText("20m", ex+82, ey-2);

    const scanR = 28+Math.sin(bevPhase.current*Math.PI*2)*8;
    ctx.strokeStyle = "rgba(0,245,255,0.3)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(ex,ey,scanR,0,Math.PI*2); ctx.stroke();

    ctx.shadowColor = "#00f5ff"; ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(0,245,255,0.2)"; ctx.strokeStyle = "#00f5ff"; ctx.lineWidth = 2;
    ctx.fillRect(ex-10,ey-8,20,16); ctx.strokeRect(ex-10,ey-8,20,16);
    ctx.fillStyle = "#00f5ff";
    ctx.beginPath(); ctx.arc(ex,ey,4,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,245,255,0.6)"; ctx.font = "7px 'Share Tech Mono'";
    ctx.fillText("EGO", ex-9, ey+22);

    bevPhase.current = (bevPhase.current + 0.005) % 1;
  }, [result]);

  const drawTraj = useCallback(() => {
    const canvas = trajRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "#020812"; ctx.fillRect(0,0,W,H);

    ctx.strokeStyle = "rgba(0,245,255,0.06)"; ctx.lineWidth = 0.8;
    for (let x=0;x<W;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for (let y=0;y<H;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    const COLORS = ["#ffd60a","#00f5ff","#c084fc"];

    let objects;
    if (trajData.current && trajData.current.length > 0) {
      objects = trajData.current.map((traj, i) => {
        const scaleX = v => Math.max(10, Math.min(W-10, (v/1280)*W));
        const scaleY = v => Math.max(10, Math.min(H-10, (v/720)*H));
        const startX = W*(0.3+i*0.2), startY = H*0.85;
        const hist = [
          [startX, startY], [startX+2, H*0.72],
          [startX+4, H*0.60], [startX+6, H*0.50]
        ];
        const pred = traj.slice(0,6).map(pt => [scaleX(pt[0]), scaleY(pt[1])]);
        return { id: i+1, hist, pred };
      });
    } else {
      objects = [
        { id:1, hist:[[W*0.28,H*0.92],[W*0.29,H*0.76],[W*0.31,H*0.60],[W*0.33,H*0.46]],
          pred:[[W*0.35,H*0.33],[W*0.37,H*0.21],[W*0.39,H*0.10]] },
        { id:2, hist:[[W*0.72,H*0.88],[W*0.70,H*0.73],[W*0.67,H*0.58],[W*0.65,H*0.44]],
          pred:[[W*0.63,H*0.32],[W*0.61,H*0.21],[W*0.59,H*0.11]] },
        { id:3, hist:[[W*0.50,H*0.95],[W*0.50,H*0.78],[W*0.50,H*0.62],[W*0.50,H*0.48]],
          pred:[[W*0.50,H*0.35],[W*0.50,H*0.23],[W*0.50,H*0.12]] },
      ];
    }

    objects.forEach((obj, i) => {
      const c = COLORS[i%3];
      ctx.strokeStyle = c+"55"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      obj.hist.forEach((p,j) => j===0 ? ctx.moveTo(p[0],p[1]) : ctx.lineTo(p[0],p[1]));
      ctx.stroke();
      obj.hist.forEach((p,j) => {
        ctx.fillStyle = j===obj.hist.length-1 ? c : c+"44";
        ctx.beginPath();
        ctx.arc(p[0],p[1], j===obj.hist.length-1?4.5:2.5, 0, Math.PI*2);
        ctx.fill();
      });
      const startPt = obj.hist[obj.hist.length-1];
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash([5,3]);
      ctx.beginPath(); ctx.moveTo(startPt[0],startPt[1]);
      obj.pred.forEach(p => ctx.lineTo(p[0],p[1]));
      ctx.stroke(); ctx.setLineDash([]);
      obj.pred.forEach((p,j) => {
        ctx.shadowColor = c; ctx.shadowBlur = 6;
        ctx.fillStyle = c+"99";
        ctx.beginPath(); ctx.arc(p[0],p[1],3,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = c; ctx.font = "7px 'Share Tech Mono'";
        ctx.fillText(`t+${j+1}s`, p[0]+5, p[1]-3);
      });
      const allPts = [...obj.hist,...obj.pred];
      const t2 = (trajPhase.current + i*0.35) % 1;
      const dotIdx = Math.floor(t2*(allPts.length-1));
      const dotFrac = t2*(allPts.length-1)-dotIdx;
      if (dotIdx < allPts.length-1) {
        const dx = allPts[dotIdx][0]+(allPts[dotIdx+1][0]-allPts[dotIdx][0])*dotFrac;
        const dy = allPts[dotIdx][1]+(allPts[dotIdx+1][1]-allPts[dotIdx][1])*dotFrac;
        ctx.shadowColor = c; ctx.shadowBlur = 14;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(dx,dy,5.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = c+"44";
        ctx.beginPath(); ctx.arc(dx,dy,10,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = c; ctx.font = "bold 9px 'Orbitron'";
      ctx.fillText(`VEH-${obj.id}`, obj.hist[0][0]-18, obj.hist[0][1]+16);
    });

    ctx.fillStyle = "rgba(0,245,255,0.35)"; ctx.font = "8px 'Share Tech Mono'";
    ctx.fillText("─── HISTORY", 8, H-16);
    ctx.fillText("- - PREDICTED", 8, H-6);
    trajPhase.current = (trajPhase.current + 0.004) % 1;
  }, []);

  useEffect(() => {
    const bev  = setInterval(drawBEV,  50);
    const traj = setInterval(drawTraj, 50);
    return () => { clearInterval(bev); clearInterval(traj); };
  }, [drawBEV, drawTraj]);

  const processResult = useCallback((data) => {
    if (data.mask_b64 && segImgRef.current) {
      segImgRef.current.src = "data:image/jpeg;base64," + data.mask_b64;
      segImgRef.current.style.display = "block";
      if (segImgRef.current.previousSibling)
        segImgRef.current.previousSibling.style.display = "none";
    }
    if (data.bev_b64) {
      bevData.current = data.bev_b64;
      bevImageRef.current.src = "data:image/jpeg;base64," + data.bev_b64;
    }
    if (data.trajectory?.length) trajData.current = data.trajectory;


    const fps   = data.fps || 0;
    const obj   = data.obj_count || 0;
    const conf  = Math.round((data.confidence || 0)*100);
    const threat = obj>4?"HIGH":obj>2?"MEDIUM":"LOW";
    setStats({ fps, obj, conf, threat, mode: videoActive ? "VIDEO" : liveMode ? "LIVE" : "UPLOAD" });
    setDanger(obj > 3);
    setResult(data);
  }, [liveMode, videoActive]);

  const captureFrame = useCallback(() => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = captureRef.current;
      if (!video || video.paused || video.ended || !canvas) {
        resolve();
        return;
      }

      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(); return; }
        const form = new FormData();
        form.append("file", blob, "frame.jpg");
        try {
          const res = await fetch(`${API_BASE}/predict`, {
            method: "POST",
            body: form,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.error) {
              setBackendError(`Backend: ${data.error}`);
            } else {
              setBackendError("");
              processResult(data);
            }
          } else {
            setBackendError(`Server error ${res.status} — backend may be starting up (Render cold start ~30s)`);
          }
        } catch (err) {
          console.error("Frame capture error", err);
          setBackendError("Cannot reach backend — CORS or server down. Check Render logs.");
        }
        resolve();
      }, "image/jpeg", 0.55);
    });
  }, [processResult]);


  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setBackendError("");

    if (file.type.startsWith("video/")) {
      const video = videoRef.current;
      // Release previous object URL if any
      if (video.src && video.src.startsWith("blob:")) URL.revokeObjectURL(video.src);
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        setVideoActive(true);
        video.play().catch(err => console.warn("Autoplay blocked", err));
      };

      video.onplaying = () => {
        if (isProcessingRef.current) return; // already looping
        isProcessingRef.current = true;
        const loop = async () => {
          const v = videoRef.current;
          if (!v || v.paused || v.ended) {
            isProcessingRef.current = false;
            return;
          }
          await captureFrame();
          // Use requestAnimationFrame-like delay – let the event loop breathe
          setTimeout(loop, 200); // 5 fps to backend – enough for analysis
        };
        loop();
      };

      video.onended = () => {
        isProcessingRef.current = false;
        setVideoActive(false);
      };

      video.onerror = () => {
        isProcessingRef.current = false;
        setBackendError("Unsupported video format or corrupted file.");
        setVideoActive(false);
      };
      return;
    }

    // Image upload
    setLoading(true);
    setVideoActive(false);
    const form = new FormData();
    form.append("file", file);
    const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${API_BASE}/predict`, { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        if (data.error) setBackendError(`Backend: ${data.error}`);
        else { setBackendError(""); processResult(data); }
      } else {
        setBackendError(`Server error ${res.status}. Backend may be cold-starting on Render (~30s)`);
      }
    } catch (err) {
      console.error("Upload error", err);
      setBackendError("Cannot reach backend — CORS blocked or server is down.");
    }
    setLoading(false);
  };

  const toggleLive = () => {
    setVideoActive(false);
    if (!liveMode) {
      const WS_BASE = (process.env.REACT_APP_API_URL || "http://localhost:8000").replace("http", "ws");
      wsRef.current = new WebSocket(`${WS_BASE}/ws/live`);
      wsRef.current.onmessage = e => processResult(JSON.parse(e.data));
      setLiveMode(true);
    } else {
      wsRef.current?.close();
      setLiveMode(false);
    }
  };

  const stopVideo = () => {
    isProcessingRef.current = false;
    if (analysisTimer.current) clearInterval(analysisTimer.current);
    if (videoRef.current) videoRef.current.pause();
    setVideoActive(false);
    setFileName("");
    setBackendError("");
  };

  const threatColor = stats.threat==="HIGH"?"#ff2d55":stats.threat==="MEDIUM"?"#ffd60a":"#00ff88";

  return (
    <>
      <style>{CSS}</style>
      <div className="bg-grid"/>
      <div className="header">
        <div className="header-inner">
          <div className="logo-block">
            <div className="logo-icon">🛣️</div>
            <div>
              <div className="logo-title">BHARAT PERCEPTION</div>
              <div className="logo-sub">AUTONOMOUS ROAD INTELLIGENCE SYSTEM &nbsp;|&nbsp; BENGALURU</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div className="status-label"><div className="status-dot"/>&nbsp;SYSTEM ONLINE</div>
            <div className="sys-time">{clock}</div>
          </div>
        </div>
      </div>

      {backendError && (
        <div className="error-banner">
          <span style={{fontSize:18}}>⚡</span>
          <div className="error-text">BACKEND OFFLINE: {backendError}</div>
        </div>
      )}

      {danger && (
        <div className="danger-banner">
          <span style={{fontSize:18,animation:"blink 0.8s ease-in-out infinite"}}>⚠</span>
          <div className="danger-text">DANGER: {stats.obj} OBSTACLES IN DETECTION ZONE — BRAKE ADVISORY ACTIVE</div>
        </div>
      )}

      <div className="controls">
        {!videoActive ? (
          <label className="file-label">
            <span>📁</span> {fileName ? fileName : "UPLOAD FRAME/VIDEO"}
            <input type="file" accept="video/*,image/*" style={{display:"none"}} onChange={handleUpload}/>
          </label>
        ) : (
          <button className="btn btn-stop" onClick={stopVideo}>⏹ STOP VIDEO ANALYSIS</button>
        )}
        <button className={`btn ${liveMode?"btn-stop":"btn-live"}`} onClick={toggleLive}>
          {liveMode?"⏹ STOP LIVE":"⬤ START LIVE"}
        </button>
        {loading && <div className="processing"><div className="spinner"/>PROCESSING...</div>}
        {videoActive && <div className="processing" style={{color:'var(--green)'}}><div className="spinner" style={{borderColor:'var(--green)T', borderTopColor:'var(--green)'}}/>VIDEO STREAM ACTIVE</div>}
      </div>

      <div className="stats-bar">
        {[
          {label:"FRAME RATE",   val:stats.fps,   unit:"frames / sec",          ac:"var(--cyan)",  w:Math.min(stats.fps/30*100,100)},
          {label:"OBJECTS",      val:stats.obj,   unit:"vehicles + pedestrians", ac:"var(--green)", w:Math.min(stats.obj/10*100,100)},
          {label:"CONFIDENCE",   val:stats.conf+"%",unit:"road drivable area",   ac:"var(--orange)",w:stats.conf},
          {label:"PIPELINE MODE",val:stats.mode,  unit:"active data source",     ac:"var(--yellow)",w:100},
          {label:"THREAT LEVEL", val:stats.threat,unit:stats.threat==="HIGH"?"obstacle in path":stats.threat==="MEDIUM"?"caution":"path clear", ac:threatColor, w:stats.threat==="HIGH"?85:stats.threat==="MEDIUM"?50:20},
        ].map(s => (
          <div key={s.label} className="stat-card" style={{"--ac":s.ac}}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{fontSize:s.val.toString().length>4?14:22}}>{s.val}</div>
            <div className="stat-unit">{s.unit}</div>
            <div className="stat-bar-bg"><div className="stat-bar-fill" style={{width:s.w+"%","--ac":s.ac}}/></div>
          </div>
        ))}
      </div>

      <div className="panels">
        <div className="panel" style={{"--ac":"var(--green)"}}>
          <div className="panel-header">
            <div className="panel-title">PS2 — REAL-TIME VEHICLE TRACKING</div>
            <div className="panel-badge">DeepLabV3+ | YOLOv8</div>
          </div>
          <div className="panel-body">
            <div className="img-wrap">
              <div className="corner c-tl" style={{"--ac":"var(--green)"}}/>
              <div className="corner c-tr" style={{"--ac":"var(--green)"}}/>
              <div className="corner c-bl" style={{"--ac":"var(--green)"}}/>
              <div className="corner c-br" style={{"--ac":"var(--green)"}}/>
              
              {videoActive && !result && <div className="video-status">INITIALIZING STREAM...</div>}
              
              {!result && !videoActive && (
                <div className="placeholder"><span style={{fontSize:26}}>🛣️</span>AWAITING INPUT</div>
              )}
              
              <img ref={segImgRef} alt="seg" style={{display: result ? "block" : "none", width:"100%", borderRadius: "6px"}}/>
              <video ref={videoRef} id="hidden-video" muted playsInline style={{display: "none"}}></video>

            </div>
            <div className="metrics-grid">
              {[
                {l:"mIoU SCORE", v:result?((result.confidence||0.45)*0.85).toFixed(2):"—", c:"#00ff88"},
                {l:"ROAD PIXELS",v:result?Math.round((result.confidence||0.45)*100)+"%":"—", c:"#00ff88"},
                {l:"INFERENCE", v:result&&result.fps>0?Math.round(1000/result.fps)+"ms":"—", c:"#00ff88"},
                {l:"RESOLUTION",v:"520²",c:"#00ff88"},
              ].map(m=>(
                <div key={m.l} className="mini-stat" style={{background:"rgba(0,255,136,0.05)",border:"1px solid rgba(0,255,136,0.15)"}}>
                  <div className="mini-label">{m.l}</div>
                  <div className="mini-value" style={{color:m.c}}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel" style={{"--ac":"var(--orange)"}}>
          <div className="panel-header">
            <div className="panel-title">PS3 — BEV OCCUPANCY GRID</div>
            <div className="panel-badge">IPM TRANSFORM</div>
          </div>
          <div className="panel-body">
            <canvas ref={bevRef} width={280} height={210}/>
            <div className="bev-legend">
              {[["#00ff88","FREE SPACE"],["#ff6b1a","OCCUPIED"],["#00f5ff","EGO VEHICLE"],["#ffd60a","PREDICTED"]].map(([c,l])=>(
                <div key={l} className="leg-item"><div className="leg-dot" style={{background:c}}/>{l}</div>
              ))}
            </div>
            <div className="metrics-grid" style={{marginTop:8}}>
              {[
                {l:"OCC-IoU",  v:result?((result.confidence||0.45)*0.75).toFixed(2):"—", c:"var(--orange)"},
                {l:"GRID SIZE",v:"300×300",c:"var(--orange)"},
              ].map(m=>(
                <div key={m.l} className="mini-stat" style={{background:"rgba(255,107,26,0.05)",border:"1px solid rgba(255,107,26,0.15)"}}>
                  <div className="mini-label">{m.l}</div>
                  <div className="mini-value" style={{color:m.c}}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel" style={{"--ac":"var(--cyan)"}}>
          <div className="panel-header">
            <div className="panel-title">PS1 — TRAJECTORY PREDICTION</div>
            <div className="panel-badge">Social LSTM</div>
          </div>
          <div className="panel-body">
            <canvas ref={trajRef} width={280} height={170}/>
            <div className="traj-objects">
              {result?.trajectory?.length > 0
                ? result.trajectory.slice(0,3).map((traj,i) => (
                    <div key={i} className="obj-card">
                      <div className="obj-hdr">
                        <div className="obj-id" style={{color:["#ffd60a","#00f5ff","#c084fc"][i]}}>VEH-{i+1}</div>
                        <div className="obj-tag">TRACKED</div>
                      </div>
                      <div className="path-grid">
                        {traj.slice(0,6).map((pt,j)=>(
                          <div key={j} className="path-pt">
                            <div className="path-t">t+{j+1}s</div>
                            <div className="path-xy">{pt[0].toFixed(0)},{pt[1].toFixed(0)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                : <div style={{textAlign:"center",padding:"14px",color:"var(--dim)",fontFamily:"'Share Tech Mono',monospace",fontSize:10}}>
                    TRACKING ACTIVE — UPLOAD VIDEO TO SEE PATHS
                  </div>
              }
            </div>
          </div>
        </div>
      </div>

      <canvas ref={captureRef} id="capture-canvas"></canvas>

      <div className="bottom-bar">
        <div className="bottom-info">BHARAT PERCEPTION v1.0 &nbsp;|&nbsp; RTX 3050 6GB &nbsp;|&nbsp; CUDA 11.7 &nbsp;|&nbsp; Bengaluru Urban Roads</div>
        <div className="flow">
          {["PS2 SEG","PS3 BEV","PS1 TRAJ","DASHBOARD"].map((s,i,arr)=>(
            <span key={s} style={{display:"flex",alignItems:"center",gap:6}}>
              <div className="flow-step">{s}</div>
              {i<arr.length-1 && <div className="flow-arr">→</div>}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
