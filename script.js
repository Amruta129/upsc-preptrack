let quizData = [];
let userAnswers = [];
let currentIdx = 0;
let score = 0;

async function startQuiz() {
    try {
        const response = await fetch('questions.json');
        const allQuestions = await response.json();
        // Pick 10 random questions
        quizData = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
        showQuestion();
    } catch (e) { console.error("Error loading quiz", e); }
}

function showQuestion() {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentIdx];
    
    container.innerHTML = `
        <div class="quiz-box">
            <p><strong>Question ${currentIdx + 1} of 10</strong></p>
            <p>${q.q}</p>
            ${q.opts.map((opt, i) => `
                <button class="quiz-btn" onclick="handleSelect(${i})">${opt}</button>
            `).join('')}
        </div>
    `;
}

window.handleSelect = (idx) => {
    userAnswers.push({ 
        question: quizData[currentIdx].q, 
        selected: idx, 
        correct: quizData[currentIdx].ans,
        solution: quizData[currentIdx].sol 
    });
    
    if (idx === quizData[currentIdx].ans) score++;
    
    currentIdx++;
    if (currentIdx < quizData.length) {
        showQuestion();
    } else {
        showResults();
    }
};

function showResults() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = `
        <div class="results-card">
            <h2>Test Completed!</h2>
            <h1 style="color: #6366f1;">Score: ${score} / 10</h1>
            <hr>
            <h3>Review Solutions:</h3>
            <div style="text-align: left; max-height: 400px; overflow-y: auto;">
                ${userAnswers.map((ua, i) => `
                    <div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                        <p><strong>Q${i+1}:</strong> ${ua.question}</p>
                        <p style="color: ${ua.selected === ua.correct ? 'green' : 'red'}">
                            Your answer: ${quizData[i].opts[ua.selected]}
                        </p>
                        <p style="color: green;">Correct: ${quizData[i].opts[ua.correct]}</p>
                        <p style="font-size: 0.9rem; font-style: italic;">Note: ${ua.solution}</p>
                    </div>
                `).join('')}
            </div>
            <button onclick="location.reload()" style="background: #6366f1; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-top: 20px;">Retake New Quiz</button>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', startQuiz);