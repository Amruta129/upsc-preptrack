// --- 1. ZUSTAND FIX ---
// If using Zustand in your project, ensure the import in that file is:
// import { create } from 'zustand';

// --- 2. FIREBASE CONFIGURATION ---
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

// --- 3. GLOBAL STATE ---
const TOTAL_QUESTIONS_COUNT = 250; 
let allQuestions = [];
let quizData = [];
let currentIdx = 0;
let score = 0;
let currentUser = null;
let wrongQuestions = JSON.parse(localStorage.getItem('upsc_wrong_pool')) || [];
let currentCalendarDate = new Date();
let timerInterval;
let timeLeft = 25 * 60;
let isTimerRunning = false;

// --- 4. INITIALIZATION ---
async function init() {
    try {
        const response = await fetch('./questions.json?v=' + new Date().getTime());
        allQuestions = await response.json();
        
        updateAnalytics();
        renderTodoList(); 
        renderCalendar();
        updateLeaderboard();
        updateAuthUI();
    } catch (e) { console.error("Init Error:", e); }
}

// --- 5. AUTHENTICATION ---
function updateAuthUI() {
    const authArea = document.getElementById('auth-area');
    if (!authArea) return;
    
    if (currentUser) {
        authArea.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; background:white; padding:5px 15px; border-radius:30px; border:1px solid #e2e8f0;">
                <span style="font-size:0.8rem; font-weight:700;">Hi, ${currentUser.displayName.split(' ')[0]}</span>
                <button onclick="handleLogout()" style="border:none; background:none; color:#ef4444; cursor:pointer;"><i class="fas fa-sign-out-alt"></i></button>
            </div>`;
    } else {
        authArea.innerHTML = `<button class="btn-signin" onclick="handleLogin()">Sign In</button>`;
    }
}

window.handleLogin = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.handleLogout = () => { auth.signOut().then(() => { localStorage.clear(); location.reload(); }); };

// --- 6. HEATMAP NAVIGATION ---
window.changeMonth = (offset) => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
};

function renderCalendar() {
    const container = document.getElementById('calendar-days');
    const label = document.getElementById('month-label');
    if (!container || !label) return;
    
    label.innerHTML = `
        <button onclick="changeMonth(-1)" class="cal-nav-btn"><i class="fas fa-chevron-left"></i></button>
        <span>${currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        <button onclick="changeMonth(1)" class="cal-nav-btn"><i class="fas fa-chevron-right"></i></button>
    `;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const completedDates = JSON.parse(localStorage.getItem('upsc_completed_dates')) || [];

    container.innerHTML = '';
    for (let i = 0; i < firstDay; i++) container.innerHTML += `<div class="cal-day-empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const fullDate = new Date(year, month, d).toDateString();
        const isDone = completedDates.includes(fullDate);
        const isToday = fullDate === new Date().toDateString();
        container.innerHTML += `
            <div class="cal-day ${isDone ? 'completed' : ''} ${isToday ? 'today' : ''}">
                ${d} ${isDone ? '<span class="tick">✓</span>' : ''}
            </div>`;
    }
}

// --- 7. FOCUS TIMER ---
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
        resetTimer(); return;
    }
    timeLeft--;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const display = document.getElementById('timer');
    if (display) display.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

window.resetTimer = () => {
    clearInterval(timerInterval); timeLeft = 25 * 60; isTimerRunning = false;
    const timerElem = document.getElementById('timer');
    const btnElem = document.getElementById('timer-btn');
    if (timerElem) timerElem.innerText = "25:00";
    if (btnElem) btnElem.innerHTML = '<i class="fas fa-play"></i> Start';
};

// --- 8. QUIZ ENGINE ---
window.startFilteredQuiz = (subject, isAutoLoad = false) => {
    if (!allQuestions.length) return;
    const today = new Date().toDateString();
    if (localStorage.getItem('upsc_last_date') === today && subject !== 'review' && !isAutoLoad) {
        return alert("Daily drill completed!");
    }
    currentIdx = 0; score = 0;
    let pool = (subject === 'review') ? allQuestions.filter(q => wrongQuestions.includes(q.id)) :
               (subject === 'all') ? allQuestions : allQuestions.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
    
    if (!pool.length) return alert("No questions found.");
    quizData = pool.sort(() => 0.5 - Math.random()).slice(0, 10);
    showQuestion();
};

function showQuestion() {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentIdx];
    container.innerHTML = `
        <div class="quiz-card">
            <span class="subject-tag">${q.subject.toUpperCase()}</span>
            <h2>${q.q}</h2>
            <div style="display:grid; gap:10px;">
                ${q.opts.map((opt, i) => `<button class="option-row" onclick="handleSelect(${i})"><span>${String.fromCharCode(65+i)}</span> ${opt}</button>`).join('')}
            </div>
            <div id="feedback-area" style="display:none; margin-top:15px;">
                <p style="background:#f8fafc; padding:10px; border-radius:8px; font-size:0.85rem;">${q.explanation}</p>
                <button onclick="nextStep()" class="btn-primary-large">Next Question →</button>
            </div>
        </div>`;
}

