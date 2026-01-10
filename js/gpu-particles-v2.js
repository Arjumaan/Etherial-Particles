const THREE = window.THREE;

const simulatedVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const simulationFragmentShader = `
    uniform sampler2D tPositions;
    uniform sampler2D tOrigins;
    uniform float uTime;
    uniform float uDelta;
    uniform float uSpeed;
    
    uniform int uHandCount;
    uniform vec3 uHand1Pos;     
    uniform int uHand1Gesture;  
    uniform vec3 uHand2Pos;
    uniform int uHand2Gesture;
    uniform float uIsClapping;
    uniform vec3 uCloudCenter;

    varying vec2 vUv;

    float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    vec3 wsh(vec3 p) {
        p *= 0.15;
        return vec3(sin(p.z), cos(p.y), sin(p.x)); 
    }
    
    vec3 curlNoise(vec3 p) {
        const float e = 0.1;
        vec3 dx = vec3(e, 0.0, 0.0);
        vec3 dy = vec3(0.0, e, 0.0);
        vec3 dz = vec3(0.0, 0.0, e);
        
        vec3 p_x0 = wsh(p - dx); vec3 p_x1 = wsh(p + dx);
        vec3 p_y0 = wsh(p - dy); vec3 p_y1 = wsh(p + dy);
        vec3 p_z0 = wsh(p - dz); vec3 p_z1 = wsh(p + dz);
        
        float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
        float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
        float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;
        
        return normalize(vec3(x, y, z));
    }

    void main() {
        vec4 posData = texture2D(tPositions, vUv);
        vec3 pos = posData.rgb;
        float life = posData.a; 
        
        vec3 target = texture2D(tOrigins, vUv).rgb;
        
        vec3 velocity = vec3(0.0);
        
        // 1. Return to Shape (Spring)
        vec3 toTarget = target - pos;
        velocity += toTarget * (0.05 + 0.05 * rand(vUv)); 
        
        // 2. Fluid Noise (Always active)
        vec3 noise = curlNoise(pos * 0.5 + vec3(uTime * 0.2));
        velocity += noise * 0.3;
        
        // 3. Hand Interactions
        if (uHandCount > 0) {
            // Hand 1
            float d1 = distance(pos, uHand1Pos);
            vec3 dir1 = normalize(uHand1Pos - pos);
            
            // FIST: VORTEX GRAVITY (Black Hole)
            if (uHand1Gesture == 1) { 
                if (d1 < 25.0) {
                    // Pull in
                    velocity += dir1 * (30.0 / (d1 + 0.5)) * 1.5;
                    // Rotate (Cross product with up vector)
                    vec3 tan = cross(dir1, vec3(0, 1, 0));
                    velocity += tan * (20.0 / (d1 + 1.0));
                }
            }
            // OPEN/POINT: FORCE FIELD (Repel)
            else if (d1 < 12.0) {
                velocity -= dir1 * (20.0 / (d1 + 0.1));
            }
            
            // Hand 2
            if (uHandCount > 1) {
                float d2 = distance(pos, uHand2Pos);
                vec3 dir2 = normalize(uHand2Pos - pos);
                if (uHand2Gesture == 1 && d2 < 25.0) {
                     velocity += dir2 * (30.0 / (d2 + 0.5)) * 1.5;
                } else if (d2 < 12.0) {
                     velocity -= dir2 * (20.0 / (d2 + 0.1));
                }
            }
        
            // Clap Shokwave
            if (uIsClapping > 0.5) {
                float dC = distance(pos, uCloudCenter);
                if (dC < 40.0) {
                    velocity += normalize(pos - uCloudCenter) * (150.0 / (dC + 1.0));
                }
            }
        }

        pos += velocity * uDelta * uSpeed;
        gl_FragColor = vec4(pos, life);
    }
`;

