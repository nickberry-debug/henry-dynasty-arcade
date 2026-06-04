// dungeon3d/pages/Dungeon3D.tsx — Main game view (Phase 0-1: core + content + HUD + audio)
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { initCore, CoreScene, updateCameraTarget } from '../engine/core';
import { generateDungeon, createRoomMesh, DungeonLayout } from '../engine/generator';
import { createCharacter, updateCharacter, getMovementInput, Character } from '../engine/character';
import { initFogOfWar, updateFogOfWar, applyFogOfWarToMesh, FogOfWarState } from '../engine/fogofwar';
import { loadAssets, AssetCatalog } from '../engine/assetLoader';
import { spawnEnemy, updateEnemy, Enemy, EnemyType } from '../engine/enemies';
import { getFloorTheme, applyThemeToScene, applyThemeToRoomMeshes } from '../engine/themes';
import { useGameStore, createDefaultHero } from '../state/gameState';
import { GameHUD } from '../components/GameHUD';
import { createGameIntegration, GameIntegration } from '../engine/gameIntegration';

export const Dungeon3D: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [enemyCount, setEnemyCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameIntegration, setGameIntegration] = useState<GameIntegration | null>(null);
  const [hudState, setHudState] = useState({
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    level: 1,
    experience: 0,
    currentFloor: 1,
    statusEffects: [] as Array<{ type: string; duration: number }>,
    cooldowns: new Map<string, number>(),
  });

  // Game state refs
  const coreRef = useRef<CoreScene | null>(null);
  const dungeonRef = useRef<DungeonLayout | null>(null);
  const characterRef = useRef<Character | null>(null);
  const fogRef = useRef<FogOfWarState | null>(null);
  const roomMeshesRef = useRef<THREE.Group[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const assetsRef = useRef<AssetCatalog | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!gameStarted || !canvasRef.current) return;

    const initGame = async () => {
      const core = initCore(canvasRef.current!);
      coreRef.current = core;

      // Load assets (Phase 1)
      const assets = await loadAssets();
      assetsRef.current = assets;

      // Generate dungeon (floor 1)
      const dungeon = generateDungeon(1, 12345);
      dungeonRef.current = dungeon;

      // Apply theme to scene (Phase 1)
      const theme = getFloorTheme(1);
      applyThemeToScene(core.scene, theme);

      // Create room meshes
      roomMeshesRef.current = dungeon.rooms.map((room) => {
        const mesh = createRoomMesh(room);
        core.scene.add(mesh);
        return mesh;
      });

      // Apply theme colors to rooms (Phase 1)
      applyThemeToRoomMeshes(roomMeshesRef.current, theme);

      // Spawn enemies in rooms (Phase 1)
      const theme1 = getFloorTheme(1);
      dungeon.rooms.forEach((room, i) => {
        if (i === dungeon.playerStartRoom) return;
        const enemyCount = room.enemies;
        for (let j = 0; j < enemyCount; j++) {
          const enemyType = theme1.enemyTypes[j % theme1.enemyTypes.length] as EnemyType;
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * (room.width - 2),
            0,
            (Math.random() - 0.5) * (room.height - 2)
          );
          const enemyPos = new THREE.Vector3(room.x, 1, room.z).add(offset);
          const enemy = spawnEnemy(enemyType, enemyPos, 1, roomMeshesRef.current[i]);
          core.scene.add(enemy.mesh);
          enemiesRef.current.push(enemy);
        }
      });
      setEnemyCount(enemiesRef.current.length);

      // Create player character
      const hero = createDefaultHero();
      const character = createCharacter(
        new THREE.Vector3(dungeon.rooms[0].x, 1, dungeon.rooms[0].z)
      );
      characterRef.current = character;
      core.scene.add(character.mesh);

      // Initialize game integration (HUD + audio)
      // Convert Hero to HeroStats for integration
      const heroStats = {
        level: hero.level,
        health: hero.health,
        maxHealth: hero.maxHealth,
        mana: 50,
        maxMana: 50,
        attack: hero.attack,
        defense: hero.defense,
        speed: 5,
        luck: 0.15,
        statusEffects: [],
        cooldowns: new Map(),
      };
      const integration = createGameIntegration(core.scene, core.camera, null, heroStats);
      setGameIntegration(integration);

      // Initialize fog-of-war
      const fog = initFogOfWar(dungeon);
      fogRef.current = fog;

      // Keyboard input
      const onKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        keysRef.current.add(key);
        // Pause toggle
        if (key === 'p') {
          setIsPaused((prev) => !prev);
        }
      };
      const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      // Main loop
      let lastTime = performance.now();
      const animate = (currentTime: number) => {
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.016);
        lastTime = currentTime;

        if (!isPaused) {
          const inputDir = getMovementInput(keysRef.current);
          updateCharacter(character, deltaTime, inputDir);

          updateFogOfWar(fog, dungeon, character.position);

          dungeon.rooms.forEach((_, i) => {
            const opacity = fog.roomOpacity.get(i) ?? 1;
            applyFogOfWarToMesh(roomMeshesRef.current[i], opacity);
          });

          // Update enemies (Phase 1)
          enemiesRef.current.forEach((enemy) => {
            updateEnemy(enemy, deltaTime, character.position, currentTime / 1000);
          });
          enemiesRef.current = enemiesRef.current.filter((e) => e.ai.state !== 'dead');
          setEnemyCount(enemiesRef.current.length);

          // Update game integration state
          if (gameIntegration) {
            gameIntegration.updateGameState(deltaTime);
            setHudState({
              health: hero.health,
              maxHealth: hero.maxHealth,
              mana: 50,
              maxMana: 50,
              level: hero.level,
              experience: hero.experience,
              currentFloor: 1,
              statusEffects: [] as Array<{ type: string; duration: number }>,
              cooldowns: new Map(),
            });
          }
        }

        updateCameraTarget(core.camera, character.position);

        core.renderer.render(core.scene, core.camera);
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        core.cleanup();
      };
    };

    let cleanup: (() => void) | undefined;
    initGame().then((c) => {
      cleanup = c;
    });

    return () => cleanup?.();
  }, [gameStarted]);

  if (!gameStarted) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>🐦 Dungeon Crawler 3D</h1>
        <p>Phase 0: Core polish | Phase 1: Content expansion</p>
        <button onClick={() => setGameStarted(true)} style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
          Start Dungeon
        </button>
        {onClose && <button onClick={onClose} style={{ marginLeft: '0.5rem' }}>Close</button>}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#000' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      {gameIntegration && gameStarted && (
        <GameHUD
          hero={hudState}
          currentXpForLevel={hudState.experience}
          nextLevelXp={1000 * hudState.level}
          currentFloor={hudState.currentFloor}
          abilities={[]}
          cooldowns={hudState.cooldowns}
          statusEffects={hudState.statusEffects}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(!isPaused)}
        />
      )}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        color: '#fff',
        fontSize: '0.875rem',
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.7)',
        padding: '0.5rem',
        borderRadius: '0.25rem',
        maxWidth: '300px',
      }}>
        <p>🐦 DUNGEON CRAWLER 3D (Phase 0-1)</p>
        <p>WASD/Arrows to move | P to pause</p>
        <hr style={{ borderColor: '#555' }} />
        <p>✅ Phase 0: Camera, fog-of-war, character control</p>
        <p>✅ Phase 1: Enemy AI, themed floors, varied content</p>
        <p>✅ HUD + Audio system integrated</p>
        <p>Enemies alive: {enemyCount}</p>
      </div>
    </div>
  );
};
