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

let allQuestions = [];
let quizData = [];
let currentIdx = 0;
let score = 0;
let currentUser = null;
let wrongQuestions = JSON.parse(localStorage.getItem('upsc_wrong_pool')) || [];

// --- AUTH LOGIC ---
window.handleLogin = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => console.log("Logged in:", result.user.displayName))
        .catch((e) => alert("Login Error: " + e.message));
};

window.handleLogout = () => {
    auth.signOut().then(() => {
        localStorage.clear(); 
        window.location.reload();
    });
};

auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        updateUI(user);
        syncCloudData(user);
    } else {
        initGuestMode();
        updateLeaderboard(); 
    }
});

function updateUI(user) {
    const authArea = document.getElementById('auth-area');
    if (authArea) {
        authArea.innerHTML = `
            <div class="user-pill">
                <img src="${user.photoURL}" class="user-img" style="width:25px; border-radius:50%; margin-right:8px;">
                <span>Officer ${user.displayName.split(' ')[0]}</span>
                <button onclick="handleLogout()" class="logout-btn" style="margin-left:10px; background:none; border:none; color:red; cursor:pointer; font-size:0.8rem;">Logout</button>
            </div>`;
    }
}

// --- DATA SYNC & ANALYTICS ---
async function syncCloudData(user) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (doc.exists) {
        const data = doc.data();
        localStorage.setItem('upsc_streak', data.streak || 0);
        localStorage.setItem('upsc_points', data.points || 0);
        localStorage.setItem('upsc_history', JSON.stringify(data.history || {}));
        localStorage.setItem('upsc_tasks', JSON.stringify(data.tasks || []));
    } else {
        await userRef.set({
            name: user.displayName,
            streak: parseInt(localStorage.getItem('upsc_streak')) || 0,
            points: parseInt(localStorage.getItem('upsc_points')) || 0,
            history: JSON.parse(localStorage.getItem('upsc_history')) || {},
            tasks: JSON.parse(localStorage.getItem('upsc_tasks')) || []
        });
    }
    renderAllStats();
}

function renderAllStats() {
    updateStreakDisplay();
    renderTasks();
    renderHeatmap();
    updateLeaderboard();
    updateAnalytics();
}

function updateAnalytics() {
    const pts = localStorage.getItem('upsc_points') || 0;
    const history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
    const totalSolved = Object.values(history).reduce((a, b) => a + b, 0);
    
    if(document.getElementById('points-val')) document.getElementById('points-val').innerText = pts;
    if(document.getElementById('solved-count')) document.getElementById('solved-count').innerText = totalSolved;
}

// --- GITHUB-STYLE HEATMAP ---
function renderHeatmap() {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    const history = JSON.parse(localStorage.getItem('upsc_history')) || {};
    
    container.innerHTML = '';
    // Show last 28 days
    for (let i = 0; i < 28; i++) {
        const day = new Date();
        day.setDate(day.getDate() - (27 - i));
        const dateStr = day.toDateString();
        
        const square = document.createElement('div');
        square.className = 'heat-sq';
        if (history[dateStr]) {
            square.classList.add(history[dateStr] > 5 ? 'active-high' : 'active');
        }
        square.title = `${dateStr}: ${history[dateStr] || 0} questions`;
        container.appendChild(square);
    }
}

async function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;
    try {
        const snapshot = await db.collection('users').orderBy('points', 'desc').limit(5).get();
        let html = '<table class="leaderboard-table">';
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const isMe = currentUser && doc.id === currentUser.uid;
            html += `
                <tr class="${isMe ? 'highlight-me' : ''}">
                    <td>${rank}</td>
                    <td>${data.name || "Officer"}</td>
                    <td style="text-align:right">⭐ ${data.points || 0}</td>
                </tr>`;
            rank++;
        });
        leaderboardList.innerHTML = html + '</table>';
    } catch (e) { console.error(e); }
}

// --- CORE QUIZ LOGIC ---
async function init() {
    renderAllStats();
    try {
        const response = await fetch('./questions.json');
        allQuestions = await response.json();
    } catch (e) { console.error("JSON Error", e); }
}

function initGuestMode() { init(); }

function updateStreakDisplay() {
    const streakEl = document.getElementById('streak-count');
    if (streakEl) streakEl.innerText = localStorage.getItem('upsc_streak') || 0;
}

window.startFilteredQuiz = (subject) => {
    currentIdx = 0; score = 0;
    let filtered = [];

    if (subject === 'Review') {
        filtered = allQuestions.filter(q => wrongQuestions.includes(q.id));
        if (filtered.length === 0) return alert("No mistakes to review! Keep practicing.");
    } else if (subject === 'All') {
        filtered = allQuestions;
    } else {
        filtered = allQuestions.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
    }

    quizData = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
    showQuestion();
};

