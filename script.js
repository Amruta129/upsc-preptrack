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

// Initialize Firebase once
if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}
const auth = firebase.auth();
const db = firebase.firestore();

// Constants
const TOTAL_QUESTIONS_COUNT = 250; 

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

auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        updateUI(user);
        
        try {
            await db.collection('users').doc(user.uid).set({
                name: user.displayName,
                points: parseInt(localStorage.getItem('upsc_points')) || 0,
                streak: parseInt(localStorage.getItem('upsc_streak')) || 0,
                last_date: localStorage.getItem('upsc_last_date') || ""
            }, { merge: true });
        } catch (e) { console.error("Firestore Init Error:", e); }

        syncCloudData(user);
    } else {
        init();
        updateLeaderboard(); 
        renderCalendar(); 
    }
});

function updateUI(user) {
    const authArea = document.getElementById('auth-area');
    if (authArea) {
        const firstName = user.displayName ? user.displayName.split(' ')[0] : "Officer";
        authArea.innerHTML = `
            <div class="user-pill">
                <img src="${user.photoURL}" class="user-img" style="width:25px; border-radius:50%; margin-right:8px; vertical-align:middle;">
                <span style="font-size:0.85rem; font-weight:600;">Officer ${firstName}</span>
                <button onclick="handleLogout()" class="logout-btn" style="margin-left:8px; background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.75rem;">Logout</button>
            </div>`;
    }
}

// --- CALENDAR HEATMAP LOGIC ---
function renderCalendar() {
    const container = document.getElementById('calendar-days');
    if (!container) return;

    const now = new Date();
    const monthLabel = document.getElementById('month-label');
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    
    if (monthLabel) monthLabel.innerText = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const completedDates = JSON.parse(localStorage.getItem('upsc_completed_dates')) || [];

    container.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.classList.add('cal-day-empty');
        container.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dayBox = document.createElement('div');
        dayBox.classList.add('cal-day');
        const dateObj = new Date(now.getFullYear(), now.getMonth(), d);
        const dateKey = dateObj.toDateString();
        dayBox.innerText = d;

        if (d === now.getDate()) dayBox.classList.add('today');
        if (completedDates.includes(dateKey)) {
            dayBox.classList.add('completed');
            dayBox.innerHTML = `${d}<span class="tick">✅</span>`;
        }
        container.appendChild(dayBox);
    }
}

// --- DATA SYNC ---
async function syncCloudData(user) {
    try {
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        if (doc.exists) {
            const data = doc.data();
            localStorage.setItem('upsc_streak', data.streak || 0);
            localStorage.setItem('upsc_points', data.points || 0);
            localStorage.setItem('upsc_history', JSON.stringify(data.history || {}));
            localStorage.setItem('upsc_last_date', data.last_date || "");
            localStorage.setItem('upsc_completed_dates', JSON.stringify(data.completed_dates || []));
        }
    } catch (e) { console.error("Sync Error:", e); }
    init();
    renderAllStats();
}

function renderAllStats() {
    updateStreakDisplay();
    updateLeaderboard();
    updateAnalytics();
    renderCalendar();
}

function updateStreakDisplay() {
    const streakEl = document.getElementById('streak-count');
    if (streakEl) streakEl.innerText = localStorage.getItem('upsc_streak') || 0;
}

function updateAnalytics() {
    const pts = localStorage.getItem('upsc_points') || 0;
    const history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
    const totalSolved = Object.values(history).reduce((a, b) => a + b, 0);
    
    if(document.getElementById('points-val')) document.getElementById('points-val').innerText = pts;
    if(document.getElementById('solved-count')) document.getElementById('solved-count').innerText = totalSolved;
    
    const progressText = document.getElementById('quest-progress-text');
    if (progressText) progressText.innerText = `Quest Progress (of ${TOTAL_QUESTIONS_COUNT})`;
    
    const progressBar = document.getElementById('progress-bar-fill');
    if (progressBar) {
        const percentage = (totalSolved / TOTAL_QUESTIONS_COUNT) * 100;
        progressBar.style.width = `${Math.min(percentage, 100)}%`;
    }
}

// --- CORE QUIZ LOGIC ---
async function init() {
    console.log("Fetching questions...");
    try {
        // The ?v= query string forces the browser to bypass its cache
        const response = await fetch('./questions.json?v=' + new Date().getTime());
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        allQuestions = await response.json();
        
        if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
            console.error("Warning: questions.json is empty or not an array!");
        } else {
            console.log("Success! Loaded", allQuestions.length, "questions.");
        }
        
        updateAnalytics(); 
    } catch (e) { 
        console.error("CRITICAL ERROR loading questions.json:", e); 
    }
}

window.startFilteredQuiz = (subject) => {
    if (!allQuestions || allQuestions.length === 0) {
        return alert("The Question bank is still initializing. Please wait a few seconds and try again.");
    }

    const today = new Date().toDateString();
    // Allow 'Review' mode even if daily limit is reached
    if (localStorage.getItem('upsc_last_date') === today && subject !== 'Review') {
        return alert("Daily limit reached! Practice in 'Review' or come back tomorrow.");
    }

    currentIdx = 0; score = 0;
    let pool = [];

    if (subject === 'Review') {
        pool = allQuestions.filter(q => wrongQuestions.includes(q.id));
        if (pool.length === 0) return alert("Great job! You have no mistakes to review.");
    } else {
        pool = (subject === 'All') ? allQuestions : allQuestions.filter(q => 
            q.subject.trim().toLowerCase() === subject.trim().toLowerCase()
        );
    }

    if (pool.length === 0) return alert(`No questions found for category: ${subject}`);

    // Randomize selection based on day to keep it fresh
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const startIndex = (dayOfYear * 10) % pool.length;
    quizData = pool.slice(startIndex, startIndex + 10);

    // If slice results in less than 10 questions, just take what's available
    if(quizData.length === 0) quizData = pool.slice(0, 10);

    showQuestion();
};

