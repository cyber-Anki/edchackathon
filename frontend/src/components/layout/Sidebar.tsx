import { NavLink } from "react-router-dom";
import { BarChart3, GitPullRequest, LayoutDashboard } from "lucide-react";
import { CausalWatermark } from "../widgets/CausalWatermark";
import { useStatusQuery } from "../../lib/api";

const NAV: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/benchmark", label: "Benchmark Suite", icon: BarChart3 },
  { to: "/contribution", label: "Open Source PR", icon: GitPullRequest },
];

function MarkGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden>
      <g stroke="currentColor" strokeWidth="1.5" fill="none" className="text-teal">
        <path d="M4 28 H28 V4" />
        <path d="M4 28 L28 4" />
        <path d="M4 28 H16 V16 H4 Z" />
      </g>
    </svg>
  );
}

export function Sidebar() {
  const { data } = useStatusQuery();

  const device = data?.device ?? "—";
  const ckpt = data?.bdh_checkpoint ?? "—";
  const ts = data?.last_extraction_ts ?? null;

  return (
    <aside
      className="group/sidebar sticky top-0 z-20 h-screen w-14 hover:w-sidebar shrink-0 bg-panel border-r border-hairline flex flex-col rounded-none overflow-hidden transition-[width] duration-150 ease-out"
    >
      <div className="relative px-3.5 pt-5 pb-4 min-h-[64px]">
        <CausalWatermark />
        <div className="relative z-[1] flex items-center gap-2 text-teal whitespace-nowrap">
          <MarkGlyph />
          <span className="font-sans font-semibold text-[16px] text-primary tracking-tight opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
            BDH//SCOPE
          </span>
        </div>
      </div>

      <div className="h-px bg-hairline mx-0" />

      <nav className="flex-1 py-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              [
                "flex items-center gap-2 px-3.5 py-2.5 text-body font-sans font-medium border-l-2 whitespace-nowrap",
                isActive
                  ? "border-teal text-primary"
                  : "border-transparent text-secondary hover:bg-panel-raised hover:text-primary",
              ].join(" ")
            }
          >
            <Icon size={16} strokeWidth={1.5} className="text-secondary shrink-0" />
            <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-hairline px-4 py-4 space-y-2 opacity-0 pointer-events-none group-hover/sidebar:opacity-100 group-hover/sidebar:pointer-events-auto transition-opacity duration-150 whitespace-nowrap overflow-hidden">
        <div className="font-sans text-eyebrow uppercase text-secondary">Run config</div>
        <div className="font-mono text-metric-sm text-tertiary break-all whitespace-normal" title={ckpt}>
          ckpt: {ckpt.length > 36 ? `…${ckpt.slice(-34)}` : ckpt}
        </div>
        <div className="font-mono text-metric-sm text-secondary">device: {device}</div>
        <div className="font-mono text-metric-sm text-tertiary">
          last extract: {ts ? new Date(ts).toLocaleString() : "—"}
        </div>
      </div>
    </aside>
  );
}
