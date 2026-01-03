document.addEventListener('DOMContentLoaded', () => {
    let appData = JSON.parse(localStorage.getItem('drivingQuizData')) || signalsData;

    if (appData.length !== signalsData.length) {
        const savedMap = new Map(appData.map(s => [s.id, s]));
        appData = signalsData.map(signal => {
            const saved = savedMap.get(signal.id);
            return saved ? saved : signal;
        });
        localStorage.setItem('drivingQuizData', JSON.stringify(appData));
    }

    const btnTheme = document.getElementById('btn-theme');
    const questionsPerSession = 10;

    const toggleTheme = () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDark);
        btnTheme.textContent = isDark ? '☀️' : '🌙';
    };

    const loadTheme = () => {
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.body.classList.add('dark-mode');
            btnTheme.textContent = '☀️';
        }
    };

    btnTheme.addEventListener('click', toggleTheme);
    loadTheme();

    const saveState = () => {
        localStorage.setItem('drivingQuizData', JSON.stringify(appData));
        updateStats();
        renderGrid();
    };

    const btnStudy = document.getElementById('btn-study');
    const btnQuiz = document.getElementById('btn-quiz');
    const btnExport = document.getElementById('btn-export');
    const sectionStudy = document.getElementById('study-section');
    const sectionQuiz = document.getElementById('quiz-section');
    const signalsGrid = document.getElementById('signals-grid');
    const identifiedCountSpan = document.getElementById('identified-count');

    const modal = document.getElementById('edit-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalImg = document.getElementById('modal-img');
    const inputName = document.getElementById('signal-name');
    const selectCategory = document.getElementById('signal-category');
    const btnSave = document.getElementById('save-signal');
    let currentEditingId = null;

    const quizStart = document.getElementById('quiz-start');
    const quizGame = document.getElementById('quiz-game');
    const quizResults = document.getElementById('quiz-results');
    const btnStartQuiz = document.getElementById('start-quiz-btn');
    const quizImage = document.getElementById('quiz-image');
    const quizOptions = document.getElementById('quiz-options');
    const scoreSpan = document.getElementById('score');
    const streakSpan = document.getElementById('streak');
    const feedbackDiv = document.getElementById('feedback');
    const btnNext = document.getElementById('next-question');
    const progressBar = document.getElementById('quiz-progress-bar');

    const finalScoreVal = document.getElementById('final-score-val');
    const starsDisplay = document.getElementById('stars-display');
    const resultsMessage = document.getElementById('results-message');
    const btnRestart = document.getElementById('restart-quiz-btn');
    const btnBackStudy = document.getElementById('back-study-btn');

    let score = 0;
    let streak = 0;
    let currentQuestion = null;
    let questionCount = 0;
    let usedQuestions = new Set();

    const switchTab = (mode) => {
        if (mode === 'study') {
            btnStudy.classList.add('active');
            btnQuiz.classList.remove('active');
            sectionStudy.classList.remove('hidden');
            sectionQuiz.classList.add('hidden');
            renderGrid();
        } else {
            btnStudy.classList.remove('active');
            btnQuiz.classList.add('active');
            sectionStudy.classList.add('hidden');
            sectionQuiz.classList.remove('hidden');
            resetQuizView();
        }
    };

    btnStudy.addEventListener('click', () => switchTab('study'));
    btnQuiz.addEventListener('click', () => switchTab('quiz'));

    btnExport.addEventListener('click', () => {
        const jsContent = `const signalsData = ${JSON.stringify(appData, null, 4)};`;
        const blob = new Blob([jsContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'signals.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Archivo signals.js descargado. Reemplaza el archivo original en tu carpeta del proyecto con este nuevo para guardar tus cambios permanentemente.');
    });

    const updateStats = () => {
        const namedCount = appData.filter(s => s.name && s.name.trim() !== "").length;
        identifiedCountSpan.textContent = namedCount;
    };

    const renderGrid = () => {
        signalsGrid.innerHTML = '';
        appData.forEach(signal => {
            const card = document.createElement('div');
            card.className = 'signal-card';
            card.onclick = () => openModal(signal.id);

            const isNamed = signal.name && signal.name.trim() !== "";

            card.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${signal.src}" loading="lazy" alt="Señal">
                </div>
                <div class="card-info">
                    <div class="card-name">
                        <span class="status-indicator ${isNamed ? 'status-set' : 'status-unset'}"></span>
                        ${isNamed ? signal.name : '<em>Sin nombre</em>'}
                    </div>
                    <div class="card-category">${signal.category}</div>
                </div>
            `;
            signalsGrid.appendChild(card);
        });
        updateStats();
    };

    const openModal = (id) => {
        const signal = appData.find(s => s.id === id);
        if (!signal) return;

        currentEditingId = id;
        modalImg.src = signal.src;
        inputName.value = signal.name;
        selectCategory.value = signal.category;

        modal.classList.remove('hidden');
        inputName.focus();
    };

    const closeModalFunc = () => {
        modal.classList.add('hidden');
        currentEditingId = null;
    };

    closeModal.addEventListener('click', closeModalFunc);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModalFunc();
    });

    btnSave.addEventListener('click', () => {
        if (!currentEditingId) return;

        const signalIndex = appData.findIndex(s => s.id === currentEditingId);
        if (signalIndex !== -1) {
            appData[signalIndex].name = inputName.value;
            appData[signalIndex].category = selectCategory.value;
            saveState();
            closeModalFunc();
        }
    });

    const resetQuizView = () => {
        quizStart.classList.remove('hidden');
        quizGame.classList.add('hidden');
        quizResults.classList.add('hidden');
        score = 0;
        streak = 0;
        questionCount = 0;
        usedQuestions.clear();
        updateScoreBoard();
    };

    const updateScoreBoard = () => {
        scoreSpan.textContent = `Puntos: ${score}`;
        streakSpan.textContent = `Racha: 🔥 ${streak}`;
        const progress = (questionCount / questionsPerSession) * 100;
        progressBar.style.width = `${progress}%`;
    };

    const getDistractors = (correctSignal) => {
        const otherSignals = appData.filter(s => s.id !== correctSignal.id && s.name && s.name.trim() !== "");
        const shuffled = otherSignals.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    };

    const showResults = () => {
        quizGame.classList.add('hidden');
        quizResults.classList.remove('hidden');

        finalScoreVal.textContent = score;

        let stars = 1;
        if (score >= 80) stars = 3;
        else if (score >= 50) stars = 2;

        starsDisplay.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const star = document.createElement('span');
            star.textContent = '⭐';
            star.className = 'star';
            if (i < stars) {
                setTimeout(() => star.classList.add('active'), i * 200 + 300);
            }
            starsDisplay.appendChild(star);
        }

        if (score === 100) resultsMessage.textContent = "¡Perfecto! 🏆";
        else if (score >= 80) resultsMessage.textContent = "¡Excelente! 👏";
        else if (score >= 50) resultsMessage.textContent = "¡Bien hecho! 👍";
        else resultsMessage.textContent = "Sigue practicando 💪";
    };

    const nextQuestion = () => {
        if (questionCount >= questionsPerSession) {
            showResults();
            return;
        }

        const playableSignals = appData.filter(s => s.name && s.name.trim() !== "");

        if (playableSignals.length < 4) {
            alert("Necesitas nombrar al menos 4 señales en el modo 'Estudiar' para tomar el examen.");
            switchTab('study');
            return;
        }

        const availableQuestions = playableSignals.filter(s => !usedQuestions.has(s.id));

        if (availableQuestions.length === 0) {
            usedQuestions.clear();
            availableQuestions.push(...playableSignals);
        }

        currentQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        usedQuestions.add(currentQuestion.id);

        quizImage.src = currentQuestion.src;
        quizOptions.innerHTML = '';
        feedbackDiv.className = 'feedback hidden';
        btnNext.classList.add('hidden');

        quizImage.style.animation = 'none';
        quizImage.offsetHeight; /* trigger reflow */
        quizImage.style.animation = 'popIn 0.5s ease';

        const distractors = getDistractors(currentQuestion);
        const options = [currentQuestion, ...distractors];
        options.sort(() => 0.5 - Math.random());

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt.name;
            btn.onclick = () => handleAnswer(opt, btn);
            quizOptions.appendChild(btn);
        });

        quizStart.classList.add('hidden');
        quizGame.classList.remove('hidden');

        updateScoreBoard();
    };

    const handleAnswer = (selected, btnElement) => {
        const buttons = quizOptions.querySelectorAll('button');
        buttons.forEach(b => b.disabled = true);

        questionCount++;

        if (selected.id === currentQuestion.id) {
            btnElement.classList.add('correct');
            feedbackDiv.textContent = "¡Correcto! 🎉";
            feedbackDiv.className = "feedback success";
            score += 10;
            streak++;
            scoreSpan.parentElement.style.animation = 'none';
            scoreSpan.parentElement.offsetHeight;
            scoreSpan.parentElement.style.animation = 'popIn 0.3s ease';
        } else {
            btnElement.classList.add('incorrect');
            feedbackDiv.textContent = `Incorrecto. Era: ${currentQuestion.name}`;
            feedbackDiv.className = "feedback error";
            streak = 0;
            buttons.forEach(b => {
                if (b.textContent === currentQuestion.name) b.classList.add('correct');
            });
            quizGame.style.animation = 'shake 0.4s ease';
            setTimeout(() => quizGame.style.animation = '', 400);
        }

        feedbackDiv.classList.remove('hidden');
        btnNext.classList.remove('hidden');
        updateScoreBoard();
    };

    btnStartQuiz.addEventListener('click', nextQuestion);
    btnNext.addEventListener('click', nextQuestion);

    btnRestart.addEventListener('click', () => {
        resetQuizView();
        nextQuestion();
    });

    btnBackStudy.addEventListener('click', () => switchTab('study'));

    renderGrid();
    updateStats();
});
