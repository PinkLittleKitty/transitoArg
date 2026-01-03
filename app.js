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

    let gameMode = 'standard';
    let selectedCategories = [];
    let isSecondCheck = false;

    const btnTheme = document.getElementById('btn-theme');
    let questionsPerSession = 10;

    const configCount = document.getElementById('config-count');
    const categoryFiltersContainer = document.getElementById('category-filters');
    const modeBtns = document.querySelectorAll('.mode-btn');

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameMode = btn.dataset.mode;
        });
    });

    const initCategoryFilters = () => {
        const categories = [...new Set(appData.map(s => s.category))]
            .filter(c => c !== "Desconocido")
            .sort();

        categoryFiltersContainer.innerHTML = '';

        const allWrapper = document.createElement('label');
        allWrapper.className = 'category-checkbox';
        allWrapper.innerHTML = `
            <input type="checkbox" id="cat-all" checked>
            <span>Todas</span>
        `;
        categoryFiltersContainer.appendChild(allWrapper);

        categories.forEach(cat => {
            const label = document.createElement('label');
            label.className = 'category-checkbox';
            label.innerHTML = `
                <input type="checkbox" class="cat-filter" value="${cat}" checked>
                <span>${cat}</span>
            `;
            categoryFiltersContainer.appendChild(label);
        });

        const allCheckbox = document.getElementById('cat-all');
        const catCheckboxes = document.querySelectorAll('.cat-filter');

        allCheckbox.addEventListener('change', (e) => {
            catCheckboxes.forEach(cb => cb.checked = e.target.checked);
        });

        catCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const allChecked = Array.from(catCheckboxes).every(c => c.checked);
                allCheckbox.checked = allChecked;
            });
        });
    };

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
        isSecondCheck = false;
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

    let timerEnabled = true;
    let timerInterval = null;
    let timeLeft = 10;
    const timerBar = document.getElementById('timer-bar');
    const configTimer = document.getElementById('config-timer');

    const startTimer = () => {
        if (!timerEnabled) return;

        clearInterval(timerInterval);
        timeLeft = 10;
        timerBar.classList.remove('hidden');
        timerBar.style.transition = 'none';
        timerBar.style.width = '100%';

        timerBar.offsetHeight;

        timerBar.style.transition = 'width 10s linear';
        timerBar.style.width = '0%';

        timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                handleTimeOut();
            }
        }, 1000);
    };

    const stopTimer = () => {
        clearInterval(timerInterval);
        if (timerBar) {
            timerBar.style.transition = 'none';
            timerBar.style.width = '100%';
        }
    };

    const handleTimeOut = () => {
        const buttons = quizOptions.querySelectorAll('button');
        buttons.forEach(b => b.disabled = true);

        feedbackDiv.textContent = `⏰ ¡Tiempo agotado! Era: ${currentQuestion.name}`;
        feedbackDiv.className = "feedback error";

        buttons.forEach(b => {
            if (b.textContent === currentQuestion.name) b.classList.add('correct');
        });

        streak = 0;
        questionCount++;

        quizGame.style.animation = 'shake 0.4s ease';
        setTimeout(() => quizGame.style.animation = '', 400);

        feedbackDiv.classList.remove('hidden');
        btnNext.classList.remove('hidden');
        updateScoreBoard();
    };

    const startQuizSession = () => {
        const countVal = configCount.value;
        questionsPerSession = countVal === 'all' ? 9999 : parseInt(countVal);
        timerEnabled = configTimer.checked;

        if (!timerEnabled) {
            timerBar.classList.add('hidden');
        } else {
            timerBar.classList.remove('hidden');
        }

        const catCheckboxes = document.querySelectorAll('.cat-filter');
        selectedCategories = Array.from(catCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (selectedCategories.length === 0) {
            alert("Por favor selecciona al menos una categoría.");
            return;
        }

        const playableSignals = appData.filter(s =>
            s.name &&
            s.name.trim() !== "" &&
            selectedCategories.includes(s.category)
        );

        if (playableSignals.length < 4) {
            alert(`No hay suficientes señales estudiadas (${playableSignals.length}) en las categorías seleccionadas. Necesitas al menos 4.`);
            return;
        }

        score = 0;
        streak = 0;
        questionCount = 0;
        usedQuestions.clear();
        isSecondCheck = false;

        quizStart.classList.add('hidden');
        quizGame.classList.remove('hidden');
        quizResults.classList.add('hidden');

        updateScoreBoard();
        nextQuestion();
    };


    const nextQuestion = () => {
        const playableSignals = appData.filter(s =>
            s.name &&
            s.name.trim() !== "" &&
            selectedCategories.includes(s.category)
        );

        const actualLimit = Math.min(questionsPerSession, playableSignals.length);

        if (questionCount >= actualLimit) {
            showResults();
            return;
        }

        let availableQuestions = playableSignals.filter(s => !usedQuestions.has(s.id));

        if (availableQuestions.length === 0) {
            showResults();
            return;
        }

        currentQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        usedQuestions.add(currentQuestion.id);
        isSecondCheck = false;

        renderQuestionState();
    };

    const renderQuestionState = () => {
        quizImage.src = currentQuestion.src;
        quizOptions.innerHTML = '';
        feedbackDiv.className = 'feedback hidden';
        btnNext.classList.add('hidden');

        quizImage.style.animation = 'none';
        quizImage.offsetHeight;
        quizImage.style.animation = 'popIn 0.5s ease';

        if (gameMode === 'expert' && isSecondCheck) {
            startTimer();

            feedbackDiv.innerHTML = `<span style="color:var(--text-muted)">¡Correcto! Ahora, ¿cuál es su categoría?</span>`;
            feedbackDiv.className = "feedback";
            feedbackDiv.classList.remove('hidden');

            const allCategories = [...new Set(appData.map(s => s.category))];
            const correctCat = currentQuestion.category;
            let options = [correctCat];

            while (options.length < 4 && options.length < allCategories.length) {
                const rand = allCategories[Math.floor(Math.random() * allCategories.length)];
                if (!options.includes(rand)) options.push(rand);
            }
            options.sort(() => 0.5 - Math.random());

            options.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = cat;
                btn.onclick = () => handleAnswer(cat, btn, true);
                quizOptions.appendChild(btn);
            });

        } else {
            startTimer();

            const distractors = getDistractors(currentQuestion);
            const options = [currentQuestion, ...distractors];
            options.sort(() => 0.5 - Math.random());

            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = opt.name;
                btn.onclick = () => handleAnswer(opt, btn, false);
                quizOptions.appendChild(btn);
            });
        }
        updateScoreBoard();
    };

    const handleAnswer = (selected, btnElement, isCategoryCheck) => {
        stopTimer();

        const buttons = quizOptions.querySelectorAll('button');

        let isCorrect = false;
        if (isCategoryCheck) {
            isCorrect = (selected === currentQuestion.category);
        } else {
            isCorrect = (selected.id === currentQuestion.id);
        }

        buttons.forEach(b => b.disabled = true);

        if (isCorrect) {
            btnElement.classList.add('correct');

            if (gameMode === 'expert' && !isSecondCheck) {
                score += 10;
                setTimeout(() => {
                    isSecondCheck = true;
                    renderQuestionState();
                }, 800);
            } else {
                feedbackDiv.textContent = "¡Correcto! 🎉";
                feedbackDiv.className = "feedback success";
                score += 10;
                streak++;
                questionCount++;

                btnNext.classList.remove('hidden');
            }

            scoreSpan.parentElement.style.animation = 'none';
            scoreSpan.parentElement.offsetHeight;
            scoreSpan.parentElement.style.animation = 'popIn 0.3s ease';

        } else {
            btnElement.classList.add('incorrect');

            if (isCategoryCheck) {
                feedbackDiv.textContent = `Incorrecto. Era: ${currentQuestion.category}`;
                buttons.forEach(b => {
                    if (b.textContent === currentQuestion.category) b.classList.add('correct');
                });
            } else {
                feedbackDiv.textContent = `Incorrecto. Era: ${currentQuestion.name}`;
                buttons.forEach(b => {
                    if (b.textContent === currentQuestion.name) b.classList.add('correct');
                });
            }

            feedbackDiv.className = "feedback error";
            streak = 0;
            questionCount++;

            quizGame.style.animation = 'shake 0.4s ease';
            setTimeout(() => quizGame.style.animation = '', 400);

            feedbackDiv.classList.remove('hidden');
            btnNext.classList.remove('hidden');
        }

        if (!(gameMode === 'expert' && !isSecondCheck && isCorrect)) {
            feedbackDiv.classList.remove('hidden');
        }
        updateScoreBoard();
    };

    btnStartQuiz.addEventListener('click', startQuizSession);
    btnNext.addEventListener('click', nextQuestion);

    btnRestart.addEventListener('click', () => {
        resetQuizView();
    });

    btnBackStudy.addEventListener('click', () => switchTab('study'));

    initCategoryFilters();

    const checkLocalEnv = () => {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
            btnExport.classList.remove('hidden');
        }
    };
    checkLocalEnv();

    renderGrid();
    updateStats();
});
