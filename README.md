# 🧠 Dimory
### *Voice-Guided Spatial Memory Training for Dementia Cognitive Therapy*

> A real-time speech command recognition game that helps dementia patients exercise spatial memory, sequential recall, and verbal articulation — all through voice.

---

## 📌 Overview

Dimory is a voice-controlled, game-based cognitive rehabilitation tool built on a stacked **LSTM neural network** trained to recognise four directional commands: **up, down, left, right**.

The patient is shown a sequence of moves on a **5×5 grid**, then must reproduce that sequence by *speaking* the directions in order. This simultaneously engages:

- 🗺️ **Spatial memory** — remembering a path on a grid
- 🔁 **Sequential recall** — reproducing the correct order
- 🗣️ **Verbal articulation** — speaking the commands aloud
- 👂 **Auditory processing** — listening to themselves

Built as part of the **Lifelong Learning Project** for **21CSC558J – Deep Learning Approaches**.

---

## 🎮 Demo

| Screen | Description |
|--------|-------------|
| Menu | Choose difficulty: Easy / Medium / Hard |
| Game | Watch the path animate → speak directions to follow it |
| Result | Win (completed path) or Lose (wrong direction) with feedback |

---


## 🗂️ Project Structure

```
dimory/
├── app.py                      # Flask backend — game logic, /start & /predict endpoints
├── requirements.txt            # Python dependencies
├── sampl.py                    # Utility: convert .h5 model → .keras format
├── voice_model_lstm_fixed.h5   # Trained LSTM model (Keras HDF5)
├── static/
│   └── script.js               # Game engine — canvas rendering, audio capture
└── templates/
    └── index.html              # Single-page frontend — UI, game screens, styling
```

---

## 🧠 Model Architecture (LSTM)

```
Input         →  Shape (31, 40)  — 31 time-frames × 40 MFCC features
LSTM 1        →  128 units, return_sequences=True
BatchNorm     →  Stabilises training
LSTM 2        →  64 units, return_sequences=False
BatchNorm     →  Stabilises training
Dense         →  128 neurons, ReLU
Dropout       →  Rate = 0.4
Output        →  4 neurons, Softmax  [left | right | up | down]
```

**Compiled with:** Adam (lr=0.001) · Categorical Cross-Entropy · 20 epochs · Batch size 32

---

## 📊 LSTM Training Log

| Epoch | Train Acc. | Train Loss | Val. Acc. | Val. Loss |
|-------|-----------|-----------|----------|----------|
| 1  | 75.81% | 0.6298 | 81.70% | 0.4941 |
| 2  | 91.68% | 0.2471 | 93.53% | 0.1877 |
| 3  | 94.50% | 0.1641 | 95.24% | 0.1306 |
| 4  | 95.54% | 0.1252 | 96.19% | 0.1177 |
| 5  | 96.46% | 0.1001 | 96.85% | 0.0855 |
| 6  | 96.90% | 0.0876 | 96.32% | 0.1133 |
| 7  | 97.09% | 0.0895 | 97.40% | 0.0769 |
| 8  | 97.53% | 0.0694 | 97.44% | 0.0814 |
| 9  | 97.60% | 0.0665 | 95.89% | 0.1234 |
| 10 | 97.74% | 0.0632 | 97.63% | 0.0708 |
| 11 | 98.38% | 0.0473 | 97.83% | 0.0673 |
| 12 | 98.29% | 0.0492 | 96.91% | 0.0918 |
| 13 | 98.27% | 0.0504 | 97.50% | 0.0738 |
| 14 | 98.36% | 0.0442 | 97.63% | 0.0836 |
| 15 | 98.60% | 0.0370 | 96.91% | 0.1165 |
| 16 | 98.51% | 0.0413 | 97.67% | 0.0880 |
| 17 | 98.62% | 0.0428 | 97.80% | 0.0762 |
| 18 | 98.80% | 0.0317 | 97.34% | 0.0994 |
| 19 | 98.58% | 0.0401 | 97.96% | 0.0894 |
| 20 | **98.99%** | **0.0289** | **98.23%** | **0.0737** |

**🔥 Final Test Accuracy: 98.23%**

---

## 📦 Dataset

- **Source:** [Kaggle — yashdogra/speech-commands](https://www.kaggle.com/datasets/yashdogra/speech-commands) (Google Speech Commands Dataset)
- **Classes used:** `left`, `right`, `up`, `down` (~3,000 clips per class)
- **Format:** Mono WAV, 16,000 Hz, ~1 second per clip
- **Split:** 80% train / 20% test (stratified, random_state=42)



## 🚀 Getting Started

### Prerequisites

```bash
pip install flask tensorflow numpy librosa sounddevice
```

Or install all at once:

```bash
pip install -r requirements.txt
```

### Run the App

```bash
cd dimory
python app.py
```

Then open your browser at `http://localhost:5000`

> ⚠️ Microphone access is required. Allow it when prompted by your browser.

---

## 🎯 How to Play

1. Select a difficulty level: **Easy** (3 steps) · **Medium** (6 steps) · **Hard** (8 steps)
2. Watch the path animate on the grid — **memorise the sequence**
3. Speak each direction in order: *"up"*, *"left"*, *"right"*, *"down"*
4. The game validates each command in real time
5. Complete the full sequence to **win** — or say a wrong direction to see the correction

> 💡 Speak clearly at normal volume. Commands with confidence below 70% are automatically retried.

---

## ⚙️ API Reference

### `POST /start`
Starts a new game round.

**Request:**
```json
{ "level": "easy" }
```

**Response:**
```json
{ "path": ["UP", "RIGHT", "DOWN", "LEFT", "UP", "RIGHT"] }
```

---

### `POST /predict`
Classifies a voice command from audio.

**Request:** `multipart/form-data` with `audio` file

**Response (correct):**
```json
{ "status": "correct" }
```

**Response (win):**
```json
{ "status": "win" }
```

**Response (wrong):**
```json
{ "status": "lose", "expected": "RIGHT", "got": "left" }
```

**Response (low confidence):**
```json
{ "status": "retry" }
```

---

## 📄 License

This project was developed for academic purposes under the Lifelong Learning Project, 21CSC558J – Deep Learning Approaches.

---

<p align="center">Made with ❤️ for dementia care · Built with TensorFlow, Flask & librosa</p>
