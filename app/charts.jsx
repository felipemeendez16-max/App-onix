/* ============ App Onix — Charts (hand-rolled SVG, data-driven) ============ */

/* ---------- Donut chart ---------- */
function DonutChart({ data, size = 180, thickness = 26, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = total > 0 ? data.filter(d => d.value > 0).map(d => {
    const frac = d.value / total;
    const seg = { ...d, frac, dash: frac * circ, offset };
    offset += frac * circ;
    return seg;
  }) : [];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
      {segs.map((s, i) => (
        <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
          strokeDasharray={`${Math.max(0, s.dash - 2)} ${circ}`} strokeDashoffset={-s.offset} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }} />
      ))}
      {centerValue !== undefined && (
        <g style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
          <text x={c} y={c - 4} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize={size * 0.13} fill="var(--text)">{centerValue}</text>
          {centerLabel && <text x={c} y={c + 16} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--text-faint)">{centerLabel}</text>}
        </g>
      )}
    </svg>
  );
}

function ChartLegend({ data, fmt = formatBRL, total }) {
  const sum = total != null ? total : data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%' }}>
      {data.filter(d => d.value > 0).map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
          <span className="cat-dot" style={{ background: d.color, width: 10, height: 10 }} />
          <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
          <span className="mono-num" style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>{sum > 0 ? formatPct(d.value / sum * 100, 0) : '0%'}</span>
          <span className="mono-num" style={{ fontWeight: 700, minWidth: 78, textAlign: 'right' }}>{fmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Grouped bar chart (months comparison) ---------- */
function GroupedBars({ groups, series, height = 240, fmt = formatBRL }) {
  // groups: [{label, values:{key:val}}], series: [{key,label,color}]
  const allVals = groups.flatMap(g => series.map(s => g.values[s.key] || 0));
  const max = Math.max(1, ...allVals);
  const padTop = 16, padBottom = 30, padLeft = 4;
  const plotH = height - padTop - padBottom;
  const gw = 100 / groups.length;
  const barGap = 0.14, groupPad = 0.16;
  const innerW = gw * (1 - groupPad);
  const bw = innerW / series.length * (1 - barGap);
  return (
    <div style={{ width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1="0" x2="100" y1={padTop + plotH * (1 - t)} y2={padTop + plotH * (1 - t)} stroke="var(--border)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
        ))}
        {groups.map((g, gi) => {
          const gx = gi * gw + gw * groupPad / 2;
          return series.map((s, si) => {
            const v = g.values[s.key] || 0;
            const h = Math.abs(v) / max * plotH;
            const x = gx + si * (innerW / series.length) + (innerW / series.length - bw) / 2;
            const y = v >= 0 ? padTop + plotH - h : padTop + plotH;
            return <rect key={gi + '-' + si} x={x} y={y} width={bw} height={Math.max(0.5, h)} rx="1.2" fill={s.color}
              style={{ transition: 'height 0.5s ease, y 0.5s ease' }} />;
          });
        })}
      </svg>
      <div style={{ display: 'flex', marginTop: -24 }}>
        {groups.map((g, i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: 'var(--text-faint)' }}>{g.label}</div>)}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
        {series.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--text-dim)' }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color }} />{s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Line chart (profit evolution) ---------- */
function LineChart({ points, height = 230, color = 'var(--accent)', fmt = formatBRL }) {
  // points: [{label, value}]
  const [hover, setHover] = useState(null);
  if (points.length === 0) return null;
  const W = 100, padTop = 14, padBottom = 26, padX = 3;
  const plotH = height - padTop - padBottom;
  const vals = points.map(p => p.value);
  const max = Math.max(1, ...vals, 0);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  const n = points.length;
  const xAt = i => n === 1 ? W / 2 : padX + (i / (n - 1)) * (W - padX * 2);
  const yAt = v => padTop + plotH * (1 - (v - min) / range);
  const linePts = points.map((p, i) => `${xAt(i)},${yAt(p.value)}`).join(' ');
  const areaPts = `${xAt(0)},${yAt(min)} ${linePts} ${xAt(n - 1)},${yAt(min)}`;
  const zeroY = yAt(0);
  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t, i) => <line key={i} x1="0" x2={W} y1={padTop + plotH * t} y2={padTop + plotH * t} stroke="var(--border)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />)}
        {min < 0 && <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="var(--border-strong)" strokeWidth="0.4" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />}
        <polygon points={areaPts} fill="url(#lineFill)" />
        <polyline points={linePts} fill="none" stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xAt(i)} cy={yAt(p.value)} r={hover === i ? 3 : 2} fill="var(--surface)" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            <rect x={xAt(i) - (W / n / 2)} y="0" width={W / n} height={height} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', marginTop: 4 }}>
        {points.map((p, i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)' }}>{p.label}</div>)}
      </div>
      {hover != null && (
        <div style={{ position: 'absolute', top: 0, left: `${xAt(hover)}%`, transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--bg)', padding: '5px 9px', borderRadius: 8, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: 'var(--shadow-md)' }}>
          {fmt(points[hover].value)}
        </div>
      )}
    </div>
  );
}

/* ---------- Radial gauge (270° arc) ---------- */
function RadialGauge({ pct, color, size = 150, thickness = 13, big, sub }) {
  const pad = thickness;                       // room for the glow to bleed outside the arc
  const r = (size - thickness) / 2 - pad / 2, c = size / 2, circ = 2 * Math.PI * r;
  const sweep = 0.75; // 270°
  const clamped = Math.max(0, Math.min(100, pct));
  const track = sweep * circ;
  const prog = (clamped / 100) * sweep * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <g transform={`rotate(135 ${c} ${c})`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} strokeDasharray={`${track} ${circ}`} strokeLinecap="round" />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeDasharray={`${prog} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(.3,1,.4,1)', filter: 'drop-shadow(0 0 4px ' + color + ')' }} />
      </g>
      <text x={c} y={c - 2} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize={size * 0.2} letterSpacing="-0.04em" fill={color}>{big}</text>
      {sub && <text x={c} y={c + size * 0.15} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="var(--text-faint)">{sub}</text>}
    </svg>
  );
}

Object.assign(window, { DonutChart, ChartLegend, GroupedBars, LineChart, RadialGauge });