function showQuestion() {
    const container = document.getElementById('quiz-container');
    if (!container) return;
    
    const q = quizData[currentIdx];
    
    container.innerHTML = `
        <div class="quiz-card animate-in">
            <div class="quiz-meta" style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <span class="subject-tag">${q.subject}</span>
                <span style="font-size:0.75rem; color:#94a3b8;">${currentIdx + 1}/10</span>
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
                <p style="font-size:0.85rem; color:#1e293b;"><strong>💡 Source:</strong> ${q.source || 'UPSC Prelims'}</p>
                <p style="font-size:0.85rem; color:#475569; margin-top:5px;">${q.explanation || ''}</p>
                <button onclick="nextStep()" class="btn-primary" style="width:100%; margin-top:10px;">Next Question →</button>
            </div>
        </div>`;
}

window.handleSelect = (idx) => {
    const q = quizData[currentIdx];
    const buttons = document.querySelectorAll('.option-row');
    buttons.forEach(btn => btn.disabled = true);

    let pts = 0;
    if (idx === q.ans) {
        score++; pts = 10;
        buttons[idx].classList.add('correct');
        wrongQuestions = wrongQuestions.filter(id => id !== q.id);
        
        let history = JSON.parse(localStorage.getItem('upsc_history') || "{}");
        history[q.subject] = (history[q.subject] || 0) + 1;
        localStorage.setItem('upsc_history', JSON.stringify(history));
    } else {
        score -= 0.33; pts = -2;
        buttons[idx].classList.add('wrong');
        buttons[q.ans].classList.add('correct');
        if (!wrongQuestions.includes(q.id)) wrongQuestions.push(q.id);
    }
    
    updatePoints(pts);
    localStorage.setItem('upsc_wrong_pool', JSON.stringify(wrongQuestions));
    document.getElementById('feedback-area').style.display = 'block';
};

window.nextStep = () => {
    currentIdx++;
    if (currentIdx < quizData.length) showQuestion();
    else showResults();
};

function updatePoints(pts) {
    let p = parseInt(localStorage.getItem('upsc_points')) || 0;
    p = Math.max(0, p + pts);
    localStorage.setItem('upsc_points', p);
    updateAnalytics();
}

function showResults() {
    const container = document.getElementById('quiz-container');
    const today = new Date().toDateString();
    
    let completed = JSON.parse(localStorage.getItem('upsc_completed_dates')) || [];
    if (!completed.includes(today)) completed.push(today);
    localStorage.setItem('upsc_completed_dates', JSON.stringify(completed));

    let streak = parseInt(localStorage.getItem('upsc_streak') || 0);
    const lastDate = localStorage.getItem('upsc_last_date');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDate === yesterday.toDateString()) streak++;
    else if (lastDate !== today) streak = 1;

    saveData(streak, today, completed);
    renderAllStats();

    container.innerHTML = `
        <div class="results-card" style="text-align:center; padding:40px;">
            <div style="font-size:3rem;">✅</div>
            <h2>Well Done, Officer!</h2>
            <p>Today's Score: ${score.toFixed(2)}/10</p>
            <p>Current Streak: ${streak} Days</p>
            <button class="whatsapp-btn" onclick="shareResults()" style="background:#25d366; color:white; padding:12px; border-radius:8px; border:none; width:100%; cursor:pointer; margin-top:10px;">Share Streak to WhatsApp</button>
            <button onclick="location.reload()" style="margin-top:15px; background:none; border:none; color:blue; cursor:pointer; display:block; width:100%;">Return to Dashboard</button>
        </div>`;
}

async function saveData(s, d, comp) {
    localStorage.setItem('upsc_streak', s);
    localStorage.setItem('upsc_last_date', d);
    if (currentUser) {
        try {
            await db.collection('users').doc(currentUser.uid).set({
                name: currentUser.displayName,
                streak: s,
                last_date: d,
                completed_dates: comp,
                points: parseInt(localStorage.getItem('upsc_points')) || 0,
                history: JSON.parse(localStorage.getItem('upsc_history') || "{}")
            }, { merge: true });
        } catch (e) { console.error("Firestore Save Error:", e); }
    }
}

window.shareResults = () => {
    const s = localStorage.getItem('upsc_streak');
    const text = `🚀 My UPSC Prep Streak is ${s} Days on PrepTrack! Join the challenge: https://upsc-preptrack.vercel.app/`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
};

async function updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    try {
        const snap = await db.collection('users').orderBy('points', 'desc').limit(5).get();
        let html = '<table style="width:100%; font-size:0.9rem;">';
        snap.forEach(doc => {
            const userData = doc.data();
            const name = userData.name ? userData.name.split(' ')[0] : "User";
            html += `<tr><td style="padding:5px 0;">${name}</td><td style="text-align:right; font-weight:700; color:#6366f1;">⭐ ${userData.points || 0}</td></tr>`;
        });
        list.innerHTML = html + '</table>';
    } catch(e) { console.log("Leaderboard error", e); }
}