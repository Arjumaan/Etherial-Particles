# Etherial Particles: GPU-Accelerated Gesture & Audio Reactive System

![Etherial Particles](https://img.shields.io/badge/Status-Private-red) ![License](https://img.shields.io/badge/License-Proprietary-red)

**Etherial Particles** is a futuristic, interactive web application that leverages **GLSL Compute Shaders (GPGPU)** to simulate **262,000+ particles** in real-time. It features advanced hand-tracking (Skeletal Tracking) and audio reactivity to create a fluid, living digital organism that responds to your physical presence and voice.

## 🌟 Key Features

* **Massive Scale Particle Simulation**: shifting from CPU to GPU allows simulating 250k+ particles at 60fps.
* **Real-time Skeletal Hand Tracking**: Powered by MediaPipe Hands, interaction is lag-free and accurate.
* **Advanced Physics Interactions**:
  * **Vortex Gravity**: Making a **FIST** creates a black-hole singularity that sucks particles in.
  * **Force Field**: Opening your hand pushes particles away with a repulsive force field.
  * **Shockwave**: **CLAPPING** your hands generates a massive sonic boom shockwave.
* **Audio Reactivity**: Particles pulse, accelerate, and glow based on microphone input and music beats.
* **Dynamic Incandescence**: Particles heat up and glow white-hot when moving at high velocities (e.g., during the "Big Bang" or inside a Vortex).
* **Shape Shifting**: Morph the cloud into various 3D forms (Sphere, Hearts, Saturn, Buddha, etc.).

## 🚀 Tech Stack

* **Core**: HTML5, Vanilla JavaScript (ES Modules).
* **Rendering**: [Three.js](https://threejs.org/) (WebGL 2.0).
* **Physics**: Custom GLSL Compute Shaders (Texture-based Position Simulation).
* **AI/Vision**: [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands).
* **Audio**: Web Audio API (FFT Analysis).

## 🛠️ Setup & Running Locally

This project requires a local server to handle ES Modules and Camera permissions securely.

### Prerequisites

* Python (for simple server) OR Node.js (for http-server).
* A webcam.

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

## 🎮 Controls & Interactions

| Gesture / Action | Effect |
| :--- | :--- |
| **Open Hand** | **Repulsion Field**: Pushes particles away gently. |
| **Fist (Closed Hand)** | **Gravitational Vortex**: Creates a singularity that sucks particles inward spirally. |
| **Clap** | **Sonic Boom**: Generates a high-velocity shockwave clearing the center. |
| **Victory Sign (Peace)** | **Swirl/Perturbation**: Gentle mixing of the fluid. |
| **Voice / Audio** | **Energy Boost**: Volume intensity increases simulation speed and particle size. |
| **UI Buttons** | **Shape Shifting**: Click to morph particles into different target shapes. |

## 📂 Project Structure

```
Etherial-Particles/
├── css/
│   └── style.css          # Cyberpunk UI styling
├── js/
│   ├── gpu-particles-v2.js # CORE: GLSL Physics Engine & Rendering
│   ├── vision.js          # MediaPipe Hand Tracking Controller
│   ├── audio.js           # Audio Analyzer & Microphone Input
│   ├── main.js            # App Entry Point & Loop
│   ├── ui.js              # DOM UI Manager
│   └── ...
├── index.html             # Main Entry
└── README.md
```

## 🐛 Troubleshooting

* **Particles not visible?**
  * Ensure your browser supports **WebGL 2.0** or **OES_texture_float** extension.
  * The engine automatically attempts to fallback to Half-Float textures for iOS/Safari compatibility.
* **Laggy?**
  * Close other GPU-intensive tabs. The simulation is heavy (262k active agents).

## 📜 License

**Bismillahi Rahmani Raheem.**

**© 2026 Arjumaan. All Rights Reserved.**

This project is the intellectual property of **Arjumaan**.
This software is **PROPRIETARY and CONFIDENTIAL**.
Unauthorized copying, distribution, modification, or use of this source code, via any medium, is strictly prohibited without explicit written permission from the owner.

---

*Project Architected for the Future.*
