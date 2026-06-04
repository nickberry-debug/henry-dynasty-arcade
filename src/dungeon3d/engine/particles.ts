// dungeon3d/engine/particles.ts — Particle effects system (blood, magic, sparks, etc.)
import * as THREE from 'three';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  life: number; // 0-1
  lifetime: number; // seconds
  size: number;
  color: THREE.Color;
  type: 'blood' | 'spark' | 'magic' | 'heal' | 'fire';
}

export class ParticleSystem {
  particles: Particle[] = [];
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  mesh: THREE.Points;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.2,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Points(this.geometry, this.material);
  }

  /**
   * Spawn particles at position (impact, death, hit, heal, etc.)
   */
  spawn(position: THREE.Vector3, type: string, count: number = 10) {
    const typeStr = type as Particle['type'];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 10;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * 15,
        Math.sin(angle) * speed
      );

      let color: THREE.Color;
      let lifetime: number;

      switch (typeStr) {
        case 'blood':
          color = new THREE.Color(0x8b0000).lerp(new THREE.Color(0xff0000), Math.random());
          lifetime = 1.5;
          break;
        case 'spark':
          color = new THREE.Color(0xffaa00).lerp(new THREE.Color(0xffff00), Math.random());
          lifetime = 0.8;
          break;
        case 'magic':
          color = new THREE.Color(0x00aaff).lerp(new THREE.Color(0xff00ff), Math.random());
          lifetime = 1.2;
          break;
        case 'heal':
          color = new THREE.Color(0x00ff00).lerp(new THREE.Color(0x00ffff), Math.random());
          lifetime = 1.5;
          break;
        case 'fire':
          color = new THREE.Color(0xff4500).lerp(new THREE.Color(0xffff00), Math.random());
          lifetime = 1.0;
          break;
        default:
          color = new THREE.Color(0xffffff);
          lifetime = 1;
      }

      this.particles.push({
        position: position.clone(),
        velocity,
        acceleration: new THREE.Vector3(0, -9.8, 0), // gravity
        life: 1,
        lifetime,
        size: 0.1 + Math.random() * 0.2,
        color,
        type: typeStr,
      });
    }
  }

  /**
   * Update particles (gravity, fade, remove dead ones)
   */
  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime / p.lifetime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.add(p.acceleration.clone().multiplyScalar(deltaTime));
      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));
    }

    this.updateGeometry();
  }

  /**
   * Update Three.js geometry with current particles
   */
  private updateGeometry() {
    if (this.particles.length === 0) return;

    const positions = new Float32Array(this.particles.length * 3);
    const colors = new Float32Array(this.particles.length * 3);
    const sizes = new Float32Array(this.particles.length);

    this.particles.forEach((p, i) => {
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;

      sizes[i] = p.size * p.life; // fade out
    });

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.attributes.size = new THREE.BufferAttribute(sizes, 1);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.material.vertexColors = true;
  }
}
