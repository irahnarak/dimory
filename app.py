from flask import Flask, render_template, request, jsonify
import numpy as np
import librosa
import tensorflow as tf
import random

app = Flask(__name__)

# -------------------------
# LOAD MODEL
# -------------------------
model = tf.keras.models.load_model("voice_model_lstm_fixed.h5")

COMMANDS = ["left", "right", "up", "down"]
VALID_MOVES = ["up", "down", "left", "right"]

SAMPLES = 16000
MFCC_FEATURES = 40
ROWS, COLS = 5, 5

# -------------------------
# GAME STATE
# -------------------------
game_state = {
    "player_pos": [0, 0],
    "expected_path": [],
    "current_step": 0,
    "state": "menu"
}

@app.route("/")
def index():
    return render_template("index.html")

# -------------------------
# PATH GENERATION
# -------------------------
def generate_path(length):
    path = []
    row, col = 0, 0

    for _ in range(length):
        moves = []
        if row > 0: moves.append("UP")
        if row < ROWS-1: moves.append("DOWN")
        if col > 0: moves.append("LEFT")
        if col < COLS-1: moves.append("RIGHT")

        move = random.choice(moves)
        path.append(move)

        if move == "UP": row -= 1
        elif move == "DOWN": row += 1
        elif move == "LEFT": col -= 1
        elif move == "RIGHT": col += 1

    return path

# -------------------------
# START GAME
# -------------------------
@app.route("/start", methods=["POST"])
def start():
    level = request.json["level"]
    length = {"easy": 3, "medium": 6, "hard": 8}[level]

    game_state["player_pos"] = [0, 0]
    game_state["expected_path"] = generate_path(length)
    game_state["current_step"] = 0
    game_state["state"] = "playing"

    return jsonify({"path": game_state["expected_path"]})

# -------------------------
# AUDIO → PREDICTION
# -------------------------
def predict_voice(audio):
    audio = audio.astype(np.float32)

    audio = audio / (np.max(np.abs(audio)) + 1e-6)
    audio, _ = librosa.effects.trim(audio, top_db=20)

    if len(audio) < SAMPLES:
        audio = np.pad(audio, (0, SAMPLES - len(audio)))
    else:
        audio = audio[:SAMPLES]

    mfcc = librosa.feature.mfcc(y=audio, sr=16000, n_mfcc=MFCC_FEATURES)
    mfcc = mfcc.T
    mfcc = (mfcc - np.mean(mfcc)) / (np.std(mfcc) + 1e-6)
    mfcc = mfcc[np.newaxis, ...]

    pred = model.predict(mfcc, verbose=0)[0]

    label = np.argmax(pred)
    command = COMMANDS[label]
    confidence = np.max(pred)

    print(f"{command} ({confidence:.2f})")

    if confidence < 0.7 or command not in VALID_MOVES:
        return None

    return command

# -------------------------
# PREDICT ROUTE
# -------------------------
@app.route("/predict", methods=["POST"])
def predict():
    file = request.files["audio"]
    y, sr = librosa.load(file, sr=16000)

    command = predict_voice(y)

    if command is None:
        return jsonify({"status": "retry"})

    step = game_state["expected_path"][game_state["current_step"]]

    if command.upper() == step:
        game_state["current_step"] += 1

        if game_state["current_step"] == len(game_state["expected_path"]):
            return jsonify({"status": "win"})

        return jsonify({"status": "correct"})

    else:
        return jsonify({
            "status": "lose",
            "expected": step,
            "got": command
        })

# -------------------------
# RUN
# -------------------------
if __name__ == "__main__":
    app.run(debug=True)