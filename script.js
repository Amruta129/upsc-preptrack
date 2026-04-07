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
    try {
        const response = await fetch('./questions.json?v=' + new Date().getTime());
        allQuestions = await response.json();
        
        updateAnalytics();
        renderTodoList(); 
        renderCalendar();
        updateLeaderboard();
    } catch (e) { console.error("Init Error:", e); }
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

document.addEventListener('keydown', (e) => {
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
    
    list.innerHTML = tasks.length === 0 ? '<li style="color:#94a3b8; font-size:0.8rem; text-align:center; list-style:none; padding:20px;">No targets set for today.</li>' : 
    tasks.map(t => `
        <li class="todo-item ${t.completed ? 'completed' : ''}" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9; list-style:none;">
            <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="toggleTask(${t.id})">
                <i class="${t.completed ? 'fas fa-check-circle' : 'far fa-circle'}" style="color: ${t.completed ? '#22c55e' : '#6366f1'};"></i>
                <span style="text-decoration: ${t.completed ? 'line-through' : 'none'}; color: ${t.completed ? '#94a3b8' : '#1e293b'}; font-size:0.85rem;">${t.text}</span>
            </div>
            <i class="fas fa-trash" onclick="deleteTask(${t.id})" style="color:#cbd5e1; cursor:pointer; font-size:0.75rem;"></i>
        </li>
    `).join('');
}

// --- QUIZ CORE ---
window.startFilteredQuiz = (subject, isAutoLoad = false) => {
    if (!allQuestions.length) return;
    const today = new Date().toDateString();
    
    if (localStorage.getItem('upsc_last_date') === today && subject.toLowerCase() !== 'review' && !isAutoLoad) {
        return alert("Daily drill completed! Review your errors or come back tomorrow.");
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

    if (!pool.length) return alert("Subject pool is currently empty.");
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
                <span style="font-size:0.8rem; color:#94a3b8; font-weight:600;">Question ${currentIdx + 1}/10</span>
            </div>
            <h2 class="question-text" style="font-size:1.1rem; margin-bottom:20px; line-height:1.5;">${q.q}</h2>
            <div class="options-container" style="display:grid; gap:10px;">
                ${q.opts.map((opt, i) => `
                    <button class="option-row" onclick="handleSelect(${i})" style="text-align:left; padding:12px 15px; border:1px solid #f1f5f9; border-radius:10px; background:white; cursor:pointer; transition:0.2s; display:flex; align-items:center; gap:12px;">
                        <span style="background:#f8fafc; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-weight:700; font-size:0.8rem;">${String.fromCharCode(65+i)}</span>
                        <span style="font-size:0.9rem; color:#475569;">${opt}</span>
                    </button>
                `).join('')}
            </div>
            <div id="feedback-area" style="display:none; margin-top:20px; border-top:1px solid #eee; padding-top:15px;">
                <p style="font-size:0.85rem; color:#64748b; line-height:1.6; background:#f8fafc; padding:12px; border-radius:8px;"><strong>Context:</strong> ${q.explanation}</p>
                <button onclick="nextStep()" class="btn-primary" style="width:100%; margin-top:15px; padding:12px; background:#6366f1; color:white; border:none; border-radius:10px; font-weight:700; cursor:pointer;">Next Challenge →</button>
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
    
    // Save state
    localStorage.setItem('upsc_last_date', today);
    let comp = JSON.parse(localStorage.getItem('upsc_completed_dates')) || [];
    if (!comp.includes(today)) comp.push(today);
    localStorage.setItem('upsc_completed_dates', JSON.stringify(comp));

    container.innerHTML = `
        <div class="results-card" style="text-align:center; padding:40px 20px;">
            <div style="font-size:3rem; margin-bottom:10px;">🎯</div>
            <h2 style="color:#1e293b;">Drill Complete!</h2>
            <p style="color:#64748b; margin-bottom:20px;">Session Score: <strong>${score.toFixed(2)}</strong></p>
            <p style="color:#22c55e; font-weight:800; font-size:0.9rem;">Heatmap Updated! 🌿</p>
            <button onclick="location.reload()" class="btn-primary" style="padding:12px 30px; background:#6366f1; color:white; border:none; border-radius:10px; font-weight:700; cursor:pointer; margin-top:10px;">Claim Reward & Exit</button>
        </div>`;
    
    renderCalendar();
}

// --- CALENDAR LOGIC (FULLY FIXED) ---
function renderCalendar() {
    const container = document.getElementById('calendar-days');
    const label = document.getElementById('month-label');
    if (!container) return;
    
    const now = new Date();
    if (label) label.innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const completedDates = JSON.parse(localStorage.getItem('upsc_completed_dates')) || [];

    container.innerHTML = '';
    
    // Fill leading empty days
    for (let i = 0; i < firstDay; i++) {
        container.innerHTML += `<div class="cal-day-empty"></div>`;
    }

    // Render active month days
    for (let d = 1; d <= daysInMonth; d++) {
        const fullDate = new Date(now.getFullYear(), now.getMonth(), d).toDateString();
        const isDone = completedDates.includes(fullDate);
        const isToday = fullDate === new Date().toDateString();
        
        // Applying classes and the '✓' tick for completed days
        container.innerHTML += `
            <div class="cal-day ${isDone ? 'completed' : ''} ${isToday ? 'today' : ''}" 
                 style="position:relative; width:100%; aspect-ratio:1; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:600; border-radius:6px; cursor:default; transition:all 0.3s;
                 background:${isDone ? 'var(--primary)' : '#f8fafc'}; color:${isDone ? 'white' : '#64748b'};">
                ${d}
                ${isDone ? '<span style="position:absolute; bottom:2px; right:2px; font-size:0.6rem; font-weight:900;">✓</span>' : ''}
            </div>`;
    }
}

async function updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    try {
        const snap = await db.collection('users').orderBy('points', 'desc').limit(5).get();
        let html = '<ul style="list-style:none; padding:0; margin-top:15px;">';
        snap.forEach((doc, i) => {
            const d = doc.data();
            html += `<li style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9;">
                <span style="font-size:0.85rem; color:#475569;">${i+1}. ${d.name || 'Aspirant'}</span>
                <span style="font-weight:700; color:#6366f1; font-size:0.85rem;">${d.points || 0} XP</span>
            </li>`;
        });
        list.innerHTML = html + '</ul>';
    } catch(e) { list.innerHTML = '<p style="font-size:0.7rem; color:#94a3b8;">Rankings available in Cloud mode.</p>'; }
}

// --- STATS SYNC ---
function updatePoints(pts, subject) {
    let p = parseInt(localStorage.getItem('upsc_points')) || 0;
    p = Math.max(0, p + pts);
    localStorage.setItem('upsc_points', p);

    if (pts > 0) {
        let history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
        history[subject] = (history[subject] || 0) + 1;
        localStorage.setItem('upsc_history', JSON.stringify(history));
    }
    
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).set({
            points: p,
            name: currentUser.displayName || "Aspirant",
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    updateAnalytics();
}

function updateAnalytics() {
    const p = localStorage.getItem('upsc_points') || 0;
    const streak = localStorage.getItem('upsc_streak') || 0;
    const history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
    const solved = Object.values(history).reduce((a, b) => a + b, 0);
    
    if (document.getElementById('points-val')) document.getElementById('points-val').innerText = p;
    if (document.getElementById('solved-count')) document.getElementById('solved-count').innerText = solved;
    if (document.getElementById('streak-count')) document.getElementById('streak-count').innerText = streak;
    
    if (document.getElementById('progress-bar-fill')) {
        const perc = (solved / TOTAL_QUESTIONS_COUNT) * 100;
        document.getElementById('progress-bar-fill').style.width = `${Math.min(perc, 100)}%`;
    }
}

// --- AUTH & SYNC ---
auth.onAuthStateChanged(user => {
    currentUser = user;
    const authArea = document.getElementById('auth-area');
    
    if (user) {
        authArea.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size:0.85rem; font-weight:700; color:#1e293b;">Hi, ${user.displayName.split(' ')[0]}</span>
                <button onclick="handleLogout()" class="btn-signin" style="background:#fef2f2; color:#ef4444; border:1px solid #fee2e2; padding:6px 12px; font-size:0.75rem;">Logout</button>
            </div>`;
        syncCloudData(user);
    } else {
        authArea.innerHTML = `<button class="btn-signin" onclick="handleLogin()">Sign In</button>`;
        init();
    }
});

window.handleLogin = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.handleLogout = () => { auth.signOut().then(() => { localStorage.clear(); window.location.reload(); }); };

async function syncCloudData(user) {
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
        const d = doc.data();
        localStorage.setItem('upsc_points', d.points || 0);
        localStorage.setItem('upsc_streak', d.streak || 0);
    }
    init();
}