import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function fmt(n) {
  return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}

function withAlpha(color, alpha = 0.85) {
  const c = (color || "").trim();

  if (c.startsWith("rgb(")) return c.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  if (c.startsWith("rgba(")) return c;

  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return `rgba(13,110,253, ${alpha})`;
}

function formatShortDate(label) {
  const d = new Date(label);
  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat("ar-EG", { day: "2-digit", month: "2-digit" }).format(d);
  }
  return String(label || "");
}

export default function SalesTrendColumnChart({ rows = [], loading = false }) {
  const { data, options } = useMemo(() => {
    const labels = rows.map((r) => r.label);
    const revenue = rows.map((r) => Number(r.revenue || 0));

    const css = getComputedStyle(document.documentElement);
    const primary = css.getPropertyValue("--bs-primary").trim() || "#0d6efd";
    const textColor = "rgba(255,255,255,0.85)";
    const gridColor = "rgba(255,255,255,0.08)";

    const n = labels.length;
    const step =
      n <= 10 ? 1 :
      n <= 20 ? 2 :
      n <= 35 ? 3 :
      n <= 60 ? 5 : 7;

    return {
      data: {
        labels,
        datasets: [
          {
            label: "الإيراد",
            data: revenue,
            backgroundColor: withAlpha(primary, 0.8),
            borderColor: withAlpha(primary, 1),
            borderWidth: 1,
            borderRadius: 8,
            maxBarThickness: 26,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: textColor },
          },
          tooltip: {
            callbacks: {
              title: (items) => {
                const raw = items?.[0]?.label;
                const d = new Date(raw);
                if (!Number.isNaN(d.getTime())) {
                  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(d);
                }
                return String(raw || "");
              },
              label: (ctx) => `الإيراد: ${fmt(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              autoSkip: false, 
              maxRotation: 0,
              minRotation: 0,
              callback: function (value, index) {
                if (index % step !== 0 && index !== n - 1) return "";
                return formatShortDate(labels[index]);
              },
            },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              callback: (val) => fmt(val),
            },
            grid: { color: gridColor },
          },
        },
      },
    };
  }, [rows]);

  if (loading) return <div className="text-center py-4">جاري التحميل...</div>;
  if (!rows.length) return <div className="text-center py-4 text-secondary">لا توجد بيانات</div>;

  return (
    <div style={{ height: 320 }} dir="rtl">
      <Bar data={data} options={options} />
    </div>
  );
}
