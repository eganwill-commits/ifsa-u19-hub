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

function fmtDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
}

export default function WeatherPanel({ lat, lon }: { lat: number; lon: number }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const weatherUrl = "https://forecast.weather.gov/MapClick.php?lat=" + lat + "&lon=" + lon;

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,snowfall" +
      "&daily=weathercode,temperature_2m_max,temperature_2m_min,snowfall_sum,windspeed_10m_max" +
      "&forecast_days=5&temperature_unit=fahrenheit&windspeed_unit=kmh&timezone=auto"
    )
      .then(function(r) { return r.json(); })
      .then(setData)
      .catch(function() { setError(true); });
  }, [lat, lon]);

  if (error) return <p style={{ color: "#aaa", fontSize: 13 }}>Weather unavailable for this location.</p>;
  if (!data)  return <p style={{ color: "#aaa", fontSize: 13 }}>Loading weather...</p>;

  const c = data.current;
  const current = decodeWMO(c.weathercode);
  const snowToday = data.daily.snowfall_sum[0] ?? 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <span style={{ fontSize: 42, lineHeight: 1 }}>{current.icon}</span>
        <div>
          <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{Math.round(c.temperature_2m)}F</div>
          <div style={{ fontSize: 13, color: "#4a9edd", marginTop: 2 }}>{current.label}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
        {[
          { label: "WIND",     value: Math.round(c.windspeed_10m) + " km/h" },
          { label: "HUMIDITY", value: c.relativehumidity_2m + "%" },
          { label: "SNOWFALL", value: snowToday > 0 ? snowToday + " cm today" : "None today" },
        ].map(function(item) {
          return (
            <div key={item.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: "#555", fontFamily: "monospace", letterSpacing: 1, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>5-Day Forecast</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
        {data.daily.time.map(function(day: string, i: number) {
          const dayWeather = decodeWMO(data.daily.weathercode[i]);
          const snow = data.daily.snowfall_sum[i] ?? 0;
          return (
            <div key={day} style={{ background: i === 0 ? "rgba(74,158,221,0.1)" : "rgba(255,255,255,0.03)", border: "1px solid " + (i === 0 ? "#1a2a3a" : "#2a2a2a"), borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 6, fontFamily: "monospace" }}>{i === 0 ? "TODAY" : fmtDay(day).toUpperCase()}</div>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{dayWeather.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{Math.round(data.daily.temperature_2m_max[i])}F</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>{Math.round(data.daily.temperature_2m_min[i])}F</div>
              {snow > 0 && <div style={{ fontSize: 10, color: "#4a9edd", marginTop: 4 }}>snow {snow}cm</div>}
            </div>
          );
        })}
      </div>

      <a href={weatherUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", fontSize: 13, color: "#ffcc00", border: "1px solid #ffcc00", borderRadius: 8, padding: "6px 14px", textDecoration: "none" }}>
        Full forecast
      </a>
    </div>
  );
}