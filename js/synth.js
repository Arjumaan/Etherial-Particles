export class SynthController {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterType = 'sine';
        this.volume = 0.1;
        this.isPlaying = false;

        // Oscillators
        this.osc1 = null;
        this.osc2 = null;
        this.gainNode = null;
        this.filterNode = null;
        this.lfo = null;
        this.lfoGain = null;
        this.delayNode = null;
        this.delayFeedback = null;
        this.panner = null;
    }

    start() {
        if (this.isPlaying) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // Signal Chain: Oscs -> Filter -> Gain -> Panner -> Reverb -> Master

        // Reverb (Impulse Response approximation or simple delay)
        // Keep it simple: Simple Delay for "Space"
        this.delayNode = this.ctx.createDelay();
        this.delayNode.delayTime.value = 0.3;
        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.value = 0.4;
        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);

        // Spatial Panner
        this.panner = this.ctx.createStereoPanner();

        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 0; // Start silent

        this.filterNode = this.ctx.createBiquadFilter();
        this.filterNode.type = 'lowpass';
        this.filterNode.frequency.value = 1000;
        this.filterNode.Q.value = 5;

        // LFO
        this.lfo = this.ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = 2;
        this.lfoGain = this.ctx.createGain();
        this.lfoGain.gain.value = 500;

        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.filterNode.frequency);
        this.lfo.start();

        // Oscillators
        this.osc1 = this.ctx.createOscillator();
        this.osc1.type = 'sine';
        this.osc1.frequency.value = 110;

        this.osc2 = this.ctx.createOscillator();
        this.osc2.type = 'triangle';
        this.osc2.frequency.value = 220;
        this.osc2.detune.value = 5;

        this.osc1.connect(this.filterNode);
        this.osc2.connect(this.filterNode);

        this.filterNode.connect(this.gainNode);
        this.gainNode.connect(this.panner);

        // Dry
        this.panner.connect(this.ctx.destination);
        // Wet path
        this.panner.connect(this.delayNode);
        this.delayNode.connect(this.ctx.destination);

        this.osc1.start();
        this.osc2.start();

        this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.5);
        this.isPlaying = true;
    }

    stop() {
        if (!this.isPlaying) return;

        // Fade out
        this.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);

        setTimeout(() => {
            if (this.osc1) this.osc1.stop();
            if (this.osc2) this.osc2.stop();
            if (this.lfo) this.lfo.stop();
            this.isPlaying = false;
        }, 200);
    }

    toggle() {
        if (this.isPlaying) {
            this.stop();
            return false;
        } else {
            this.start();
            return true;
        }
    }

    update(hands) {
        if (!this.isPlaying) return;

        // Find dominant hand for audio (e.g. first detected)
        const hand = (hands && hands.length > 0) ? hands[0] : null;

        if (hand && hand.isDetected) {
            // Frequency logic
            const pitchMod = 1 + (hand.position.x + 1) * 0.5;
            const baseFreq = 110;
            const targetFreq = baseFreq * pitchMod;

            this.osc1.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
            this.osc2.frequency.setTargetAtTime(targetFreq * 2 + 5, this.ctx.currentTime, 0.1);

            const filterMod = (hand.position.y + 1) * 2000 + 200;
            this.filterNode.frequency.setTargetAtTime(filterMod, this.ctx.currentTime, 0.1);

            const lfoRate = 2 + (hand.tension * 8);
            this.lfo.frequency.setTargetAtTime(lfoRate, this.ctx.currentTime, 0.1);

            // UPGRADE: Panning based on X
            // Map -1..1 to -1..1
            // hand.position.x is ~ -1 to 1 but scaled by 2.5 in vision.js logic?
            // vision.js: x = (0.5 - wrist.x) * 2.5; -> -1.25 to 1.25 approx
            const panVal = Math.max(-1, Math.min(1, hand.position.x));
            this.panner.pan.setTargetAtTime(panVal, this.ctx.currentTime, 0.1);

            this.gainNode.gain.setTargetAtTime(0.2, this.ctx.currentTime, 0.1);
        } else {
            // Idle
            this.osc1.frequency.setTargetAtTime(110, this.ctx.currentTime, 1.0);
            this.osc2.frequency.setTargetAtTime(220, this.ctx.currentTime, 1.0);
            this.filterNode.frequency.setTargetAtTime(500, this.ctx.currentTime, 1.0);
            this.lfo.frequency.setTargetAtTime(0.5, this.ctx.currentTime, 1.0);
            this.panner.pan.setTargetAtTime(0, this.ctx.currentTime, 1.0);
            this.gainNode.gain.setTargetAtTime(0.05, this.ctx.currentTime, 1.0);
        }
    }
}