const renderVertexShader = `
    // Render Shader
    // Reads position from simulation texture and places point
    
    uniform sampler2D tPositions;
    uniform float uPointSize;
    
    varying vec3 vPos;
    varying float vSpeed;

    void main() {
        vec4 posData = texture2D(tPositions, position.xy); // Geometry uv used as lookup
        vec3 pos = posData.rgb;
        
        vPos = pos;
        
        // Calculate speed for coloring
        vSpeed = length(posData.rgb - position.xyz); // Approximate... or just use height

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Size attenuation
        gl_PointSize = uPointSize * (100.0 / -mvPosition.z);
    }
`;

const renderFragmentShader = `
    varying vec3 vPos;
    varying float vSpeed;
    
    uniform vec3 uColor;
    
    void main() {
        // Circular soft particle
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;
        
        float glow = 1.0 - (dist * 2.0);
        glow = pow(glow, 1.5);
        
        // Incandescence based on speed
        // uDelta is approx 0.016. Speed is velocity * delta. 
        // vSpeed is length(diff) which is distance moved in one frame?
        // In update loop: pos += velocity * delta.
        // So vSpeed approx velocity * delta.
        // During big bang, velocity is high.
        
        vec3 col = uColor + vPos * 0.005; 
        
        // Heat
        float heat = smoothstep(0.0, 1.0, vSpeed * 2.0); // Adjust sensitivity
        col = mix(col, vec3(1.0, 0.9, 0.5), heat); // Mix with warm gold/white
        
        gl_FragColor = vec4(col, glow);
    }
`;


// --- JS ENGINE CLASS ---

export class GPUParticleEngine {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;

        // Resolution of simulation
        // 512 = 262,144 particles
        // 1024 = 1,048,576 particles (This is the shock value) 
        // Let's go 512 first for safety, user can upgrade. Or fuck it, 700? 
        // 700*700 = 490k. Close to half a million. Good balance.
        this.width = 512;
        this.height = 512;
        this.count = this.width * this.height;

        this.particles = null;
        this.simMesh = null;
        this.renderMesh = null;

        // FBOs
        this.currentRenderTarget = null;
        this.nextRenderTarget = null;
        this.targetTexture = null; // Shape targets

