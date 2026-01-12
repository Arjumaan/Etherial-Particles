# Etherial Particles: GPU-Accelerated Gesture & Audio Reactive System

![Etherial Particles](https://img.shields.io/badge/Status-Private-red) ![License](https://img.shields.io/badge/License-Proprietary-red) ![Particles](https://img.shields.io/badge/Particles-262K-cyan) ![Grade](https://img.shields.io/badge/Code%20Grade-A--brightgreen)

**Etherial Particles** is a futuristic, interactive web application that leverages **GLSL Compute Shaders (GPGPU)** to simulate **262,000+ particles** in real-time. It features advanced hand-tracking (Skeletal Tracking) and audio reactivity to create a fluid, living digital organism that responds to your physical presence and voice.

---

## 🌟 Key Features

* **Massive Scale Particle Simulation**: Shifting from CPU to GPU allows simulating 250k+ particles at 60fps.
* **Real-time Skeletal Hand Tracking**: Powered by MediaPipe Hands, interaction is lag-free and accurate.
* **Advanced Physics Interactions**:
  * **Vortex Gravity**: Making a **FIST** creates a black-hole singularity that sucks particles in with swirl.
  * **Force Field**: Opening your hand pushes particles away with a repulsive force field.
  * **Shockwave**: **CLAPPING** your hands generates a massive sonic boom shockwave.
* **Audio Reactivity**: Particles pulse, accelerate, and glow based on microphone input and music beats.
* **Dynamic Incandescence**: Particles heat up and glow white-hot when moving at high velocities.
* **Shape Shifting**: Morph the cloud into various 3D forms (Sphere, Hearts, Flower, Saturn, etc.).
* **Voice Control**: Say "Hearts", "Sphere", "Red", "Blue" to change shapes and colors.
* **Generative Synth**: Hand-controlled audio synthesizer with spatial panning.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Core** | HTML5, Vanilla JavaScript (ES Modules) |
| **Rendering** | [Three.js](https://threejs.org/) r128 (WebGL 2.0) |
| **Physics** | Custom GLSL Compute Shaders (GPGPU Ping-Pong FBO) |
| **AI/Vision** | [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) |
| **Audio Input** | Web Audio API (FFT Analysis) |
| **Audio Output** | Web Audio Synth (Oscillators, LFO, Filter, Delay) |
| **Voice** | Web Speech Recognition API |

---

## 🛠️ Setup & Running Locally

This project requires a local server to handle ES Modules and Camera permissions securely.

### Prerequisites

* Python (for simple server) OR Node.js (for http-server).
* A webcam.
* Modern browser (Chrome 90+, Firefox 90+, Edge 90+).

### Instructions

1. **Clone the Repository**

    ```bash
    git clone https://github.com/Arjumaan/Etherial-Particles.git
    cd Etherial-Particles
    ```

2. **Start a Local Server**
    * **Using Python 3:**

        ```bash
        python -m http.server 8000
        ```

    * **Using Node/VS Code Live Server:**
        Open index.html with Live Server or run `npx http-server .`

3. **Launch**
    Open your browser and navigate to `http://localhost:8000`.
    * *Note: Allow Camera and Microphone permissions when prompted.*

---

## 🎮 Controls & Interactions

| Gesture / Action | Effect |
| :--- | :--- |
| **Open Hand** | **Repulsion Field**: Pushes particles away (radius: 30 units, force: 40x) |
| **Fist (Closed Hand)** | **Gravitational Vortex**: Creates a singularity with swirl effect |
| **Clap (Both Hands)** | **Sonic Boom**: Generates a high-velocity shockwave clearing the center |
| **Victory Sign (Peace)** | **Time Freeze**: Slows down particle motion |
| **Point** | **Directional**: Focuses particles in pointing direction |
| **Voice Commands** | Say: "Sphere", "Hearts", "Flower", "Saturn", "Red", "Blue", "Gold", etc. |
| **Audio / Mic** | **Energy Boost**: Volume intensity increases simulation speed and size |
| **UI Buttons** | **Shape Shifting**: Click to morph particles into different target shapes |

---

## 📂 Project Structure

```
Etherial-Particles/
├── css/
│   └── style.css              # Cyberpunk UI styling (472 lines)
├── js/
│   ├── main.js                # App Entry Point & Orchestrator (292 lines)
│   ├── gpu-particles-v2.js    # CORE: GPGPU Physics Engine (567 lines)
│   ├── particles.js           # CPU Fallback Engine (327 lines)
│   ├── vision.js              # MediaPipe Hand Tracking (131 lines)
│   ├── audio.js               # Microphone FFT Analyzer (69 lines)
│   ├── synth.js               # Generative Audio Synth (150 lines)
│   ├── voice.js               # Speech Recognition (71 lines)
│   └── ui.js                  # DOM UI Manager (84 lines)
├── index.html                 # Main Entry (133 lines)
└── README.md                  # This file
```

**Total Lines of Code**: ~2,500

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Particles not visible?** | Ensure your browser supports **WebGL 2.0** or **OES_texture_float**. The engine auto-falls back to HalfFloat for iOS. |
| **Just one dot in center?** | Hard refresh (Ctrl+F5). The initialization flag may be cached. |
| **Hand gestures not working?** | Ensure camera permission is granted. Check bottom-left camera preview shows skeleton. |
| **Laggy performance?** | Close other GPU-intensive tabs. 262k particles is demanding. |
| **Audio not reacting?** | Click "MIC OFF" button to enable microphone access. |

---

# 📊 Technical Architecture Review

## Executive Summary

**Etherial Particles** is an impressive, ambitious real-time interactive visual experience combining:
* **WebGL/Three.js** for 3D rendering
* **MediaPipe Hands** for real-time gesture recognition
* **Web Audio API** for generative sound synthesis
* **Web Speech API** for voice control
* **GPGPU** (General-Purpose computing on Graphics Processing Units) for particle simulation

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          index.html                                  │
│  (Entry Point, CDN Libraries, UI Structure, Error Logger)           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │       main.js          │
                    │  (App Orchestrator)    │
                    └───────────┬───────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼           ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
  │vision.js│ │audio.js │ │synth.js │ │voice.js │ │  ui.js  │ │particles│
  │MediaPipe│ │Mic Input│ │Sound Out│ │Speech   │ │ DOM UI  │ │Engines  │
  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
                                                                   │
                                                    ┌──────────────┴──────────────┐
                                                    ▼                              ▼
                                         ┌────────────────────┐      ┌────────────────────┐
                                         │ gpu-particles-v2.js│      │   particles.js     │
                                         │   (GPGPU Engine)   │      │ (CPU Fallback)     │
                                         │   262K Particles   │      │  15K Particles     │
                                         └────────────────────┘      └────────────────────┘
```

---

## File-by-File Analysis

### 1. `index.html` (133 lines)

**Purpose**: Entry point, dependency loading, UI scaffolding.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Structure | ⭐⭐⭐⭐ | Clean semantic HTML5 |
| Dependencies | ⭐⭐⭐ | Uses CDN, Three.js r128 (consider upgrade to r150+) |
| Error Handling | ⭐⭐⭐⭐⭐ | Inline error logger displays runtime errors visually |
| Accessibility | ⭐⭐ | Missing ARIA labels, keyboard nav |

---

### 2. `css/style.css` (472 lines)

**Purpose**: UI styling with cyberpunk/futuristic aesthetic.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Design System | ⭐⭐⭐⭐⭐ | CSS Variables, cohesive palette |
| Animations | ⭐⭐⭐⭐⭐ | Glitch effect, pulse animations, smooth transitions |
| Responsiveness | ⭐⭐⭐ | Fixed positioning may break on mobile |
| Modern CSS | ⭐⭐⭐⭐ | Uses `backdrop-filter`, glassmorphism |

**Standout Features**:
* Beautiful **Glitch Text Effect** with `::before`/`::after` pseudo-elements
* Glassmorphism panel with blur
* Pulsing status indicator

---

### 3. `js/main.js` (292 lines)

**Purpose**: Application orchestrator, Three.js scene setup.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Architecture | ⭐⭐⭐⭐ | Clean class-based structure |
| GPU Detection | ⭐⭐⭐⭐⭐ | Robust software renderer detection |
| Fallback Logic | ⭐⭐⭐⭐⭐ | Dynamic import of CPU engine |
| Error Recovery | ⭐⭐⭐⭐ | Try-catch with graceful degradation |

**Key Technical Highlight**:

```javascript
// Smart GPU capability detection
const isSoftware = /SwiftShader|Basic Render|Software|VMware|llvmpipe/i.test(rendererName);
```

---

### 4. `js/gpu-particles-v2.js` (567 lines) ⭐ CORE ENGINE

**Purpose**: GPGPU particle simulation using ping-pong FBO technique.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Algorithm | ⭐⭐⭐⭐⭐ | Proper GPGPU with double-buffering |
| Shader Code | ⭐⭐⭐⭐ | Clean GLSL, good comments |
| Compatibility | ⭐⭐⭐⭐ | HalfFloat fallback for iOS |
| Physics | ⭐⭐⭐⭐ | Spring-based with hand interaction |

**GPGPU Simulation Loop**:

```
┌──────────────┐          ┌──────────────┐
│ Position FBO │ ──Read──►│  Simulation  │──Write─►┐
│   (Current)  │          │   Shader     │         │
└──────────────┘          └──────────────┘         │
       ▲                                           │
       │              PING-PONG SWAP               ▼
       └───────────────────────────────────────────┘
```

**Particle Counts**:
* 512×512 texture = **262,144 particles**
* Each pixel RGBA = one particle's XYZ position + metadata

**Shape Generation Algorithms**:

| Shape | Algorithm |
|-------|-----------|
| Sphere | Spherical coordinates with uniform distribution |
| Hearts | Parametric heart curve equation |
| Flower | Polar rose curve with Golden Angle |
| Text | Canvas 2D bitmap sampling |

---

### 5. `js/particles.js` (327 lines) - CPU Fallback

**Purpose**: JavaScript-based particle engine for low-end devices.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Performance | ⭐⭐⭐ | 15K particles, adequate for fallback |
| Features | ⭐⭐⭐⭐ | Full parity with GPU shapes |
| Physics | ⭐⭐⭐⭐⭐ | Rich hand interactions (pinch, fist, clap) |

---

### 6. `js/vision.js` (131 lines)

**Purpose**: MediaPipe Hands integration for gesture recognition.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Integration | ⭐⭐⭐⭐⭐ | Clean wrapper around MediaPipe |
| Gesture Detection | ⭐⭐⭐⭐ | FIST, POINT, VICTORY, OPEN + Pinch |
| Data Normalization | ⭐⭐⭐⭐ | Coordinates mapped to -1..1 range |

**Gesture Classification Logic**:

```javascript
if (!isExtended[1] && !isExtended[2] && !isExtended[3] && !isExtended[4]) gesture = 'FIST';
else if (isExtended[1] && isExtended[2] && ...) gesture = 'VICTORY';
```

---

### 7. `js/audio.js` (69 lines)

**Purpose**: Microphone input for audio-reactive effects.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Implementation | ⭐⭐⭐⭐ | Clean Web Audio API usage |
| Error Handling | ⭐⭐⭐⭐ | Graceful denial handling |

---

### 8. `js/synth.js` (150 lines)

**Purpose**: Generative sound synthesis controlled by hand gestures.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Sound Design | ⭐⭐⭐⭐⭐ | Dual oscillators, LFO, filter, delay |
| Hand Control | ⭐⭐⭐⭐⭐ | X→Pitch, Y→Filter, Tension→LFO Rate |
| Spatialization | ⭐⭐⭐⭐ | Stereo panning based on X position |

**Signal Chain**:

```
Osc1 (Sine) ─┬─► Filter (LPF + LFO) ─► Gain ─► Panner ─┬─► Destination
Osc2 (Tri)  ─┘                                          └─► Delay (Wet)
```

---

### 9. `js/voice.js` (71 lines)

**Purpose**: Voice command recognition using Web Speech API.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Implementation | ⭐⭐⭐⭐ | Continuous recognition with auto-restart |
| Command Set | ⭐⭐⭐ | Shapes + 7 colors |

**Supported Voice Commands**:
* Shapes: `sphere`, `hearts`, `flower`, `saturn`, `buddha`, `fireworks`
* Colors: `red`, `blue`, `green`, `cyan`, `purple`, `white`, `gold`

---

### 10. `js/ui.js` (84 lines)

**Purpose**: DOM event handling for control panel.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Implementation | ⭐⭐⭐⭐ | Clean callback pattern |
| Status Display | ⭐⭐⭐⭐⭐ | Creative "spell" naming (e.g., "GRAVITY WELL") |

---

## Performance Metrics

| Metric | GPU Engine | CPU Engine |
|--------|------------|------------|
| Particle Count | 262,144 | 15,000 |
| Simulation | GPU Shader | JavaScript |
| Frame Budget | ~1ms | ~8-12ms |
| Memory | ~64MB VRAM | ~10MB RAM |
| Target FPS | 60 | 30-60 |

---

## Security Considerations

| Risk | Status | Mitigation |
|------|--------|------------|
| Camera Access | ✅ Prompted | Browser permission dialog |
| Microphone Access | ✅ Prompted | Browser permission dialog |
| XSS via Text Input | ⚠️ Low Risk | Input only used for Canvas rendering |
| CDN Dependencies | ⚠️ Medium | Consider Subresource Integrity (SRI) |

---

## Overall Code Grade: A-

### Strengths

1. **Innovative Concept** - Unique blend of computer vision + audio + particles
2. **Technical Depth** - Proper GPGPU implementation with fallbacks
3. **Polish** - Beautiful UI with animations and feedback
4. **Modularity** - Clean separation of concerns

### Areas for Improvement

1. Second hand not fully utilized in GPU shader
2. Some shapes not implemented in GPU engine (fall to default)
3. Mobile/touch support missing
4. Consider Three.js upgrade for WebGPU readiness

---

## Future Roadmap

| Feature | Priority | Difficulty |
|---------|----------|------------|
| Mobile Touch Support | High | Medium |
| Recording/Export Video | High | Medium |
| More Shapes (DNA Helix, Galaxy) | Medium | Easy |
| VR/XR Support (WebXR) | Low | Hard |
| WebGPU Migration | Low | Hard |

---

## 📜 License

**Bismillahi Rahmani Raheem.**

**© 2026 Arjumaan. All Rights Reserved.**

This project is the intellectual property of **Arjumaan**.
This software is **PROPRIETARY and CONFIDENTIAL**.
Unauthorized copying, distribution, modification, or use of this source code, via any medium, is strictly prohibited without explicit written permission from the owner.

---

*Project Architected for the Future.* ✨
