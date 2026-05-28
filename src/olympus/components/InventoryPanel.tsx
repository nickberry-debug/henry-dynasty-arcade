// In-adventure inventory popup. Three-tab layout (Equipped / Pack /
// Base) so the player can navigate without scrolling a long stack.
// Words only, no images. Tap any item to expand its description; tap
// the action buttons to drop / stash / take.

import { useState } from "react";
import type { Hero } from "../types";
import { useOlympus } from "../store";
import { MYTHIC_ARTIFACTS } from "../artifacts";
import { Backpack, X, ArrowDown, ArrowUp, Trash2 } from "lucide-react";

interface Props {
  hero: Hero;
}

type Tab = "equipped" | "pack" | "base";

export function InventoryPanel({ hero }: Props) {
  const dropPackItem  = useOlympus(s => s.dropPackItem);
  const stashPackItem = useOlympus(s => s.stashPackItem);
  const takeBaseItem  = useOlympus(s => s.takeBaseItem);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("pack");
  const [expanded, setExpanded] = useState<string | null>(null);

  const eq = hero.equipment as any;
  const equippedRows = collectEquipped(hero);
  const packCount = (hero.inventory ?? []).length;
  const baseCount = (hero.baseInventory ?? []).length;

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed z-40 rounded-full pressable touch-target flex items-center justify-center shadow-2xl"
        style={{
          right: 12,
          bottom: 76,
          width: 48,
          height: 48,
          background: open ? "#DAA520" : "rgba(15,27,45,0.95)",
          border: "1px solid rgba(218,165,32,0.55)",
          color: open ? "#0F1B2D" : "#DAA520",
        }}
        aria-label={open ? "Close inventory" : "Open inventory"}
      >
        {open ? <X size={22} /> : <Backpack size={22} />}
      </button>

      {open && (
        <div
          className="fixed z-30 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            right: 12,
            bottom: 132,
            width: 300,
            maxHeight: "70vh",
            background: "rgba(10,16,28,0.98)",
            border: "1px solid rgba(218,165,32,0.4)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: "1px solid rgba(218,165,32,0.18)" }}>
            <TabBtn label="Equipped" count={equippedRows.length} active={tab === "equipped"} onClick={() => { setTab("equipped"); setExpanded(null); }} />
            <TabBtn label="Pack"     count={packCount} max={10}    active={tab === "pack"}     onClick={() => { setTab("pack"); setExpanded(null); }} />
            <TabBtn label="Base"     count={baseCount}             active={tab === "base"}     onClick={() => { setTab("base"); setExpanded(null); }} />
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {tab === "equipped" && (
              <EquippedTab rows={equippedRows} hero={hero} expanded={expanded} setExpanded={setExpanded} />
            )}
            {tab === "pack" && (
              <PackTab
                hero={hero}
                expanded={expanded}
                setExpanded={setExpanded}
                onDrop={(id) => { dropPackItem(hero.id, id); }}
                onStash={(id) => { stashPackItem(hero.id, id); }}
              />
            )}
            {tab === "base" && (
              <BaseTab
                hero={hero}
                expanded={expanded}
                setExpanded={setExpanded}
                onTake={(id) => { takeBaseItem(hero.id, id); }}
                packFull={packCount >= 10}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Tab button ────────────────────────────────────────────────────────
function TabBtn({ label, count, max, active, onClick }: { label: string; count: number; max?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 px-2 py-2 pressable touch-target text-center"
      style={{
        background: active ? "rgba(218,165,32,0.18)" : "transparent",
        color: active ? "#DAA520" : "rgba(233,227,210,0.65)",
        borderBottom: active ? "2px solid #DAA520" : "2px solid transparent",
      }}
    >
      <div className="text-[10px] uppercase tracking-widest font-display">{label}</div>
      <div className="text-[10px] mt-0.5 font-mono" style={{ color: "rgba(233,227,210,0.5)" }}>
        {count}{max != null ? ` / ${max}` : ""}
      </div>
    </button>
  );
}

// ── Equipped tab ──────────────────────────────────────────────────────
interface EquipRow { slot: string; name: string; description?: string }

function collectEquipped(hero: Hero): EquipRow[] {
  const e = hero.equipment as any;
  const rows: EquipRow[] = [];
  const push = (slot: string, v: any) => v && rows.push({ slot, name: v.name, description: v.description });
  push("Melee",     e.meleeWeapon);
  push("Ranged",    e.rangedWeapon);
  push("Magic",     e.magicWeapon);
  if (e.weapon && !e.meleeWeapon && !e.rangedWeapon) push("Weapon", e.weapon);
  push("Helmet",    e.helmet);
  push("Torso",     e.torso ?? e.armor);
  push("Arms",      e.arms1);
  push("Arms",      e.arms2);
  push("Legs",      e.legs);
  push("Boots",     e.feet);
  push("Accessory", e.accessory);
  return rows;
}

function EquippedTab({ rows, hero, expanded, setExpanded }: { rows: EquipRow[]; hero: Hero; expanded: string | null; setExpanded: (s: string | null) => void }) {
  const artifact = hero.activeArtifactId ? MYTHIC_ARTIFACTS.find(a => a.id === hero.activeArtifactId) : undefined;
  return (
    <>
      {rows.length === 0 && (
        <div className="text-[11px] italic px-2 py-3 text-center" style={{ color: "rgba(233,227,210,0.5)" }}>
          Nothing equipped.
        </div>
      )}
      {rows.map((r, i) => (
        <Row key={`eq-${i}`} idKey={`eq-${i}`} slot={r.slot} name={r.name} description={r.description} expanded={expanded} onToggle={setExpanded} />
      ))}
      {artifact && (
        <>
          <div className="text-[9px] uppercase tracking-[0.3em] mt-2 mb-1 px-1" style={{ color: "#a070c0" }}>Mythic Artifact</div>
          <Row idKey="myth" slot="Mythic" name={artifact.name} description={artifact.storyUse} rare expanded={expanded} onToggle={setExpanded} />
        </>
      )}
    </>
  );
}

// ── Pack tab ──────────────────────────────────────────────────────────
function PackTab({ hero, expanded, setExpanded, onDrop, onStash }: {
  hero: Hero; expanded: string | null; setExpanded: (s: string | null) => void;
  onDrop: (id: string) => void; onStash: (id: string) => void;
}) {
  const items = hero.inventory ?? [];
  if (items.length === 0) {
    return <div className="text-[11px] italic px-2 py-3 text-center" style={{ color: "rgba(233,227,210,0.5)" }}>Pack is empty.</div>;
  }
  return (
    <>
      {items.map(it => (
        <Row
          key={it.id}
          idKey={it.id}
          slot={it.qty > 1 ? `x${it.qty}` : it.kind}
          name={it.name}
          description={(it as any).description}
          expanded={expanded}
          onToggle={setExpanded}
          actions={[
            { icon: <ArrowDown size={12} />, label: "Stash", onClick: () => onStash(it.id), tint: "#86efac" },
            { icon: <Trash2 size={12} />,    label: "Drop",  onClick: () => { if (confirm(`Drop "${it.name}"?`)) onDrop(it.id); }, tint: "#e08a8a" },
          ]}
        />
      ))}
    </>
  );
}

// ── Base tab ──────────────────────────────────────────────────────────
const CATEGORY_ORDER: Array<{ id: string; label: string }> = [
  { id: "weapon",     label: "Weapons" },
  { id: "armor",      label: "Armor" },
  { id: "consumable", label: "Consumables" },
  { id: "quest",      label: "Quest Items" },
  { id: "trophy",     label: "Trophies" },
  { id: "stuff",      label: "Stuff" },
];

function BaseTab({ hero, expanded, setExpanded, onTake, packFull }: {
  hero: Hero; expanded: string | null; setExpanded: (s: string | null) => void;
  onTake: (id: string) => void; packFull: boolean;
}) {
  const items = hero.baseInventory ?? [];
  if (items.length === 0) {
    return <div className="text-[11px] italic px-2 py-3 text-center" style={{ color: "rgba(233,227,210,0.5)" }}>The base chest is empty.</div>;
  }
  return (
    <>
      {CATEGORY_ORDER.map(cat => {
        const list = items.filter(x => x.category === cat.id);
        if (list.length === 0) return null;
        return (
          <div key={cat.id} className="mb-2">
            <div className="text-[9px] uppercase tracking-[0.3em] mb-1 px-1" style={{ color: "rgba(218,165,32,0.85)" }}>
              {cat.label} <span style={{ color: "rgba(233,227,210,0.4)" }}>· {list.length}</span>
            </div>
            {list.map(it => (
              <Row
                key={it.id}
                idKey={it.id}
                slot={it.qty > 1 ? `x${it.qty}` : ""}
                name={it.name}
                description={it.description}
                expanded={expanded}
                onToggle={setExpanded}
                actions={packFull
                  ? [{ icon: <ArrowUp size={12} />, label: "Full", onClick: () => alert("Pack is full. Drop or stash something first."), tint: "rgba(233,227,210,0.5)" }]
                  : [{ icon: <ArrowUp size={12} />, label: "Take", onClick: () => onTake(it.id), tint: "#DAA520" }]
                }
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

// ── Row primitive ─────────────────────────────────────────────────────
interface RowAction { icon: React.ReactNode; label: string; onClick: () => void; tint: string }

function Row({ idKey, slot, name, description, rare, actions, expanded, onToggle }: {
  idKey: string;
  slot: string;
  name: string;
  description?: string;
  rare?: boolean;
  actions?: RowAction[];
  expanded: string | null;
  onToggle: (s: string | null) => void;
}) {
  const isOpen = expanded === idKey;
  return (
    <div
      className="rounded-lg px-2 py-1.5"
      style={{
        background: isOpen ? "rgba(218,165,32,0.10)" : "rgba(255,255,255,0.03)",
        border: rare ? "1px solid rgba(160,112,192,0.45)" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <button
        onClick={() => onToggle(isOpen ? null : idKey)}
        className="w-full text-left pressable touch-target"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: rare ? "#a070c0" : "rgba(233,227,210,0.5)" }}>{slot}</div>
          <div className="text-[10px]" style={{ color: "rgba(233,227,210,0.35)" }}>{isOpen ? "—" : "+"}</div>
        </div>
        <div className="text-sm" style={{ color: rare ? "#e2caf2" : "#e9e3d2" }}>{name}</div>
      </button>
      {isOpen && (
        <>
          {description && (
            <div className="text-[11px] mt-1 leading-relaxed italic" style={{ color: "rgba(233,227,210,0.75)" }}>{description}</div>
          )}
          {actions && actions.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {actions.map((a, i) => (
                <button
                  key={i}
                  onClick={a.onClick}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest pressable touch-target"
                  style={{ background: `${a.tint}22`, border: `1px solid ${a.tint}55`, color: a.tint }}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
