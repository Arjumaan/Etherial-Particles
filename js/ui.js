export class UIController {
    constructor(callbacks) {
        this.callbacks = callbacks; // { onShapeChange, onColorChange, onAudioToggle, onVoiceToggle }
        this.init();
    }

    init() {
        // Shape Buttons
        document.getElementById('template-buttons').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                document.querySelectorAll('.template-grid button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const shape = e.target.getAttribute('data-shape');
                this.callbacks.onShapeChange(shape);
            }
        });

        // Color Picker
        document.getElementById('color-picker').addEventListener('input', (e) => {
            this.callbacks.onColorChange(e.target.value);
        });

        // Audio Button (Mic)
        const audioBtn = document.getElementById('btn-audio');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                const isActive = this.callbacks.onAudioToggle();
                audioBtn.classList.toggle('active', isActive);
                audioBtn.innerText = isActive ? "MIC ON" : "MIC OFF";
            });
        }

        // Synth Button (Output)
        const synthBtn = document.getElementById('btn-synth');
        if (synthBtn) {
            synthBtn.addEventListener('click', () => {
                const isActive = this.callbacks.onSynthToggle();
                synthBtn.classList.toggle('active', isActive);
                synthBtn.innerText = isActive ? "SYNTH ON" : "SYNTH OFF";
            });
        }

        // Voice Button
        const voiceBtn = document.getElementById('btn-voice');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                const isActive = this.callbacks.onVoiceToggle();
                voiceBtn.classList.toggle('active', isActive);
                voiceBtn.innerText = isActive ? "VOICE ON" : "VOICE OFF";

                const indicator = document.getElementById('voice-indicator');
                if (indicator) indicator.classList.toggle('active', isActive);
            });
        }
    }

    updateStatus(handData) {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');

        let count = 0;
        if (handData && handData.length !== undefined) count = handData.length;

        if (count > 0) {
            dot.classList.add('active');
            const h1 = handData[0];
            const gesture = h1.gesture || 'UNKNOWN';
            const pinch = h1.pinch ? " | PINCH" : "";

            let spellName = gesture;
            if (gesture === 'FIST') spellName = 'GRAVITY WELL';
            if (gesture === 'VICTORY') spellName = 'TIME FREEZE';
            if (gesture === 'POINT') spellName = 'DIRECTIONAL';

            let dualText = (count > 1) ? ` | 2 HANDS (CLAP: ${h1.pinch ? 'READY' : 'WAIT'})` : "";

            text.innerText = `SPELL: ${spellName}${pinch}${dualText}`;
        } else {
            dot.classList.remove('active');
            text.innerText = "AWAITING CASTER...";
        }
    }
}
