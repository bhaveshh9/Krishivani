import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut, MapPin, Sprout, Volume2 } from "lucide-react";
import { BackendBadge, DemoTag } from "@/components/ui-bits";
import { isLoggedIn } from "@/components/AppLayout";
import { MapPanel } from "@/components/MapPanel";
import { fetchAdvisory, fetchFarmerForecast, fetchLocations, todayISO, type AdvisoryResult, type FarmerDay, type GeoPanchayat } from "@/lib/api";
import { LANGS, SPEECH_LANG, useLang, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/farmer-dashboard")({
  head: () => ({ meta: [{ title: "My Weather & Farm Advisory — Krishivani" }, { name: "description", content: "Simple local weather and advisory for your Panchayat. Demo data." }] }),
  component: FarmerDashboard,
});

const CROPS = ["Cotton", "Soybean", "Maize", "Wheat", "Onion"];
const icon = (mm: number) => (mm >= 25 ? "🌧" : mm >= 10 ? "🌦" : mm >= 4 ? "☁" : "☀");
const dot = (s: string) => (s === "heavy" || s === "severe" ? "🔴" : s === "moderate" ? "🟡" : "🟢");
const sel = "w-full rounded-lg border border-input bg-background px-3 py-2 text-base";
const SAVED = "agroscale_farmer_pid";

