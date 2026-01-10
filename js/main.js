import { VisionController } from './vision.js';
import { AudioController } from './audio.js';
import { SynthController } from './synth.js';
import { GPUParticleEngine } from './gpu-particles-v2.js';
import { VoiceController } from './voice.js';
import { UIController } from './ui.js';

// --- MAIN APPLICATION LOGIC ---

class App {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.controls = null;

        this.particles = null;
        this.vision = null;
        this.audio = null;
        this.synth = null;
        this.voice = null;
        this.ui = null;

        this.clock = new THREE.Clock();

        this.handData = null; // Shared state

        this.initThree();
        this.initSystems();
        this.animate();
    }

    initThree() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 30;

        const canvas = document.getElementById('main-canvas');
        if (!canvas) console.error("CRITICAL: Canvas not found!");

        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Post Processing (Bloom)
        const renderScene = new THREE.RenderPass(this.scene, this.camera);
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85
        );
        bloomPass.threshold = 0;
        bloomPass.strength = 1.2;
        bloomPass.radius = 0.5;

        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);

        // Resize Handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initSystems() {
        // 1. Particle Engine (GPU with CPU Fallback)
        this.particles = null;
        let useCPU = false;

        try {
            // Check for critical GPU capabilities before attempting expensive init
            const gl = this.renderer.getContext();

            // Check debug info for Software Renderer
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            let rendererName = "";
            if (debugInfo) {
                rendererName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }

            console.log("Detected Renderer:", rendererName);

            // Detect Software Renderers (SwiftShader, Basic Render, llvmpipe, etc)
            const isSoftware = /SwiftShader|Basic Render|Software|VMware|llvmpipe/i.test(rendererName);

            // Basic Capabilities
            const hasCaps = (
                this.renderer.capabilities.isWebGL2 ||
                this.renderer.extensions.get('OES_texture_float') ||
                this.renderer.extensions.get('OES_texture_half_float')
            );

            if (!hasCaps || isSoftware) {
                console.warn("Hardware limitation detected (Software/Weak GPU). Switching to CPU Engine.");
                useCPU = true;
            } else {
                this.particles = new GPUParticleEngine(this.scene, this.renderer);
                // Verify if init succeeded (some internal checks might fail)
                if (!this.particles || !this.particles.targetTexture) throw new Error("GPU Init Failed");
            }
        } catch (err) {
            console.error("GPU Engine Critical Failure:", err);
            // If GPU init crashed, destroy any partial state and fallback
            if (this.particles) {
                this.particles = null;
            }
            useCPU = true;
        }

        if (useCPU) {
            import('./particles.js').then(module => {
                console.log("Initializing CPU Fallback Engine...");
                this.particles = new module.ParticleEngine(this.scene);
                this.particles.setColor('#ff0080'); // Bright Pink/Gold
                // Manual boost
                if (this.particles.mesh && this.particles.mesh.material) {
                    this.particles.mesh.material.size = 0.45;
                }
                const stat = document.getElementById('stats');
                if (stat) stat.innerText = "FPS: 60 | PARTICLES: 15K (CPU MODE)";
            });
        }

        // 2. Audio (Mic Input)
        this.audio = new AudioController();

        // 3. Synth (Generative Output)
        this.synth = new SynthController();

        // 4. Vision
        const videoElement = document.getElementById('input_video');
        const canvasElement = document.getElementById('output_canvas');

        this.vision = new VisionController(videoElement, canvasElement, (data) => {
            this.handData = data;
            if (this.ui) this.ui.updateStatus(data);
        });

        // 5. Voice
        this.voice = new VoiceController({
            onShape: (shape) => {
                console.log("Voice changed shape to", shape);
                this.particles.generateShape(shape);
                // Update UI button state manually if needed
                const btn = document.querySelector(`button[data-shape="${shape}"]`);
                if (btn) btn.click();
            },
            onColor: (hex) => {
                this.particles.setColor(hex);
            }
        });

        // 6. UI
        this.ui = new UIController({
            onShapeChange: (shape) => this.particles.generateShape(shape),
            onColorChange: (color) => this.particles.setColor(color),
            onAudioToggle: () => this.audio.toggle(),
            onSynthToggle: () => this.synth.toggle(),
            onVoiceToggle: () => this.voice.toggle()
        });

        // 7. Text Input
        const textInput = document.getElementById('particle-text-input');
        textInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.particles.generateTextShape(textInput.value.toUpperCase());
                textInput.value = '';
                textInput.blur();
            }
        });

        // 8. Fullscreen
        const btnFs = document.getElementById('btn-fs');
        btnFs.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });

        // Start Vision
        this.vision.init().then(() => {
            const loading = document.getElementById('loading');
            loading.style.opacity = '0';
            setTimeout(() => loading.style.display = 'none', 800);
        }).catch(e => {
            console.error(e);
            document.getElementById('loading').innerHTML = "<div style='color:#ff0055'>Camera Access Failed</div>";
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = this.clock.getElapsedTime();
        const audioData = this.audio.getAudioData();

        // Update Particles (Safe Check)
        if (this.particles && this.particles.update) {
            try {
                this.particles.update(time, this.handData, audioData);
            } catch (e) {
                console.error("Animation Error (Switching to Safe Mode):", e);
                // Last resort safety: Disable particles if they crash repeatedly
                this.particles = null;
            }
        }

        // Update Synth
        if (this.synth) this.synth.update(this.handData);

        // Scene Rotation (Idle vs Interaction)
        const handData = this.handData;
        const hand1 = (handData && handData.length > 0) ? handData[0] : null;

        if (this.particles && this.particles.mesh) {
            if (hand1 && hand1.isDetected) {
                // Hand detected: Follow hand
                const targetRotY = hand1.position.x * 0.5;
                const targetRotX = hand1.position.y * 0.5;
                this.particles.mesh.rotation.y += (targetRotY - this.particles.mesh.rotation.y) * 0.05;
                this.particles.mesh.rotation.x += (targetRotX - this.particles.mesh.rotation.x) * 0.05;

                // Only access tension if it exists (CPU vs GPU difference?) 
                // Both engines expose mesh, but rotation logic is generic.
            } else {
                // Idle: Auto rotate
                this.particles.mesh.rotation.y += 0.001;
                this.particles.mesh.rotation.x += (0 - this.particles.mesh.rotation.x) * 0.02;
            }
        }

        this.controls.update();
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Start App when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    new App();
});