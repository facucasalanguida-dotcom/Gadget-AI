"use client";

export interface ActionCardSpec {
  id: string;
  label: string;
  emoji: string;
}

export function ActionCard({
  card,
  onTap,
  disabled,
}: {
  card: ActionCardSpec;
  onTap: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onTap(card.id)}
      className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-device-panel py-3 text-xs font-medium text-neutral-200 transition active:scale-95 disabled:opacity-40"
    >
      <span className="text-xl leading-none">{card.emoji}</span>
      {card.label}
    </button>
  );
}
