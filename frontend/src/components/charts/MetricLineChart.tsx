import Plot from "react-plotly.js";
import { chartSeries, colors, fonts } from "../../theme/tokens";

export type LinePoint = { seq_len: number; value: number };

type Props = {
  bdh: LinePoint[];
  transformer: LinePoint[];
  yLabel: string;
  height?: number;
};

export function MetricLineChart({ bdh, transformer, yLabel, height = 280 }: Props) {
  return (
    <Plot
      data={[
        {
          x: bdh.map((p) => p.seq_len),
          y: bdh.map((p) => p.value),
          type: "scatter",
          mode: "lines+markers",
          name: "BDH",
          line: { color: chartSeries.bdh, width: 2 },
          marker: { size: 6, color: chartSeries.bdh },
          hovertemplate: `BDH<br>seq=%{x}<br>${yLabel}=%{y:.4f}<extra></extra>`,
          showlegend: false,
        },
        {
          x: transformer.map((p) => p.seq_len),
          y: transformer.map((p) => p.value),
          type: "scatter",
          mode: "lines+markers",
          name: "Transformer",
          line: { color: chartSeries.transformer, width: 2 },
          marker: { size: 6, color: chartSeries.transformer },
          hovertemplate: `Transformer<br>seq=%{x}<br>${yLabel}=%{y:.4f}<extra></extra>`,
          showlegend: false,
        },
      ]}
      layout={{
        paper_bgcolor: colors.bgPanel,
        plot_bgcolor: colors.bgVoid,
        margin: { t: 16, r: 16, b: 48, l: 56 },
        height,
        xaxis: {
          title: { text: "seq_len", font: { family: fonts.mono, size: 11, color: colors.textTertiary } },
          tickfont: { family: fonts.mono, size: 10, color: colors.textTertiary },
          gridcolor: colors.borderHairline,
          zeroline: false,
          type: "log",
        },
        yaxis: {
          title: { text: yLabel, font: { family: fonts.mono, size: 11, color: colors.textTertiary } },
          tickfont: { family: fonts.mono, size: 10, color: colors.textTertiary },
          gridcolor: colors.borderHairline,
          zeroline: false,
        },
        font: { family: fonts.mono, color: colors.textSecondary },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
      useResizeHandler
    />
  );
}
