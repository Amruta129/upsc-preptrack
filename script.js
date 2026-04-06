// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyC12rmt0WxdDVUfyLw4lHK94uU1kbL47L8",
    authDomain: "preptrack---upsc.firebaseapp.com",
    projectId: "preptrack---upsc",
    storageBucket: "preptrack---upsc.firebasestorage.app",
    messagingSenderId: "426094667263",
    appId: "1:426094667263:web:517556eaf8581c648a33ca",
    measurementId: "G-6EXX7XY7T2"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

// Global State
const TOTAL_QUESTIONS_COUNT = 250; 
let allQuestions = [];
let quizData = [];
let currentIdx = 0;
let score = 0;
let currentUser = null;
let wrongQuestions = JSON.parse(localStorage.getItem('upsc_wrong_pool')) || [];

// --- INITIALIZATION ---
async function init() {
    console.log("Initializing PrepTrack...");
    try {
        const response = await fetch('./questions.json?v=' + new Date().getTime());
        allQuestions = await response.json();
        
        // Auto-start if empty
        const container = document.getElementById('quiz-container');
        if (container && container.innerHTML.includes('welcome-screen')) {
            // Optional: Auto-start logic here
        }
        
        updateAnalytics();
        renderTodoList(); // Initialize To-Do List
    } catch (e) { console.error("Load Error:", e); }
}

// --- TO-DO LIST LOGIC ---
window.addTask = () => {
    const input = document.getElementById('todo-input');
    const val = input.value.trim();
    if (!val) return;

    const tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')) || [];
    tasks.push({ id: Date.now(), text: val, completed: false });
    localStorage.setItem('upsc_todo_tasks', JSON.stringify(tasks));
    
    input.value = "";
    renderTodoList();
};

// Handle Enter Key for To-Do
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'todo-input') {
        window.addTask();
    }
});

window.toggleTask = (id) => {
    let tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')) || [];
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    localStorage.setItem('upsc_todo_tasks', JSON.stringify(tasks));
    renderTodoList();
};

window.deleteTask = (id) => {
    let tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')) || [];
    tasks = tasks.filter(t => t.id !== id);
    localStorage.setItem('upsc_todo_tasks', JSON.stringify(tasks));
    renderTodoList();
};

function renderTodoList() {
    const list = document.getElementById('todo-list');
    if (!list) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')) || [];
    
    list.innerHTML = tasks.map(t => `
        <li class="todo-item ${t.completed ? 'completed' : ''}" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9;">
            <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="toggleTask(${t.id})">
                <i class="${t.completed ? 'fas fa-check-circle' : 'far fa-circle'}" style="color: ${t.completed ? '#22c55e' : '#6366f1'};"></i>
                <span style="text-decoration: ${t.completed ? 'line-through' : 'none'}; color: ${t.completed ? '#94a3b8' : '#1e293b'};">${t.text}</span>
            </div>
            <i class="fas fa-trash" onclick="deleteTask(${t.id})" style="color:#cbd5e1; cursor:pointer; font-size:0.8rem;"></i>
        </li>
    `).join('');
}

// --- QUIZ CORE ---
window.startFilteredQuiz = (subject, isAutoLoad = false) => {
    if (!allQuestions.length) return;
    const today = new Date().toDateString();
    if (localStorage.getItem('upsc_last_date') === today && subject !== 'Review' && !isAutoLoad) {
        return alert("Daily limit reached! Practice in 'Review' mode.");
    }

    currentIdx = 0; score = 0;
    let pool = [];
    const target = subject.toLowerCase();

    if (target === 'review') {
        pool = allQuestions.filter(q => wrongQuestions.includes(q.id));
        if (!pool.length) return alert("No errors to review!");
    } else if (target === 'all') {
        pool = allQuestions;
    } else {
        pool = allQuestions.filter(q => q.subject.toLowerCase() === target);
    }

    if (!pool.length) return alert("Category empty!");

    // Shuffle and slice 10
    quizData = pool.sort(() => 0.5 - Math.random()).slice(0, 10);
    showQuestion();
};

