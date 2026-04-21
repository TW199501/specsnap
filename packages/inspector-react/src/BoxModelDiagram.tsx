import type { Session } from '@tw199501/specsnap-inspector-core';
type Frame = Session['frames'][number];

const W = 200;
const H = 150;
const LAYER = 20;

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

export function BoxModelDiagram({ frame }: { frame: Frame }) {
  const m = frame.boxModel.margin.map(n => Math.round(n));
  const b = frame.boxModel.border.map(n => Math.round(n));
  const p = frame.boxModel.padding.map(n => Math.round(n));
  const contentLabel = `${fmt(frame.boxModel.content.width)}×${fmt(frame.boxModel.content.height)}`;

  const mT = LAYER, mR = LAYER, mB = LAYER, mL = LAYER;
  const bT = LAYER, bR = LAYER, bB = LAYER, bL = LAYER;
  const pT = LAYER, pR = LAYER, pB = LAYER, pL = LAYER;

  return (
    <svg width={W} height={H} className="specsnap-inspector-bmdiag" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="#fef3c7" stroke="#d97706" strokeWidth={1} strokeDasharray="4 3" rx={3} />
      <text x={6} y={12} fontSize={9} fill="#92400e">margin</text>
      <text x={W / 2} y={9} textAnchor="middle" fontSize={9} fill="#92400e">{m[0]}</text>
      <text x={W - 4} y={H / 2 + 3} textAnchor="end" fontSize={9} fill="#92400e">{m[1]}</text>
      <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={9} fill="#92400e">{m[2]}</text>
      <text x={4} y={H / 2 + 3} fontSize={9} fill="#92400e">{m[3]}</text>

      <rect x={mL} y={mT} width={W - mL - mR} height={H - mT - mB} fill="#fde68a" stroke="#78350f" strokeWidth={1} strokeDasharray="4 3" rx={2} />
      <text x={mL + 4} y={mT + 11} fontSize={9} fill="#78350f">border</text>
      <text x={W / 2} y={mT + 8} textAnchor="middle" fontSize={9} fill="#78350f">{b[0]}</text>
      <text x={W - mR - 4} y={(mT + (H - mB)) / 2 + 3} textAnchor="end" fontSize={9} fill="#78350f">{b[1]}</text>
      <text x={W / 2} y={H - mB - 4} textAnchor="middle" fontSize={9} fill="#78350f">{b[2]}</text>
      <text x={mL + 4} y={(mT + (H - mB)) / 2 + 3} fontSize={9} fill="#78350f">{b[3]}</text>

      <rect x={mL + bL} y={mT + bT} width={W - mL - mR - bL - bR} height={H - mT - mB - bT - bB} fill="#bbf7d0" stroke="#15803d" strokeWidth={1} strokeDasharray="3 3" rx={2} />
      <text x={mL + bL + 4} y={mT + bT + 11} fontSize={9} fill="#14532d">padding</text>
      <text x={W / 2} y={mT + bT + 8} textAnchor="middle" fontSize={9} fill="#14532d">{p[0]}</text>
      <text x={W - mR - bR - 4} y={(mT + bT + (H - mB - bB)) / 2 + 3} textAnchor="end" fontSize={9} fill="#14532d">{p[1]}</text>
      <text x={W / 2} y={H - mB - bB - 4} textAnchor="middle" fontSize={9} fill="#14532d">{p[2]}</text>
      <text x={mL + bL + 4} y={(mT + bT + (H - mB - bB)) / 2 + 3} fontSize={9} fill="#14532d">{p[3]}</text>

      <rect
        x={mL + bL + pL}
        y={mT + bT + pT}
        width={Math.max(10, W - mL - mR - bL - bR - pL - pR)}
        height={Math.max(10, H - mT - mB - bT - bB - pT - pB)}
        fill="#bfdbfe"
        stroke="#1e3a8a"
        strokeWidth={1}
      />
      <text
        x={W / 2}
        y={(mT + bT + pT + (H - mB - bB - pB)) / 2 + 3}
        textAnchor="middle"
        fontSize={10}
        fill="#0f172a"
        fontWeight={600}
      >{contentLabel}</text>
    </svg>
  );
}
