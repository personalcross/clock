document.addEventListener("DOMContentLoaded", () => {
    const roundsInput = document.getElementById("rounds");

    const workMinutesInput = document.getElementById("work-minutes");
    const workSecondsInput = document.getElementById("work-seconds");

    const restMinutesInput = document.getElementById("rest-minutes");
    const restSecondsInput = document.getElementById("rest-seconds");

    const applyButton = document.getElementById("apply-settings");

    const phaseDisplay = document.getElementById("clock-phase");
    const timeDisplay = document.getElementById("clock-time");
    const roundDisplay = document.getElementById("clock-round");

    const startButton = document.getElementById("start-clock");
    const pauseButton = document.getElementById("pause-clock");
    const resetButton = document.getElementById("reset-clock");

    const errorDisplay = document.getElementById("settings-error");

    let settings = {
        rounds: 5,
        work: 60,
        rest: 30,
    };

    let currentRound = 0;
    let currentPhase = "READY";

    let remainingTime = 0;
    let endTimestamp = null;

    let interval = null;

    let running = false;
    let finished = false;

    let audioContext = null;

    let starting = false;
    let countdownTimeout = null;
    let countdownInterval = null;
    let countdownEndTimestamp = null;

    function initializeAudio() {
        if (!audioContext) {
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (AudioContextClass) {
                audioContext = new AudioContextClass();
            }
        }

        if (audioContext?.state === "suspended") {
            audioContext.resume();
        }
    }

    function playTone(frequency, duration, delay = 0, type = "sine", endFrequency = frequency) {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        const start = audioContext.currentTime + delay;
        const end = start + duration;

        oscillator.type = type;

        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.linearRampToValueAtTime(endFrequency, end);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
        gain.gain.setValueAtTime(0.3, end - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, end);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(start);
        oscillator.stop(end);
    }



    function playStartSound() {
        playTone(880.00, 0.15, 0); // A5
        playTone(880.00, 0.15, 1); // A5
        playTone(880.00, 0.15, 2); // A5

        playTone(987.77, 0.7, 3); // B5
    }

    function playRoundSound() {
        playTone(523.25, 0.25, 0);  // C5
        playTone(659.20, 0.25, 0.3); // E5
        playTone(784.00, 0.45, 0.6); // G5
    }

    function playFinalSound() {
        playTone(1046.50, 0.15, 0); // C6
        playTone(1046.50, 0.15, 0.2); // C6
        playTone(1046.50, 0.15, 0.4); // C6
        playTone(1318.51, 0.5, 0.7); // E6
    }


    function getSettings() {
        const rounds = Number(roundsInput.value);

        const workMinutes = Number(workMinutesInput.value);
        const workSeconds = Number(workSecondsInput.value);

        const restMinutes = Number(restMinutesInput.value);
        const restSeconds = Number(restSecondsInput.value);

        const values = [
            rounds,
            workMinutes,
            workSeconds,
            restMinutes,
            restSeconds
        ];

        if (values.some(value => !Number.isInteger(value) || value < 0)) {
            throw new Error("Please enter valid positive integers.");
        }

        if (rounds < 1 || rounds > 99) {
            throw new Error("Rounds must be between 1 and 99.");
        }

        if (
            workMinutes > 59 || restMinutes > 59
            || workSeconds > 59 || restSeconds > 59
        ) {
            throw new Error("Invalid time values.");
        }

        const work = workMinutes * 60 + workSeconds;
        const rest = restMinutes * 60 + restSeconds;

        if (work <= 0) {
            throw new Error("Work duration must be greater than zero.");
        }

        return {
            rounds,
            work,
            rest
        };
    }

    function applySettings() {

        if (running) return;

        try {
            settings = getSettings();
            errorDisplay.textContent = "";
            resetTimer();
        } catch (error) {
            errorDisplay.textContent = error.message;
        }
    }

    function formatTime(seconds) {

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return (
            String(minutes).padStart(2, "0")
            + ":"
            + String(remainingSeconds).padStart(2, "0")
        );
    }

    function updateDisplay() {

        timeDisplay.textContent = formatTime(remainingTime);
        phaseDisplay.textContent = currentPhase;

        roundDisplay.textContent =
            `Round ${currentRound} / ${settings.rounds}`;

        phaseDisplay.classList.remove("work", "rest", "finished");

        const classListStatus = currentPhase === "WORK" ? "work"
            : currentPhase === "REST" ? "rest"
                : currentPhase === "FINISHED" ? "finished"
                    : "";

        if (classListStatus) {
            phaseDisplay.classList.add(classListStatus);
        }

        startButton.disabled = running || finished || starting;
        pauseButton.disabled = !running;
        applyButton.disabled = running || starting;
    }

    function startTimer() {

        if (running || finished || starting) return;

        initializeAudio();

        // First start: perform countdown
        if (currentPhase === "READY") {
            startCountdown();
            return;
        }

        // Resume after pause
        runTimer();
    }

    function startCountdown() {

        starting = true;

        currentRound = 1;
        currentPhase = "GET READY";
        remainingTime = 3;

        updateDisplay();

        playStartSound();

        countdownEndTimestamp = Date.now() + 3000;

        countdownInterval = setInterval(() => {

            remainingTime = Math.max(
                0,
                Math.ceil((countdownEndTimestamp - Date.now()) / 1000)
            );

            updateDisplay();

        }, 100);

        countdownTimeout = setTimeout(() => {

            clearInterval(countdownInterval);
            countdownInterval = null;
            countdownTimeout = null;

            starting = false;

            currentPhase = "WORK";
            remainingTime = settings.work;

            runTimer();

        }, 3000);
    }

    function runTimer() {

        running = true;

        endTimestamp = Date.now() + remainingTime * 1000;

        interval = setInterval(tick, 100);

        updateDisplay();
    }


    function tick() {

        if (!running) return;

        const difference = endTimestamp - Date.now();

        remainingTime = Math.max(
            0,
            Math.ceil(difference / 1000)
        );

        updateDisplay();

        if (difference <= 0) {
            transitionPhase();
        }
    }

    function transitionPhase() {

        clearInterval(interval)
        interval = null;

        running = false;
        remainingTime = 0;

        if (currentPhase === "WORK") {

            if (currentRound >= settings.rounds) {
                finishTimer();
                return;
            }

            if (settings.rest > 0) {
                completeWork();
            } else {
                completeRound();
                return;
            }

        } else if (currentPhase === "REST") {

            completeRound();
            return;
        }

        startTimer();
    }

    function completeWork() {
        playRoundSound();

        currentPhase = "REST";
        remainingTime = settings.rest;
    }

    function completeRound() {

        playRoundSound();

        currentRound++;

        currentPhase = "WORK";
        remainingTime = settings.work;

        updateDisplay();
        startTimer();
    }

    function finishTimer() {

        clearInterval(interval);
        interval = null;

        running = false;
        finished = true;

        remainingTime = 0;
        currentPhase = "FINISHED";

        playFinalSound();
        updateDisplay();
    }

    function pauseTimer() {

        if (!running) return;

        clearInterval(interval);
        interval = null;

        remainingTime = Math.max(
            0,
            Math.ceil((endTimestamp - Date.now()) / 1000)
        );

        running = false;

        updateDisplay();
    }

    function resetTimer() {

        clearInterval(interval);
        clearInterval(countdownInterval);
        clearTimeout(countdownTimeout);

        interval = null;
        countdownInterval = null;
        countdownTimeout = null;

        starting = false;
        running = false;
        finished = false;

        currentRound = 0;
        currentPhase = "READY";

        remainingTime = settings.work;
        endTimestamp = null;
        countdownEndTimestamp = null;

        updateDisplay();
    }

    applyButton.addEventListener("click", applySettings);
    startButton.addEventListener("click", startTimer);
    pauseButton.addEventListener("click", pauseTimer);
    resetButton.addEventListener("click", resetTimer);

    resetTimer();

});