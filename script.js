let quizData = [];
let userAnswers = [];
let currentIdx = 0;
let score = 0;
let tasks = JSON.parse(localStorage.getItem('upsc_todos')) || [];

// 1. Initialize Everything
async function init() {
    // Load Streak from storage
    const savedStreak = localStorage.getItem('upsc_streak') || 0;
    const streakElement = document.getElementById('streak-count');
    if(streakElement) streakElement.innerText = savedStreak;

    // Load To-Do List
    renderTasks();

    // Load Quiz Data
    try {
        const response = await fetch('questions.json');
        const allQuestions = await response.json();
        quizData = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
        showQuestion();
    } catch (e) { 
        console.error("Error loading questions", e); 
    }
}

// 2. Quiz Logic
function showQuestion() {
    const container = document.getElementById('quiz-container');
    if (!container || quizData.length === 0) return;
    
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
        selected: idx, 
        correct: quizData[currentIdx].ans 
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
    updateStreak(); 

    container.innerHTML = `
        <div class="results-card" style="text-align: center; padding: 20px;">
            <h2>Test Completed!</h2>
            <h1 style="color: #6366f1;">Score: ${score} / 10</h1>
            <p>Your daily streak has been updated!</p>
            
            <button onclick="window.open('https://t.me/share/url?url=https://upsc-preptrack.vercel.app&text=I just scored ${score}/10 on PrepTrack!')" 
                style="background: #0088cc; color: white; border: none; padding: 12px 20px; border-radius: 8px; margin-top: 15px; cursor: pointer; font-weight: bold;">
                Share Score to Telegram
            </button>
            
            <button onclick="location.reload()" style="display: block; width: 100%; margin-top: 10px; background: none; border: 1px solid #ccc; padding: 8px; border-radius: 5px; cursor: pointer;">
                Restart Quiz
            </button>
        </div>
    `;
}

// 3. Streak Logic
function updateStreak() {
    let streak = parseInt(localStorage.getItem('upsc_streak') || 0);
    streak++;
    localStorage.setItem('upsc_streak', streak);
    const streakElement = document.getElementById('streak-count');
    if(streakElement) streakElement.innerText = streak;
}

// 4. To-Do List Logic
window.addTask = () => {
    const input = document.getElementById('todo-input');
    if (!input || input.value.trim() === "") return;

    tasks.push({ text: input.value, completed: false });
    localStorage.setItem('upsc_todos', JSON.stringify(tasks));
    input.value = ""; 
    renderTasks();
};

function renderTasks() {
    const list = document.getElementById('todo-list');
    if (!list) return;
    list.innerHTML = tasks.map((task, i) => `
        <li style="list-style: none; margin: 5px 0;">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${i})">
            <span style="${task.completed ? 'text-decoration: line-through; color: gray;' : ''}">${task.text}</span>
        </li>
    `).join('');
}

window.toggleTask = (i) => {
    tasks[i].completed = !tasks[i].completed;
    localStorage.setItem('upsc_todos', JSON.stringify(tasks));
    renderTasks();
};

document.addEventListener('DOMContentLoaded', init);