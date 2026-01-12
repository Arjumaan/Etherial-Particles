export class ParticleEngine {
    constructor(scene, count = 15000) {
        this.scene = scene;
        this.count = count;
        this.particleSize = 0.15;
        this.transitionSpeed = 0.05;
        this.baseColor = new THREE.Color(0x00d2ff);

        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.count * 3);
        this.targetPositions = new Float32Array(this.count * 3);
        this.currentBasePositions = new Float32Array(this.count * 3); // Position without physics offsets

        this.mesh = null;
        this.init();
    }

    init() {
        // Init positions (Sphere)
        this.generateShape('sphere');

        // sync buffers
        for (let i = 0; i < this.targetPositions.length; i++) {
            this.currentBasePositions[i] = this.targetPositions[i];
            this.positions[i] = this.targetPositions[i];
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        // Texture
        const getSprite = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 32; canvas.height = 32;
            const ctx = canvas.getContext('2d');
            const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.2, 'rgba(255,255,255,0.8)');
            g.addColorStop(0.5, 'rgba(255,255,255,0.2)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 32, 32);
            return new THREE.Texture(canvas);
        };
        const texture = getSprite();
        texture.needsUpdate = true;

        const material = new THREE.PointsMaterial({
            color: 0xff0055, // Match GPU Neon Pink
            size: 0.35, // Larger for better visibility
            map: texture,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.mesh = new THREE.Points(this.geometry, material);
        this.scene.add(this.mesh);
    }

    setColor(hexColor) {
        if (this.mesh) this.mesh.material.color.set(hexColor);
    }

    generateShape(shapeName) {
        const arr = [];
        const count = this.count;

        switch (shapeName) {
            case 'sphere':
                for (let i = 0; i < count; i++) {
                    const r = 12 * Math.cbrt(Math.random());
                    const theta = Math.random() * 2 * Math.PI;
                    const phi = Math.acos(2 * Math.random() - 1);
                    arr.push(
                        r * Math.sin(phi) * Math.cos(theta),
                        r * Math.sin(phi) * Math.sin(theta),
                        r * Math.cos(phi)
                    );
                }
                break;
            case 'hearts':
                for (let i = 0; i < count; i++) {
                    const t = Math.random() * Math.PI * 2;
                    const s = 0.5 + Math.random() * 0.5;
                    const x = 16 * Math.pow(Math.sin(t), 3);
                    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
                    const z = (Math.random() - 0.5) * 4 * (1 - Math.abs(y) / 20);
                    arr.push(x * 0.6 * s, y * 0.6 * s, z * s);
                }
                break;
            case 'flower':
                for (let i = 0; i < count; i++) {
                    const k = 4; // petals
                    const theta = Math.random() * Math.PI * 2;
                    const rMax = Math.abs(Math.cos(k * theta)) + 0.2;
                    const r = rMax * 12 * Math.sqrt(Math.random());
                    const x = r * Math.cos(theta);
                    const y = r * Math.sin(theta);
                    const z = (Math.cos(r * 0.5) * 5) - 2;
                    arr.push(x, z - 2, y); // Rotate to lay flat
                }
                break;
            case 'saturn':
                for (let i = 0; i < count; i++) {
                    if (Math.random() < 0.35) {
                        // Planet
                        const r = 5;
                        const theta = Math.random() * 2 * Math.PI;
                        const phi = Math.acos(2 * Math.random() - 1);
                        arr.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
                    } else {
                        // Ring
                        const ang = Math.random() * Math.PI * 2;
                        const dist = 8 + Math.random() * 8;
                        arr.push(Math.cos(ang) * dist, (Math.random() - 0.5) * 0.5, Math.sin(ang) * dist);
                    }
                }
                break;
            case 'fireworks':
                for (let i = 0; i < count; i++) {
                    const burst = Math.floor(Math.random() * 4);
                    const cx = (burst % 2 === 0 ? 1 : -1) * 8;
                    const cy = (burst < 2 ? 1 : -1) * 8;
                    const r = Math.random() * 6;
                    const theta = Math.random() * 2 * Math.PI;
                    const phi = Math.acos(2 * Math.random() - 1);
                    arr.push(cx + r * Math.sin(phi) * Math.cos(theta), cy + r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
                }
                break;
            case 'dna':
                // DNA Double Helix
                for (let i = 0; i < count; i++) {
                    const t = (i / count) * 8 * Math.PI;
                    const y = (i / count - 0.5) * 25;
                    const strand = i % 2 === 0 ? 0 : Math.PI; // Two strands
                    const r = 4;
                    const x = Math.cos(t + strand) * r;
                    const z = Math.sin(t + strand) * r;
                    // Add some randomness for thickness
                    arr.push(
                        x + (Math.random() - 0.5) * 0.8,
                        y + (Math.random() - 0.5) * 0.5,
                        z + (Math.random() - 0.5) * 0.8
                    );
                }
                break;
            case 'galaxy':
                // Spiral Galaxy with arms
                for (let i = 0; i < count; i++) {
                    const arm = Math.floor(Math.random() * 4);
                    const armOffset = arm * (Math.PI / 2);
                    const dist = Math.sqrt(Math.random()) * 15;
                    const angle = armOffset + dist * 0.5 + (Math.random() - 0.5) * 0.5;
                    const x = Math.cos(angle) * dist;
                    const z = Math.sin(angle) * dist;
                    const y = (Math.random() - 0.5) * (1 + dist * 0.1);
                    arr.push(x, y, z);
                }
                break;
            case 'tornado':
                // Tornado/Vortex
                for (let i = 0; i < count; i++) {
                    const t = i / count;
                    const height = (t - 0.5) * 25;
                    const radius = 1 + Math.abs(height) * 0.3;
                    const angle = t * 20 * Math.PI + (Math.random() - 0.5);
                    const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.5;
                    const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.5;
                    arr.push(x, height, z);
                }
                break;
            case 'cube':
                // Hollow Cube
                for (let i = 0; i < count; i++) {
                    const face = Math.floor(Math.random() * 6);
                    const s = 8; // Size
                    const u = (Math.random() - 0.5) * 2 * s;
                    const v = (Math.random() - 0.5) * 2 * s;
                    let x, y, z;
                    switch (face) {
                        case 0: x = s; y = u; z = v; break;     // +X
                        case 1: x = -s; y = u; z = v; break;    // -X
                        case 2: x = u; y = s; z = v; break;     // +Y
                        case 3: x = u; y = -s; z = v; break;    // -Y
                        case 4: x = u; y = v; z = s; break;     // +Z
                        default: x = u; y = v; z = -s; break;   // -Z
                    }
                    arr.push(x, y, z);
                }
                break;
            case 'torus':
                // Torus (Donut)
                for (let i = 0; i < count; i++) {
                    const R = 10; // Major radius
                    const r = 4;  // Minor radius
                    const u = Math.random() * Math.PI * 2;
                    const v = Math.random() * Math.PI * 2;
                    const x = (R + r * Math.cos(v)) * Math.cos(u);
                    const y = r * Math.sin(v);
                    const z = (R + r * Math.cos(v)) * Math.sin(u);
                    arr.push(x, y, z);
                }
                break;
            case 'wave':
                // Sinusoidal Wave Surface
                for (let i = 0; i < count; i++) {
                    const gridSize = Math.sqrt(count);
                    const xi = (i % gridSize) / gridSize;
                    const zi = Math.floor(i / gridSize) / gridSize;
                    const x = (xi - 0.5) * 25;
                    const z = (zi - 0.5) * 25;
                    const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 4;
                    arr.push(x, y, z);
                }
                break;
            case 'buddha':
                // Lotus/Buddha - layered rings representing seated meditation form
                for (let i = 0; i < count; i++) {
                    const layer = Math.floor((i / count) * 5);
                    const angle = Math.random() * Math.PI * 2;
                    const layerHeight = layer * 2.5 - 5;
                    const layerRadius = (5 - layer) * 2 + Math.random();
                    const x = Math.cos(angle) * layerRadius;
                    const y = layerHeight + Math.random() * 0.5;
                    const z = Math.sin(angle) * layerRadius;
                    arr.push(x, y, z);
                }
                break;
            default:
                // Fallback sphere
                for (let i = 0; i < count; i++) {
                    arr.push((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
                }
        }

        // Fill target
        for (let i = 0; i < arr.length; i++) {
            this.targetPositions[i] = arr[i];
        }
    }

    update(time, hands, audioData) {
        const positions = this.geometry.attributes.position.array;

        // Audio Influence
        const volume = audioData ? audioData.volume : 0;
        const beatScale = 1 + volume * 0.5;

        // Hand Influence
        let timeSpeed = 1.0;
        let gravityStr = 0;

        let hand1 = null, hand2 = null;
        if (hands && hands.length > 0) hand1 = hands[0];
        if (hands && hands.length > 1) hand2 = hands[1];

        // 1. Dual Hand Logic
        if (hand1) {
            if (hand1.gesture === 'VICTORY') timeSpeed = 0.05;
            if (hand1.gesture === 'FIST') gravityStr = 0.5;
            // Color mapping based on gesture
            if (hand1.gesture === 'FIST') this.mesh.material.color.lerp(new THREE.Color(0xff4400), 0.1);
            else if (hand1.gesture === 'VICTORY') this.mesh.material.color.lerp(new THREE.Color(0x00ffff), 0.1);
            else if (hand1.pinch) this.mesh.material.color.lerp(new THREE.Color(0xffff00), 0.2); // Pinch = Gold
        }

        // Base Color Return (if no special gesture or if no hands)
        if ((!hand1 || (hand1.gesture === 'OPEN' || hand1.gesture === 'POINT')) && volume < 0.1) {
            this.mesh.material.color.lerp(this.baseColor, 0.05);
        }

        // 2. Shockwave (Clap)
        let isClapping = false;
        let shockwaveCenter = null;
        if (hand1 && hand2) {
            const dist = Math.hypot(
                (hand1.position.x - hand2.position.x) * 15,
                (hand1.position.y - hand2.position.y) * 10
            );
            if (dist < 2.0 && !this.wasClapping) {
                isClapping = true;
                shockwaveCenter = { x: (hand1.position.x + hand2.position.x) * 7.5, y: (hand1.position.y + hand2.position.y) * 5 };
            }
            this.wasClapping = (dist < 2.0);
        } else {
            this.wasClapping = false;
        }

        if (isClapping) {
            this.mesh.material.color.setHex(0xffffff);
        }

        const effectiveScale = beatScale;

        for (let i = 0; i < this.count; i++) {
            const idx = i * 3;

            // Base Morph
            this.currentBasePositions[idx] += (this.targetPositions[idx] - this.currentBasePositions[idx]) * this.transitionSpeed * timeSpeed;
            this.currentBasePositions[idx + 1] += (this.targetPositions[idx + 1] - this.currentBasePositions[idx + 1]) * this.transitionSpeed * timeSpeed;
            this.currentBasePositions[idx + 2] += (this.targetPositions[idx + 2] - this.currentBasePositions[idx + 2]) * this.transitionSpeed * timeSpeed;

            let x = this.currentBasePositions[idx];
            let y = this.currentBasePositions[idx + 1];
            let z = this.currentBasePositions[idx + 2];

            // Scale
            x *= effectiveScale; y *= effectiveScale; z *= effectiveScale;

            // Turbulence
            if (timeSpeed > 0.1) {
                const ns = 0.05;
                const dx = Math.sin(y * ns + time);
                const dy = Math.cos(z * ns + time);
                const dz = Math.sin(x * ns + time);
                x += dx * 0.2;
                y += dy * 0.2;
                z += dz * 0.2;
            }

            // Hand Interactions 
            if (hands) {
                for (const hand of hands) {
                    const hx = hand.position.x * 15;
                    const hy = hand.position.y * 10;
                    const hz = 15;

                    const dx = x - hx;
                    const dy = y - hy;
                    const dz = z - hz;
                    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1; // Add small epsilon to prevent div by zero

                    // PINCH: Grab/Drag
                    if (hand.pinch) {
                        if (d < 15) {
                            x -= dx * 0.1;
                            y -= dy * 0.1;
                            z -= dz * 0.1;
                        }
                    }
                    // FIST: Gravity Well
                    else if (hand.gesture === 'FIST') {
                        if (d < 25) {
                            const force = (25 - d) / 25;
                            x -= (dx / d) * force * 2.0;
                            y -= (dy / d) * force * 2.0;
                            z -= (dz / d) * force * 2.0;
                        }
                    }
                    // SHOCKWAVE Impulse
                    else if (isClapping && shockwaveCenter) {
                        const sx = x - shockwaveCenter.x;
                        const sy = y - shockwaveCenter.y;
                        const sd = Math.sqrt(sx * sx + sy * sy) + 0.1; // Safe division
                        const force = 5.0 * (1 / (sd));
                        x += (sx / sd) * Math.min(force, 10.0);
                        y += (sy / sd) * Math.min(force, 10.0);
                    }
                    // STANDARD REPEL
                    else {
                        if (d < 8) {
                            const force = (8 - d) / 8;
                            const push = force * force * 5.0;
                            x += (dx / d) * push;
                            y += (dy / d) * push;
                            z += (dz / d) * push;
                        }
                    }
                }
            }

            positions[idx] = x;
            positions[idx + 1] = y;
            positions[idx + 2] = z;
        }

        this.geometry.attributes.position.needsUpdate = true;

        if (volume > 0.2) {
            this.mesh.material.color.setHSL((time * 0.1) % 1, 1, 0.5);
        }
    }

    // Text Shape Generation
    generateTextShape(text) {
        if (!text || text.trim().length === 0) return; // Safety

        const canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.font = 'Bold 60px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 100, 50);

        const data = ctx.getImageData(0, 0, 200, 100).data;
        const positions = [];

        for (let py = 0; py < 100; py += 2) {
            for (let px = 0; px < 200; px += 2) {
                const alpha = data[(py * 200 + px) * 4 + 3];
                if (alpha > 128) {
                    const vx = (px / 200 - 0.5) * 25;
                    const vy = -(py / 100 - 0.5) * 12;
                    positions.push(vx, vy, 0);
                }
            }
        }

        // If text produced no pixels (e.g. space), fallback
        if (positions.length === 0) return;

        // Map to particles
        for (let i = 0; i < this.count; i++) {
            const pIdx = i % (positions.length / 3); // Safeguard modulus

            this.targetPositions[i * 3] = positions[pIdx * 3] + (Math.random() - 0.5) * 0.2;
            this.targetPositions[i * 3 + 1] = positions[pIdx * 3 + 1] + (Math.random() - 0.5) * 0.2;
            this.targetPositions[i * 3 + 2] = positions[pIdx * 3 + 2] + (Math.random() - 0.5);
        }
    }
}
