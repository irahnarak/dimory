// ═══════════════════════════════════════════
//  DIMORY — Game Script (Redesigned)
// ═══════════════════════════════════════════

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const waveCanvas = document.getElementById("waveCanvas");
const waveCtx = waveCanvas.getContext("2d");

const ROWS = 5;
const COLS = 5;
const SIZE = canvas.width / COLS;
const CELL_PAD = 6;
const CELL_RADIUS = 12;

// Direction display helpers
const DIR_ARROW = { UP: "↑", DOWN: "↓", LEFT: "←", RIGHT: "→" };
const DIR_EMOJI  = { UP: "⬆️", DOWN: "⬇️", LEFT: "⬅️", RIGHT: "➡️" };

let player, path, stepIndex;
let selectedLevel = "easy";

// Flash state per cell [row][col] = { color, alpha }
let cellFlash = [];

// ─── Level selection ─────────────────────────────
function selectLevel(btn) {
    document.querySelectorAll(".level-btn").forEach(b => {
        b.className = "level-btn";
    });
    const level = btn.dataset.level;
    btn.classList.add("selected-" + level);
    selectedLevel = level;
}

// ─── Screen transitions ──────────────────────────
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function goToMenu() {
    document.getElementById("resultScreen").classList.remove("show");
    showScreen("menuScreen");
}

