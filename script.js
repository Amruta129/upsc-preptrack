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

// Calendar Navigation State
let currentCalendarDate = new Date();

// Timer State
let timerInterval;
let timeLeft = 25 * 60;
let isTimerRunning = false;

// --- INITIALIZATION ---
async function init() {
    try {
        const response = await fetch('./questions.json?v=' + new Date().getTime());
        allQuestions = await response.json();
        
        updateAnalytics();
        renderTodoList(); 
        renderCalendar();
        updateLeaderboard();
    } catch (e) { console.error("Init Error:", e); }
}

// --- HEATMAP NAVIGATION ---
window.changeMonth = (offset) => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
};

function renderCalendar() {
    const container = document.getElementById('calendar-days');
    const label = document.getElementById('month-label');
    if (!container) return;
    
    // Update Month Display with Nav Buttons
    if (label) {
        label.innerHTML = `
            <button onclick="changeMonth(-1)" class="cal-nav-btn"><i class="fas fa-chevron-left"></i></button>
            <span>${currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button onclick="changeMonth(1)" class="cal-nav-btn"><i class="fas fa-chevron-right"></i></button>
        `;
    }

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const completedDates = JSON.parse(localStorage.getItem('upsc_completed_dates')) || [];

    container.innerHTML = '';
    
    // Empty slots for start of month
    for (let i = 0; i < firstDay; i++) {
        container.innerHTML += `<div class="cal-day-empty"></div>`;
    }

    // Days logic
    for (let d = 1; d <= daysInMonth; d++) {
        const fullDate = new Date(year, month, d).toDateString();
        const isDone = completedDates.includes(fullDate);
        const isToday = fullDate === new Date().toDateString();
        
        container.innerHTML += `
            <div class="cal-day ${isDone ? 'completed' : ''} ${isToday ? 'today' : ''}" 
                 style="position:relative; width:100%; aspect-ratio:1; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:600; border-radius:6px; 
                 background:${isDone ? '#22c55e' : '#f8fafc'}; color:${isDone ? 'white' : '#64748b'}; border:${isToday ? '2px solid #6366f1' : 'none'};">
                ${d}
                ${isDone ? '<span style="position:absolute; bottom:2px; right:2px; font-size:0.6rem; font-weight:900;">✓</span>' : ''}
            </div>`;
    }
}

// --- FOCUS TIMER LOGIC ---
window.toggleTimer = () => {
    const btn = document.getElementById('timer-btn');
    if (isTimerRunning) {
        clearInterval(timerInterval);
        btn.innerHTML = '<i class="fas fa-play"></i> Start';
    } else {
        timerInterval = setInterval(updateTimerUI, 1000);
        btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    }
    isTimerRunning = !isTimerRunning;
};

function updateTimerUI() {
    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        alert("Focus Session Complete! 🌿");
        resetTimer();
        return;
    }
    timeLeft--;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const display = document.getElementById('timer');
    if (display) display.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

window.resetTimer = () => {
    clearInterval(timerInterval);
    timeLeft = 25 * 60;
    isTimerRunning = false;
    document.getElementById('timer').innerText = "25:00";
    document.getElementById('timer-btn').innerHTML = '<i class="fas fa-play"></i> Start';
};

// --- QUIZ & ANALYTICS ---
window.startFilteredQuiz = (subject, isAutoLoad = false) => {
    if (!allQuestions.length) return;
    const today = new Date().toDateString();
    
    if (localStorage.getItem('upsc_last_date') === today && subject.toLowerCase() !== 'review' && !isAutoLoad) {
        return alert("Daily drill completed! Review errors or check your targets.");
    }

    currentIdx = 0; score = 0;
    let pool = [];
    const target = subject.toLowerCase();

    if (target === 'review') {
        pool = allQuestions.filter(q => wrongQuestions.includes(q.id));
        if (!pool.length) return alert("No errors to review yet!");
    } else if (target === 'all') {
        pool = allQuestions;
    } else {
        pool = allQuestions.filter(q => q.subject.toLowerCase() === target);
    }

    if (!pool.length) return alert("Subject pool is empty.");
    quizData = pool.sort(() => 0.5 - Math.random()).slice(0, 10);
    showQuestion();
};

function showQuestion() {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentIdx];
    container.innerHTML = `
        <div class="quiz-card animate-in">
            <div class="quiz-meta" style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <span class="subject-tag" style="background:#f1f5f9; padding:4px 12px; border-radius:20px; font-size:0.7rem; font-weight:700; color:#6366f1;">${q.subject.toUpperCase()}</span>
                <span style="font-size:0.8rem; color:#94a3b8; font-weight:600;">Q ${currentIdx + 1}/10</span>
            </div>
            <h2 style="font-size:1.1rem; margin-bottom:20px; line-height:1.5;">${q.q}</h2>
            <div style="display:grid; gap:10px;">
                ${q.opts.map((opt, i) => `
                    <button class="option-row" onclick="handleSelect(${i})" style="text-align:left; padding:12px 15px; border:1px solid #f1f5f9; border-radius:10px; background:white; cursor:pointer; display:flex; align-items:center; gap:12px;">
                        <span style="background:#f8fafc; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-weight:700;">${String.fromCharCode(65+i)}</span>
                        <span>${opt}</span>
                    </button>
                `).join('')}
            </div>
            <div id="feedback-area" style="display:none; margin-top:20px; border-top:1px solid #eee; padding-top:15px;">
                <p style="font-size:0.85rem; color:#64748b; background:#f8fafc; padding:12px; border-radius:8px;">${q.explanation}</p>
                <button onclick="nextStep()" class="btn-primary" style="width:100%; margin-top:15px; padding:12px; background:#6366f1; color:white; border:none; border-radius:10px; font-weight:700; cursor:pointer;">Next Question →</button>
            </div>
        </div>`;
}

