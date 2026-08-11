import Plot from "react-plotly.js";
import { colors, fonts, tealColorscale } from "../../theme/tokens";

type Props = {
  matrix: number[][];
  title?: string;
  height?: number;
};

export function Heatmap({ matrix, title, height = 480 }: Props) {
  const n = matrix.length;
  return (
    <Plot
      data={[
        {
          z: matrix,
          type: "heatmap",
          colorscale: tealColorscale,
          zmin: 0,
          zmax: Math.max(...matrix.flat(), 1e-9),
          hovertemplate: "i=%{y}<br>j=%{x}<br>w=%{z:.4f}<extra></extra>",
          colorbar: {
            tickfont: { family: fonts.mono, size: 11, color: colors.textSecondary },
            outlinewidth: 0,
            bgcolor: colors.bgPanel,
          },
        },
      ]}
      layout={{
        title: title
          ? { text: title, font: { family: fonts.sans, size: 13, color: colors.textSecondary } }
          : undefined,
        paper_bgcolor: colors.bgPanel,
        plot_bgcolor: colors.bgVoid,
        margin: { t: title ? 40 : 24, r: 48, b: 48, l: 48 },
        height,
        xaxis: {
          title: { text: "key", font: { family: fonts.mono, size: 11, color: colors.textTertiary } },
          tickfont: { family: fonts.mono, size: 10, color: colors.textTertiary },
          gridcolor: colors.borderHairline,
          zeroline: false,
          range: [-0.5, n - 0.5],
        },
        yaxis: {
          title: { text: "query", font: { family: fonts.mono, size: 11, color: colors.textTertiary } },
          tickfont: { family: fonts.mono, size: 10, color: colors.textTertiary },
          gridcolor: colors.borderHairline,
          zeroline: false,
          autorange: "reversed",
          range: [-0.5, n - 0.5],
        },
        font: { family: fonts.mono, color: colors.textSecondary },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
      useResizeHandler
    />
  );
}
