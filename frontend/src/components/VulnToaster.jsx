import { useVulnStore } from '../store';

export default function VulnToaster() {
  const tags = useVulnStore((s) => s.tags);
  const clearTags = useVulnStore((s) => s.clearTags);

  if (!tags.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-3">
      <div className="flex justify-end">
        <button type="button" onClick={clearTags} className="text-xs text-slate/60 hover:text-ink">
          Clear tags
        </button>
      </div>
      {tags.slice(0, 5).map((t, i) => (
        <div
          key={`${t.at}-${i}`}
          className={`vuln-toast module-panel rounded-lg p-3 shadow-lg ${
            t.type === 'success' ? 'border-l-4 border-l-accent' : t.type === 'failed' ? 'border-l-4 border-l-crit' : 'border-l-4 border-l-warn'
          }`}
        >
          {t.notification && <p className="text-sm font-semibold">{t.notification}</p>}
          {t.tag && <p className="font-display text-sm font-bold text-ink">{t.tag}</p>}
          {t.name && <p className="text-sm text-slate">{t.name}</p>}
          {t.severity && <p className="text-xs text-slate/70">{t.severity}</p>}
          {t.flag && (
            <p className="mt-1 break-all rounded bg-ink/5 px-2 py-1 font-mono text-xs text-accent">
              {t.flag}
            </p>
          )}
          {t.hint && <p className="mt-1 text-xs text-slate/80">ℹ️ {t.hint}</p>}
        </div>
      ))}
    </div>
  );
}
