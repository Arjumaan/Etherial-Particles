export class AudioController {
    constructor() {
        this.ctx = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        this.isInitialized = false;
        this.isActive = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            // Try getting microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.source = this.ctx.createMediaStreamSource(stream);
            this.source.connect(this.analyser);

            this.isInitialized = true;
            this.isActive = true;
            console.log("Audio Initialized");
        } catch (e) {
            console.error("Audio Access Denied or Error:", e);
            // Fallback to silent mode or oscillator if needed, but for now just fail gracefully
        }
    }

    toggle() {
        if (!this.isInitialized) {
            this.init();
            return true;
        }

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
            this.isActive = true;
        } else if (this.ctx.state === 'running') {
            this.ctx.suspend();
            this.isActive = false;
        }
        return this.isActive;
    }

    getAudioData() {
        if (!this.isActive || !this.analyser) return { volume: 0, frequencies: [] };

        this.analyser.getByteFrequencyData(this.dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;

        // Return normalized volume (0-1) and raw data
        return {
            volume: average / 128, // Normalize 0-2 range loosely
            frequencies: this.dataArray
        };
    }
}
