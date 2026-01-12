/**
 * ETHERIAL PARTICLES - Backend Integration Module
 * ================================================
 * Connects to Python FastAPI backend for advanced AI features:
 * - Emotion detection (face → particle mood)
 * - Body pose tracking (full body → particle field)
 * - Beat synchronization (music → particle pulse)
 */

export class BackendController {
    constructor(options = {}) {
        this.wsUrl = options.wsUrl || 'ws://localhost:8001/ws';
        this.beatsWsUrl = options.beatsWsUrl || 'ws://localhost:8001/ws/beats';

        this.ws = null;
        this.beatsWs = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // Feature flags (set by server)
        this.features = {
            emotion: false,
            pose: false,
            audio: false
        };

        // Latest data from server
        this.emotion = {
            current: 'neutral',
            confidence: 0,
            all: {}
        };

        this.pose = {
            detected: false,
            landmarks: [],
            keyPoints: {}
        };

        this.beat = {
            tempo: 120,
            onBeat: false,
            count: 0
        };

        // Callbacks
        this.onEmotionChange = null;
        this.onPoseUpdate = null;
        this.onBeat = null;
        this.onConnect = null;
        this.onDisconnect = null;

        // Frame sending settings
        this.sendFrameInterval = 100; // ms between frames
        this.lastFrameSent = 0;
        this.emotionFrameInterval = 500; // Emotion detection less frequent
        this.lastEmotionFrame = 0;
    }

    /**
     * Connect to the Python backend
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔌 Connecting to backend:', this.wsUrl);

                this.ws = new WebSocket(this.wsUrl);

                this.ws.onopen = () => {
                    console.log('✅ Backend connected');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    if (this.onConnect) this.onConnect();
                    resolve(true);
                };

                this.ws.onclose = () => {
                    console.log('❌ Backend disconnected');
                    this.connected = false;
                    if (this.onDisconnect) this.onDisconnect();
                    this.attemptReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };

            } catch (error) {
                console.error('Failed to connect:', error);
                reject(error);
            }
        });
    }

    /**
     * Attempt to reconnect on disconnect
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect().catch(() => { });
        }, delay);
    }

    /**
     * Handle incoming messages from backend
     */
    handleMessage(data) {
        switch (data.type) {
            case 'connected':
                this.features = data.features;
                console.log('Backend features:', this.features);
                break;

            case 'analysis':
                // Emotion data
                if (data.emotion) {
                    this.emotion = {
                        current: data.emotion.emotion,
                        confidence: data.emotion.confidence,
                        all: data.emotion.all_emotions || {}
                    };
                    if (this.onEmotionChange) {
                        this.onEmotionChange(this.emotion);
                    }
                }

                // Pose data
                if (data.pose) {
                    this.pose = {
                        detected: data.pose.detected,
                        landmarks: data.pose.landmarks || [],
                        keyPoints: {
                            nose: data.pose.nose,
                            leftHand: data.pose.left_hand,
                            rightHand: data.pose.right_hand,
                            leftShoulder: data.pose.left_shoulder,
                            rightShoulder: data.pose.right_shoulder,
                            leftHip: data.pose.left_hip,
                            rightHip: data.pose.right_hip
                        }
                    };
                    if (this.onPoseUpdate) {
                        this.onPoseUpdate(this.pose);
                    }
                }
                break;

            case 'beat':
                this.beat = {
                    tempo: data.tempo,
                    onBeat: true,
                    count: data.count
                };
                if (this.onBeat) {
                    this.onBeat(this.beat);
                }
                // Reset beat flag after short delay
                setTimeout(() => { this.beat.onBeat = false; }, 50);
                break;

            case 'error':
                console.error('Backend error:', data.message);
                break;

            case 'pong':
                // Heartbeat response
                break;
        }
    }

    /**
     * Send video frame to backend for analysis
     * @param {HTMLCanvasElement|HTMLVideoElement} source - Video source
     * @param {Object} options - What to analyze
     */
    sendFrame(source, options = { emotion: true, pose: true }) {
        if (!this.connected || !this.ws) return;

        const now = Date.now();

        // Rate limit frame sending
        if (now - this.lastFrameSent < this.sendFrameInterval) return;
        this.lastFrameSent = now;

        // Rate limit emotion detection more heavily
        const analyzeEmotion = options.emotion && (now - this.lastEmotionFrame > this.emotionFrameInterval);
        if (analyzeEmotion) this.lastEmotionFrame = now;

        try {
            // Convert to canvas if video element
            let canvas;
            if (source instanceof HTMLVideoElement) {
                canvas = document.createElement('canvas');
                canvas.width = 320;  // Downscale for performance
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
            } else {
                canvas = source;
            }

            // Get base64 image
            const base64 = canvas.toDataURL('image/jpeg', 0.7);

            this.ws.send(JSON.stringify({
                type: 'frame',
                data: base64,
                analyze_emotion: analyzeEmotion,
                analyze_pose: options.pose
            }));

        } catch (error) {
            console.error('Error sending frame:', error);
        }
    }

