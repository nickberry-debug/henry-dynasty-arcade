interface Props {
  emoji: string;
  title: string;
  body?: string;
  cta?: { label: string; onClick: () => void };
}

export function EmptyState({ emoji, title, body, cta }: Props) {
  return (
    <div className="glass rounded-2xl p-10 text-center flex flex-col items-center gap-3">
      <div className="text-6xl">{emoji}</div>
      <div className="font-display text-2xl">{title}</div>
      {body && <div className="text-sm text-ink-200 max-w-md">{body}</div>}
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-3 px-5 py-2.5 rounded-xl bg-accent text-ink-950 font-display tracking-wider text-sm pressable touch-target"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
