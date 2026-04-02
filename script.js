let allQuestions = [];
let quizData = [];
let currentIdx = 0;
let score = 0;

// 1. Initialize
async function init() {
    const savedStreak = localStorage.getItem('upsc_streak') || 0;
    const lastDate = localStorage.getItem('upsc_last_date'); // Format: "Mon Oct 27 2025"
    const streakEl = document.getElementById('streak-count');

    // --- STREAK RESET LOGIC ---
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // If there's a record but it's not today AND it's not yesterday, they broke the streak
    if (lastDate && lastDate !== today && lastDate !== yesterdayStr) {
        localStorage.setItem('upsc_streak', 0);
        if (streakEl) streakEl.innerText = 0;
    } else {
        if (streakEl) streakEl.innerText = savedStreak;
    }
    
    renderTasks();

    try {
        const response = await fetch('questions.json');
        allQuestions = await response.json();
    } catch (e) { 
        console.error("Data Load Error", e); 
    }
}

// 2. Quiz Logic
window.startFilteredQuiz = (subject) => {
    currentIdx = 0;
    score = 0;
    
    let filtered = (subject === 'All') 
        ? allQuestions 
        : allQuestions.filter(q => q.subject === subject);

    if (subject === 'Review') {
        const mistakes = JSON.parse(localStorage.getItem('upsc_mistakes')) || [];
        filtered = allQuestions.filter(q => mistakes.includes(q.id));
        if (filtered.length === 0) {
            alert("No mistakes to review yet!");
            return;
        }
    }

    if (filtered.length === 0) {
        alert("No questions found for this subject.");
        return;
    }

    quizData = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
    showQuestion();
    document.getElementById('quiz-section').scrollIntoView({ behavior: 'smooth' });
};

function showQuestion() {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentIdx];
    
    container.innerHTML = `
        <div class="quiz-box animate-in">
            <div class="quiz-header" style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <span>Subject: <b>${q.subject || 'General'}</b></span>
                <span>${currentIdx + 1}/${quizData.length}</span>
            </div>
            <p class="question-text" style="font-size:1.1rem; margin-bottom:20px;">${q.q}</p>
            <div class="options-grid" style="display:grid; gap:10px;">
                ${q.opts.map((opt, i) => `
                    <button class="quiz-btn" onclick="handleSelect(${i})">${opt}</button>
                `).join('')}
            </div>
        </div>
    `;
}

window.handleSelect = (idx) => {
    const currentQ = quizData[currentIdx];
    if (idx === currentQ.ans) {
        score++;
    } else {
        saveMistake(currentQ.id);
    }

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
        <div class="results-card" style="text-align:center; padding:20px;">
            <h2>${score >= 7 ? 'Excellent, Officer!' : 'Keep Grinding!'}</h2>
            <h1 class="big-score" style="font-size:3rem; color:#4f46e5;">${score} / ${quizData.length}</h1>
            <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
                <button class="btn-primary" onclick="startFilteredQuiz('All')">Try 10 New Questions</button>
                <button class="btn-secondary" onclick="startFilteredQuiz('Review')">Review Mistakes</button>
            </div>
        </div>
    `;
}

// 3. Helper Functions
function saveMistake(id) {
    let mistakes = JSON.parse(localStorage.getItem('upsc_mistakes')) || [];
    if (!mistakes.includes(id)) {
        mistakes.push(id);
        localStorage.setItem('upsc_mistakes', JSON.stringify(mistakes));
    }
}

function updateStreak() {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('upsc_last_date');
    let streak = parseInt(localStorage.getItem('upsc_streak') || 0);

    // Increase streak ONLY if they haven't finished a quiz today
    if (lastDate !== today) {
        streak++;
        localStorage.setItem('upsc_streak', streak);
        localStorage.setItem('upsc_last_date', today);
        document.getElementById('streak-count').innerText = streak;
    }
    
    // Always show the modal on completion, regardless of score
    document.getElementById('success-modal').style.display = 'flex';
}

// 4. Task/To-Do Logic
window.renderTasks = () => {
    const taskList = document.getElementById('todo-list');
    if (!taskList) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    taskList.innerHTML = tasks.map((task, index) => `
        <li style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
            <span style="${task.completed ? 'text-decoration: line-through; opacity:0.6;' : ''}">${task.text}</span>
        </li>
    `).join('');
};

window.addTask = () => {
    const input = document.getElementById('todo-input');
    if (!input.value.trim()) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    tasks.push({ text: input.value, completed: false });
    localStorage.setItem('upsc_tasks', JSON.stringify(tasks));
    input.value = '';
    renderTasks();
};

window.toggleTask = (index) => {
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    tasks[index].completed = !tasks[index].completed;
    localStorage.setItem('upsc_tasks', JSON.stringify(tasks));
    renderTasks();
};

document.addEventListener('DOMContentLoaded', init);