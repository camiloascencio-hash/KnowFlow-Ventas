export default function DemoBanner({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-800">Entorno demostrativo — datos sintéticos. No usar para decisiones operacionales reales.</div>;
}
