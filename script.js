let allQuestions = [];
let quizData = [];
let userAnswers = [];
let currentIdx = 0;
let score = 0;
let currentSubject = 'All';

// 1. Initialize
async function init() {
    // Load UI Elements
    const savedStreak = localStorage.getItem('upsc_streak') || 0;
    document.getElementById('streak-count').innerText = savedStreak;
    renderTasks();

    try {
        const response = await fetch('questions.json');
        allQuestions = await response.json();
        startFilteredQuiz('All'); // Default start
    } catch (e) { console.error("Data Load Error", e); }
}

// 2. Filter Logic (The "Subject" Switch)
window.startFilteredQuiz = (subject) => {
    currentSubject = subject;
    currentIdx = 0;
    score = 0;
    userAnswers = [];
    
    let filtered = (subject === 'All') 
        ? allQuestions 
        : allQuestions.filter(q => q.subject === subject);

    // If "Review Mode" requested, filter by mistakes saved in LocalStorage
    if (subject === 'Review') {
        const mistakes = JSON.parse(localStorage.getItem('upsc_mistakes')) || [];
        filtered = allQuestions.filter(q => mistakes.includes(q.id));
        if (filtered.length === 0) {
            alert("No mistakes to review yet! Get some questions wrong first.");
            return startFilteredQuiz('All');
        }
    }

    quizData = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
    showQuestion();
};

// 3. Quiz UI
function showQuestion() {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentIdx];
    
    container.innerHTML = `
        <div class="quiz-box animate-in">
            <div class="quiz-header">
                <span>Subject: <b>${q.subject || 'General'}</b></span>
                <span>${currentIdx + 1}/10</span>
            </div>
            <p class="question-text">${q.q}</p>
            <div class="options-grid">
                ${q.opts.map((opt, i) => `
                    <button class="quiz-btn" onclick="handleSelect(${i})">${opt}</button>
                `).join('')}
            </div>
        </div>
    `;
}

window.handleSelect = (idx) => {
    const currentQ = quizData[currentIdx];
    const isCorrect = (idx === currentQ.ans);
    
    if (isCorrect) {
        score++;
    } else {
        // Save ID of wrong question for Review Mode
        saveMistake(currentQ.id);
    }

    currentIdx++;
    if (currentIdx < quizData.length) {
        showQuestion();
    } else {
        showResults();
    }
};

// 4. Review Mode Helper
function saveMistake(id) {
    let mistakes = JSON.parse(localStorage.getItem('upsc_mistakes')) || [];
    if (!mistakes.includes(id)) {
        mistakes.push(id);
        localStorage.setItem('upsc_mistakes', JSON.stringify(mistakes));
    }
}

function showResults() {
    const container = document.getElementById('quiz-container');
    updateStreak(); 

    container.innerHTML = `
        <div class="results-card">
            <h2>${score >= 7 ? 'Excellent, Officer!' : 'Keep Grinding!'}</h2>
            <h1 class="big-score">${score} / 10</h1>
            <button class="btn-primary" onclick="startFilteredQuiz('All')">Try Another Set</button>
            <button class="btn-secondary" onclick="startFilteredQuiz('Review')">Review Mistakes</button>
            <button class="btn-telegram" onclick="shareScore()">Share to Telegram</button>
        </div>
    `;
}

// ... (Keep your updateStreak and Task functions from yesterday)
document.addEventListener('DOMContentLoaded', init);