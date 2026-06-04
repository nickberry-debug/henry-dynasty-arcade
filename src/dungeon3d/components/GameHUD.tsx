// dungeon3d/components/GameHUD.tsx — Game HUD (health, mana, cooldowns, XP, floor)
import React, { useEffect, useState } from 'react';
import '../styles/hud.css';

interface HUDProps {
  hero: {
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    level: number;
    experience: number;
  };
  currentXpForLevel: number;
  nextLevelXp: number;
  currentFloor: number;
  abilities: Array<{
    id: string;
    name: string;
    cooldown: number;
  }>;
  cooldowns: Map<string, number>;
  statusEffects: Array<{
    type: string;
    duration: number;
  }>;
  isPaused: boolean;
  onTogglePause: () => void;
}

export function GameHUD({
  hero,
  currentXpForLevel,
  nextLevelXp,
  currentFloor,
  abilities,
  cooldowns,
  statusEffects,
  isPaused,
  onTogglePause,
}: HUDProps) {
  const [healthPercent, setHealthPercent] = useState(100);
  const [manaPercent, setManaPercent] = useState(100);
  const [xpPercent, setXpPercent] = useState(0);

  useEffect(() => {
    setHealthPercent((hero.health / hero.maxHealth) * 100);
    setManaPercent((hero.mana / hero.maxMana) * 100);
    setXpPercent((currentXpForLevel / nextLevelXp) * 100);
  }, [hero, currentXpForLevel, nextLevelXp]);

  return (
    <div className="game-hud">
      {/* Top-Left: Health & Mana Bars */}
      <div className="vitals">
        <div className="stat-container">
          <label className="stat-label">Health</label>
          <div className="stat-bar health-bar">
            <div className="fill" style={{ width: `${healthPercent}%` }} />
            <span className="value">
              {Math.ceil(hero.health)} / {hero.maxHealth}
            </span>
          </div>
        </div>

        <div className="stat-container">
          <label className="stat-label">Mana</label>
          <div className="stat-bar mana-bar">
            <div className="fill" style={{ width: `${manaPercent}%` }} />
            <span className="value">
              {Math.ceil(hero.mana)} / {hero.maxMana}
            </span>
          </div>
        </div>
      </div>

      {/* Top-Right: Level & XP */}
      <div className="level-info">
        <div className="level-badge">
          <span className="level-number">{hero.level}</span>
          <span className="level-label">LVL</span>
        </div>
        <div className="xp-container">
          <div className="xp-bar">
            <div className="fill" style={{ width: `${xpPercent}%` }} />
          </div>
          <span className="xp-text">
            {Math.floor(currentXpForLevel)} / {Math.floor(nextLevelXp)} XP
          </span>
        </div>
      </div>

      {/* Top-Center: Floor Counter */}
      <div className="floor-info">
        <span className="floor-label">FLOOR</span>
        <span className="floor-number">{currentFloor}</span>
        <span className="floor-max">/ 10</span>
      </div>

      {/* Bottom: Ability Bar */}
      <div className="ability-bar">
        <div className="abilities-container">
          {abilities.map((ability, i) => {
            const cooldownRemaining = cooldowns.get(ability.id) || 0;
            const isOnCooldown = cooldownRemaining > 0;
            const key = ['Q', 'E', 'R'][i] || '?';

            return (
              <div
                key={ability.id}
                className={`ability-slot ${isOnCooldown ? 'cooldown' : ''}`}
                title={ability.name}
              >
                <div className="ability-icon">
                  <span className="ability-name">{ability.name}</span>
                </div>
                {isOnCooldown && (
                  <div className="cooldown-overlay">
                    <span className="cooldown-timer">
                      {cooldownRemaining.toFixed(1)}s
                    </span>
                    <div
                      className="cooldown-circle"
                      style={{
                        background: `conic-gradient(#ff6b6b 0deg, #ff6b6b 
                          ${((ability.cooldown - cooldownRemaining) / ability.cooldown) * 360}deg, 
                          transparent ${((ability.cooldown - cooldownRemaining) / ability.cooldown) * 360}deg)`,
                      }}
                    />
                  </div>
                )}
                <span className="ability-key">{key}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom-Right: Status Effects */}
      {statusEffects.length > 0 && (
        <div className="status-effects">
          {statusEffects.map((effect, i) => (
            <div key={i} className={`status-effect ${effect.type}`}>
              <span className="effect-name">{effect.type}</span>
              <span className="effect-duration">{effect.duration.toFixed(1)}s</span>
            </div>
          ))}
        </div>
      )}

      {/* Pause Button */}
      <button className="pause-button" onClick={onTogglePause}>
        {isPaused ? '▶️' : '⏸️'}
      </button>

      {/* Pause Overlay */}
      {isPaused && (
        <div className="pause-overlay">
          <div className="pause-menu">
            <h1>PAUSED</h1>
            <button onClick={onTogglePause} className="resume-button">
              Resume Game
            </button>
            <button className="settings-button">Settings</button>
            <button className="quit-button">Quit to Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
