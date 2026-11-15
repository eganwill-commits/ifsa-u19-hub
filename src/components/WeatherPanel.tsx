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

// Open-Meteo daily dates are plain YYYY-MM-DD in the resort's zone; parse at noon
// UTC so the weekday never slips a day in the viewer's time zone.
function fmtDay(dateStr: string) {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}
function fmtMd(dateStr: string) {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function WeatherPanel({ lat, lon, eventStart, eventEnd }: { lat: number; lon: number; eventStart?: string | null; eventEnd?: string | null }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const weatherUrl = "https://forecast.weather.gov/MapClick.php?lat=" + lat + "&lon=" + lon;

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,snowfall" +
      "&daily=weathercode,temperature_2m_max,temperature_2m_min,snowfall_sum,windspeed_10m_max" +
      "&forecast_days=16&temperature_unit=fahrenheit&windspeed_unit=kmh&timezone=auto"
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

  // Which days to show: the comp's own days once they're inside the 16-day
  // forecast (plus the two days before, for travel), otherwise the next 5 days.
  const days: string[] = data.daily.time;
  const lastDay = days[days.length - 1];
  const evStart = eventStart ?? null;
  const evEnd = eventEnd ?? eventStart ?? null;
  const inRange = !!evStart && evStart <= lastDay && (evEnd ?? evStart) >= days[0];
  let idx: number[];
  if (inRange) {
    const from = new Date(evStart + "T12:00:00Z"); from.setUTCDate(from.getUTCDate() - 2);
    const fromYmd = from.toISOString().slice(0, 10);
    idx = days.map((d, i) => [d, i] as const).filter(([d]) => d >= fromYmd && d <= (evEnd as string)).map(([, i]) => i).slice(0, 7);
  } else {
    idx = [0, 1, 2, 3, 4];
  }
  const isEventDay = (d: string) => !!evStart && d >= evStart && d <= (evEnd as string);
  const weeksOut = evStart && !inRange && evStart > lastDay
    ? Math.round((new Date(evStart + "T12:00:00Z").getTime() - Date.now()) / (7 * 86400000))
    : null;

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

      <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace", letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
        {inRange ? "Comp forecast" : "Next 5 days"}
      </div>
      {weeksOut != null && weeksOut > 0 && (
        <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
          The comp is ~{weeksOut} week{weeksOut === 1 ? "" : "s"} out. Comp-day forecast shows here about two weeks before.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))", gap: 8, marginBottom: 16 }}>
        {idx.map(function(i: number) {
          const day = days[i];
          const dayWeather = decodeWMO(data.daily.weathercode[i]);
          const snow = data.daily.snowfall_sum[i] ?? 0;
          return (
            <div key={day} style={{ background: isEventDay(day) ? "rgba(255,204,0,0.08)" : i === 0 ? "rgba(74,158,221,0.1)" : "rgba(255,255,255,0.03)", border: "1px solid " + (isEventDay(day) ? "#ffcc00" : i === 0 ? "#1a2a3a" : "#2a2a2a"), borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: isEventDay(day) ? "#ffcc00" : "#aaa", marginBottom: 6, fontFamily: "monospace" }}>{i === 0 ? "TODAY" : fmtDay(day).toUpperCase()}{inRange ? " " + fmtMd(day) : ""}</div>
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