import Plot from "react-plotly.js";
import { chartSeries, colors, fonts } from "../../theme/tokens";

type Props = {
  labels: string[];
  bdh: number[];
  transformer: number[];
  yLabel: string;
  height?: number;
};

export function ComparisonBar({ labels, bdh, transformer, yLabel, height = 260 }: Props) {
  return (
    <Plot
      data={[
        {
          x: labels,
          y: bdh,
          type: "bar",
          name: "BDH",
          marker: { color: chartSeries.bdh },
          showlegend: false,
          hovertemplate: `BDH<br>%{x}<br>${yLabel}=%{y:.4f}<extra></extra>`,
        },
        {
          x: labels,
          y: transformer,
          type: "bar",
          name: "Transformer",
          marker: { color: chartSeries.transformer },
          showlegend: false,
          hovertemplate: `Transformer<br>%{x}<br>${yLabel}=%{y:.4f}<extra></extra>`,
        },
      ]}
      layout={{
        barmode: "group",
        paper_bgcolor: colors.bgPanel,
        plot_bgcolor: colors.bgVoid,
        margin: { t: 16, r: 16, b: 48, l: 56 },
        height,
        xaxis: {
          tickfont: { family: fonts.mono, size: 10, color: colors.textTertiary },
          gridcolor: colors.borderHairline,
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