window.handleSelect = (idx) => {
    const q = quizData[currentIdx];
    const btns = document.querySelectorAll('.option-row');
    btns.forEach(b => b.disabled = true);
    if (idx === q.ans) {
        score++; btns[idx].style.background = "#f0fdf4"; btns[idx].style.borderColor = "#22c55e";
        wrongQuestions = wrongQuestions.filter(id => id !== q.id);
        updatePoints(10, q.subject);
    } else {
        score -= 0.33; btns[idx].style.background = "#fef2f2"; btns[idx].style.borderColor = "#ef4444";
        btns[q.ans].style.borderColor = "#22c55e";
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
    const today = new Date().toDateString();
    localStorage.setItem('upsc_last_date', today);
    let comp = JSON.parse(localStorage.getItem('upsc_completed_dates')) || [];
    if (!comp.includes(today)) comp.push(today);
    localStorage.setItem('upsc_completed_dates', JSON.stringify(comp));
    document.getElementById('quiz-container').innerHTML = `<h2>Result: ${score.toFixed(2)}</h2><button onclick="location.reload()" class="btn-primary-large">Dashboard</button>`;
}

// --- 9. ANALYTICS, TODO & STREAK ---
function calculateStreak() {
    const completedDates = JSON.parse(localStorage.getItem('upsc_completed_dates')) || [];
    if (completedDates.length === 0) return 0;

    const uniqueDates = [...new Set(completedDates)];
    const dateObjects = uniqueDates.map(d => {
        const date = new Date(d);
        date.setHours(0,0,0,0);
        return date.getTime();
    }).sort((a, b) => b - a);

    let streak = 0;
    let today = new Date();
    today.setHours(0,0,0,0);
    let yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // If the latest date is neither today nor yesterday, streak is broken
    if (dateObjects[0] !== today.getTime() && dateObjects[0] !== yesterday.getTime()) return 0;

    let expectedTime = dateObjects[0];
    for (let time of dateObjects) {
        if (time === expectedTime) {
            streak++;
            let nextExpected = new Date(expectedTime);
            nextExpected.setDate(nextExpected.getDate() - 1);
            expectedTime = nextExpected.getTime();
        } else {
            break;
        }
    }
    return streak;
}

function updatePoints(pts, subject) {
    let p = Math.max(0, (parseInt(localStorage.getItem('upsc_points')) || 0) + pts);
    localStorage.setItem('upsc_points', p);
    if (pts > 0) {
        let history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
        history[subject.toLowerCase()] = (history[subject.toLowerCase()] || 0) + 1;
        localStorage.setItem('upsc_history', JSON.stringify(history));
    }
    if (currentUser) db.collection('users').doc(currentUser.uid).set({ points: p, name: currentUser.displayName }, { merge: true });
    updateAnalytics();
}

function updateAnalytics() {
    const history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
    const solved = Object.values(history).reduce((a, b) => a + b, 0);
    const pointsDisplay = document.getElementById('points-val');
    const solvedDisplay = document.getElementById('solved-count');
    const streakDisplay = document.getElementById('streak-val');
    
    if (pointsDisplay) pointsDisplay.innerText = localStorage.getItem('upsc_points') || 0;
    if (solvedDisplay) solvedDisplay.innerText = solved;
    if (streakDisplay) streakDisplay.innerText = calculateStreak();
    
    ['polity', 'history', 'geography', 'economy', 'science'].forEach(s => {
        const bar = document.getElementById(`mastery-${s}`);
        if (bar) bar.style.width = `${Math.min(((history[s] || 0) / 50) * 100, 100)}%`;
    });
}

window.addTask = () => {
    const input = document.getElementById('todo-input');
    const tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')) || [];
    if (!input.value.trim()) return;
    tasks.push({ id: Date.now(), text: input.value, completed: false });
    localStorage.setItem('upsc_todo_tasks', JSON.stringify(tasks));
    input.value = ""; renderTodoList();
};

function renderTodoList() {
    const list = document.getElementById('todo-list');
    const tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')) || [];
    if (!list) return;
    list.innerHTML = tasks.map(t => `<li class="todo-item"><span onclick="toggleTask(${t.id})" style="${t.completed ? 'text-decoration:line-through' : ''}">${t.text}</span><i class="fas fa-trash" onclick="deleteTask(${t.id})"></i></li>`).join('');
}

window.toggleTask = (id) => {
    let tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')).map(t => t.id === id ? {...t, completed: !t.completed} : t);
    localStorage.setItem('upsc_todo_tasks', JSON.stringify(tasks)); renderTodoList();
};

window.deleteTask = (id) => {
    let tasks = JSON.parse(localStorage.getItem('upsc_todo_tasks')).filter(t => t.id !== id);
    localStorage.setItem('upsc_todo_tasks', JSON.stringify(tasks)); renderTodoList();
};

async function updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    try {
        const snap = await db.collection('users').orderBy('points', 'desc').limit(5).get();
        let html = ''; 
        let rank = 1; 
        snap.forEach((doc) => { 
            const d = doc.data();
            html += `<li style="display:flex; justify-content:space-between; padding:5px 0; font-size:0.85rem;">
                <span>${rank}. ${d.name || 'User'}</span>
                <span style="font-weight:700; color:#6366f1;">${d.points || 0} XP</span>
            </li>`; 
            rank++;
        });
        list.innerHTML = html;
    } catch(e) { 
        console.log("Leaderboard locked."); 
        list.innerHTML = "Sign in to see rankings.";
    }
}

auth.onAuthStateChanged(user => { 
    currentUser = user; 
    if (user) { 
        db.collection('users').doc(user.uid).get().then(doc => { 
            if (doc.exists) localStorage.setItem('upsc_points', doc.data().points || 0); 
            init(); 
        }); 
    } else { 
        init(); 
    } 
});