function showQuestion() {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentIdx];
    container.innerHTML = `
        <div class="quiz-card animate-in">
            <div class="quiz-meta">
                <span class="subject-tag">${q.subject}</span>
                <span>${currentIdx + 1}/10</span>
            </div>
            <h2 class="question-text">${q.q}</h2>
            <div class="options-container">
                ${q.opts.map((opt, i) => `
                    <button class="option-row" onclick="handleSelect(${i})">
                        <span class="opt-letter">${String.fromCharCode(65+i)}</span>
                        <span class="opt-text">${opt}</span>
                    </button>
                `).join('')}
            </div>
            <div id="feedback-area" style="display:none; margin-top:20px; border-top:1px solid #eee; padding-top:15px;">
                <p style="font-size:0.85rem; color:#475569;"><strong>Explanation:</strong> ${q.explanation}</p>
                <button onclick="nextStep()" class="btn-primary" style="width:100%; margin-top:10px;">Next Question →</button>
            </div>
        </div>`;
}

window.handleSelect = (idx) => {
    const q = quizData[currentIdx];
    const buttons = document.querySelectorAll('.option-row');
    buttons.forEach(b => b.disabled = true);

    if (idx === q.ans) {
        score++;
        buttons[idx].classList.add('correct');
        wrongQuestions = wrongQuestions.filter(id => id !== q.id);
        updatePoints(10, q.subject);
    } else {
        score -= 0.33;
        buttons[idx].classList.add('wrong');
        buttons[q.ans].classList.add('correct');
        if (!wrongQuestions.includes(q.id)) wrongQuestions.push(q.id);
        updatePoints(-2, q.subject);
    }
    localStorage.setItem('upsc_wrong_pool', JSON.stringify(wrongQuestions));
    document.getElementById('feedback-area').style.display = 'block';
};

window.nextStep = () => {
    currentIdx++;
    if (currentIdx < quizData.length) showQuestion();
    else showResults();
};

// --- STATS & CLOUD ---
function updatePoints(pts, subject) {
    let p = parseInt(localStorage.getItem('upsc_points')) || 0;
    p = Math.max(0, p + pts);
    localStorage.setItem('upsc_points', p);

    if (pts > 0) {
        let history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
        history[subject] = (history[subject] || 0) + 1;
        localStorage.setItem('upsc_history', JSON.stringify(history));
    }
    updateAnalytics();
}

function updateAnalytics() {
    const p = localStorage.getItem('upsc_points') || 0;
    const history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
    const solved = Object.values(history).reduce((a, b) => a + b, 0);
    
    if (document.getElementById('points-val')) document.getElementById('points-val').innerText = p;
    if (document.getElementById('solved-count')) document.getElementById('solved-count').innerText = solved;
    if (document.getElementById('progress-bar-fill')) {
        const perc = (solved / TOTAL_QUESTIONS_COUNT) * 100;
        document.getElementById('progress-bar-fill').style.width = `${Math.min(perc, 100)}%`;
    }
}

// --- AUTH ---
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        const authArea = document.getElementById('auth-area');
        authArea.innerHTML = `<button onclick="handleLogout()" class="btn-signin">Logout</button>`;
        syncCloudData(user);
    } else {
        init();
    }
});

window.handleLogin = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
};

window.handleLogout = () => {
    auth.signOut().then(() => { localStorage.clear(); window.location.reload(); });
};

async function syncCloudData(user) {
    const ref = db.collection('users').doc(user.uid);
    const doc = await ref.get();
    if (doc.exists) {
        const d = doc.data();
        localStorage.setItem('upsc_points', d.points || 0);
        localStorage.setItem('upsc_streak', d.streak || 0);
    }
    init();
}

// Start everything
init();
renderCalendar();