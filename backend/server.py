"""
ETHERIAL PARTICLES - Python Backend Server
==========================================
FastAPI server providing:
- Real-time WebSocket communication
- Emotion detection from facial expressions
- Beat detection from audio
- Full body pose tracking

Run with: uvicorn server:app --reload --host 0.0.0.0 --port 8001
"""

import asyncio
import base64
import json
import logging
import time
from io import BytesIO
from typing import Dict, List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from PIL import Image

# ML Libraries
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    logging.warning("MediaPipe not available - pose/face/hand detection disabled")

try:
    from fer import FER
    FER_AVAILABLE = True
except ImportError:
    FER_AVAILABLE = False
    logging.warning("FER not available - emotion detection disabled")

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    logging.warning("Librosa not available - beat detection disabled")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Etherial Particles API",
    description="Backend for real-time particle system with AI features",
    version="2.0.0"
)

# CORS - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================
# ML Model Initializers
# ====================

# Emotion Detector
emotion_detector = None
if FER_AVAILABLE:
    try:
        emotion_detector = FER(mtcnn=True)
        logger.info("✅ Emotion detector initialized")
    except Exception as e:
        logger.error(f"Failed to initialize emotion detector: {e}")

# MediaPipe Pose
pose_detector = None
if MEDIAPIPE_AVAILABLE:
    try:
        mp_pose = mp.solutions.pose
        pose_detector = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("✅ Pose detector initialized")
    except Exception as e:
        logger.error(f"Failed to initialize pose detector: {e}")

# MediaPipe Face Mesh (468 landmarks)
face_mesh_detector = None
if MEDIAPIPE_AVAILABLE:
    try:
        mp_face_mesh = mp.solutions.face_mesh
        face_mesh_detector = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,  # Enables iris landmarks
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("✅ Face Mesh detector initialized (468 landmarks)")
    except Exception as e:
        logger.error(f"Failed to initialize face mesh detector: {e}")

# MediaPipe Hands (21 landmarks per hand)
hand_detector = None
if MEDIAPIPE_AVAILABLE:
    try:
        mp_hands = mp.solutions.hands
        hand_detector = mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("✅ Hand detector initialized (21 landmarks x 2 hands)")
    except Exception as e:
        logger.error(f"Failed to initialize hand detector: {e}")

# ====================
# WebSocket Manager
# ====================

