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
    
    uniform float uInit;
    
    varying vec2 vUv;

    // Pseudo-random
    float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }
    
    // Curl Noise for organic motion
    vec3 curlNoise(vec3 p) {
        const float e = 0.1;
        vec3 dx = vec3(e, 0.0, 0.0);
        vec3 dy = vec3(0.0, e, 0.0);
        vec3 dz = vec3(0.0, 0.0, e);
        
        float x = sin((p + dy).z * 0.5) - sin((p - dy).z * 0.5) - cos((p + dz).y * 0.5) + cos((p - dz).y * 0.5);
        float y = sin((p + dz).x * 0.5) - sin((p - dz).x * 0.5) - cos((p + dx).z * 0.5) + cos((p - dx).z * 0.5);
        float z = sin((p + dx).y * 0.5) - sin((p - dx).y * 0.5) - cos((p + dy).x * 0.5) + cos((p - dy).x * 0.5);
        
        vec3 result = vec3(x, y, z);
        float len = length(result);
        if (len < 0.001) return vec3(0.0);
        return result / len;
    }

    uniform int uShapeType; // 0=sphere, 1=hearts, 2=flower, 3=saturn, 4=buddha, 5=fireworks, 6=dna, 7=galaxy, 8=tornado, 9=cube, 10=torus, 11=wave
    
    // Emotion-based modifiers (from Python backend)
    uniform float uEmotionSpeed;     // Speed multiplier based on emotion
    uniform float uEmotionTurbulence; // Turbulence based on emotion
    uniform float uBeatPulse;         // 0-1 pulse on beat
    
    // Procedural shape generator
    vec3 getShapeTarget(vec2 uv, int shape) {
        float u = uv.x * 6.28318;
        float v = uv.y * 3.14159;
        float idx = uv.x * 512.0 + uv.y * 512.0 * 512.0;
        float t = uv.x + uv.y * 0.618;
        
        if (shape == 0) {
            // SPHERE
            float r = 15.0;
            return vec3(r * sin(v) * cos(u), r * sin(v) * sin(u), r * cos(v));
        }
        else if (shape == 1) {
            // HEARTS
            float t2 = u;
            float x = 16.0 * pow(sin(t2), 3.0);
            float y = 13.0 * cos(t2) - 5.0 * cos(2.0*t2) - 2.0 * cos(3.0*t2) - cos(4.0*t2);
            float z = (rand(uv) - 0.5) * 4.0;
            return vec3(x * 0.8, y * 0.8, z);
        }
        else if (shape == 2) {
            // FLOWER (spiral)
            float angle = idx * 0.1;
            float r = sqrt(idx) * 0.03;
            return vec3(r * cos(angle), r * sin(angle), (rand(uv) - 0.5) * 5.0);
        }
        else if (shape == 3) {
            // SATURN (planet + ring)
            if (rand(uv) < 0.35) {
                float r = 6.0;
                return vec3(r * sin(v) * cos(u), r * sin(v) * sin(u), r * cos(v));
            } else {
                float ang = u;
                float dist = 10.0 + rand(uv + 0.5) * 8.0;
                return vec3(cos(ang) * dist, (rand(uv + 0.3) - 0.5) * 0.8, sin(ang) * dist);
            }
        }
        else if (shape == 4) {
            // BUDDHA (layered rings)
            float layer = floor(uv.y * 5.0);
            float r = (5.0 - layer) * 2.0 + rand(uv) * 2.0;
            float ang = u;
            float y = layer * 3.0 - 6.0 + rand(uv + 0.1);
            return vec3(r * cos(ang), y, r * sin(ang));
        }
        else if (shape == 5) {
            // FIREWORKS (multiple bursts)
            float burst = floor(rand(uv) * 5.0);
            float cx = (mod(burst, 3.0) - 1.0) * 12.0;
            float cy = (burst < 2.0 ? 1.0 : -1.0) * 8.0;
            float r = rand(uv + 0.2) * 8.0;
            return vec3(cx + r * sin(v) * cos(u), cy + r * sin(v) * sin(u), r * cos(v));
        }
        else if (shape == 6) {
            // DNA HELIX (double helix)
            float helixY = (uv.y - 0.5) * 30.0;
            float helixAngle = uv.y * 20.0 + (uv.x < 0.5 ? 0.0 : 3.14159);
            float helixR = 5.0 + sin(uv.y * 10.0) * 2.0;
            return vec3(cos(helixAngle) * helixR, helixY, sin(helixAngle) * helixR);
        }
        else if (shape == 7) {
            // GALAXY (spiral arms)
            float arm = floor(rand(uv) * 4.0);
            float armAngle = arm * 1.5708 + uv.y * 6.0;
            float armDist = uv.y * 18.0 + rand(uv) * 2.0;
            float armY = (rand(uv + 0.5) - 0.5) * 2.0;
            return vec3(cos(armAngle) * armDist, armY, sin(armAngle) * armDist);
        }
        else if (shape == 8) {
            // TORNADO (vortex)
            float height = (uv.y - 0.5) * 25.0;
            float vortexR = 2.0 + abs(height) * 0.4;
            float vortexAngle = u + height * 0.3;
            return vec3(cos(vortexAngle) * vortexR, height, sin(vortexAngle) * vortexR);
        }
        else if (shape == 9) {
            // CUBE (hollow)
            float face = floor(rand(uv) * 6.0);
            float s = 10.0;
            vec2 faceUV = vec2(rand(uv + 0.1), rand(uv + 0.2)) * 2.0 - 1.0;
            if (face < 1.0) return vec3(faceUV.x * s, faceUV.y * s, s);
            else if (face < 2.0) return vec3(faceUV.x * s, faceUV.y * s, -s);
            else if (face < 3.0) return vec3(s, faceUV.x * s, faceUV.y * s);
            else if (face < 4.0) return vec3(-s, faceUV.x * s, faceUV.y * s);
            else if (face < 5.0) return vec3(faceUV.x * s, s, faceUV.y * s);
            else return vec3(faceUV.x * s, -s, faceUV.y * s);
        }
        else if (shape == 10) {
            // TORUS (donut)
            float torusR = 12.0;
            float tubeR = 4.0;
            float torusU = u;
            float torusV = v * 2.0;
            return vec3(
                (torusR + tubeR * cos(torusV)) * cos(torusU),
                tubeR * sin(torusV),
                (torusR + tubeR * cos(torusV)) * sin(torusU)
            );
        }
        else if (shape == 11) {
            // WAVE (sinusoidal surface)
            float waveX = (uv.x - 0.5) * 30.0;
            float waveZ = (uv.y - 0.5) * 30.0;
            float waveY = sin(waveX * 0.5) * cos(waveZ * 0.5) * 5.0;
            return vec3(waveX, waveY, waveZ);
        }
        
        // Default: sphere
        float r = 15.0;
        return vec3(r * sin(v) * cos(u), r * sin(v) * sin(u), r * cos(v));
    }

    void main() {
        vec4 posData = texture2D(tPositions, vUv);
        vec3 pos = posData.rgb;
        
        // Generate target procedurally based on shape type
        vec3 target = getShapeTarget(vUv, uShapeType);
        
        // --- INITIALIZATION ---
        if (uInit > 0.5) {
            // Start with sphere distribution
            float u = vUv.x * 6.28318;
            float v = vUv.y * 3.14159;
            float r = 20.0 + rand(vUv) * 5.0;
            
            pos.x = r * sin(v) * cos(u);
            pos.y = r * sin(v) * sin(u);
            pos.z = r * cos(v);
            
            gl_FragColor = vec4(pos, 1.0);
            return;
        }

        vec3 velocity = vec3(0.0);
        
        // --- PHYSICS ---
        // 1. Spring Force to Target Shape (STRONG - shapes must form)
        vec3 toTarget = target - pos;
        velocity += toTarget * 0.15;
        
        // 2. Curl Noise for organic fluid motion (SUBTLE - don't overpower spring)
        vec3 noise = curlNoise(pos * 0.3 + vec3(uTime * 0.1));
        velocity += noise * 0.05;
        
        // 3. HAND 1 INTERACTION (Boosted radius and force)
        if (uHandCount > 0) {
            float d1 = distance(pos, uHand1Pos);
            vec3 dir1 = normalize(pos - uHand1Pos + vec3(0.001)); // Prevent zero-length
            
            // FIST (1) = Attract + Swirl
            if (uHand1Gesture == 1) {
                if (d1 < 50.0) {
                    velocity -= dir1 * (35.0 / (d1 + 1.0));
                    vec3 tangent = cross(dir1, vec3(0.0, 1.0, 0.0));
                    velocity += tangent * (20.0 / (d1 + 1.0));
                }
            }
            // VICTORY (3) = Gentle swirl only
            else if (uHand1Gesture == 3) {
                if (d1 < 40.0) {
                    vec3 tangent = cross(dir1, vec3(0.0, 1.0, 0.0));
                    velocity += tangent * (12.0 / (d1 + 1.0));
                }
            }
            // OPEN/POINT = Repel
            else {
                if (d1 < 50.0) {
                    velocity += dir1 * (50.0 / (d1 + 0.5));
                }
            }
        }
        
        // 4. HAND 2 INTERACTION (Full Parity - Same boosted values)
        if (uHandCount > 1) {
            float d2 = distance(pos, uHand2Pos);
            vec3 dir2 = normalize(pos - uHand2Pos + vec3(0.001));
            
            if (uHand2Gesture == 1) {
                if (d2 < 50.0) {
                    velocity -= dir2 * (35.0 / (d2 + 1.0));
                    vec3 tangent = cross(dir2, vec3(0.0, 1.0, 0.0));
                    velocity += tangent * (20.0 / (d2 + 1.0));
                }
            } else if (uHand2Gesture == 3) {
                if (d2 < 40.0) {
                    vec3 tangent = cross(dir2, vec3(0.0, 1.0, 0.0));
                    velocity += tangent * (12.0 / (d2 + 1.0));
                }
            } else {
                if (d2 < 50.0) {
                    velocity += dir2 * (50.0 / (d2 + 0.5));
                }
            }
        }
        
        // 5. CLAP SHOCKWAVE
        if (uIsClapping > 0.5) {
            float dC = distance(pos, uCloudCenter);
            if (dC < 50.0) {
                vec3 shockDir = normalize(pos - uCloudCenter);
                velocity += shockDir * (80.0 / (dC + 1.0));
            }
        }

        // Apply velocity
        pos += velocity * uSpeed * uDelta;
        
        // Safety: Reset if too far
        if (length(pos) > 150.0) {
            pos = target;
        }

        gl_FragColor = vec4(pos, 1.0);
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
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;
        
        // Soft glow falloff
        float alpha = 1.0 - (dist * 2.0);
        alpha = pow(alpha, 1.5);
        
        // Slight color variation based on position for depth
        vec3 col = uColor + vPos * 0.003;
        
        // Clamp to prevent overflow
        col = clamp(col, 0.0, 1.0);
        
        gl_FragColor = vec4(col, alpha);
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
        // CRITICAL: Use FloatType since we provide Float32Array data
        // HalfFloatType requires Uint16Array with half-float encoded data
        // FloatType is widely supported in WebGL2 and with OES_texture_float extension
        this.type = THREE.FloatType;

        // Check for float texture support
        const hasFloatSupport = this.renderer.capabilities.isWebGL2 ||
            this.renderer.extensions.get('OES_texture_float');
        if (!hasFloatSupport) {
            console.warn("Float textures may not be fully supported");
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

        // Initialize Data Textures
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

        // SEEDING THE SIMULATION
        // We must copy the data from posTexture1 (DataTexture) into currentRenderTarget (WebGLRenderTarget).
        // Using MeshBasicMaterial is risky because of automatic color management/tone mapping.
        // We use a raw ShaderMaterial to ensure exact bit-copy.

        const copyShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tData: { value: posTexture1 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tData;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = texture2D(tData, vUv);
                }
            `,
            depthTest: false,
            depthWrite: false
        });

        // Fullscreen Quad
        const quadGeometry = new THREE.PlaneGeometry(2, 2);
        const quad = new THREE.Mesh(quadGeometry, copyShaderMaterial);
        const cam = new THREE.Camera(); // Identity camera

        // Render to Current
        this.renderer.setRenderTarget(this.currentRenderTarget);
        this.renderer.render(quad, cam);

        // Render to Next
        this.renderer.setRenderTarget(this.nextRenderTarget);
        this.renderer.render(quad, cam);

        this.renderer.setRenderTarget(null);

        // Cleanup temp
        quadGeometry.dispose();
        copyShaderMaterial.dispose();
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
                uInit: { value: 1.0 },
                uShapeType: { value: 0 },

                // AI/Backend modifiers
                uEmotionSpeed: { value: 1.0 },
                uEmotionTurbulence: { value: 0.1 },
                uBeatPulse: { value: 0.0 },

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
        this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
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
                uPointSize: { value: 6.0 }, // Increased size for visibility
                uColor: { value: new THREE.Color(0x00ffff) }
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

            // Hand 2 - Full Gesture Parity
            if (hands.length > 1) {
                const h2 = hands[1];
                this.simMaterial.uniforms.uHand2Pos.value.set(h2.position.x * 20, h2.position.y * 12, 0);
                let g = 0;
                if (h2.gesture === 'FIST') g = 1;
                if (h2.gesture === 'POINT') g = 2;
                if (h2.gesture === 'VICTORY') g = 3;
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

        // Disable Init AFTER successful render
        if (this.simMaterial.uniforms.uInit.value > 0.5) {
            this.simMaterial.uniforms.uInit.value = 0.0;
        }

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

    // Generate shapes by setting uShapeType uniform (procedural in shader)
    generateShape(shapeName) {
        console.log("Generating shape:", shapeName);

        // Map shape name to shader index
        const shapeMap = {
            'sphere': 0,
            'hearts': 1,
            'flower': 2,
            'saturn': 3,
            'buddha': 4,
            'fireworks': 5,
            'dna': 6,
            'galaxy': 7,
            'tornado': 8,
            'cube': 9,
            'torus': 10,
            'wave': 11
        };

        const shapeIndex = shapeMap[shapeName] !== undefined ? shapeMap[shapeName] : 0;
        this.simMaterial.uniforms.uShapeType.value = shapeIndex;

        console.log("Shape type set to:", shapeIndex);
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

    // ==================
    // AI/Backend Integration Methods
    // ==================

    /**
     * Set emotion-based parameters from backend
     * @param {Object} emotionData - { speed: 1.0, turbulence: 0.1 }
     */
    setEmotionParams(emotionData) {
        if (emotionData.speed !== undefined) {
            this.simMaterial.uniforms.uEmotionSpeed.value = emotionData.speed;
        }
        if (emotionData.turbulence !== undefined) {
            this.simMaterial.uniforms.uEmotionTurbulence.value = emotionData.turbulence;
        }
    }

    /**
     * Trigger beat pulse effect
     * @param {number} intensity - 0-1 pulse strength
     */
    triggerBeat(intensity = 1.0) {
        this.simMaterial.uniforms.uBeatPulse.value = intensity;

        // Pulse the point size too
        const baseSize = this.renderMaterial.uniforms.uPointSize.value;
        this.renderMaterial.uniforms.uPointSize.value = baseSize * (1 + intensity * 0.5);

        // Decay the beat pulse
        setTimeout(() => {
            this.simMaterial.uniforms.uBeatPulse.value = 0;
            this.renderMaterial.uniforms.uPointSize.value = baseSize;
        }, 100);
    }

    /**
     * Add body pose interaction points
     * @param {Array} points - Array of { x, y, z, force } objects
     */
    setPoseInteractionPoints(points) {
        // Use first two points as hand positions if available
        if (points.length > 0) {
            const p1 = points[0];
            this.simMaterial.uniforms.uHand1Pos.value.set(p1.x, p1.y, p1.z || 0);
            this.simMaterial.uniforms.uHand1Gesture.value = p1.force === 'attract' ? 1 : 0;
        }
        if (points.length > 1) {
            const p2 = points[1];
            this.simMaterial.uniforms.uHand2Pos.value.set(p2.x, p2.y, p2.z || 0);
            this.simMaterial.uniforms.uHand2Gesture.value = p2.force === 'attract' ? 1 : 0;
        }
        this.simMaterial.uniforms.uHandCount.value = Math.min(points.length, 2);
    }

    /**
     * Get list of all available shapes
     */
    getAvailableShapes() {
        return [
            'sphere', 'hearts', 'flower', 'saturn', 'buddha', 'fireworks',
            'dna', 'galaxy', 'tornado', 'cube', 'torus', 'wave'
        ];
    }
}