window.handleSelect = (idx) => {
    const q = quizData[currentIdx];
    const buttons = document.querySelectorAll('.option-row');
    buttons.forEach(b => b.disabled = true);

    if (idx === q.ans) {
        score++;
        buttons[idx].style.borderColor = '#22c55e';
        buttons[idx].style.background = '#f0fdf4';
        wrongQuestions = wrongQuestions.filter(id => id !== q.id);
        updatePoints(10, q.subject);
    } else {
        score -= 0.33;
        buttons[idx].style.borderColor = '#ef4444';
        buttons[idx].style.background = '#fef2f2';
        buttons[q.ans].style.borderColor = '#22c55e';
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

function showResults() {
    const container = document.getElementById('quiz-container');
    const today = new Date().toDateString();
    localStorage.setItem('upsc_last_date', today);
    let comp = JSON.parse(localStorage.getItem('upsc_completed_dates')) || [];
    if (!comp.includes(today)) comp.push(today);
    localStorage.setItem('upsc_completed_dates', JSON.stringify(comp));

    container.innerHTML = `
        <div style="text-align:center; padding:40px 20px;">
            <div style="font-size:3rem;">🎯</div>
            <h2>Drill Complete!</h2>
            <p>Score: <strong>${score.toFixed(2)}</strong></p>
            <button onclick="location.reload()" class="btn-primary" style="padding:12px 30px; background:#6366f1; color:white; border:none; border-radius:10px; cursor:pointer;">Update Dashboard</button>
        </div>`;
    renderCalendar();
}

function updatePoints(pts, subject) {
    let p = parseInt(localStorage.getItem('upsc_points')) || 0;
    p = Math.max(0, p + pts);
    localStorage.setItem('upsc_points', p);

    if (pts > 0) {
        let history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
        let subKey = subject.toLowerCase();
        history[subKey] = (history[subKey] || 0) + 1;
        localStorage.setItem('upsc_history', JSON.stringify(history));
    }
    
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).set({ points: p, name: currentUser.displayName }, { merge: true });
    }
    updateAnalytics();
}

function updateAnalytics() {
    const p = localStorage.getItem('upsc_points') || 0;
    const history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
    const solved = Object.values(history).reduce((a, b) => a + b, 0);
    
    if (document.getElementById('points-val')) document.getElementById('points-val').innerText = p;
    if (document.getElementById('solved-count')) document.getElementById('solved-count').innerText = solved;
    
    // Mastery Bars Update
    const subs = ['polity', 'history', 'geography', 'economy', 'science'];
    subs.forEach(s => {
        const bar = document.getElementById(`mastery-${s}`);
        if (bar) bar.style.width = `${Math.min(((history[s] || 0) / 50) * 100, 100)}%`;
    });

    const masterAll = document.getElementById('mastery-all');
    if (masterAll) masterAll.style.width = `${Math.min((solved / TOTAL_QUESTIONS_COUNT) * 100, 100)}%`;

    const fill = document.getElementById('progress-bar-fill');
    if (fill) fill.style.width = `${Math.min((solved / TOTAL_QUESTIONS_COUNT) * 100, 100)}%`;
}

// --- TODO LOGIC ---
window.addTask = () => {
    const input = document.getElementById('todo-input');
    const tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')) || [];
    if (!input.value.trim()) return;
    tasks.push({ id: Date.now(), text: input.value, completed: false });
    localStorage.setItem('upsc_todo_tasks', JSON.stringify(tasks));
    input.value = "";
    renderTodoList();
};

function renderTodoList() {
    const list = document.getElementById('todo-list');
    const tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')) || [];
    if (!list) return;
    list.innerHTML = tasks.map(t => `
        <li style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
            <span onclick="toggleTask(${t.id})" style="cursor:pointer; text-decoration:${t.completed ? 'line-through' : 'none'}">${t.text}</span>
            <i class="fas fa-trash" onclick="deleteTask(${t.id})" style="cursor:pointer; color:#ccc;"></i>
        </li>
    `).join('');
}

window.toggleTask = (id) => {
    let tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')) || [];
    tasks = tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t);
    localStorage.setItem('upsc_todo_tasks', JSON.stringify(tasks));
    renderTodoList();
};

window.deleteTask = (id) => {
    let tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')) || [];
    tasks = tasks.filter(t => t.id !== id);
    localStorage.setItem('upsc_todo_tasks', JSON.stringify(tasks));
    renderTodoList();
};

async function updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    try {
        const snap = await db.collection('users').orderBy('points', 'desc').limit(5).get();
        let html = '<ul style="list-style:none; padding:0;">';
        snap.forEach((doc, i) => {
            const d = doc.data();
            html += `<li style="display:flex; justify-content:space-between; padding:5px 0; font-size:0.85rem;">
                <span>${i+1}. ${d.name || 'User'}</span>
                <span style="font-weight:700; color:#6366f1;">${d.points || 0} XP</span>
            </li>`;
        });
        list.innerHTML = html + '</ul>';
    } catch(e) { list.innerHTML = 'Sign in to see rankings.'; }
}

auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) syncCloudData(user);
    else init();
});

async function syncCloudData(user) {
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) localStorage.setItem('upsc_points', doc.data().points || 0);
    init();
}

window.handleLogin = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.handleLogout = () => { auth.signOut().then(() => { localStorage.clear(); location.reload(); }); };