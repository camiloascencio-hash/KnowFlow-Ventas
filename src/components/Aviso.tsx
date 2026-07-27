/** Mensaje de resultado (éxito / error) de una acción de administración. */
export default function Aviso({
  ok,
  error,
}: {
  ok?: string;
  error?: string;
}) {
  if (!ok && !error) return null;
  return (
    <p
      className={`mt-3 rounded-lg px-3 py-2 text-sm ring-1 ${
        error
          ? "bg-red-50 text-red-700 ring-red-200"
          : "bg-emerald-50 text-emerald-800 ring-emerald-200"
      }`}
    >
      {error ? `⚠ ${error}` : `✅ ${ok}`}
    </p>
  );
}
