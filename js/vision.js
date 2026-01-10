export class VisionController {
    constructor(videoElement, canvasElement, onHandData) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
        this.onHandData = onHandData;

        this.hands = null;
        this.camera = null;
        this.isLoaded = false;
    }

    async init() {
        if (!window.Hands) {
            console.error("MediaPipe Hands not loaded");
            return;
        }

        this.hands = new window.Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2, // UPGRADE: Dual Hands
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => {
            this.processResults(results);
        });

        this.camera = new window.Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: 640,
            height: 480
        });

        try {
            await this.camera.start();
            this.isLoaded = true;
            console.log("Vision System Started");
        } catch (err) {
            console.error("Camera access error:", err);
            throw err;
        }
    }

    processResults(results) {
        // Draw
        if (this.canvasCtx) {
            this.canvasCtx.save();
            this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
            if (results.multiHandLandmarks) {
                for (const landmarks of results.multiHandLandmarks) {
                    if (window.drawConnectors) window.drawConnectors(this.canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: '#00d2ff', lineWidth: 2 });
                    if (window.drawLandmarks) window.drawLandmarks(this.canvasCtx, landmarks, { color: '#ffffff', lineWidth: 1, radius: 2 });
                }
            }
            this.canvasCtx.restore();
        }

        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.onHandData([]);
            return;
        }

        const handsOut = [];

        // Process up to 2 hands
        for (const landmarks of results.multiHandLandmarks) {
            const wrist = landmarks[0];
            const tips = [4, 8, 12, 16, 20];

            // 1. Gesture Detection
            const isExtended = [];
            tips.forEach((tipIdx, i) => {
                if (i === 0) return;
                const tip = landmarks[tipIdx];
                const pip = landmarks[tipIdx - 2];
                // Distance to wrist check
                const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
                const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
                isExtended[i] = dTip > dPip;
            });

            let gesture = 'OPEN';
            if (!isExtended[1] && !isExtended[2] && !isExtended[3] && !isExtended[4]) gesture = 'FIST';
            else if (isExtended[1] && isExtended[2] && !isExtended[3] && !isExtended[4]) gesture = 'VICTORY';
            else if (isExtended[1] && !isExtended[2] && !isExtended[3] && !isExtended[4]) gesture = 'POINT';

            // 2. Pinch Detection (Thumb Tip 4 close to Index Tip 8)
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
            const isPinching = pinchDist < 0.05; // Threshold

            // 3. Tension
            let totalDist = 0;
            tips.forEach(idx => {
                const tip = landmarks[idx];
                totalDist += Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2) + Math.pow(tip.z - wrist.z, 2));
            });
            let tension = 1 - ((totalDist / 5 - 0.1) / (0.35 - 0.1));
            tension = Math.max(0, Math.min(1, tension));

            // 4. Coordinates
            const x = (0.5 - wrist.x) * 2.5;
            const y = (0.5 - wrist.y) * 2.0;

            handsOut.push({
                isDetected: true,
                id: handsOut.length, // 0 or 1
                position: { x, y },
                pinch: isPinching,
                tension: tension,
                gesture: gesture,
                landmarks: landmarks
            });
        }

        this.onHandData(handsOut);
    }
}