        this.init();
    }

    init() {
        this.initTextures();
        this.initSimulation();
        this.initVisualization();
    }

    // Create floating point textures
    getDataTexture(data) {
        const texture = new THREE.DataTexture(
            data, this.width, this.height,
            THREE.RGBAFormat, this.type
        );
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        return texture;
    }

    initTextures() {
        // Detect support for Floating Point Textures
        // Some devices (like iPhones or older GPUs) only support HalfFloat
        if (this.renderer.capabilities.isWebGL2 === false &&
            this.renderer.extensions.get('OES_texture_float') === null) {
            // Fallback or HalfFloat?
            // Try to detect half float
            this.type = THREE.HalfFloatType;
        } else {
            // Default to Float if available, but check for iOS specific quirk/performance
            // actually, checking floatFragmentTextures capability is cleaner in newer Three.js, 
            // but let's stick to safe defaults.
            // If uncertain, HalfFloatType is safer for compatibility.
            // But let's look for the extension check.
            if (this.renderer.capabilities.floatVertexTextures) {
                this.type = THREE.FloatType;
            } else {
                this.type = THREE.HalfFloatType;
            }
        }

        // Force HalfFloat for broad compatibility if we suspect issues? 
        // No, let's trust the capability check. 
        // Actually, for maximum "works everywhere", HalfFloat is usually sufficient for visual particles.
        // Let's use HalfFloatType as default if Float isn't explicitly super-supported?
        // Let's stick to the check.

        // Wait, 'isWebGL2' usually supports float textures by default but requires EXT_color_buffer_float for rendering TO them.
        // Let's try to just check if we can render to float.

        // SIMPLIFICATION: usage of HalfFloatType is almost always safe for positions in this scope.
        // Let's check if the generic 'FloatType' caused the issue.
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.type = isIOS ? THREE.HalfFloatType : THREE.FloatType;
        // Check if the renderer actually supports it
        if (!this.renderer.extensions.get('OES_texture_float')) {
            this.type = THREE.HalfFloatType;
        }

        const size = this.width * this.height * 4;
        const data = new Float32Array(size); // CPU always uses Float32, DataTexture converts.
        const targetData = new Float32Array(size);

        for (let i = 0; i < size; i += 4) {
            // Random sphere start
            // BIG BANG: Start at singularity (very small radius)
            // They will explode outwards to the 'targetData' (Sphere)
            const r = 0.1 * Math.cbrt(Math.random());
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.acos(2 * Math.random() - 1);

            const x = r * Math.sin(theta) * Math.cos(phi);
            const y = r * Math.sin(theta) * Math.sin(phi);
            const z = r * Math.cos(theta);

            data[i] = x;
            data[i + 1] = y;
            data[i + 2] = z;
            data[i + 3] = 1.0; // Alpha

            // Targets match start initially
            targetData[i] = x;
            targetData[i + 1] = y;
            targetData[i + 2] = z;
            targetData[i + 3] = 0.0;
        }

        const posTexture1 = this.getDataTexture(data);
        const posTexture2 = this.getDataTexture(data);
        this.targetTexture = this.getDataTexture(targetData);

        // Setup Double Buffering with detected TYPE
        this.currentRenderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
            wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
            minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat, type: this.type,
            stencilBuffer: false, depthBuffer: false
        });

        this.nextRenderTarget = this.currentRenderTarget.clone();

        // Fill initial data
        this.renderer.setRenderTarget(this.currentRenderTarget);
        // We are skipping the initial render-to-texture from data, assuming shader handles it?
        // NO, we must seed the simulation! 
        // The DataTexture input is 'tPositions' for the first frame?
        // Let's make sure the 'currentRenderTarget' has the data.

        // Hack: Render the posTexture1 into currentRenderTarget using a simple copy pass?
        // Or simpler: Just assign the data texture as the initial "read" texture in the update loop?
        // The update loop uses 'this.currentRenderTarget.texture'. 
        // If that is empty (black), particles spawn at 0,0,0.
        // We MUST render the initial state.

        // create a quad to blit data
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: posTexture1 }));
        const cam = new THREE.Camera();

        const originalTarget = this.renderer.getRenderTarget();

        this.renderer.setRenderTarget(this.currentRenderTarget);
        this.renderer.render(quad, cam);

        this.renderer.setRenderTarget(this.nextRenderTarget);
        this.renderer.render(quad, cam);

        this.renderer.setRenderTarget(originalTarget);

        // Cleanup temp
        quad.geometry.dispose();
        quad.material.dispose();
    }

    initSimulation() {
        // Geometry for the simulation fullscreen quad
        const simGeometry = new THREE.BufferGeometry();
        simGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            -1, -1, 0, 1, -1, 0, 1, 1, 0,
            -1, -1, 0, 1, 1, 0, -1, 1, 0
        ]), 3));
        simGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
            0, 0, 1, 0, 1, 1,
            0, 0, 1, 1, 0, 1
        ]), 2));

        this.simMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tPositions: { value: null },
                tOrigins: { value: this.targetTexture },
                uTime: { value: 0 },
                uDelta: { value: 0 },
                uSpeed: { value: 2.0 },

                // Interaction
                uHandCount: { value: 0 },
                uHand1Pos: { value: new THREE.Vector3() },
                uHand1Gesture: { value: 0 },
                uHand2Pos: { value: new THREE.Vector3() },
                uHand2Gesture: { value: 0 },
                uIsClapping: { value: 0 },
                uCloudCenter: { value: new THREE.Vector3() }
            },
            vertexShader: simulatedVertexShader,
            fragmentShader: simulationFragmentShader
        });

        this.simScene = new THREE.Scene();
        this.simCamera = new THREE.Camera();
        this.simCamera.position.z = 1;

        this.simMesh = new THREE.Mesh(simGeometry, this.simMaterial);
        this.simScene.add(this.simMesh);
    }

    initVisualization() {
        // The point cloud
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3); // Just dummy coords to be displaced by shader

        // We need UVs on the particles to associate them with texture pixels
        const uvs = new Float32Array(this.count * 2);

        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                const k = i * this.width + j;
                uvs[k * 2] = j / (this.width - 1);
                uvs[k * 2 + 1] = i / (this.height - 1);
                positions[k * 3] = 0; // shader overwrites
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        // We reuse the position attribute slot or use custom 'uv'
        // But shader uses 'position' to define standard vertex.
        // Wait, 'renderVertexShader' uses 'position.xy' as lookup?
        // Yes, if we passed uvs as position.

        // Better:
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.count * 3), 3));
        // We actually need to pass the UVs to the vertex shader so it knows which pixel to read.
        // Standard 'uv' attribute:
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); // Use standard UV
        // Wait, Points geometry usually needs positions. We can leave them at 0.
        // But the shader needs to read the texture at specific UV.
        // In vertex shader 'renderVertexShader', I used 'texture2D(tPositions, position.xy)'.
        // That implies I populate 'position' with UV values.

        // Let's populate 'position' with UVs for simplicity in shader (0 to 1)
        const uvPos = new Float32Array(this.count * 3);
        for (let i = 0; i < this.count; i++) {
            uvPos[i * 3] = uvs[i * 2];
            uvPos[i * 3 + 1] = uvs[i * 2 + 1];
            uvPos[i * 3 + 2] = 0;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(uvPos, 3));

        this.renderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tPositions: { value: null },
                uPointSize: { value: 3.0 },
                uColor: { value: new THREE.Color(0xff0055) }
            },
            vertexShader: renderVertexShader,
            fragmentShader: renderFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Points(geometry, this.renderMaterial);
        this.scene.add(this.mesh);
    }

    update(time, hands, audioData) {
        // 1. Update Uniforms
        this.simMaterial.uniforms.uTime.value = time;
        this.simMaterial.uniforms.uDelta.value = 0.016; // Fixed timestep for stability

        const volume = audioData ? audioData.volume : 0;
        this.simMaterial.uniforms.uSpeed.value = 2.0 + volume * 8.0; // Audio boosts speed

        // Pulse size
        this.renderMaterial.uniforms.uPointSize.value = 2.0 + volume * 2.0;

        // Hand Data mapping
        if (hands && hands.length > 0) {
            this.simMaterial.uniforms.uHandCount.value = hands.length;

            // Hand 1
            const h1 = hands[0];
            if (h1) {
                this.simMaterial.uniforms.uHand1Pos.value.set(h1.position.x * 20, h1.position.y * 12, 0); // Scale up
                let g = 0;
                if (h1.gesture === 'FIST') g = 1;
                if (h1.gesture === 'POINT') g = 2;
                if (h1.gesture === 'VICTORY') g = 3;
                this.simMaterial.uniforms.uHand1Gesture.value = g;
            }

            // Hand 2
            if (hands.length > 1) {
                const h2 = hands[1];
                this.simMaterial.uniforms.uHand2Pos.value.set(h2.position.x * 20, h2.position.y * 12, 0);
                let g = 0;
                if (h2.gesture === 'FIST') g = 1;
                this.simMaterial.uniforms.uHand2Gesture.value = g;
            }

            // Clap
            // Check main app state or calc here. Calculating here is safer for GLSL self-containment.
            if (hands.length > 1) {
                const h2 = hands[1];
                // Distance in normalized 0-1, need to consider aspect if strict, but approx is fine
                // Wait, h1.position is normalized (0 to 1? or -1 to 1? In vision.js it is normalized centered? check)
                // Vision.js: (0.5 - wrist.x) * 2.5 -> range approx -1.25 to 1.25
                const dx = h1.position.x - h2.position.x;
                const dy = h1.position.y - h2.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                this.simMaterial.uniforms.uIsClapping.value = (dist < 0.2) ? 1.0 : 0.0;
                if (dist < 0.2) {
                    const cx = (h1.position.x + h2.position.x) * 10; // *20 / 2
                    const cy = (h1.position.y + h2.position.y) * 6; // *12 / 2
                    this.simMaterial.uniforms.uCloudCenter.value.set(cx, cy, 0);
                }
            }
        } else {
            this.simMaterial.uniforms.uHandCount.value = 0;
        }

        // 2. Perform Simulation Step
        // Read from current, write to next
        this.simMaterial.uniforms.tPositions.value = this.currentRenderTarget.texture;

        // Render into next FBO
        this.renderer.setRenderTarget(this.nextRenderTarget);
        this.renderer.render(this.simScene, this.simCamera);
        this.renderer.setRenderTarget(null); // Back to screen

        // 3. Update Visuals
        this.renderMaterial.uniforms.tPositions.value = this.nextRenderTarget.texture;

        // 4. Ping Pong
        const temp = this.currentRenderTarget;
        this.currentRenderTarget = this.nextRenderTarget;
        this.nextRenderTarget = temp;
    }

    setColor(hex) {
        this.renderMaterial.uniforms.uColor.value.set(hex);
    }

    // Generate shapes by updating the TargetTexture
    generateShape(shapeName) {
        const data = this.targetTexture.image.data;
        const count = this.count;

        // Helper to set xyz
        const setPos = (i, x, y, z) => {
            data[i] = x; data[i + 1] = y; data[i + 2] = z;
        };

        switch (shapeName) {
            case 'sphere':
                for (let i = 0; i < count; i++) {
                    const idx = i * 4;
                    const r = 15;
                    const theta = Math.random() * 2 * Math.PI;
                    const phi = Math.acos(2 * Math.random() - 1);
                    setPos(idx, r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
                }
                break;
            case 'hearts':
                for (let i = 0; i < count; i++) {
                    const idx = i * 4;
                    const t = Math.random() * Math.PI * 2;
                    const s = 0.5 + Math.random() * 0.5;
                    const x = 16 * Math.pow(Math.sin(t), 3);
                    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
                    const z = (Math.random() - 0.5) * 4;
                    setPos(idx, x * 0.8, y * 0.8, z);
                }
                break;
            case 'flower':
                // Spiral flower
                for (let i = 0; i < count; i++) {
                    const idx = i * 4;
                    const angle = i * 0.1; // Golden angle?
                    const r = Math.sqrt(i) * 0.05 * (512 / Math.sqrt(count) * 2);
                    setPos(idx, r * Math.cos(angle), r * Math.sin(angle), (Math.random() - 0.5) * 5);
                }
                break;
            // Add others as fallback to random box
            default:
                for (let i = 0; i < count; i++) {
                    const idx = i * 4;
                    setPos(idx, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
                }
        }

        this.targetTexture.needsUpdate = true;
    }

    generateTextShape(text) {
        // Bitmap logic in JS? 
        // We can do the same Canvas logic but mapping to 1M particles is tricky.
        // Simplified: Randomly distribute particles inside text mask.
        if (!text) return;
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.font = 'Bold 80px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 64);

        const imgData = ctx.getImageData(0, 0, 256, 128).data;
        const validPixels = [];
        for (let y = 0; y < 128; y += 2) {
            for (let x = 0; x < 256; x += 2) {
                if (imgData[(y * 256 + x) * 4 + 3] > 128) {
                    validPixels.push({ x: (x / 256 - 0.5) * 60, y: -(y / 128 - 0.5) * 30 });
                }
            }
        }

        if (validPixels.length === 0) return;

        const data = this.targetTexture.image.data;
        for (let i = 0; i < this.count; i++) {
            const idx = i * 4;
            const p = validPixels[i % validPixels.length];
            data[idx] = p.x + (Math.random() - 0.5);
            data[idx + 1] = p.y + (Math.random() - 0.5);
            data[idx + 2] = (Math.random() - 0.5) * 2;
        }
        this.targetTexture.needsUpdate = true;
    }
}
