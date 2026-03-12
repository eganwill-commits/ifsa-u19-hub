"use client";
import { useEffect, useState } from "react";

function decodeWMO(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "☀️", label: "Clear sky" };
  if (code <= 2)  return { icon: "🌤️", label: "Partly cloudy" };
  if (code === 3) return { icon: "☁️", label: "Overcast" };
  if (code <= 49) return { icon: "🌫️", label: "Foggy" };
  if (code <= 69) return { icon: "🌧️", label: "Rain" };
  if (code <= 79) return { icon: "❄️", label: "Snow" };
  if (code <= 86) return { icon: "🌨️", label: "Snow showers" };
  if (code <= 99) return { icon: "⛈️", label: "Thunderstorm" };
  return { icon: "🌡️", label: "Unknown" };
}

export default function WeatherPanel({ lat, lon }: { lat: number; lon: number }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,snowfall` +
      `&daily=snowfall_sum&forecast_days=1&temperature_unit=celsius&windspeed_unit=kmh&timezone=auto`
    )
      .then(r => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, [lat, lon]);

  if (error) return <p style={{ color: "#aaa", fontSize: 13 }}>Weather unavailable for this location.</p>;
  if (!data)  return <p style={{ color: "#aaa", fontSize: 13 }}>Loading weather…</p>;

  const c = data.current;
  const { icon, label } = decodeWMO(c.weathercode);
  const snowToday = data.daily.snowfall_sum[0] ?? 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <span style={{ fontSize: 42, lineHeight: 1 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{Math.round(c.temperature_2m)}°C</div>
          <div style={{ fontSize: 13, color: "#4a9edd", marginTop: 2 }}>{label}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "WIND",     value: `${Math.round(c.windspeed_10m)} km/h` },
          { label: "HUMIDITY", value: `${c.relativehumidity_2m}%` },
          { label: "SNOWFALL", value: snowToday > 0 ? `${snowToday} cm today` : "None today" },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "#555", fontFamily: "monospace", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>
      {snowToday > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", fontFamily: "monospace", marginBottom: 5 }}>
            <span>TODAY'S SNOWFALL</span><span>{snowToday} cm</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${Math.min(100, snowToday * 10)}%`, background: "linear-gradient(90deg, #4a9edd, #a0d4f5)", borderRadius: 2 }} />
          </div>
        </div>
      )}
    </div>
  );
}