function showQuestion() {
    const container = document.getElementById('quiz-container');
    const q = quizData[currentIdx];
    
    let difficulty = q.id % 3 === 0 ? 'Hard' : (q.id % 2 === 0 ? 'Medium' : 'Easy');
    let diffColor = difficulty === 'Easy' ? '#00b8a3' : (difficulty === 'Medium' ? '#ffb800' : '#ff2d55');

    container.innerHTML = `
        <div class="quiz-card animate-in">
            <div class="quiz-meta">
                <span class="subject-tag">${q.subject}</span>
                <span style="color:${diffColor}; font-weight:bold; font-size:0.8rem;">${difficulty}</span>
                <span class="q-count">${currentIdx + 1} / ${quizData.length}</span>
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
        </div>`;
}

window.handleSelect = (idx) => {
    const q = quizData[currentIdx];
    const buttons = document.querySelectorAll('.option-row');
    buttons.forEach(btn => btn.disabled = true);

    let pointsEarned = 0;
    if (idx === q.ans) {
        score += 1;
        pointsEarned = 10;
        buttons[idx].classList.add('correct');
        wrongQuestions = wrongQuestions.filter(id => id !== q.id);
    } else {
        score -= 0.33;
        pointsEarned = -2;
        buttons[idx].classList.add('wrong');
        buttons[q.ans].classList.add('correct');
        if (!wrongQuestions.includes(q.id)) wrongQuestions.push(q.id);
    }
    
    updatePoints(pointsEarned);
    localStorage.setItem('upsc_wrong_pool', JSON.stringify(wrongQuestions));

    setTimeout(() => {
        currentIdx++;
        if (currentIdx < quizData.length) showQuestion();
        else showResults();
    }, 1200);
};

function updatePoints(pts) {
    let p = parseInt(localStorage.getItem('upsc_points')) || 0;
    p = Math.max(0, p + pts); // Don't go below 0
    localStorage.setItem('upsc_points', p);
    updateAnalytics();
}

function showResults() {
    const container = document.getElementById('quiz-container');
    const today = new Date().toDateString();
    
    // Update History for Heatmap
    let history = JSON.parse(localStorage.getItem('upsc_history')) || {};
    history[today] = (history[today] || 0) + quizData.length;
    
    // Streak Logic
    let streak = parseInt(localStorage.getItem('upsc_streak') || 0);
    if (localStorage.getItem('upsc_last_date') !== today) {
        streak++;
    }

    saveData(streak, today, null, history, localStorage.getItem('upsc_points'));
    renderAllStats();

    container.innerHTML = `
        <div class="results-card" style="text-align:center; padding:40px;">
            <h1 style="font-size:3rem;">${score >= 6 ? '🦁' : '📖'}</h1>
            <h2>Session Finished!</h2>
            <p>You scored <strong>${score.toFixed(2)}</strong></p>
            <button class="whatsapp-btn" onclick="shareResults()">Share on WhatsApp</button>
            <button class="btn-primary" onclick="location.reload()" style="margin-top:10px;">Back to Dashboard</button>
        </div>`;
}

window.shareResults = () => {
    const streak = localStorage.getItem('upsc_streak');
    const text = `🔥 My UPSC Streak is ${streak} Days on PrepTrack! \nTarget: LBSNAA 🇮🇳\nJoin me in the daily grind: [YOUR_URL]`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
};

// --- TASKS ---
window.renderTasks = () => {
    const taskList = document.getElementById('todo-list');
    if (!taskList) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    taskList.innerHTML = tasks.map((task, i) => `
        <li class="task-item">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${i})">
            <span class="${task.completed ? 'done' : ''}">${task.text}</span>
        </li>`).join('');
};

window.addTask = () => {
    const input = document.getElementById('todo-input');
    if (!input || !input.value.trim()) return;
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    tasks.push({ text: input.value, completed: false });
    saveData(null, null, tasks, null, null);
    input.value = '';
    renderTasks();
};

window.toggleTask = (i) => {
    const tasks = JSON.parse(localStorage.getItem('upsc_tasks')) || [];
    tasks[i].completed = !tasks[i].completed;
    saveData(null, null, tasks, null, null);
    renderTasks();
};

async function saveData(s, d, t, h, pts) {
    if (s !== null) localStorage.setItem('upsc_streak', s);
    if (d !== null) localStorage.setItem('upsc_last_date', d);
    if (t !== null) localStorage.setItem('upsc_tasks', JSON.stringify(t));
    if (h !== null) localStorage.setItem('upsc_history', JSON.stringify(h));
    
    if (currentUser) {
        const obj = {};
        if (s !== null) obj.streak = s;
        if (d !== null) obj.last_date = d;
        if (t !== null) obj.tasks = t;
        if (h !== null) obj.history = h;
        if (pts !== null) obj.points = parseInt(pts);
        await db.collection('users').doc(currentUser.uid).update(obj).catch(async () => {
             await db.collection('users').doc(currentUser.uid).set(obj, {merge: true});
        });
    }
}

init();