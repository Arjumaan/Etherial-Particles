export class VoiceController {
    constructor(callbacks) {
        this.callbacks = callbacks; // { onShape, onColor }
        this.recognition = null;
        this.isListening = false;

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => this.processResult(event);
            this.recognition.onerror = (e) => console.log('Voice Error', e);
            this.recognition.onend = () => { if (this.isListening) this.recognition.start(); }; // Auto restart
        }
    }

    toggle() {
        if (!this.recognition) return false;

        if (this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        } else {
            this.recognition.start();
            this.isListening = true;
        }
        return this.isListening;
    }

    processResult(event) {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.trim().toLowerCase();
        console.log("Voice Command:", command);

        const shapes = ['sphere', 'hearts', 'flower', 'saturn', 'buddha', 'fireworks'];
        const colors = {
            'red': 0xff0000,
            'blue': 0x0000ff,
            'green': 0x00ff00,
            'cyan': 0x00d2ff,
            'purple': 0x800080,
            'white': 0xffffff,
            'gold': 0xffd700
        };

        // Check for shape
        const foundShape = shapes.find(s => command.includes(s));
        if (foundShape) {
            this.callbacks.onShape(foundShape);
            return;
        }

        // Check for "heart" singular
        if (command.includes('heart')) {
            this.callbacks.onShape('hearts');
            return;
        }

        // Check for color
        for (const [name, hex] of Object.entries(colors)) {
            if (command.includes(name)) {
                this.callbacks.onColor(hex);
                return;
            }
        }
    }
}