function FarmerDashboard() {
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [all, setAll] = useState<GeoPanchayat[]>([]);
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [pid, setPid] = useState("");
  const [crop, setCrop] = useState("");
  const [days, setDays] = useState<FarmerDay[]>([]);
  const [adv, setAdv] = useState<AdvisoryResult | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) navigate({ to: "/login", replace: true });
    else setReady(true);
  }, [navigate]);

  const choose = useCallback((p: GeoPanchayat) => {
    setDistrict(p.district); setBlock(p.block); setPid(p.id);
    localStorage.setItem(SAVED, p.id);
  }, []);

  /** Ask the browser for location (it shows its own permission prompt). Manual selection always works. */
  const locate = useCallback((list: GeoPanchayat[]) => {
    if (!navigator.geolocation) { setMsg("Location is not available in this browser. Please choose your Panchayat."); return; }
    setMsg("…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        let best: GeoPanchayat | undefined;
        let bestKm = Infinity;
        for (const p of list) {
          const km = Math.hypot((p.lat - pos.coords.latitude) * 111, (p.lng - pos.coords.longitude) * 104);
          if (km < bestKm) { bestKm = km; best = p; }
        }
        if (!best) return;
        choose(best);
        setMsg(`${best.district} › ${best.block} › ${best.name} (~${Math.round(bestKm)} km)${bestKm > 100 ? " — outside the demo area, nearest demo Panchayat selected." : ""}`);
      },
      () => setMsg("Location permission not given. Please choose your Panchayat below."),
      { timeout: 10000 },
    );
  }, [choose]);

  useEffect(() => {
    if (!ready) return;
    fetchLocations().then((list) => {
      setAll(list);
      const saved = list.find((p) => p.id === localStorage.getItem(SAVED));
      if (saved) choose(saved); else locate(list);
    }).catch((e: Error) => setError(e.message));
  }, [ready, choose, locate]);

  useEffect(() => {
    if (!pid) return;
    setError("");
    fetchFarmerForecast(pid, todayISO()).then((d) => {
      setDays(d);
      const today = d[0];
      if (today) fetchAdvisory(today.status, today.rainfallMm, today.windKmh, lang, crop || undefined).then(setAdv).catch((e: Error) => setError(e.message));
    }).catch((e: Error) => setError(e.message));
  }, [pid, lang, crop]);

  const districts = useMemo(() => [...new Set(all.map((a) => a.district))], [all]);
  const blocks = useMemo(() => [...new Set(all.filter((a) => a.district === district).map((a) => a.block))], [all, district]);
  const panchayats = all.filter((a) => a.block === block);
  const today = days[0];
  const alerts = days.flatMap((d, i) => {
    const prev = days[i - 1];
    const out: { color: string; text: string }[] = [];
    if (d.status !== "normal") out.push({ color: dot(d.status), text: `${t.days[i]}: ${t.status[d.status]} (${Math.round(d.rainfallMm)} mm)` });
    if (prev && Math.abs(d.rainfallMm - prev.rainfallMm) >= 25) out.push({ color: "🔵", text: `${t.days[i]}: ${Math.round(prev.rainfallMm)} → ${Math.round(d.rainfallMm)} mm` });
    return out;
  });

  const listen = () => {
    if (!("speechSynthesis" in window) || !adv) { setMsg("Voice is not supported in this browser."); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(adv.items.map((i) => i.text).join(" "));
    u.lang = SPEECH_LANG[lang];
    window.speechSynthesis.speak(u);
  };

  if (!ready) return null;
  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Sprout className="size-6 text-primary" />
        <div className="mr-auto">
          <h1 className="text-lg font-semibold leading-tight">{t.title}</h1>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <select aria-label="Language" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {(Object.keys(LANGS) as Lang[]).map((l) => <option key={l} value={l}>{LANGS[l]}</option>)}
        </select>
        <button onClick={() => { localStorage.removeItem("agroscale_auth"); navigate({ to: "/login", replace: true }); }} className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"><LogOut className="size-4" />Sign out</button>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2"><BackendBadge /><DemoTag /></div>
        {error && <div role="alert" className="rounded-lg border border-status-severe/40 bg-status-severe/10 p-3 text-sm">{error}</div>}

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <select aria-label={t.district} className={sel} value={district} onChange={(e) => { setDistrict(e.target.value); setBlock(""); setPid(""); }}>
              <option value="">{t.district}</option>{districts.map((d) => <option key={d}>{d}</option>)}</select>
            <select aria-label={t.block} className={sel} value={block} onChange={(e) => { setBlock(e.target.value); setPid(""); }}>
              <option value="">{t.block}</option>{blocks.map((b) => <option key={b}>{b}</option>)}</select>
            <select aria-label={t.panchayat} className={sel} value={pid} onChange={(e) => { const p = all.find((x) => x.id === e.target.value); if (p) choose(p); }}>
              <option value="">{t.panchayat}</option>{panchayats.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <button onClick={() => locate(all)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><MapPin className="size-4" />{t.useLocation}</button>
          {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
        </section>

        {today ? (
          <>
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">{t.today}</h2>
              <div className="grid gap-2 text-xl sm:grid-cols-2">
                <p>🌧 {t.rain}: <b>{Math.round(today.rainfallMm)} mm</b></p>
                <p>🌡 {t.temp}: <b>{Math.round(today.temperatureC)}°C</b></p>
                <p>💧 {t.humidity}: <b>{today.humidityPct}%</b></p>
                <p>🌧 {t.prob}: <b>{today.rainProbabilityPct}%</b></p>
              </div>
              <p className="mt-3 text-xl">{dot(today.status)} {t.risk}: <b>{t.status[today.status]}</b></p>
              <p className={`mt-1 text-[11px] font-medium ${today.isLive ? "text-status-normal" : "text-muted-foreground"}`}>{today.isLive ? "● Live weather (Open-Meteo)" : "○ Prototype demo value — live forecast unavailable"}</p>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-base font-semibold">{t.fiveDay}</h2>
              <div className="grid grid-cols-5 gap-2 text-center">
                {days.map((d, i) => (
                  <div key={d.date} className="rounded-lg bg-muted p-2"><p className="text-[11px] text-muted-foreground">{t.days[i]}</p><p className="text-2xl">{icon(d.rainfallMm)}</p><p className="text-sm font-semibold">{Math.round(d.rainfallMm)}mm</p></div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between"><h2 className="text-base font-semibold">{t.know}</h2>
                <button onClick={listen} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"><Volume2 className="size-3.5" />{t.listen}</button></div>
              <label className="mb-3 block text-xs text-muted-foreground">{t.crop}
                <select className={sel} value={crop} onChange={(e) => setCrop(e.target.value)}><option value="">—</option>{CROPS.map((c) => <option key={c}>{c}</option>)}<option>{t.other}</option></select></label>
              {adv ? (
                <div className="space-y-2">
                  {adv.items.map((i) => <div key={i.key} className="rounded-lg border-l-4 border-primary bg-muted p-3"><p className="font-semibold">{dot(today.status)} {i.key === "wind" ? "💨" : ""} {t.status[today.status]}</p><p className="mt-1 text-base">“{i.text}”</p></div>)}
                  {adv.cropNote && <p className="text-xs text-muted-foreground">{adv.cropNote}</p>}
                  <p className="text-[11px] text-muted-foreground">{adv.disclaimer}</p>
                  {adv.offline && <p className="text-[11px] text-status-severe">Backend offline: translated advisories need the Flask server.</p>}
                </div>
              ) : <p className="text-sm text-muted-foreground">…</p>}
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-2 text-base font-semibold">{t.alerts}</h2>
              {alerts.length ? <ul className="space-y-1 text-base">{alerts.map((a, i) => <li key={i}>{a.color} {a.text}</li>)}</ul> : <p className="text-sm text-muted-foreground">{t.noAlerts}</p>}
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-2 text-base font-semibold">{t.nearby}</h2>
              <div className="h-64"><MapPanel points={panchayats} layer="rainfall" selectedId={pid} onSelect={(p) => { const g = all.find((x) => x.id === p.id); if (g) choose(g); }} /></div>
            </section>
          </>
        ) : <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t.panchayat} ↑</p>}
      </main>
    </div>
  );
}
