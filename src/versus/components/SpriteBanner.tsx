// src/versus/components/SpriteBanner.tsx
//
// Honest "art ceiling" banner shown above combat-sports matches/hubs:
// Boxing + Wrestling are still procedural canvas placeholders. Drop CC0
// boxer/wrestler sprites in `/public/assets/{boxing,wrestling}/` to
// upgrade. Phase 3 spec required this stay visible until real art is in.

interface Props {
  sport: "boxing" | "wrestling";
}

export function SpriteBanner({ sport }: Props) {
  const dirHint = sport === "boxing"
    ? "/public/assets/boxing/"
    : "/public/assets/wrestling/";
  return (
    <div
      className="mx-auto max-w-3xl mt-2 mb-1 px-3 py-2 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-200 text-[11px] leading-snug"
      role="note"
    >
      <span className="font-semibold tracking-wide">SPRITES — procedural placeholder.</span>{" "}
      Drop CC0 {sport === "boxing" ? "boxer" : "wrestler"} sprites in{" "}
      <code className="font-mono">{dirHint}</code> to upgrade.
    </div>
  );
}