    /**
     * Start beat synchronization at given tempo
     * @param {number} tempo - Beats per minute
     */
    startBeatSync(tempo = 120) {
        try {
            this.beatsWs = new WebSocket(this.beatsWsUrl);

            this.beatsWs.onopen = () => {
                console.log('🎵 Beat sync connected');
                this.beatsWs.send(JSON.stringify({ tempo }));
            };

            this.beatsWs.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'beat') {
                    this.beat = {
                        tempo: data.tempo,
                        onBeat: true,
                        count: data.count
                    };
                    if (this.onBeat) {
                        this.onBeat(this.beat);
                    }
                    setTimeout(() => { this.beat.onBeat = false; }, 50);
                }
            };

            this.beatsWs.onerror = (error) => {
                console.error('Beat sync error:', error);
            };

        } catch (error) {
            console.error('Failed to start beat sync:', error);
        }
    }

    /**
     * Stop beat synchronization
     */
    stopBeatSync() {
        if (this.beatsWs) {
            this.beatsWs.close();
            this.beatsWs = null;
        }
    }

    /**
     * Get emotion-based particle parameters
     * Maps emotions to particle behavior
     */
    getEmotionParticleParams() {
        const emotion = this.emotion.current;
        const confidence = this.emotion.confidence;

        // Base params modified by emotion
        const params = {
            speed: 1.0,
            turbulence: 0.1,
            colorShift: 0,
            pulseRate: 1.0,
            attraction: 0,
            expansion: 0
        };

        switch (emotion) {
            case 'happy':
                params.speed = 1.5;
                params.turbulence = 0.2;
                params.colorShift = 60;  // Shift to yellow/warm
                params.pulseRate = 1.5;
                params.expansion = 0.3 * confidence;
                break;

            case 'sad':
                params.speed = 0.5;
                params.turbulence = 0.05;
                params.colorShift = -60;  // Shift to blue
                params.pulseRate = 0.5;
                params.attraction = 0.2 * confidence;  // Particles cluster together
                break;

            case 'angry':
                params.speed = 2.0;
                params.turbulence = 0.4;
                params.colorShift = 0;  // Red stays red
                params.pulseRate = 2.5;
                params.expansion = 0.5 * confidence;
                break;

            case 'surprise':
                params.speed = 1.8;
                params.turbulence = 0.3;
                params.colorShift = 30;
                params.pulseRate = 2.0;
                params.expansion = 0.4 * confidence;
                break;

            case 'fear':
                params.speed = 1.3;
                params.turbulence = 0.35;
                params.colorShift = -30;
                params.pulseRate = 1.8;
                params.attraction = 0.3 * confidence;
                break;

            case 'disgust':
                params.speed = 0.7;
                params.turbulence = 0.25;
                params.colorShift = 90;  // Green shift
                params.pulseRate = 0.8;
                break;

            default:  // neutral
                // Keep defaults
                break;
        }

        return params;
    }

    /**
     * Get pose-based interaction points for particles
     * Returns array of interaction points with position and type
     */
    getPoseInteractionPoints() {
        if (!this.pose.detected) return [];

        const points = [];
        const kp = this.pose.keyPoints;

        // Hands - main interaction points
        if (kp.leftHand) {
            points.push({
                type: 'hand',
                x: (0.5 - kp.leftHand.x) * 40,  // Map to world coords
                y: (0.5 - kp.leftHand.y) * 24,
                z: 0,
                force: 'repel'
            });
        }

        if (kp.rightHand) {
            points.push({
                type: 'hand',
                x: (0.5 - kp.rightHand.x) * 40,
                y: (0.5 - kp.rightHand.y) * 24,
                z: 0,
                force: 'repel'
            });
        }

        // Nose - gentle attraction
        if (kp.nose) {
            points.push({
                type: 'head',
                x: (0.5 - kp.nose.x) * 40,
                y: (0.5 - kp.nose.y) * 24,
                z: 0,
                force: 'attract'
            });
        }

        // Body center - calculate from hips
        if (kp.leftHip && kp.rightHip) {
            points.push({
                type: 'body',
                x: (0.5 - (kp.leftHip.x + kp.rightHip.x) / 2) * 40,
                y: (0.5 - (kp.leftHip.y + kp.rightHip.y) / 2) * 24,
                z: 0,
                force: 'swirl'
            });
        }

        return points;
    }

    /**
     * Disconnect from backend
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.stopBeatSync();
        this.connected = false;
    }

    /**
     * Check if backend is available
     */
    async checkBackendStatus() {
        try {
            const response = await fetch('http://localhost:8001/');
            const data = await response.json();
            return data;
        } catch (error) {
            return { status: 'offline', error: error.message };
        }
    }
}
