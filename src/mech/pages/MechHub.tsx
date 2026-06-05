// Scrapyard Kings — Mech Combat hub. Foundation page. Shows the active
// bot, lets the player rename it, and links to the Builder. Combat sim,
// shop, leagues, replays, tournaments, and the 16 features in the spec
// are pending — this page is honest about what's wired.

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Wrench, Coins, Recycle, Trophy, Swords, ShoppingBag, Crown, Award } from "lucide-react";
import { useMech, winsInCurrentLeague, winsNeededForPromotion, isPromotionReady, LEAGUE_CHAMPION_NAMES } from "../store";
import { LEAGUE_INFO, LEAGUE_ORDER } from "../types";
import { MECH_ACHIEVEMENTS } from "../achievements";
import { SyncIndicator } from "../../components/SyncIndicator";

export default function MechHub() {
  const navigate = useNavigate();
  const { save, activeBot } = useMech();
  const league = LEAGUE_INFO[save.league];
  const leagueIdx = LEAGUE_ORDER.indexOf(save.league);
  const isTopLeague = save.league === "legend";
  const wins = winsInCurrentLeague(save);
  const needed = winsNeededForPromotion(save.league);
  const promoReady = isPromotionReady(save);

  function startPromotionMatch() {
    try { sessionStorage.setItem("dd_mech_promotion", "1"); } catch {}
    navigate("/mech/battle");
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 18% 0%, rgba(252,165,165,0.16), transparent 60%), " +
          "radial-gradient(900px 600px at 82% 100%, rgba(251,191,36,0.14), transparent 60%), " +
          "linear-gradient(180deg, #1a0808 0%, #0a0a08 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/")} aria-label="Back to arcade"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fca5a5" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>SCRAPYARD KINGS</h1>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>Build a bot. Watch it fight. Climb the leagues.</div>
        </div>
        <SyncIndicator />
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-4">
        {/* Resource bar */}
        <section className="grid grid-cols-3 gap-2">
          <ResourceCard icon={<Coins size={16} />} label="MONEY"   value={`$${save.money}`}      color="#fbbf24" />
          <ResourceCard icon={<Recycle size={16} />} label="SCRAP"   value={`${save.scrap}`}     color="#86efac" />
          <ResourceCard icon={<Trophy size={16} />} label="LEAGUE"  value={league.label}         color="#fde047" />
        </section>

        {/* Active bot */}
        {activeBot && (
          <motion.section
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, ${activeBot.paint}22, rgba(10,5,5,0.85))`,
              border: `1.5px solid ${activeBot.paint}66`,
              boxShadow: `0 8px 24px -10px ${activeBot.paint}55`,
            }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: activeBot.paint }}>ACTIVE BOT</div>
            <div className="flex items-center gap-3 mb-3">
              <BotSilhouette bot={activeBot} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl tracking-wide" style={{ color: "#fef3c7" }}>{activeBot.name}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "rgba(229,231,235,0.7)" }}>
                  {activeBot.parts.chest.name} · {activeBot.parts.legs.name}
                </div>
                <div className="text-[10px] mt-1 flex items-center gap-2 flex-wrap" style={{ color: "rgba(229,231,235,0.6)" }}>
                  {activeBot.weapons.left && <span>L: {activeBot.weapons.left.name}</span>}
                  {activeBot.weapons.right && <span>R: {activeBot.weapons.right.name}</span>}
                  {!activeBot.weapons.left && !activeBot.weapons.right && <span>Unarmed</span>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <Stat label="HP"     value={activeBot.derived.hp}    accent="#86efac" />
              <Stat label="ARMOR"  value={activeBot.derived.armor} accent="#7dd3fc" />
              <Stat label="POWER"  value={activeBot.derived.power} accent="#fbbf24" />
              <Stat label="ENERGY" value={activeBot.derived.energy} accent="#a78bfa" />
              <Stat label="WEIGHT" value={activeBot.derived.weight} accent="#fb923c" />
              <Stat label="SPEED"  value={activeBot.derived.speed}  accent="#67e8f9" />
              <Stat label="BALANCE"value={activeBot.derived.balance} accent="#fde047" />
              <Stat label="W-L"    value={`${save.wins}-${save.losses}`} accent="#fca5a5" />
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={() => navigate("/mech/builder")}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display tracking-widest pressable touch-target text-[12px]"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7", minHeight: 48, minWidth: 130 }}>
                <Wrench size={14} aria-hidden="true" /> BUILDER
              </button>
              <button
                onClick={() => navigate("/mech/battle")}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display tracking-widest pressable touch-target text-[12px]"
                style={{ background: "linear-gradient(135deg, #fb923c, #ef4444)", color: "#1a0505", minHeight: 48, minWidth: 150 }}>
                <Swords size={14} aria-hidden="true" /> FIND A FIGHT
              </button>
              <button
                onClick={() => navigate("/mech/shop")}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display tracking-widest pressable touch-target text-[12px]"
                style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.45)", color: "#fbbf24", minHeight: 48 }}>
                <ShoppingBag size={14} aria-hidden="true" /> SHOP
              </button>
              <button
                onClick={() => navigate("/mech/replays")}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display tracking-widest pressable touch-target text-[12px]"
                style={{ background: "rgba(251,146,60,0.10)", border: "1px solid rgba(251,146,60,0.40)", color: "#fb923c", minHeight: 48 }}>
                REPLAYS
              </button>
            </div>
          </motion.section>
        )}

        {/* League progression — shows current league + path to next */}
        <section className="rounded-2xl p-4"
          style={{
            background: promoReady
              ? "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(20,5,5,0.85))"
              : "linear-gradient(135deg, rgba(251,191,36,0.10), rgba(10,8,2,0.85))",
            border: `1px solid ${promoReady ? "#ef4444aa" : "#fbbf2455"}`,
            boxShadow: promoReady ? "0 0 24px -8px #ef4444" : undefined,
          }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-[0.3em] font-display flex items-center gap-1.5"
              style={{ color: promoReady ? "#fca5a5" : "#fbbf24" }}>
              <Crown size={12} /> LEAGUE PROGRESSION
            </div>
            <div className="text-[10px] tracking-widest opacity-75">{league.label}</div>
          </div>
          {isTopLeague ? (
            <div className="text-[12px] py-2 flex items-center gap-2" style={{ color: "#fde047" }}>
              <Award size={14} /> You've reached the Legend's Coliseum. The top of the ladder. No further promotion exists.
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span style={{ color: "#fef3c7" }}>
                  League wins: <strong>{wins}</strong> / {needed}
                </span>
                <span className="opacity-70">Next: {LEAGUE_INFO[LEAGUE_ORDER[leagueIdx + 1]].label}</span>
              </div>
              <div className="h-2 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                <div style={{
                  width: `${Math.min(100, (wins / needed) * 100)}%`,
                  height: "100%",
                  background: promoReady
                    ? "linear-gradient(90deg, #ef4444, #fca5a5)"
                    : "linear-gradient(90deg, #fbbf24, #fde047)",
                  transition: "width 0.4s ease",
                }} />
              </div>
              {/* CTA */}
              {promoReady ? (
                <div className="mt-3 space-y-2">
                  <div className="text-[11px] leading-relaxed" style={{ color: "#fca5a5" }}>
                    ⚔ You've earned a shot at the next league. Beat <strong>{LEAGUE_CHAMPION_NAMES[save.league]}</strong> — a tougher fight than your usual rivals — and advance to <strong>{LEAGUE_INFO[LEAGUE_ORDER[leagueIdx + 1]].label}</strong>.
                  </div>
                  <button onClick={startPromotionMatch}
                    className="w-full px-4 py-3 rounded-xl font-display tracking-[0.25em] pressable touch-target flex items-center justify-center gap-2 text-[12px]"
                    style={{
                      background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                      color: "#fef3c7", minHeight: 48,
                    }}>
                    <Crown size={14} /> PROMOTION FIGHT
                  </button>
                </div>
              ) : (
                <div className="text-[10px] mt-2 opacity-70 leading-snug">
                  Win {needed - wins} more {needed - wins === 1 ? "fight" : "fights"} to unlock the promotion match against {LEAGUE_CHAMPION_NAMES[save.league]}.
                </div>
              )}
            </>
          )}
          {/* League ladder */}
          {save.trophies.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
              {save.trophies.slice(-5).map((t, i) => (
                <span key={i} className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(253,224,71,0.10)", border: "1px solid rgba(253,224,71,0.30)", color: "#fde047" }}>
                  🏆 {LEAGUE_INFO[t.league].label}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Achievements — milestones unlock cash bonuses */}
        <section className="rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(253,224,71,0.08), rgba(10,10,20,0.85))",
            border: "1px solid rgba(253,224,71,0.30)",
          }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fde047" }}>ACHIEVEMENTS</div>
            <div className="text-[10px] tracking-widest" style={{ color: "rgba(229,231,235,0.65)" }}>
              {save.achievements.length} / {MECH_ACHIEVEMENTS.length}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MECH_ACHIEVEMENTS.map(a => {
              const unlocked = save.achievements.includes(a.id);
              return (
                <div key={a.id}
                  className="rounded-xl p-2"
                  style={{
                    background: unlocked ? "rgba(253,224,71,0.10)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${unlocked ? "rgba(253,224,71,0.40)" : "rgba(255,255,255,0.08)"}`,
                    opacity: unlocked ? 1 : 0.55,
                  }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base" aria-hidden="true">{unlocked ? a.emoji : "🔒"}</span>
                    <div className="font-display text-[11px] truncate" style={{ color: unlocked ? "#fef3c7" : "#9aa6bf" }}>{a.name}</div>
                  </div>
                  <div className="text-[9px] mt-1 leading-snug" style={{ color: "rgba(229,231,235,0.65)" }}>{a.description}</div>
                  <div className="text-[9px] mt-1" style={{ color: unlocked ? "#86efac" : "#fbbf24" }}>
                    {unlocked ? "Claimed" : `+$${a.rewardCash} when unlocked`}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Career / scope */}
        <section className="rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(192,132,252,0.08), rgba(10,10,20,0.85))",
            border: "1px solid rgba(192,132,252,0.3)",
          }}>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#c084fc" }}>CAREER</div>
          <p className="text-[12px] leading-relaxed mb-2" style={{ color: "#e5e7eb" }}>
            Build a bot, find a fight, win cash + scrap, upgrade, repeat. {save.wins} wins · {save.losses} losses · {save.battles.length} battles on record.
          </p>
          {save.battles.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[9px] uppercase tracking-[0.3em] mb-1.5" style={{ color: "#c084fc" }}>Recent Battles</div>
              <ul className="space-y-0.5">
                {save.battles.slice(0, 4).map(b => (
                  <li key={b.id} className="text-[11px]" style={{ color: b.winner === "left" ? "#86efac" : "#fca5a5" }}>
                    {b.winner === "left" ? "🏆" : "💥"} {b.summary}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ResourceCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center"
      style={{
        background: `${color}1f`,
        border: `1px solid ${color}55`,
      }}>
      <div className="flex items-center justify-center gap-1 text-[9px] tracking-[0.2em] uppercase" style={{ color }}>
        {icon}<span>{label}</span>
      </div>
      <div className="font-display text-base mt-1" style={{ color: "#fef3c7" }}>{value}</div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-md py-1.5 px-2"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[8px] tracking-widest uppercase opacity-70" style={{ color: accent }}>{label}</div>
      <div className="font-display text-sm mt-0.5" style={{ color: "#fef3c7" }}>{value}</div>
    </div>
  );
}

import type { Bot } from "../types";
function BotSilhouette({ bot }: { bot: Bot }) {
  // Chunky Contra/Stardew-style mech silhouette. Hand-shaded body
  // panels with rivets, glowing eyes, exhaust vents, ankle pistons —
  // reads as a proper combat bot at a glance instead of a cardboard
  // stack of rectangles. Tinted to the bot's paint color.
  const paint = bot.paint;
  const shadow = "#0a0a0a";
  return (
    <svg viewBox="0 0 64 80" width={68} height={86} aria-hidden="true"
      style={{ filter: `drop-shadow(0 4px 10px ${paint}99)` }}>
      <defs>
        <linearGradient id={`bot-${bot.id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={paint} stopOpacity="1" />
          <stop offset="100%" stopColor={paint} stopOpacity="0.78" />
        </linearGradient>
      </defs>
      {/* Ground shadow */}
      <ellipse cx="32" cy="78" rx="18" ry="2.4" fill="#000" opacity="0.45" />

      {/* Legs — pistons + boot */}
      <rect x="19" y="52" width="9"  height="12" rx="1.5" fill={`url(#bot-${bot.id}-body)`} stroke={shadow} strokeWidth="1.4" />
      <rect x="36" y="52" width="9"  height="12" rx="1.5" fill={`url(#bot-${bot.id}-body)`} stroke={shadow} strokeWidth="1.4" />
      <rect x="20" y="63" width="7"  height="3"  fill="#1a1a1a" />
      <rect x="37" y="63" width="7"  height="3"  fill="#1a1a1a" />
      <rect x="17" y="66" width="13" height="9"  rx="2" fill="#3a3a3a" stroke={shadow} strokeWidth="1.4" />
      <rect x="34" y="66" width="13" height="9"  rx="2" fill="#3a3a3a" stroke={shadow} strokeWidth="1.4" />

      {/* Chest — paneled body */}
      <rect x="13" y="22" width="38" height="32" rx="5" fill={`url(#bot-${bot.id}-body)`} stroke={shadow} strokeWidth="1.8" />
      {/* Shoulder rivets */}
      <circle cx="17" cy="26" r="1.3" fill="#1a1a1a" />
      <circle cx="47" cy="26" r="1.3" fill="#1a1a1a" />
      <circle cx="17" cy="50" r="1.3" fill="#1a1a1a" />
      <circle cx="47" cy="50" r="1.3" fill="#1a1a1a" />
      {/* Visor panel */}
      <rect x="18" y="29" width="28" height="11" rx="2" fill="#0a0a0a" stroke={shadow} strokeWidth="1" opacity="0.9" />
      <rect x="20" y="31" width="10" height="2" fill={paint} opacity="0.55" />
      <rect x="33" y="33" width="11" height="2" fill={paint} opacity="0.55" />
      {/* Chest pilot light */}
      <circle cx="32" cy="46" r="2.2" fill={paint} stroke={shadow} strokeWidth="1" />
      <circle cx="32" cy="46" r="1.0" fill="#fef3c7" />

      {/* Arms — shoulder pads + forearms */}
      <rect x="2"  y="22" width="12" height="10" rx="2" fill={`url(#bot-${bot.id}-body)`} stroke={shadow} strokeWidth="1.4" />
      <rect x="50" y="22" width="12" height="10" rx="2" fill={`url(#bot-${bot.id}-body)`} stroke={shadow} strokeWidth="1.4" />
      <rect x="3"  y="32" width="10" height="18" rx="2" fill={`url(#bot-${bot.id}-body)`} stroke={shadow} strokeWidth="1.4" />
      <rect x="51" y="32" width="10" height="18" rx="2" fill={`url(#bot-${bot.id}-body)`} stroke={shadow} strokeWidth="1.4" />

      {/* Weapons — barrel + glow */}
      {bot.weapons.left && (
        <g>
          <rect x="0" y="38" width="6" height="4" fill={bot.weapons.left.color} stroke={shadow} strokeWidth="0.8" />
          <circle cx="2" cy="40" r="1.8" fill={bot.weapons.left.color} opacity="0.85" />
          <circle cx="2" cy="40" r="3.2" fill={bot.weapons.left.color} opacity="0.25" />
        </g>
      )}
      {bot.weapons.right && (
        <g>
          <rect x="58" y="38" width="6" height="4" fill={bot.weapons.right.color} stroke={shadow} strokeWidth="0.8" />
          <circle cx="62" cy="40" r="1.8" fill={bot.weapons.right.color} opacity="0.85" />
          <circle cx="62" cy="40" r="3.2" fill={bot.weapons.right.color} opacity="0.25" />
        </g>
      )}

      {/* Head — chunky helmet */}
      <rect x="22" y="4" width="20" height="16" rx="3" fill={`url(#bot-${bot.id}-body)`} stroke={shadow} strokeWidth="1.6" />
      <rect x="25" y="2" width="4"  height="4" fill="#3a3a3a" /> {/* antenna base */}
      <line x1="27" y1="2" x2="27" y2="-2" stroke={shadow} strokeWidth="1.4" />
      {/* Eyes — glowing slit */}
      <rect x="25" y="10" width="14" height="3" rx="1" fill="#0a0a0a" />
      <rect x="27" y="11" width="3"  height="1" fill={paint} opacity="0.95" />
      <rect x="34" y="11" width="3"  height="1" fill={paint} opacity="0.95" />
      {/* Mouth grille */}
      <rect x="28" y="15" width="8" height="2" fill="#0a0a0a" />
      <line x1="30" y1="15" x2="30" y2="17" stroke="#3a3a3a" strokeWidth="0.6" />
      <line x1="32" y1="15" x2="32" y2="17" stroke="#3a3a3a" strokeWidth="0.6" />
      <line x1="34" y1="15" x2="34" y2="17" stroke="#3a3a3a" strokeWidth="0.6" />
    </svg>
  );
}
