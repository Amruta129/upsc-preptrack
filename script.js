// ==========================================
// 1. DATA & STATE (The "Brain")
// ==========================================

// Your UPSC Question Bank
const upscQuestions = [
    {
        question: "Which pillar of the Preamble emphasizes 'Brotherhood'?",
        options: ["Justice", "Liberty", "Equality", "Fraternity"],
        correct: 3
    },
    {
        question: "The 'Quit India Movement' was launched in which year?",
        options: ["1940", "1942", "1945", "1947"],
        correct: 1
    },
    {
        question: "Which Article of the Indian Constitution deals with the Right to Equality?",
        options: ["Article 12", "Article 14", "Article 21", "Article 32"],
        correct: 1
    }
];

let currentQuestionIndex = 0;
let tasks = JSON.parse(localStorage.getItem('upsc_todos')) || [];

// ==========================================
// 2. ELEMENT SELECTORS
// ==========================================

// Quiz Elements
const questionBox = document.getElementById('question-box');
const quizActive = document.getElementById('quiz-active');
const activeQuestText = document.getElementById('active-question');
const optionsGrid = document.getElementById('options-grid');
const startBtn = document.getElementById('start-quiz-btn');

// To-Do Elements
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');

// ==========================================
// 3. STREAK LOGIC
// ==========================================

function displayStreak() {
    let streak = localStorage.getItem('upsc_streak') || 0;
    const hero = document.querySelector('.hero');
    
    // Check if badge already exists to avoid duplicates
    let existingBadge = document.getElementById('streak-badge');
    if (existingBadge) existingBadge.remove();

    const streakDisplay = document.createElement('div');
    streakDisplay.id = 'streak-badge';
    streakDisplay.innerHTML = `
        <div style="background: #ffedd5; color: #ea580c; padding: 10px 20px; 
                    border-radius: 20px; display: inline-block; font-weight: bold; margin-top: 20px; border: 2px solid #fdba74;">
            🔥 Current Streak: ${streak} Days
        </div>
    `;
    hero.appendChild(streakDisplay);
}

// ==========================================
// 4. QUIZ LOGIC
// ==========================================

function startQuiz() {
    if(questionBox) questionBox.style.display = 'none';
    if(quizActive) quizActive.style.display = 'block';
    showQuestion();
}

function showQuestion() {
    const q = upscQuestions[currentQuestionIndex];
    activeQuestText.innerText = q.question;
    optionsGrid.innerHTML = ''; 

    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.innerText = opt;
        btn.style.cssText = "padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; text-align: left; background: white; font-weight: 500; transition: 0.2s;";
        
        btn.onmouseover = () => btn.style.background = "#f1f5f9";
        btn.onmouseout = () => btn.style.background = "white";
        
        btn.onclick = () => checkAnswer(index);
        optionsGrid.appendChild(btn);
    });
}

function checkAnswer(selectedIndex) {
    const correctIndex = upscQuestions[currentQuestionIndex].correct;
    
    if (selectedIndex === correctIndex) {
        alert("Correct! ✅");
    } else {
        alert("Keep trying! The correct answer was: " + upscQuestions[currentQuestionIndex].options[correctIndex]);
    }

    currentQuestionIndex++;

    if (currentQuestionIndex < upscQuestions.length) {
        showQuestion();
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    quizActive.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #4f46e5; font-size: 1.5rem;">Quiz Completed! 🎉</h2>
            <p style="margin-top: 10px; color: #64748b;">You've secured your streak for today. Reloading...</p>
        </div>
    `;
    
    let streak = parseInt(localStorage.getItem('upsc_streak') || 0) + 1;
    localStorage.setItem('upsc_streak', streak);
    
    setTimeout(() => location.reload(), 2000);
}

// ==========================================
// 5. TO-DO LIST LOGIC
// ==========================================

function renderTasks() {
    if(!todoList) return;
    todoList.innerHTML = '';
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.style.cssText = "display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f5f9;";
        li.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
            <span style="${task.completed ? 'text-decoration: line-through; color: gray;' : ''}">${task.text}</span>
        `;
        todoList.appendChild(li);
    });
}

window.toggleTask = (index) => {
    tasks[index].completed = !tasks[index].completed;
    localStorage.setItem('upsc_todos', JSON.stringify(tasks));
    renderTasks();
};

if(addBtn) {
    addBtn.addEventListener('click', () => {
        const text = todoInput.value.trim();
        if (text) {
            tasks.push({ text: text, completed: false });
            localStorage.setItem('upsc_todos', JSON.stringify(tasks));
            todoInput.value = '';
            renderTasks();
        }
    });
}

// ==========================================
// 6. INITIALIZATION (Run on startup)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    displayStreak();
    renderTasks();
    if(startBtn) startBtn.addEventListener('click', startQuiz);
});

// Activate icons if using Lucide
if (window.lucide) {
    lucide.createIcons();
}