class ConnectionManager:
    """Manage WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.last_emotion = {"emotion": "neutral", "confidence": 0.0}
        self.last_pose = {}
        self.last_beat = {"tempo": 0, "beat": False}
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"Client disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# ====================
# Image Processing
# ====================

def decode_base64_image(data: str) -> np.ndarray:
    """Decode base64 image string to OpenCV format"""
    # Remove data URL prefix if present
    if ',' in data:
        data = data.split(',')[1]
    
    image_bytes = base64.b64decode(data)
    image = Image.open(BytesIO(image_bytes))
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

def analyze_emotion(image: np.ndarray) -> Dict:
    """Analyze facial emotions in image"""
    if not emotion_detector:
        return {"emotion": "unknown", "confidence": 0.0, "all_emotions": {}}
    
    try:
        # Convert BGR to RGB for FER
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        result = emotion_detector.detect_emotions(rgb_image)
        
        if result and len(result) > 0:
            emotions = result[0]['emotions']
            dominant = max(emotions, key=emotions.get)
            return {
                "emotion": dominant,
                "confidence": emotions[dominant],
                "all_emotions": emotions
            }
    except Exception as e:
        logger.error(f"Emotion detection error: {e}")
    
    return {"emotion": "neutral", "confidence": 0.0, "all_emotions": {}}

def analyze_pose(image: np.ndarray) -> Dict:
    """Analyze body pose in image using MediaPipe"""
    if not pose_detector:
        return {"landmarks": [], "detected": False}
    
    try:
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = pose_detector.process(rgb_image)
        
        if results.pose_landmarks:
            landmarks = []
            for idx, landmark in enumerate(results.pose_landmarks.landmark):
                landmarks.append({
                    "id": idx,
                    "x": landmark.x,
                    "y": landmark.y,
                    "z": landmark.z,
                    "visibility": landmark.visibility
                })
            
            # Extract key body points for particle interaction
            return {
                "detected": True,
                "landmarks": landmarks,
                # Key points for particle effects
                "nose": {"x": landmarks[0]["x"], "y": landmarks[0]["y"]},
                "left_hand": {"x": landmarks[15]["x"], "y": landmarks[15]["y"]} if len(landmarks) > 15 else None,
                "right_hand": {"x": landmarks[16]["x"], "y": landmarks[16]["y"]} if len(landmarks) > 16 else None,
                "left_shoulder": {"x": landmarks[11]["x"], "y": landmarks[11]["y"]},
                "right_shoulder": {"x": landmarks[12]["x"], "y": landmarks[12]["y"]},
                "left_hip": {"x": landmarks[23]["x"], "y": landmarks[23]["y"]} if len(landmarks) > 23 else None,
                "right_hip": {"x": landmarks[24]["x"], "y": landmarks[24]["y"]} if len(landmarks) > 24 else None,
            }
    except Exception as e:
        logger.error(f"Pose detection error: {e}")
    
    return {"landmarks": [], "detected": False}


def analyze_face_mesh(image: np.ndarray) -> Dict:
    """Analyze face mesh with 468 landmarks using MediaPipe"""
    if not face_mesh_detector:
        return {"landmarks": [], "detected": False}
    
    try:
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = face_mesh_detector.process(rgb_image)
        
        if results.multi_face_landmarks and len(results.multi_face_landmarks) > 0:
            face_landmarks = results.multi_face_landmarks[0]
            landmarks = []
            
            for idx, landmark in enumerate(face_landmarks.landmark):
                landmarks.append({
                    "id": idx,
                    "x": landmark.x,
                    "y": landmark.y,
                    "z": landmark.z
                })
            
            # Extract key facial features for particle effects
            # Mouth landmarks: 13 (top lip), 14 (bottom lip), 78 (left corner), 308 (right corner)
            mouth_open = abs(landmarks[13]["y"] - landmarks[14]["y"]) > 0.03
            
            # Eye landmarks: 159 (left eye top), 145 (left eye bottom), 386 (right eye top), 374 (right eye bottom)
            left_eye_open = abs(landmarks[159]["y"] - landmarks[145]["y"]) > 0.015
            right_eye_open = abs(landmarks[386]["y"] - landmarks[374]["y"]) > 0.015
            
            # Eyebrow positions for expression
            left_brow = landmarks[70]["y"]
            right_brow = landmarks[300]["y"]
            eyebrows_raised = left_brow < 0.25 or right_brow < 0.25
            
            return {
                "detected": True,
                "landmark_count": len(landmarks),
                "landmarks": landmarks[:50],  # Send first 50 to reduce payload
                "features": {
                    "mouth_open": mouth_open,
                    "left_eye_open": left_eye_open,
                    "right_eye_open": right_eye_open,
                    "eyebrows_raised": eyebrows_raised,
                    "face_center": {"x": landmarks[1]["x"], "y": landmarks[1]["y"]},
                    "nose_tip": {"x": landmarks[4]["x"], "y": landmarks[4]["y"]},
                    "chin": {"x": landmarks[152]["x"], "y": landmarks[152]["y"]},
                    "left_eye": {"x": landmarks[33]["x"], "y": landmarks[33]["y"]},
                    "right_eye": {"x": landmarks[263]["x"], "y": landmarks[263]["y"]},
                    "mouth_center": {"x": (landmarks[13]["x"] + landmarks[14]["x"]) / 2,
                                     "y": (landmarks[13]["y"] + landmarks[14]["y"]) / 2}
                }
            }
    except Exception as e:
        logger.error(f"Face mesh detection error: {e}")
    
    return {"detected": False, "landmarks": []}


def analyze_hands(image: np.ndarray) -> Dict:
    """Analyze hand landmarks and recognize gestures using MediaPipe"""
    if not hand_detector:
        return {"hands": [], "detected": False}
    
    try:
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = hand_detector.process(rgb_image)
        
        hands = []
        if results.multi_hand_landmarks:
            for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                landmarks = []
                for idx, landmark in enumerate(hand_landmarks.landmark):
                    landmarks.append({
                        "id": idx,
                        "x": landmark.x,
                        "y": landmark.y,
                        "z": landmark.z
                    })
                
                # Gesture recognition based on finger positions
                gesture = recognize_gesture(landmarks)
                
                # Get handedness
                handedness = "Unknown"
                if results.multi_handedness:
                    handedness = results.multi_handedness[hand_idx].classification[0].label
                
                hands.append({
                    "handedness": handedness,
                    "landmarks": landmarks,
                    "gesture": gesture,
                    "palm_center": {"x": landmarks[0]["x"], "y": landmarks[0]["y"]},
                    "index_tip": {"x": landmarks[8]["x"], "y": landmarks[8]["y"]},
                    "thumb_tip": {"x": landmarks[4]["x"], "y": landmarks[4]["y"]},
                    "pinch_distance": calculate_distance(landmarks[4], landmarks[8])
                })
        
        return {
            "detected": len(hands) > 0,
            "hand_count": len(hands),
            "hands": hands
        }
    except Exception as e:
        logger.error(f"Hand detection error: {e}")
    
    return {"hands": [], "detected": False}


def recognize_gesture(landmarks: List[Dict]) -> str:
    """Recognize hand gesture from landmarks using ML-based rules"""
    if len(landmarks) < 21:
        return "UNKNOWN"
    
    # Finger tip IDs: thumb=4, index=8, middle=12, ring=16, pinky=20
    # Finger base IDs: thumb=2, index=5, middle=9, ring=13, pinky=17
    
    def is_finger_extended(tip_id, base_id):
        return landmarks[tip_id]["y"] < landmarks[base_id]["y"]
    
    def is_thumb_extended():
        # Thumb extends sideways
        return abs(landmarks[4]["x"] - landmarks[2]["x"]) > 0.05
    
    thumb = is_thumb_extended()
    index = is_finger_extended(8, 5)
    middle = is_finger_extended(12, 9)
    ring = is_finger_extended(16, 13)
    pinky = is_finger_extended(20, 17)
    
    # Gesture recognition
    if not any([index, middle, ring, pinky]):
        if thumb:
            return "THUMBS_UP"
        return "FIST"
    
    if index and middle and not ring and not pinky:
        return "VICTORY"
    
    if index and not middle and not ring and not pinky:
        return "POINT"
    
    if all([thumb, index, middle, ring, pinky]):
        return "OPEN"
    
    if index and middle and ring and not pinky:
        return "THREE"
    
    if not index and not middle and not ring and pinky:
        return "PINKY"
    
    if thumb and pinky and not index and not middle and not ring:
        return "ROCK"
    
    # Pinch detection
    pinch_dist = calculate_distance(landmarks[4], landmarks[8])
    if pinch_dist < 0.05:
        return "PINCH"
    
    return "OPEN"


def calculate_distance(p1: Dict, p2: Dict) -> float:
    """Calculate distance between two landmark points"""
    return ((p1["x"] - p2["x"])**2 + (p1["y"] - p2["y"])**2 + (p1.get("z", 0) - p2.get("z", 0))**2)**0.5


# ====================
# Audio Processing
# ====================

def analyze_audio_beats(audio_path: str) -> Dict:
    """Analyze audio file for tempo and beat positions"""
    if not LIBROSA_AVAILABLE:
        return {"tempo": 120, "beats": [], "error": "Librosa not available"}
    
    try:
        y, sr = librosa.load(audio_path, duration=30)  # Load first 30 seconds
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()
        
        # Get onset strength for reactivity
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        
        return {
            "tempo": float(tempo),
            "beats": beat_times,
            "duration": float(len(y) / sr),
            "onset_strength": onset_env.tolist()[:100]  # First 100 samples
        }
    except Exception as e:
        logger.error(f"Audio analysis error: {e}")
        return {"tempo": 120, "beats": [], "error": str(e)}

# ====================
# REST Endpoints
# ====================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Etherial Particles API v2.0",
        "version": "2.0.0",
        "features": {
            "emotion_detection": FER_AVAILABLE and emotion_detector is not None,
            "pose_detection": MEDIAPIPE_AVAILABLE and pose_detector is not None,
            "face_mesh": MEDIAPIPE_AVAILABLE and face_mesh_detector is not None,
            "hand_gesture_ml": MEDIAPIPE_AVAILABLE and hand_detector is not None,
            "beat_detection": LIBROSA_AVAILABLE
        },
        "gestures_supported": [
            "FIST", "OPEN", "POINT", "VICTORY", "THUMBS_UP", 
            "THREE", "PINKY", "ROCK", "PINCH"
        ]
    }

@app.get("/status")
async def status():
    """Get detailed system status"""
    return {
        "connections": len(manager.active_connections),
        "last_emotion": manager.last_emotion,
        "last_beat": manager.last_beat,
        "features_enabled": {
            "emotion": FER_AVAILABLE,
            "pose": MEDIAPIPE_AVAILABLE,
            "audio": LIBROSA_AVAILABLE
        }
    }

@app.post("/analyze/emotion")
async def analyze_emotion_endpoint(file: UploadFile = File(...)):
    """Analyze emotion from uploaded image"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        result = analyze_emotion(image)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/audio")
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    """Analyze uploaded audio file for beats"""
    try:
        # Save temporarily
        temp_path = f"/tmp/audio_{int(time.time())}.mp3"
        contents = await file.read()
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        result = analyze_audio_beats(temp_path)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ====================
# WebSocket Endpoint
# ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for real-time communication.
    
    Receives:
    - {"type": "frame", "data": "base64_image"} - Analyze video frame
    - {"type": "audio_chunk", "data": "base64_audio"} - Analyze audio
    
    Sends:
    - {"type": "emotion", "data": {...}}
    - {"type": "pose", "data": {...}}
    - {"type": "beat", "data": {...}}
    """
    await manager.connect(websocket)
    
    # Send initial status
    await websocket.send_json({
        "type": "connected",
        "features": {
            "emotion": FER_AVAILABLE and emotion_detector is not None,
            "pose": MEDIAPIPE_AVAILABLE and pose_detector is not None,
            "audio": LIBROSA_AVAILABLE
        }
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "frame":
                # Analyze video frame for emotion, pose, face mesh, and/or hands
                try:
                    image = decode_base64_image(data.get("data", ""))
                    
                    # Run analyses based on client request
                    response = {"type": "analysis"}
                    
                    # Emotion (run less frequently for performance)
                    if data.get("analyze_emotion", False):
                        emotion_result = analyze_emotion(image)
                        response["emotion"] = emotion_result
                        manager.last_emotion = emotion_result
                    
                    # Pose (body tracking)
                    if data.get("analyze_pose", False):
                        pose_result = analyze_pose(image)
                        response["pose"] = pose_result
                        manager.last_pose = pose_result
                    
                    # Face Mesh (468 landmarks)
                    if data.get("analyze_face_mesh", False):
                        face_result = analyze_face_mesh(image)
                        response["face_mesh"] = face_result
                    
                    # Hands (gesture recognition)
                    if data.get("analyze_hands", True):  # Default on
                        hand_result = analyze_hands(image)
                        response["hands"] = hand_result
                    
                    await websocket.send_json(response)
                    
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e)
                    })
            
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# ====================
# Beat Streaming (Advanced)
# ====================

@app.websocket("/ws/beats")
async def beats_websocket(websocket: WebSocket):
    """
    WebSocket for real-time beat streaming.
    Client sends BPM, server sends beat pulses at that tempo.
    """
    await websocket.accept()
    
    try:
        data = await websocket.receive_json()
        tempo = data.get("tempo", 120)
        
        beat_interval = 60.0 / tempo
        beat_count = 0
        
        while True:
            await websocket.send_json({
                "type": "beat",
                "count": beat_count,
                "tempo": tempo
            })
            beat_count += 1
            await asyncio.sleep(beat_interval)
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Beat WebSocket error: {e}")

# ====================
# Run Configuration
# ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