// ─── Grid drawing ────────────────────────────────
function drawRoundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * SIZE + CELL_PAD;
            const y = r * SIZE + CELL_PAD;
            const w = SIZE - CELL_PAD * 2;
            const h = SIZE - CELL_PAD * 2;

            // Check for flash
            const flash = cellFlash[r] && cellFlash[r][c];

            if (flash && flash.alpha > 0) {
                ctx.globalAlpha = flash.alpha;
                ctx.fillStyle = flash.color;
                drawRoundRect(x, y, w, h, CELL_RADIUS);
                ctx.fill();
                ctx.globalAlpha = 1;

                // Draw default tile under at lower alpha
                ctx.globalAlpha = 1 - flash.alpha;
            }

            // Default tile
            if (r === player.row && c === player.col) {
                // Player tile
                const grad = ctx.createRadialGradient(
                    c * SIZE + SIZE/2, r * SIZE + SIZE/2, 4,
                    c * SIZE + SIZE/2, r * SIZE + SIZE/2, SIZE/2
                );
                grad.addColorStop(0, "#FF8E8E");
                grad.addColorStop(1, "#FF6B6B");

                ctx.globalAlpha = flash ? 1 - (cellFlash[r][c].alpha || 0) : 1;
                ctx.fillStyle = grad;
                drawRoundRect(x, y, w, h, CELL_RADIUS);
                ctx.fill();

                // Player emoji
                ctx.globalAlpha = 1;
                ctx.font = `${SIZE * 0.42}px serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("🧠", c * SIZE + SIZE / 2, r * SIZE + SIZE / 2);
            } else {
                ctx.globalAlpha = flash ? 1 - (cellFlash[r][c].alpha || 0) : 1;
                ctx.fillStyle = "#F0EDE8";
                drawRoundRect(x, y, w, h, CELL_RADIUS);
                ctx.fill();

                // Subtle grid dot
                ctx.fillStyle = "#DDD8D0";
                ctx.beginPath();
                ctx.arc(c * SIZE + SIZE / 2, r * SIZE + SIZE / 2, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    }
}

// ─── Animate a cell flash ────────────────────────
function flashCell(row, col, color) {
    if (!cellFlash[row]) cellFlash[row] = [];
    cellFlash[row][col] = { color, alpha: 1 };

    const startTime = performance.now();
    const duration = 600;

    function animate(now) {
        const t = (now - startTime) / duration;
        if (t >= 1) {
            cellFlash[row][col] = null;
            drawGrid();
            return;
        }
        cellFlash[row][col].alpha = 1 - t;
        drawGrid();
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

// ─── Countdown before "Speak!" ───────────────────
function startCountdown(seconds, callback) {
    const wrapper = document.querySelector(".grid-wrapper");
    let remaining = seconds;

    function tick() {
        // Create countdown overlay
        const existing = wrapper.querySelector(".countdown-overlay");
        if (existing) existing.remove();

        if (remaining <= 0) {
            callback();
            return;
        }

        const overlay = document.createElement("div");
        overlay.className = "countdown-overlay";
        overlay.style.position = "absolute";
        overlay.textContent = remaining;
        wrapper.style.position = "relative";
        wrapper.appendChild(overlay);

        remaining--;
        setTimeout(() => {
            overlay.remove();
            tick();
        }, 900);
    }

    tick();
}

// ─── Path chips ──────────────────────────────────
// mode: "memorize" | "recall" | "highlight" (highlight = index during memorize)
function renderPathChips(mode = "recall", highlight = -1) {
    const display = document.getElementById("pathDisplay");
    display.innerHTML = "";

    if (mode === "recall") {
        // Show completed steps, hide the rest as lock icons
        path.forEach((dir, i) => {
            const chip = document.createElement("div");
            chip.className = "path-chip";
            if (i < stepIndex) {
                chip.classList.add("done");
                chip.textContent = DIR_ARROW[dir] + " " + dir;
            } else {
                chip.classList.add("hidden-chip");
                chip.textContent = "🔒";
            }
            display.appendChild(chip);
        });
        return;
    }

    if (mode === "memorize") {
        path.forEach((dir, i) => {
            const chip = document.createElement("div");
            chip.className = "path-chip";
            if (i === highlight) chip.classList.add("current");
            else chip.classList.add("pending");
            chip.textContent = DIR_ARROW[dir] + " " + dir;
            display.appendChild(chip);
        });
    }
}

function updateStepCounter() {
    document.getElementById("stepCounter").textContent =
        stepIndex + "/" + path.length;
}

function setStatus(icon, text, hint = "") {
    document.getElementById("statusIcon").textContent = icon;
    document.getElementById("statusText").textContent = text;
    document.getElementById("micHint").textContent = hint;
}

// ─── Start game ──────────────────────────────────
async function startGame() {
    const res = await fetch("/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: selectedLevel })
    });

    const data = await res.json();
    path = data.path;
    stepIndex = 0;
    player = { row: 0, col: 0 };
    cellFlash = [];

    showScreen("gameScreen");
    drawGrid();
    renderPathChips("recall"); // all locked at start
    updateStepCounter();

    // Memorize phase — highlight each chip one by one
    setStatus("👀", "Memorize the path!", "Watch carefully...");

    let i = 0;
    function showNext() {
        if (i >= path.length) {
            // All shown — now hide and enter recall mode
            setTimeout(() => {
                setStatus("⏳", "Get ready...", "");
                renderPathChips("recall"); // stepIndex=0, all locked
                startCountdown(3, () => {
                    setStatus("🎤", "Say the direction!", "Tap mic & speak");
                });
            }, 400);
            return;
        }
        renderPathChips("memorize", i);
        i++;
        setTimeout(showNext, 700);
    }
    showNext();
}

// ─── Move player ────────────────────────────────
function movePlayer(direction) {
    if (direction === "UP") player.row--;
    if (direction === "DOWN") player.row++;
    if (direction === "LEFT") player.col--;
    if (direction === "RIGHT") player.col++;

    drawGrid();
}

// ─── Waveform ────────────────────────────────────
let audioContext, analyser, dataArray, animationId;

function drawWave() {
    animationId = requestAnimationFrame(drawWave);
    analyser.getByteTimeDomainData(dataArray);

    waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);

    waveCtx.strokeStyle = "#FF6B6B";
    waveCtx.lineWidth = 2.5;
    waveCtx.lineJoin = "round";
    waveCtx.beginPath();

    const sliceWidth = waveCanvas.width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * waveCanvas.height) / 2;
        if (i === 0) waveCtx.moveTo(x, y);
        else waveCtx.lineTo(x, y);
        x += sliceWidth;
    }

    waveCtx.stroke();
}

function stopWave() {
    cancelAnimationFrame(animationId);
    waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);

    // Draw idle flatline
    waveCtx.strokeStyle = "#DDD";
    waveCtx.lineWidth = 2;
    waveCtx.beginPath();
    waveCtx.moveTo(0, waveCanvas.height / 2);
    waveCtx.lineTo(waveCanvas.width, waveCanvas.height / 2);
    waveCtx.stroke();
}

// ─── Record ──────────────────────────────────────
let mediaRecorder;
let audioChunks = [];

async function record() {
    const micBtn = document.getElementById("micBtn");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    drawWave();

    micBtn.classList.add("recording");
    micBtn.textContent = "⏹";
    setStatus("🎙️", "Listening...", "Recording — speak now!");

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

    mediaRecorder.onstop = async () => {
        stopWave();
        micBtn.classList.remove("recording");
        micBtn.textContent = "🎤";
        setStatus("🤔", "Processing...", "");

        const blob = new Blob(audioChunks, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("audio", blob, "recording.wav");

        const res = await fetch("/predict", { method: "POST", body: formData });
        const data = await res.json();
        handleResponse(data);
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 1200);
}

// ─── Handle response ─────────────────────────────
function handleResponse(data) {
    if (data.status === "retry") {
        setStatus("😕", "Say it more clearly!", "Try again — tap the mic");
        return;
    }

    if (data.status === "correct") {
        flashCell(player.row, player.col, "#6BCB77");
        movePlayer(path[stepIndex]);
        stepIndex++;
        renderPathChips("recall"); // reveal completed steps, keep future locked
        updateStepCounter();
        setStatus("✅", "Correct! Keep going.", "Tap mic & say next direction");
    }

    if (data.status === "win") {
        setTimeout(() => showResult(true), 500);
    }

    if (data.status === "lose") {
        flashCell(player.row, player.col, "#FF6B6B");
        setTimeout(() => showResult(false), 600);
    }
}

// ─── Result ──────────────────────────────────────
const winMessages = ["Amazing memory!", "You nailed it! 🌟", "Superb! 🧠✨", "Your brain is on fire!"];
const loseMessages = ["Almost there! Try again.", "So close! Don't give up.", "Practice makes perfect!"];

function showResult(win) {
    document.getElementById("resultEmoji").textContent = win ? "🎉" : "😅";
    document.getElementById("resultTitle").textContent = win ? "You Win!" : "Oops!";
    document.getElementById("resultTitle").className = "result-title " + (win ? "win" : "lose");
    const msgs = win ? winMessages : loseMessages;
    document.getElementById("resultSub").textContent = msgs[Math.floor(Math.random() * msgs.length)];
    document.getElementById("resultScreen").classList.add("show");
}

function quit() {
    document.getElementById("resultEmoji").textContent = "👋";
    document.getElementById("resultTitle").textContent = "See you!";
    document.getElementById("resultTitle").className = "result-title";
    document.getElementById("resultSub").textContent = "Thanks for playing Dimory!";
    document.querySelector(".result-btns").innerHTML =
        '<button class="btn-ghost" onclick="goToMenu()">Back to Menu</button>';
}

// ─── Init ────────────────────────────────────────
player = { row: 0, col: 0 };
cellFlash = [];
drawGrid();
stopWave();
