// Global references to DOM elements (will be set in initializeApp)
let nameModal, nameInput, mainContent, sidebarUserName, profileInitial, profileId, profileStudy;
let newsFeed, coursesTab, practiceTab;
let mainScreen, coursesWindow, settingsWindow;
let newsToggle, eventsToggle, newsContainer, eventsContainer, eventsFeed;
let settingsButton, logoutButton;
let eventsLoaded = false;

// Persistent storage key
const LOCAL_STORAGE_KEY = 'finEduUserData';
const BACKEND_BASE_URL = window.location.origin.includes('localhost')
    ? 'http://localhost:3000'
    : window.location.origin;

function createEmptySurveyData() {
    return {
        userName: '',
        userId: '',
        screen1: null,
        screen2: null,
        screen3: [],
        screen4: null,
        screen5: null
    };
}

// Survey state
let surveyData = createEmptySurveyData();

// Screen 3 options based on Screen 1 choice
const screen3Options = {
    'Personal Finance': {
        question: 'What are your main financial goals for the next 1–3 years?',
        options: [
            'Save more money',
            'Build an emergency fund',
            'Pay off debt',
            'Improve budgeting',
            'Improve credit score',
            'Manage monthly expenses',
            'Build healthy money habits',
            'Learn basic finance terms'
        ]
    },
    'Investing': {
        question: 'What are your main investing goals for the next 1–3 years?',
        options: [
            'Learn investing basics',
            'Understand stocks & ETFs',
            'Build a simple portfolio',
            'Learn about risk',
            'Start investing small',
            'Learn diversification',
            'Avoid investing mistakes',
            'Plan for retirement'
        ]
    },
    'Quant Finance': {
        question: 'What are your main goals in quantitative finance?',
        options: [
            'Finance-focused probability & stats',
            'Learn financial modeling',
            'Intro to algo/systematic trading',
            'Understand risk models',
            'Learn derivatives basics',
            'Apply math & code to finance',
            'Learn strategy backtesting',
            'Explore portfolio optimization'
        ]
    },
    'Career & Professional Finance': {
        question: 'What are your main professional finance goals?',
        options: [
            'Negotiate salary/raises',
            'Improve financial communication',
            'Read financial statements',
            'Manage project budgets',
            'Make better money decisions at work',
            'Explore finance career paths',
            'Build Excel/reporting skills',
            'Understand taxes & contracts'
        ]
    }
};

// Initialize the application
function initializeApp() {
    console.log('Initializing app...');
    
    // Get elements and assign to global variables
    nameModal = document.getElementById('nameModal');
    nameInput = document.getElementById('nameInput');
    mainContent = document.getElementById('mainContent');
    sidebarUserName = document.getElementById('sidebarUserName');
    profileInitial = document.getElementById('profileInitial');
    profileId = document.getElementById('profileId');
    profileStudy = document.getElementById('profileStudy');
    newsFeed = document.getElementById('newsFeed');
    coursesTab = document.getElementById('coursesTab');
    practiceTab = document.getElementById('practiceTab');
    settingsButton = document.getElementById('settingsButton');
    logoutButton = document.getElementById('logoutButton');
    mainScreen = document.getElementById('mainScreen');
    coursesWindow = document.getElementById('coursesWindow');
    settingsWindow = document.getElementById('settingsWindow');

    // Toggle elements
    newsToggle = document.getElementById('newsToggle');
    eventsToggle = document.getElementById('eventsToggle');
    newsContainer = document.getElementById('newsContainer');
    eventsContainer = document.getElementById('eventsContainer');
    eventsFeed = document.getElementById('eventsFeed');

    // Check if essential elements exist (nameModal/nameInput are optional now)
    console.log('Checking elements:', { mainContent });
    if (!mainContent) {
        console.error('Essential element not found!', { mainContent });
        return;
    }

    console.log('Elements found, setting up event listeners...');

    // Hide name modal initially (we don't use it anymore)
    if (nameModal) {
        nameModal.style.display = 'none';
    }

    // Check if user is already authenticated
    const authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (authToken && userData) {
        // User is already authenticated - check if they've completed survey
        try {
            const user = JSON.parse(userData);
            surveyData.userId = user.userId;
            surveyData.userName = user.name;
            
            // Check if survey is already completed
            if (restoreExistingUser()) {
                console.log('Existing authenticated session restored.');
            } else {
                // Authenticated but no survey - show survey
                startSurvey();
            }
        } catch (error) {
            console.error('Error restoring authenticated session:', error);
            // Show auth modal if there's an error
            showAuthModal();
        }
    } else {
        // No authentication - show login/signup modal first
        showAuthModal();
    }

    // Function to switch between main windows
    function switchMainWindow(windowType) {
        // Hide all windows first
        if (mainScreen) mainScreen.style.display = 'none';
        if (coursesWindow) coursesWindow.style.display = 'none';
        if (settingsWindow) settingsWindow.style.display = 'none';
        
        // Remove active states from all nav items
        if (coursesTab) coursesTab.classList.remove('active');
        if (practiceTab) practiceTab.classList.remove('active');
        
        // Show the selected window and set active state
        switch(windowType) {
            case 'feed':
                if (mainScreen) mainScreen.style.display = 'flex';
                if (practiceTab) practiceTab.classList.add('active');
                break;
            case 'courses':
                if (coursesWindow) coursesWindow.style.display = 'flex';
                if (coursesTab) coursesTab.classList.add('active');
                break;
            case 'settings':
                if (settingsWindow) settingsWindow.style.display = 'flex';
                // Settings button doesn't need active state (it's in sidebar-actions)
                break;
        }
    }

    // Handle navigation tabs
    if (coursesTab && practiceTab) {
        coursesTab.addEventListener('click', function() {
            switchMainWindow('courses');
            // Load course lessons when courses tab is clicked
            loadCourseLessons();
        });

        practiceTab.addEventListener('click', function() {
            switchMainWindow('feed');
        });
    }

    // Handle settings button
    if (settingsButton) {
        settingsButton.addEventListener('click', function() {
            switchMainWindow('settings');
        });
    }

    // Handle view toggle (News/Events) - only if elements exist
    if (newsToggle && eventsToggle && newsContainer && eventsContainer) {
        newsToggle.addEventListener('click', function() {
            switchToView('news');
        });

        eventsToggle.addEventListener('click', function() {
            switchToView('events');
        });
    }

    // Logout handler
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // Initialize UI Mode toggle
    initializeUIModeToggle();
    
    console.log('App initialization complete!');
}

// Wait for DOM to be fully loaded, or run immediately if already loaded
(function() {
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                console.log('DOMContentLoaded fired');
                try {
                    initializeApp();
                } catch (error) {
                    console.error('Error in initializeApp:', error);
                    // Try to set up basic functionality even if initialization fails
                    setTimeout(function() {
                        const nameInput = document.getElementById('nameInput');
                        if (nameInput) {
                            nameInput.addEventListener('keydown', function(e) {
                                if (e.key === 'Enter' || e.keyCode === 13) {
                                    e.preventDefault();
                                    const userName = nameInput.value.trim();
                                    if (userName) {
                                        const nameModal = document.getElementById('nameModal');
                                        const mainContent = document.getElementById('mainContent');
                                        if (nameModal) nameModal.style.display = 'none';
                                        if (mainContent) mainContent.classList.remove('hidden');
                                    }
                                }
                            });
                        }
                    }, 100);
                }
            });
        } else {
            // DOM is already loaded
            console.log('DOM already loaded, initializing immediately');
            try {
                initializeApp();
            } catch (error) {
                console.error('Error in initializeApp:', error);
            }
        }
    } catch (error) {
        console.error('Error setting up initialization:', error);
    }
})();

// News tracking for continuous updates
let seenArticleIds = new Set(); // Track seen articles by URL
let newsUpdateInterval = null; // Store interval ID
const UPDATE_INTERVAL = 2 * 60 * 1000; // Check for new news every 2 minutes
const MAX_POSTS = 30; // Maximum number of posts in the feed

// Function to get user initials
function getUserInitials(name) {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// Generate 5-character user ID (CAPS letters + numbers)
function generateUserId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let userId = '';
    for (let i = 0; i < 5; i++) {
        userId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return userId;
}

// Start the survey flow
function startSurvey() {
    showSurveyScreen(1);
}

// Make functions and data globally accessible
if (typeof window !== 'undefined') {
    window.startSurvey = startSurvey;
    window.generateUserId = generateUserId;
    window.surveyData = surveyData;
    window.showSurveyScreen = showSurveyScreen;
    window.completeSurvey = completeSurvey;
}

// Show a specific survey screen
function showSurveyScreen(screenNumber) {
    // Hide all survey screens
    for (let i = 1; i <= 5; i++) {
        const screen = document.getElementById(`surveyScreen${i}`);
        if (screen) {
            screen.classList.add('hidden');
        }
    }
    
    // Show the requested screen
    const screen = document.getElementById(`surveyScreen${screenNumber}`);
    if (screen) {
        screen.classList.remove('hidden');
        setupSurveyScreen(screenNumber);
    }
}

// Setup event handlers for each survey screen
function setupSurveyScreen(screenNumber) {
    if (screenNumber === 1) {
        setupScreen1();
    } else if (screenNumber === 2) {
        setupScreen2();
    } else if (screenNumber === 3) {
        setupScreen3();
    } else if (screenNumber === 4) {
        setupScreen4();
    } else if (screenNumber === 5) {
        setupScreen5();
    }
}

// Screen 1: Market Focus
function setupScreen1() {
    const options = document.querySelectorAll('#surveyScreen1 .survey-option');
    // Clear any existing selections first
    options.forEach(opt => opt.classList.remove('selected'));
    
    options.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            options.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked option
            this.classList.add('selected');
            surveyData.screen1 = this.dataset.value;
            
            // Move to next screen after a short delay
            setTimeout(() => {
                showSurveyScreen(2);
            }, 300);
        });
    });
}

// Screen 2: Trading Confidence Level
function setupScreen2() {
    const options = document.querySelectorAll('#surveyScreen2 .survey-option');
    // Clear any existing selections first
    options.forEach(opt => opt.classList.remove('selected'));
    
    options.forEach(option => {
        option.addEventListener('click', function() {
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            surveyData.screen2 = this.dataset.value;
            
            setTimeout(() => {
                showSurveyScreen(3);
            }, 300);
        });
    });
}

// Screen 3: Primary Trading Goal (multi-select)
function setupScreen3() {
    const screen3Modal = document.getElementById('surveyScreen3');
    const optionsContainer = document.getElementById('screen3Options');
    let continueBtn = document.getElementById('screen3Continue');
    
    if (!screen3Modal || !optionsContainer) return;
    
    // Clear any existing selections and event listeners by cloning elements
    const options = document.querySelectorAll('#screen3Options .survey-option');
    options.forEach(opt => {
        opt.classList.remove('selected');
        const newOpt = opt.cloneNode(true);
        opt.parentNode.replaceChild(newOpt, opt);
    });
    
    // Re-query after cloning
    const freshOptions = document.querySelectorAll('#screen3Options .survey-option');
    
    // Reset survey data for screen 3
    surveyData.screen3 = [];
    
    function updateScreen3Selection() {
        const selected = document.querySelectorAll('#screen3Options .survey-option.selected');
        surveyData.screen3 = Array.from(selected).map(opt => opt.dataset.value);
        if (continueBtn) {
            continueBtn.disabled = surveyData.screen3.length === 0;
            console.log('Screen 3 selection updated:', surveyData.screen3, 'Button disabled:', continueBtn.disabled);
        }
    }
    
    freshOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.toggle('selected');
            updateScreen3Selection();
        });
    });
    
    // Re-create continue button to clear old listeners
    if (continueBtn) {
        const newContinueBtn = continueBtn.cloneNode(true);
        continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);
        continueBtn = document.getElementById('screen3Continue'); // Update reference
    }
    
    if (continueBtn) {
        continueBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (surveyData.screen3 && surveyData.screen3.length > 0) {
                setTimeout(() => {
                    showSurveyScreen(4);
                }, 300);
            }
        });
        // Initial state
        updateScreen3Selection();
    }
}

// Screen 4: Income & Life Situation
function setupScreen4() {
    const options = document.querySelectorAll('#surveyScreen4 .survey-option');
    // Clear any existing selections first
    options.forEach(opt => opt.classList.remove('selected'));
    
    options.forEach(option => {
        option.addEventListener('click', function() {
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            surveyData.screen4 = this.dataset.value;
            
            setTimeout(() => {
                showSurveyScreen(5);
            }, 300);
        });
    });
}

// Screen 5: Course Pace
function setupScreen5() {
    const options = document.querySelectorAll('#surveyScreen5 .survey-option');
    // Clear any existing selections first
    options.forEach(opt => opt.classList.remove('selected'));
    
    options.forEach(option => {
        option.addEventListener('click', function() {
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            surveyData.screen5 = this.dataset.value;
            
            // Complete survey and show main screen
            setTimeout(() => {
                completeSurvey();
            }, 300);
        });
    });
}

// Check if user has completed survey in database
async function checkUserSurveyStatus(userId) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return false;
        }

        const response = await fetch(`${BACKEND_BASE_URL}/api/get-stats/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // User has no stats yet
            return false;
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // Check if survey is completed (has all required fields)
            const stats = result.data;
            const isCompleted = stats.screen1 && stats.screen2 && stats.screen4 && stats.screen5;
            
            if (isCompleted) {
                // Load survey data from database
                surveyData.screen1 = stats.screen1;
                surveyData.screen2 = stats.screen2;
                surveyData.screen3 = stats.screen3 || [];
                surveyData.screen4 = stats.screen4;
                surveyData.screen5 = stats.screen5;
                
                // Also load userName if available in stats
                if (stats.userName) {
                    surveyData.userName = stats.userName;
                }
                
                // Save to localStorage for quick access
                persistUserData();
            }
            
            return isCompleted;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking survey status:', error);
        return false;
    }
}

// Save survey data to user account (after authentication)
async function savePersonalStatsToAccount() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('No auth token, survey data will be saved after login');
            return;
        }

        const response = await fetch(`${BACKEND_BASE_URL}/api/save-stats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(surveyData)
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Personal stats saved successfully to user account');
        } else {
            console.error('Error saving personal stats:', result.message);
        }
    } catch (error) {
        console.error('Error sending personal stats to server:', error);
    }
}

// Complete survey and show dashboard
function completeSurvey() {
    hideAllSurveyScreens();
    
    // Save survey data to user account (user is already authenticated)
    savePersonalStatsToAccount();
    persistUserData();
    
    // Update sidebar with user info
    updateSidebarWithUser();
    
    // Show main dashboard
    showMainDashboard();
    
    console.log('Survey completed:', surveyData);
}

function hideAllSurveyScreens() {
    for (let i = 1; i <= 5; i++) {
        const screen = document.getElementById(`surveyScreen${i}`);
        if (screen) {
            screen.classList.add('hidden');
        }
    }
}

function updateSidebarWithUser() {
    if (sidebarUserName) sidebarUserName.textContent = surveyData.userName;
    if (profileId) profileId.textContent = surveyData.userId;
    if (profileStudy) profileStudy.textContent = surveyData.screen1;
    
    // Set profile initial
    const initials = getUserInitials(surveyData.userName);
    if (profileInitial) profileInitial.textContent = initials;
}

function showMainDashboard() {
    if (nameModal) nameModal.style.display = 'none';
    hideAllSurveyScreens();
    if (mainContent) {
        mainContent.classList.remove('hidden');
    }
    loadFinanceNews();
    startContinuousNewsUpdates();
    
    // If user navigates to Courses later, they can load lessons on demand
    
    // Initialize chat after a short delay to ensure DOM is ready
    setTimeout(() => {
        initializeChat();
    }, 100);
}

// =========================
// Courses: Load & Display
// =========================

// Load the user's custom course (or assign a premade) and display its lessons
async function loadCourseLessons() {
    try {
        const token = localStorage.getItem('authToken');
        const listView = document.getElementById('lessonsListView');
        const tabsContainer = document.getElementById('lessonsTabs');

        if (!listView || !tabsContainer) return;

        if (!token) {
            tabsContainer.innerHTML = '<p class="lesson-placeholder">Please log in to view your course.</p>';
            return;
        }

        const response = await fetch(`${BACKEND_BASE_URL}/api/courses/user/custom`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        if (!result.success || !result.course || !Array.isArray(result.course.lessons) || result.course.lessons.length === 0) {
            tabsContainer.innerHTML = '<p class="lesson-placeholder">No lessons found for your course.</p>';
            return;
        }

        displayCourseLessons(result.course);
    } catch (error) {
        console.error('Error loading course:', error);
        const tabsContainer = document.getElementById('lessonsTabs');
        if (tabsContainer) {
            tabsContainer.innerHTML = `<p class="lesson-placeholder">Error loading course: ${error.message}</p>`;
        }
    }
}

// Display list of lessons and wire up click handlers
function displayCourseLessons(course) {
    const tabsContainer = document.getElementById('lessonsTabs');
    const listView = document.getElementById('lessonsListView');
    const contentView = document.getElementById('lessonContentView');

    if (!tabsContainer || !listView || !contentView) return;

    tabsContainer.innerHTML = '';
    listView.classList.remove('hidden');
    contentView.classList.add('hidden');

    const lessons = course.lessons || [];
    window.currentCourse = course;
    window.allLessons = lessons;

    lessons.forEach((lesson, index) => {
        const tab = document.createElement('div');
        tab.className = 'lesson-tab';
        const title = lesson.topic || lesson.title || lesson.subtopic || `Lesson ${index + 1}`;
        tab.textContent = `${index + 1}. ${title}`;
        tab.dataset.lessonIndex = index;

        tab.addEventListener('click', () => {
            document.querySelectorAll('.lesson-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            displayLessonContent(lesson);
            listView.classList.add('hidden');
            contentView.classList.remove('hidden');
        });

        tabsContainer.appendChild(tab);
    });

    const backButton = document.getElementById('lessonBackButton');
    if (backButton) {
        backButton.onclick = () => {
            listView.classList.remove('hidden');
            contentView.classList.add('hidden');
        };
    }
}

// Display a single lesson's content
function displayLessonContent(lesson) {
    const contentContainer = document.getElementById('lessonContent');
    if (!contentContainer) return;

    const title = lesson.topic || lesson.title || lesson.subtopic || 'Untitled Lesson';
    const body = formatLessonContent(lesson.content || '');

    contentContainer.innerHTML = `
        <div class="lesson-header">
            <h2 class="lesson-title">${escapeHtml(title)}</h2>
        </div>
        <div class="lesson-body">
            ${body}
        </div>
    `;
}

// Simple formatter for lesson markdown-like content
function formatLessonContent(content) {
    if (!content) return '<p>No content available.</p>';

    const lines = content.split('\n');
    const out = [];
    let inList = false;

    for (const raw of lines) {
        const line = raw.trim();

        if (line.startsWith('### ')) {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push('<h3>' + escapeHtml(line.slice(4)) + '</h3>');
        } else if (line.startsWith('## ')) {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push('<h2>' + escapeHtml(line.slice(3)) + '</h2>');
        } else if (line.startsWith('# ')) {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push('<h1>' + escapeHtml(line.slice(2)) + '</h1>');
        } else if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
            if (!inList) { inList = true; out.push('<ul>'); }
            const text = line.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
            out.push('<li>' + escapeHtml(text) + '</li>');
        } else if (line !== '') {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push('<p>' + escapeHtml(line) + '</p>');
        }
    }

    if (inList) out.push('</ul>');
    return out.join('\n');
}

function persistUserData() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(surveyData));
        }
    } catch (error) {
        console.warn('Unable to persist user data:', error);
    }
}

function restoreExistingUser() {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return false;
        }
        
        // Check if user is authenticated
        const authToken = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (!authToken || !userData) {
            return false; // Not authenticated
        }
        
        // Check if survey data exists
        const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!stored) {
            return false;
        }
        
        const parsed = JSON.parse(stored);
        if (!parsed) {
            return false;
        }
        
        // Check if survey is completed (has at least screen1-5 data)
        if (!parsed.screen1 || !parsed.screen2 || !parsed.screen4 || !parsed.screen5) {
            return false; // Survey not completed
        }
        
        // Merge survey data
        surveyData = {
            ...surveyData,
            ...parsed,
            screen3: parsed.screen3 || []
        };
        
        // Update with authenticated user data
        try {
            const user = JSON.parse(userData);
            surveyData.userId = user.userId;
            surveyData.userName = user.name;
        } catch (e) {
            console.warn('Error parsing user data:', e);
        }
        
        updateSidebarWithUser();
        showMainDashboard();
        return true;
    } catch (error) {
        console.warn('Unable to restore existing user:', error);
        return false;
    }
}

function resetSurveyDataState() {
    surveyData = createEmptySurveyData();
}

function handleLogout() {
    console.log('Logging out user');
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            // Clear all stored data
            window.localStorage.removeItem(LOCAL_STORAGE_KEY);
            window.localStorage.removeItem('authToken');
            window.localStorage.removeItem('userData');
        }
    } catch (error) {
        console.warn('Unable to clear stored user data:', error);
    }
    
    resetSurveyDataState();
    seenArticleIds = new Set();
    
    // Reset chat initialization
    resetChatInitialization();
    
    if (newsUpdateInterval) {
        clearInterval(newsUpdateInterval);
        newsUpdateInterval = null;
    }
    
    if (newsFeed) {
        newsFeed.innerHTML = '<div class="loading">Log in to load personalized finance news...</div>';
    }
    if (eventsFeed) {
        eventsFeed.innerHTML = '<div class="loading">Log in to see upcoming events...</div>';
    }
    eventsLoaded = false;
    
    if (sidebarUserName) sidebarUserName.textContent = '';
    if (profileId) profileId.textContent = '';
    if (profileStudy) profileStudy.textContent = '';
    if (profileInitial) profileInitial.textContent = '';
    
    hideAllSurveyScreens();
    hideAuthModal();
    
    if (mainContent) {
        mainContent.classList.add('hidden');
    }
    
    // Show auth modal after logout (not name modal)
    showAuthModal();
}

// Switch between News and Events views
function switchToView(view) {
    const newsToggle = document.getElementById('newsToggle');
    const eventsToggle = document.getElementById('eventsToggle');
    const newsContainer = document.getElementById('newsContainer');
    const eventsContainer = document.getElementById('eventsContainer');
    
    if (!newsToggle || !eventsToggle || !newsContainer || !eventsContainer) {
        return;
    }
    
    if (view === 'news') {
        newsToggle.classList.add('active');
        eventsToggle.classList.remove('active');
        newsContainer.classList.add('active');
        eventsContainer.classList.remove('active');
    } else if (view === 'events') {
        eventsToggle.classList.add('active');
        newsToggle.classList.remove('active');
        eventsContainer.classList.add('active');
        newsContainer.classList.remove('active');
        
        // Load events when switching to events view
        loadEvents();
    }
}

// Load events (workshops, webinars, community sessions)
async function loadEvents() {
    if (!eventsFeed) return;
    
    eventsFeed.innerHTML = '<div class="loading">Loading upcoming workshops and events...</div>';
    
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/events`);
        const data = await response.json();
        const events = data.events || [];
        
        if (!events || events.length === 0) {
            // Fallback to hardcoded events if API returns nothing
            const fallbackEvents = getFallbackEvents();
            if (fallbackEvents && fallbackEvents.length > 0) {
                renderEvents(fallbackEvents);
                return;
            }
            eventsFeed.innerHTML = '<div class="error">No upcoming events found.</div>';
            return;
        }
        
        renderEvents(events);
        eventsLoaded = true;
    } catch (error) {
        console.error('Error loading events:', error);
        // Fallback to hardcoded events on error
        const fallbackEvents = getFallbackEvents();
        if (fallbackEvents && fallbackEvents.length > 0) {
            renderEvents(fallbackEvents);
        } else {
            eventsFeed.innerHTML = '<div class="error">Unable to load events. Please try again later.</div>';
        }
    }
}

function formatEventDateRange(start, end) {
    if (!start) return 'Date TBA';
    const startDate = new Date(start);
    const formatter = { month: 'short', day: 'numeric', year: 'numeric' };
    const startStr = startDate.toLocaleDateString('en-US', formatter);
    const timeStr = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    if (!end) return `${startStr} • ${timeStr}`;
    
    const endDate = new Date(end);
    if (isNaN(endDate.getTime()) || startStr === endDate.toLocaleDateString('en-US', formatter)) {
        return `${startStr} • ${timeStr}`;
    }
    
    const endStr = endDate.toLocaleDateString('en-US', formatter);
    return `${startStr} - ${endStr}`;
}

function renderEvents(events) {
    eventsFeed.innerHTML = '';
    
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        
        // Handle both SerpApi format and fallback format
        const date = event.date || 'Date TBA';
        const speaker = event.speaker || event.location || 'Location TBA';
        const description = event.description || '';
        const source = event.source || 'Event';
        const link = event.moreInfoUrl || event.link || '#';
        
        card.innerHTML = `
            <div class="event-meta">
                <div class="event-date">${date}</div>
                <div class="event-speaker">${speaker}</div>
            </div>
            <h3 class="event-title">${event.title}</h3>
            <p class="event-description">${description}</p>
            <div class="event-source">${source}</div>
            <div class="event-actions">
                <a href="${link}" target="_blank" class="event-btn secondary">
                    More Info
                </a>
            </div>
        `;
        
        eventsFeed.appendChild(card);
    });
}

function getFallbackEvents() {
    return [
        {
            id: 'money20-usa',
            title: 'Money20/20 USA 2025',
            date: 'Oct 26-29, 2025 • Las Vegas, NV',
            description: 'Payments, banking, and fintech teams align on AI-native roadmaps and embedded finance.',
            speaker: 'Keynotes from Visa, JPMorgan, Stripe, Capital One',
            source: 'Money20/20 • Las Vegas & Virtual',
            moreInfoUrl: 'https://www.money2020.com/usa'
        },
        {
            id: 'wef-davos',
            title: 'World Economic Forum Annual Meeting 2025',
            date: 'Jan 20-24, 2025 • Davos, Switzerland',
            description: 'Global heads of state and central bankers discuss macro outlook, green investment, and digital assets.',
            speaker: 'World Economic Forum leaders',
            source: 'World Economic Forum • Davos',
            moreInfoUrl: 'https://www.weforum.org/events/world-economic-forum-annual-meeting-2025/'
        },
        {
            id: 'cfa-annual',
            title: 'CFA Institute Annual Conference 2025',
            date: 'May 18-21, 2025 • Chicago, IL',
            description: 'Strategy sessions on portfolio construction, behavioral finance, and AI copilots for analysts.',
            speaker: 'CFA Institute faculty & CIO panels',
            source: 'CFA Institute • Chicago',
            moreInfoUrl: 'https://www.cfainstitute.org/en/events/annual-conference'
        },
        {
            id: 'imn-repe',
            title: 'IMN Real Estate Private Equity Forum East',
            date: 'Jun 4-5, 2025 • New York, NY',
            description: 'Limited partners and fund managers discuss capital flows, distressed debt, and secondary strategies.',
            speaker: 'Brookfield, KKR, Blackstone executives',
            source: 'IMN • New York',
            moreInfoUrl: 'https://www.imn.org/real-estate/conference/Real-Estate-Private-Equity-Forum-East-2025/'
        }
    ];
}

// Start continuous news updates
function startContinuousNewsUpdates() {
    // Clear any existing interval
    if (newsUpdateInterval) {
        clearInterval(newsUpdateInterval);
    }
    
    // Check for new news every UPDATE_INTERVAL
    newsUpdateInterval = setInterval(async () => {
        console.log('Checking for new finance news...');
        await checkForNewNews();
    }, UPDATE_INTERVAL);
    
    console.log(`News updates started. Checking every ${UPDATE_INTERVAL / 1000 / 60} minutes.`);
}

// Check for new news and add them to the feed
async function checkForNewNews() {
    try {
        const newsData = await fetchFinanceNewsFromAPI();
        
        if (newsData && newsData.length > 0) {
            // Process news with AI summaries
            const processedNews = await processNewsWithAI(newsData);
            
            // Filter out already seen articles
            const newArticles = processedNews.filter(article => {
                const articleId = article.url || article.title;
                return !seenArticleIds.has(articleId);
            });
            
            if (newArticles.length > 0) {
                console.log(`Found ${newArticles.length} new articles!`);
                // Add new articles to the top of the feed
                addNewArticlesToFeed(newArticles);
                
                // Mark as seen
                newArticles.forEach(article => {
                    const articleId = article.url || article.title;
                    seenArticleIds.add(articleId);
                });
            } else {
                console.log('No new articles found.');
            }
        }
    } catch (error) {
        console.error('Error checking for new news:', error);
    }
}

// Function to fetch news from multiple sources
async function loadFinanceNews() {
    if (newsFeed.children.length === 0 || newsFeed.querySelector('.loading')) {
    newsFeed.innerHTML = '<div class="loading">Loading finance news from multiple sources...</div>';
    }
    
    const allNews = [];
    
    // List of major finance news sources
    const financeSources = [
        'bloomberg', 'reuters', 'financial-times', 'the-wall-street-journal',
        'cnbc', 'business-insider', 'fortune', 'forbes'
    ];
    
    // Keywords for finance-related news
    const financeKeywords = ['finance', 'financial', 'economy', 'stock market', 'business', 'banking', 'investing', 'cryptocurrency'];
    
    try {
        // Fetch news using NewsAPI or alternative APIs
        const newsData = await fetchFinanceNewsFromAPI();
        
        if (newsData && newsData.length > 0) {
            // Process and enhance news with AI summaries
            const processedNews = await processNewsWithAI(newsData);
            
            // Mark all as seen for initial load
            processedNews.forEach(article => {
                const articleId = article.url || article.title;
                seenArticleIds.add(articleId);
            });
            
            displayNewsFeed(processedNews);
        } else {
            // Fallback: Use sample news
            await loadNewsFromAlternativeSources();
        }
    } catch (error) {
        console.error('Error loading news:', error);
        await loadNewsFromAlternativeSources();
    }
}

// Fetch finance news from NewsAPI or alternative sources
async function fetchFinanceNewsFromAPI() {
    try {
        // Try multiple news APIs in order of preference
        
        // Option 1: Try NewsData.io (free tier available, no CORS issues)
        try {
            const newsDataResponse = await fetch('https://newsdata.io/api/1/news?apikey=pub_1234567890abcdef&q=finance%20OR%20financial%20OR%20economy%20OR%20stock%20market%20OR%20business&language=en&category=business');
            if (newsDataResponse.ok) {
                const newsData = await newsDataResponse.json();
                if (newsData.results && newsData.results.length > 0) {
                    // Transform NewsData.io format to our format
                    return newsData.results.map(article => ({
                        title: article.title,
                        description: article.description,
                        content: article.content,
                        urlToImage: article.image_url,
                        source: { name: article.source_name || 'News Source' },
                        publishedAt: article.pubDate,
                        url: article.link
                    }));
                }
            }
        } catch (e) {
            console.log('NewsData.io not available, trying alternatives...');
        }
        
        // Option 2: Try NewsAPI with CORS proxy (for development)
        try {
            // Using a public CORS proxy (in production, use your own backend)
            const query = encodeURIComponent('finance OR financial OR economy OR stock market OR business');
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=20&apiKey=YOUR_NEWSAPI_KEY`)}`;
            
            // Note: This requires a valid NewsAPI key. For now, we'll use fallback.
        } catch (e) {
            console.log('NewsAPI not available, using fallback...');
        }
        
        // Option 3: Use NewsAPI directly if you have an API key (uncomment and add key)
        /*
        const newsApiKey = 'YOUR_NEWSAPI_KEY_HERE';
        const response = await fetch(`https://newsapi.org/v2/everything?q=finance+OR+financial+OR+economy+OR+stock+market+OR+business&language=en&sortBy=publishedAt&pageSize=20&apiKey=${newsApiKey}`);
        const data = await response.json();
        
        if (data.articles && data.articles.length > 0) {
            return data.articles;
        }
        */
        
        // Option 4: Use alternative news aggregation with dynamic updates
        return await fetchNewsFromRSS();
        
    } catch (error) {
        console.error('Error fetching from API:', error);
        return null;
    }
}

// Fetch news from RSS feeds or alternative sources with dynamic updates
async function fetchNewsFromRSS() {
    // Generate dynamic finance news with varying timestamps to simulate real updates
    // This pool of articles will be randomly selected to create "new" news on each check
    const financeTopics = [
        {
            title: "Fed Keeps Rates Steady, Signals Possible Future Cuts",
            description: "The Federal Reserve maintained interest rates at their current level while indicating potential rate cuts later this year based on inflation trends.",
            content: "The Federal Reserve's latest meeting resulted in maintaining the current interest rate structure, with Chairman Jerome Powell suggesting that rate cuts could be on the horizon if inflation continues to decline...",
            urlToImage: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800",
            source: { name: "Bloomberg" },
            url: "https://www.bloomberg.com"
        },
        {
            title: "Stock Market Hits New Highs Amid Economic Optimism",
            description: "Major stock indices reached record levels as investors remain optimistic about economic growth and corporate earnings.",
            content: "The S&P 500 and Dow Jones Industrial Average both closed at all-time highs this week, driven by strong corporate earnings reports and positive economic indicators...",
            urlToImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
            source: { name: "Reuters" },
            url: "https://www.reuters.com"
        },
        {
            title: "Cryptocurrency Market Shows Strong Recovery",
            description: "Bitcoin and other major cryptocurrencies surged as regulatory clarity improves and institutional adoption increases.",
            content: "The cryptocurrency market experienced significant gains this week, with Bitcoin rising above key resistance levels and Ethereum showing strong momentum...",
            urlToImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800",
            source: { name: "CNBC" },
            url: "https://www.cnbc.com"
        },
        {
            title: "Global Banking Sector Embraces Digital Transformation",
            description: "Traditional banks accelerate their digital initiatives to compete with fintech companies and meet changing customer demands.",
            content: "Major banks worldwide are investing billions in digital transformation projects, focusing on mobile banking, AI-powered services, and blockchain technology...",
            urlToImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
            source: { name: "Financial Times" },
            url: "https://www.ft.com"
        },
        {
            title: "Inflation Rates Decline Across Major Economies",
            description: "Central banks report decreasing inflation rates, suggesting that monetary policy measures are having the desired effect.",
            content: "Recent data from major economies shows inflation rates declining, with the European Central Bank and Bank of England both reporting progress in their inflation targets...",
            urlToImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
            source: { name: "The Wall Street Journal" },
            url: "https://www.wsj.com"
        },
        {
            title: "Tech Giants Report Strong Quarterly Earnings",
            description: "Major technology companies exceeded analyst expectations, driving sector-wide gains in the stock market.",
            content: "Leading tech companies announced robust quarterly earnings, with cloud services and AI-driven products showing particularly strong growth...",
            urlToImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
            source: { name: "Forbes" },
            url: "https://www.forbes.com"
        },
        {
            title: "ESG Investing Continues to Attract Institutional Capital",
            description: "Environmental, Social, and Governance funds see record inflows as institutional investors prioritize sustainable investing.",
            content: "ESG-focused investment funds attracted billions in new capital this quarter, as pension funds and endowments increasingly prioritize sustainability in their investment strategies...",
            urlToImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800",
            source: { name: "Fortune" },
            url: "https://fortune.com"
        },
        {
            title: "Central Banks Explore Digital Currency Initiatives",
            description: "Multiple central banks announce collaborative efforts to develop and test digital currency frameworks.",
            content: "Central banks from several countries have formed a working group to explore the development of central bank digital currencies (CBDCs), with pilot programs expected to launch next year...",
            urlToImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800",
            source: { name: "Business Insider" },
            url: "https://www.businessinsider.com"
        },
        {
            title: "AI Revolution Transforms Financial Services Industry",
            description: "Banks and fintech companies are leveraging artificial intelligence to enhance customer experience and streamline operations.",
            content: "Financial institutions are increasingly adopting AI technologies for fraud detection, algorithmic trading, and personalized financial advice, revolutionizing the traditional banking landscape...",
            urlToImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
            source: { name: "Financial Times" },
            url: "https://www.ft.com"
        },
        {
            title: "Global Supply Chain Disruptions Impact Market Volatility",
            description: "Ongoing supply chain challenges continue to affect global markets, creating opportunities and risks for investors.",
            content: "Supply chain disruptions are causing significant market volatility, with some sectors experiencing shortages while others see increased demand and pricing power...",
            urlToImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
            source: { name: "Reuters" },
            url: "https://www.reuters.com"
        },
        {
            title: "Renewable Energy Investments Reach Record Highs",
            description: "Global investments in renewable energy projects hit unprecedented levels as countries accelerate their transition to clean energy.",
            content: "Solar and wind energy projects are attracting record levels of investment, with governments and private sector companies committing billions to sustainable energy infrastructure...",
            urlToImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800",
            source: { name: "Bloomberg" },
            url: "https://www.bloomberg.com"
        },
        {
            title: "Housing Market Shows Signs of Stabilization",
            description: "After months of volatility, housing markets in major economies are beginning to show signs of price stabilization.",
            content: "Real estate markets are experiencing a shift as interest rates stabilize and inventory levels adjust, creating a more balanced environment for buyers and sellers...",
            urlToImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
            source: { name: "The Wall Street Journal" },
            url: "https://www.wsj.com"
        }
    ];
    
    // Generate news with random recent timestamps to simulate new articles
    const now = Date.now();
    
    // Randomly select 6-10 articles from the pool to simulate new articles appearing
    const numArticles = Math.floor(Math.random() * 5) + 6; // 6-10 articles
    const selectedTopics = [];
    const usedIndices = new Set();
    
    while (selectedTopics.length < numArticles && selectedTopics.length < financeTopics.length) {
        const randomIndex = Math.floor(Math.random() * financeTopics.length);
        if (!usedIndices.has(randomIndex)) {
            usedIndices.add(randomIndex);
            selectedTopics.push(financeTopics[randomIndex]);
        }
    }
    
    const articles = selectedTopics.map((topic) => {
        // Create articles with timestamps - some very recent (last hour) to simulate breaking news
        // Mix of very recent and slightly older articles
        const isBreakingNews = Math.random() > 0.5; // 50% chance of being very recent
        let hoursAgo, minutesAgo;
        
        if (isBreakingNews) {
            // Very recent news (last hour)
            hoursAgo = Math.random() * 1; // 0-1 hour ago
            minutesAgo = Math.random() * 60; // 0-60 minutes ago
        } else {
            // Recent news (last 6 hours)
            hoursAgo = Math.random() * 6; // 0-6 hours ago
            minutesAgo = Math.random() * 60;
        }
        
        const publishedAt = new Date(now - (hoursAgo * 3600000) - (minutesAgo * 60000));
        
        return {
            ...topic,
            publishedAt: publishedAt.toISOString()
        };
    });
    
    // Sort by most recent first
    return articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

// Process news with AI to create summaries
async function processNewsWithAI(newsArticles) {
    const processedArticles = [];
    
    for (const article of newsArticles) {
        try {
            // Use OpenAI to create a concise summary if description is too long
            let summary = article.description || article.content?.substring(0, 200) || '';
            
            // If description is missing or too short, generate one with AI
            if (!summary || summary.length < 50) {
                try {
                    const aiPrompt = `Summarize this finance news article in 2-3 sentences: "${article.title}. ${article.content?.substring(0, 500) || ''}"`;
                    summary = await window.callOpenAI(aiPrompt, { max_tokens: 150, temperature: 0.5 });
                } catch (aiError) {
                    console.warn('AI summarization failed, using original:', aiError);
                    summary = article.content?.substring(0, 200) || article.description || '';
                }
            }
            
            processedArticles.push({
                title: article.title,
                summary: summary,
                source: article.source?.name || 'Unknown Source',
                image: article.urlToImage,
                url: article.url,
                date: formatDate(article.publishedAt),
                timestamp: new Date(article.publishedAt).getTime()
            });
        } catch (error) {
            console.error('Error processing article:', error);
            // Include article even if AI processing fails
            processedArticles.push({
                title: article.title,
                summary: article.description || article.content?.substring(0, 200) || '',
                source: article.source?.name || 'Unknown Source',
                image: article.urlToImage,
                url: article.url,
                date: formatDate(article.publishedAt),
                timestamp: new Date(article.publishedAt).getTime()
            });
        }
    }
    
    // Sort by timestamp (newest first)
    return processedArticles.sort((a, b) => b.timestamp - a.timestamp);
}

// Load news from alternative sources (fallback)
async function loadNewsFromAlternativeSources() {
    const news = await fetchNewsFromRSS();
    const processed = await processNewsWithAI(news);
    displayNewsFeed(processed);
}

// Add new articles to the top of the feed with animation
function addNewArticlesToFeed(newArticles) {
    if (newArticles.length === 0) return;
    
    // Get newsFeed element (in case it's not set yet)
    const feedElement = newsFeed || document.getElementById('newsFeed');
    if (!feedElement) {
        console.error('News feed element not found');
        return;
    }

    // Remove loading message if present
    const loadingMsg = feedElement.querySelector('.loading');
    if (loadingMsg) {
        loadingMsg.remove();
    }
    
    // Count current news posts (excluding notifications and loading messages)
    const currentPosts = Array.from(feedElement.children).filter(child => 
        child.classList.contains('news-post')
    );
    const currentPostCount = currentPosts.length;
    
    // Calculate how many posts to remove if we exceed the limit
    const totalAfterAdding = currentPostCount + newArticles.length;
    const postsToRemove = Math.max(0, totalAfterAdding - MAX_POSTS);
    
    // Remove oldest posts (at the bottom) if we need to make room
    if (postsToRemove > 0) {
        // Get the last N posts (oldest ones)
        const postsToDelete = currentPosts.slice(-postsToRemove);
        postsToDelete.forEach(post => {
            // Animate out before removing
            post.style.transition = 'all 0.3s ease-out';
            post.style.opacity = '0';
            post.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (post.parentNode) {
                    post.remove();
                }
            }, 300);
        });
    }
    
    // Add each new article at the top with animation
    newArticles.forEach((article, index) => {
        const postDiv = createNewsPostElement(article);
        postDiv.classList.add('new-post'); // Add class for animation
        postDiv.style.opacity = '0';
        postDiv.style.transform = 'translateY(-20px)';
        
        // Insert at the top of the feed (after notification if present)
        const firstPost = feedElement.querySelector('.news-post');
        if (firstPost) {
            feedElement.insertBefore(postDiv, firstPost);
        } else {
            // If no posts exist, add after notification or at the beginning
            const notification = feedElement.querySelector('.new-news-notification');
            if (notification && notification.nextSibling) {
                feedElement.insertBefore(postDiv, notification.nextSibling);
            } else {
                feedElement.insertBefore(postDiv, feedElement.firstChild);
            }
        }
        
        // Animate in with slight delay for each article
        setTimeout(() => {
            postDiv.style.transition = 'all 0.5s ease-out';
            postDiv.style.opacity = '1';
            postDiv.style.transform = 'translateY(0)';
            
            // Remove animation class after animation completes
            setTimeout(() => {
                postDiv.classList.remove('new-post');
            }, 500);
        }, index * 100); // Stagger animations
    });
    
    // Show notification if there are new articles
    if (newArticles.length > 0) {
        showNewNewsNotification(newArticles.length);
    }
}

// Create a news post element
function createNewsPostElement(article) {
        const postDiv = document.createElement('div');
        postDiv.className = 'news-post';
        
        postDiv.innerHTML = `
            <div class="post-header">
                <div class="source-avatar">
                    <span>${getSourceInitial(article.source)}</span>
                </div>
                <div class="source-info">
                    <div class="source-name">${article.source}</div>
                    <div class="post-date">${article.date}</div>
                </div>
            </div>
            
            <div class="post-content">
                <h3 class="post-title">${article.title}</h3>
                <p class="post-summary">${article.summary}</p>
            </div>
            
            ${article.image ? `
                <div class="post-image-container">
                    <img src="${article.image}" alt="${article.title}" class="post-image" onerror="this.style.display='none'">
                </div>
            ` : ''}
            
            <div class="post-footer">
                <a href="${article.url}" target="_blank" class="read-more-btn">Read Full Article →</a>
            </div>
        `;
        
    return postDiv;
}

// Show notification for new news
function showNewNewsNotification(count) {
    // Get newsFeed element (in case it's not set yet)
    const feedElement = newsFeed || document.getElementById('newsFeed');
    if (!feedElement) {
        return;
    }
    
    // Remove existing notification if any
    const existingNotification = feedElement.querySelector('.new-news-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'new-news-notification';
    notification.textContent = `📰 ${count} new ${count === 1 ? 'article' : 'articles'} added!`;
    
    // Insert at the top of news feed
    if (feedElement.firstChild) {
        feedElement.insertBefore(notification, feedElement.firstChild);
    } else {
        feedElement.appendChild(notification);
    }
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Display news in social media feed style
function displayNewsFeed(newsArray) {
    // Get newsFeed element (in case it's not set yet)
    const feedElement = newsFeed || document.getElementById('newsFeed');
    if (!feedElement) {
        console.error('News feed element not found');
        return;
    }
    
    feedElement.innerHTML = '';
    
    if (newsArray.length === 0) {
        feedElement.innerHTML = '<div class="error">No news articles found.</div>';
        return;
    }

    // Limit to MAX_POSTS (30) posts
    const limitedNews = newsArray.slice(0, MAX_POSTS);
    
    limitedNews.forEach(article => {
        const postDiv = createNewsPostElement(article);
        feedElement.appendChild(postDiv);
    });
    
    // Mark all displayed articles as seen
    limitedNews.forEach(article => {
        const articleId = article.url || article.title;
        seenArticleIds.add(articleId);
    });
}

// Get source initial for avatar
function getSourceInitial(sourceName) {
    if (!sourceName) return '?';
    const words = sourceName.split(' ');
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return sourceName.substring(0, 2).toUpperCase();
}

// UI Mode Toggle Functions
function initializeUIModeToggle() {
    const darkModeBtn = document.getElementById('darkModeBtn');
    const lightModeBtn = document.getElementById('lightModeBtn');
    
    if (!darkModeBtn || !lightModeBtn) {
        console.log('UI Mode toggle buttons not found, will retry...');
        // Retry after a short delay in case settings window hasn't loaded yet
        setTimeout(initializeUIModeToggle, 500);
        return;
    }
    
    // Load saved preference or default to dark
    const savedMode = localStorage.getItem('uiMode') || 'dark';
    setUIMode(savedMode);
    
    // Add click handlers
    darkModeBtn.addEventListener('click', function() {
        setUIMode('dark');
    });
    
    lightModeBtn.addEventListener('click', function() {
        setUIMode('light');
    });
    
    console.log('UI Mode toggle initialized');
}

// Set UI mode (dark or light)
function setUIMode(mode) {
    // Validate mode
    if (mode !== 'dark' && mode !== 'light') {
        mode = 'dark';
    }
    
    // Update button states
    const darkModeBtn = document.getElementById('darkModeBtn');
    const lightModeBtn = document.getElementById('lightModeBtn');
    
    if (darkModeBtn && lightModeBtn) {
        if (mode === 'dark') {
            darkModeBtn.classList.add('active');
            lightModeBtn.classList.remove('active');
        } else {
            lightModeBtn.classList.add('active');
            darkModeBtn.classList.remove('active');
        }
    }
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', mode);
    
    // Save to localStorage
    localStorage.setItem('uiMode', mode);
    
    console.log(`UI Mode changed to: ${mode}`);
}

// Apply saved theme on page load
function applySavedTheme() {
    const savedMode = localStorage.getItem('uiMode') || 'dark';
    document.documentElement.setAttribute('data-theme', savedMode);
    
    // Update button states if they exist
    const darkModeBtn = document.getElementById('darkModeBtn');
    const lightModeBtn = document.getElementById('lightModeBtn');
    
    if (darkModeBtn && lightModeBtn) {
        if (savedMode === 'dark') {
            darkModeBtn.classList.add('active');
            lightModeBtn.classList.remove('active');
        } else {
            lightModeBtn.classList.add('active');
            darkModeBtn.classList.remove('active');
        }
    }
}

// Apply theme immediately when DOM loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySavedTheme);
} else {
    applySavedTheme();
}

// Function to format date (for API dates)
function formatDate(dateString) {
    if (!dateString) return 'Just now';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

// ==================== Authentication Functions ====================

// Show authentication modal
function showAuthModal() {
    const authModal = document.getElementById('authModal');
    
    if (authModal) {
        authModal.classList.remove('hidden');
        authModal.style.display = 'flex';
    }
    
    // Hide name modal if it exists (we don't use it anymore)
    const nameModal = document.getElementById('nameModal');
    if (nameModal) {
        nameModal.style.display = 'none';
    }
    
    // Clear all error messages first
    const loginError = document.getElementById('authError');
    const signupError = document.getElementById('signupError');
    if (loginError) {
        loginError.classList.add('hidden');
        loginError.textContent = ''; // Clear error text
    }
    if (signupError) {
        signupError.classList.add('hidden');
        signupError.textContent = ''; // Clear error text
    }
    
    // Show login form by default
    showLoginForm();
}

// Hide authentication modal
function hideAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.classList.add('hidden');
        authModal.style.display = 'none';
    }
}

// Show login form
function showLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginError = document.getElementById('authError');
    const signupError = document.getElementById('signupError');
    
    // Hide signup form and show login form
    if (signupForm) {
        signupForm.classList.remove('active');
        signupForm.classList.add('hidden');
    }
    if (loginForm) {
        loginForm.classList.remove('hidden');
        loginForm.classList.add('active');
    }
    
    // Hide and clear error messages
    if (loginError) {
        loginError.classList.add('hidden');
        loginError.textContent = '';
    }
    if (signupError) {
        signupError.classList.add('hidden');
        signupError.textContent = '';
    }
    
    // Clear form inputs
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
}

// Show signup form
function showSignupForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginError = document.getElementById('authError');
    const signupError = document.getElementById('signupError');
    
    // Hide login form and show signup form
    if (loginForm) {
        loginForm.classList.remove('active');
        loginForm.classList.add('hidden');
    }
    if (signupForm) {
        signupForm.classList.remove('hidden');
        signupForm.classList.add('active');
    }
    
    // Hide and clear error messages
    if (loginError) {
        loginError.classList.add('hidden');
        loginError.textContent = '';
    }
    if (signupError) {
        signupError.classList.add('hidden');
        signupError.textContent = '';
    }
    
    // Pre-fill name from survey data if available
    const signupName = document.getElementById('signupName');
    const signupEmail = document.getElementById('signupEmail');
    const signupPassword = document.getElementById('signupPassword');
    if (signupName) {
        signupName.value = surveyData.userName || '';
    }
    if (signupEmail) signupEmail.value = '';
    if (signupPassword) signupPassword.value = '';
}

// Show error message
function showAuthError(message, isSignup = false) {
    const errorEl = isSignup ? document.getElementById('signupError') : document.getElementById('authError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const loginBtn = document.getElementById('loginBtn');
    const errorEl = document.getElementById('authError');
    
    if (!email || !password) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    if (errorEl) errorEl.classList.add('hidden');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
    }
    
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Login failed. Please try again.';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (e) {
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            showAuthError(errorMessage);
            return;
        }
        
        const result = await response.json();
        
        if (result.success && result.token) {
            // Clear any error messages before proceeding
            clearLoginError();
            
            // Save token and user data
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));
            
            // Update user info in survey data
            surveyData.userName = result.user.name;
            surveyData.userId = result.user.userId;
            
            // Hide auth modal
            hideAuthModal();
            
            // Check if user has already completed survey
            const hasCompletedSurvey = await checkUserSurveyStatus(result.user.userId);
            
            if (hasCompletedSurvey) {
                // User has completed survey - go directly to dashboard
                console.log('User has completed survey - showing dashboard');
                updateSidebarWithUser();
                showMainDashboard();
            } else {
                // User hasn't completed survey - show survey screens
                console.log('User has not completed survey - starting survey');
                startSurvey();
            }
        } else {
            showAuthError(result.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Network error. Please check your connection and try again.';
        
        // Check if it's a connection error
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
            errorMessage = 'Cannot connect to server. Please make sure the backend server is running on http://localhost:3000';
        }
        
        showAuthError(errorMessage);
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }
}

// Handle signup
async function handleSignup() {
    const name = document.getElementById('signupName')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const signupBtn = document.getElementById('signupBtn');
    const errorEl = document.getElementById('signupError');
    
    if (!name || !email || !password) {
        showAuthError('Please fill in all fields', true);
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters', true);
        return;
    }
    
    if (errorEl) errorEl.classList.add('hidden');
    if (signupBtn) {
        signupBtn.disabled = true;
        signupBtn.textContent = 'Creating account...';
    }
    
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Signup failed. Please try again.';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (e) {
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            showAuthError(errorMessage, true);
            return;
        }
        
        const result = await response.json();
        
        if (result.success && result.token) {
            // Clear any error messages before proceeding
            clearSignupError();
            
            // Save token and user data
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));
            
            // Update survey data with user info
            surveyData.userName = result.user.name;
            surveyData.userId = result.user.userId;
            
            // Hide auth modal and start survey
            hideAuthModal();
            
            // Start survey screens
            startSurvey();
            
            console.log('Signup successful - starting survey');
        } else {
            showAuthError(result.message || 'Signup failed. Please try again.', true);
        }
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Network error. Please check your connection and try again.';
        
        // Check if it's a connection error
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
            errorMessage = 'Cannot connect to server. Please make sure the backend server is running on http://localhost:3000';
        }
        
        showAuthError(errorMessage, true);
    } finally {
        if (signupBtn) {
            signupBtn.disabled = false;
            signupBtn.textContent = 'Create Account';
        }
    }
}

// Helper function to clear login error
function clearLoginError() {
    const loginError = document.getElementById('authError');
    if (loginError) {
        loginError.classList.add('hidden');
        loginError.textContent = '';
    }
}

// Helper function to clear signup error
function clearSignupError() {
    const signupError = document.getElementById('signupError');
    if (signupError) {
        signupError.classList.add('hidden');
        signupError.textContent = '';
    }
}

// Initialize authentication event listeners
function initializeAuth() {
    // Login form
    const loginBtn = document.getElementById('loginBtn');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    // Clear error when user types in login fields
    if (loginEmail) {
        loginEmail.addEventListener('input', clearLoginError);
        loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('input', clearLoginError);
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    // Signup form
    const signupBtn = document.getElementById('signupBtn');
    const signupName = document.getElementById('signupName');
    const signupEmail = document.getElementById('signupEmail');
    const signupPassword = document.getElementById('signupPassword');
    
    if (signupBtn) {
        signupBtn.addEventListener('click', handleSignup);
    }
    
    // Clear error when user types in signup fields
    if (signupName) {
        signupName.addEventListener('input', clearSignupError);
    }
    
    if (signupEmail) {
        signupEmail.addEventListener('input', clearSignupError);
    }
    
    if (signupPassword) {
        signupPassword.addEventListener('input', clearSignupError);
        signupPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSignup();
            }
        });
    }
    
    // Form switching (using buttons now)
    const showSignupBtn = document.getElementById('showSignup');
    const showLoginBtn = document.getElementById('showLogin');
    
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSignupForm();
        });
    }
    
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });
    }
}

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}

// ==================== Chat System Functions ====================

let chatMessages = [];
let chatRefreshInterval = null;
let chatInitialized = false;
let isSendingMessage = false; // Prevent sending duplicate messages
const CHAT_REFRESH_INTERVAL = 3000; // Refresh every 3 seconds

// Load chat messages from backend
async function loadChatMessages() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return; // User not authenticated
        }

        const response = await fetch(`${BACKEND_BASE_URL}/api/chat/messages`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error('Error loading chat messages:', response.status);
            return;
        }

        const result = await response.json();
        
        if (result.success && result.messages) {
            // Deduplicate messages by messageId
            const messageMap = new Map();
            result.messages.forEach(msg => {
                if (msg.messageId && !messageMap.has(msg.messageId)) {
                    messageMap.set(msg.messageId, msg);
                }
            });
            chatMessages = Array.from(messageMap.values());
            renderChatMessages();
        }
    } catch (error) {
        console.error('Error loading chat messages:', error);
    }
}

// Render chat messages in the UI
function renderChatMessages() {
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (!chatMessagesContainer) return;

    if (chatMessages.length === 0) {
        chatMessagesContainer.innerHTML = '<div class="chat-loading">No messages yet. Be the first to say something!</div>';
        return;
    }

    chatMessagesContainer.innerHTML = '';

    chatMessages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        
        const timeStr = formatChatTime(msg.timestamp);
        const isCurrentUser = msg.userId === surveyData.userId;
        
        messageDiv.innerHTML = `
            <div class="chat-message-header">
                <span class="chat-message-user">${escapeHtml(msg.userName)}</span>
                <span class="chat-message-time">${timeStr}</span>
            </div>
            <div class="chat-message-text">${escapeHtml(msg.message)}</div>
        `;
        
        chatMessagesContainer.appendChild(messageDiv);
    });

    // Scroll to bottom to show latest messages
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// Format timestamp for chat messages
function formatChatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send a chat message
async function sendChatMessage() {
    // Prevent sending multiple messages at once
    if (isSendingMessage) {
        return;
    }
    
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    
    if (!chatInput || !sendBtn) return;
    
    const message = chatInput.value.trim();
    
    if (!message) {
        return; // Don't send empty messages
    }
    
    if (message.length > 500) {
        alert('Message is too long (max 500 characters)');
        return;
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('You must be logged in to send messages');
        return;
    }
    
    // Set sending flag
    isSendingMessage = true;
    
    // Disable input and button while sending
    chatInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/chat/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            let errorMessage = 'Failed to send message';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to send message');
        }
        
        // Clear input
        chatInput.value = '';
        
        // Small delay before reloading to ensure message is saved in DB
        // This prevents race conditions with auto-refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload messages to show the new one
        await loadChatMessages();
        
    } catch (error) {
        console.error('Error sending message:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        
        // Show more specific error message
        let errorMessage = 'Error sending message. Please try again.';
        if (error.message) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = 'Cannot connect to server. Please make sure the backend is running on http://localhost:3000';
            } else if (error.message.includes('Invalid or expired token') || error.message.includes('Authentication')) {
                errorMessage = 'Your session has expired. Please log in again.';
            } else {
                errorMessage = error.message;
            }
        }
        
        alert(errorMessage);
    } finally {
        // Reset sending flag
        isSendingMessage = false;
        
        // Re-enable input and button
        chatInput.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
        chatInput.focus(); // Refocus input
    }
}

// Start auto-refresh for chat messages
function startChatAutoRefresh() {
    // Clear any existing interval
    if (chatRefreshInterval) {
        clearInterval(chatRefreshInterval);
    }
    
    // Load messages immediately
    loadChatMessages();
    
    // Set up interval to refresh messages
    chatRefreshInterval = setInterval(() => {
        loadChatMessages();
    }, CHAT_REFRESH_INTERVAL);
}

// Stop auto-refresh for chat messages
function stopChatAutoRefresh() {
    if (chatRefreshInterval) {
        clearInterval(chatRefreshInterval);
        chatRefreshInterval = null;
    }
}

// Initialize chat system (only once)
function initializeChat() {
    // Prevent duplicate initialization
    if (chatInitialized) {
        return;
    }
    
    const chatWindow = document.getElementById('chatWindow');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    
    if (!chatWindow || !chatInput || !sendBtn) {
        // Elements not ready, try again later
        setTimeout(initializeChat, 500);
        return;
    }
    
    // Mark as initialized
    chatInitialized = true;
    
    // Create handler functions that can be removed if needed
    const chatWindowClickHandler = (e) => {
        // Don't focus if clicking directly on input or send button (they handle their own focus)
        if (e.target === chatInput || e.target === sendBtn || e.target.closest('.chat-input-container')) {
            return;
        }
        // Focus input when clicking anywhere else in chat window
        if (chatInput) {
            e.preventDefault();
            chatInput.focus();
        }
    };
    
    const chatInputKeypressHandler = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    };
    
    const sendBtnClickHandler = () => {
        sendChatMessage();
    };
    
    // Store handlers for potential removal (though we prevent re-initialization)
    chatWindow.chatWindowClickHandler = chatWindowClickHandler;
    chatInput.chatInputKeypressHandler = chatInputKeypressHandler;
    sendBtn.sendBtnClickHandler = sendBtnClickHandler;
    
    // Click-to-focus: Click anywhere in chat window to focus input
    chatWindow.addEventListener('click', chatWindowClickHandler);
    
    // Send message on Enter key
    chatInput.addEventListener('keypress', chatInputKeypressHandler);
    
    // Send message on button click
    sendBtn.addEventListener('click', sendBtnClickHandler);
    
    // Start auto-refresh if user is authenticated
    const token = localStorage.getItem('authToken');
    if (token) {
        startChatAutoRefresh();
    }
}

// Reset chat initialization (for logout)
function resetChatInitialization() {
    chatInitialized = false;
    isSendingMessage = false;
    chatMessages = [];
    stopChatAutoRefresh();
}

// ==================== Fullscreen Chat Functions ====================

let isFullscreenChatActive = false;

// Enter fullscreen chat mode
function enterFullscreenChat() {
    const mainScreen = document.getElementById('mainScreen');
    const fullscreenChatContainer = document.getElementById('fullscreenChatContainer');
    const chatWindow = document.getElementById('chatWindow');
    
    if (!mainScreen || !fullscreenChatContainer) return;
    
    // Hide main screen and sidebar chat
    if (mainScreen) {
        mainScreen.classList.add('hidden');
    }
    if (chatWindow) {
        chatWindow.style.display = 'none';
    }
    
    // Show fullscreen chat
    fullscreenChatContainer.classList.remove('hidden');
    isFullscreenChatActive = true;
    
    // Load messages into fullscreen chat
    loadFullscreenChatMessages();
    
    // Initialize fullscreen chat input handlers
    initializeFullscreenChatInput();
    
    // Focus the input
    const fullscreenInput = document.getElementById('fullscreenChatInput');
    if (fullscreenInput) {
        setTimeout(() => fullscreenInput.focus(), 100);
    }
}

// Exit fullscreen chat mode
function exitFullscreenChat() {
    const mainScreen = document.getElementById('mainScreen');
    const fullscreenChatContainer = document.getElementById('fullscreenChatContainer');
    const chatWindow = document.getElementById('chatWindow');
    
    if (!fullscreenChatContainer) return;
    
    // Hide fullscreen chat
    fullscreenChatContainer.classList.add('hidden');
    isFullscreenChatActive = false;
    
    // Show main screen and sidebar chat
    if (mainScreen) {
        mainScreen.classList.remove('hidden');
    }
    if (chatWindow) {
        chatWindow.style.display = 'flex';
    }
    
    // Reload sidebar chat messages
    if (chatInitialized) {
        loadChatMessages();
    }
}

// Load messages into fullscreen chat
async function loadFullscreenChatMessages() {
    const fullscreenMessagesContainer = document.getElementById('fullscreenChatMessages');
    if (!fullscreenMessagesContainer) return;
    
    // Use the same loadChatMessages logic but render to fullscreen container
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            fullscreenMessagesContainer.innerHTML = '<div class="chat-loading">Please log in to view messages</div>';
            return;
        }

        const response = await fetch(`${BACKEND_BASE_URL}/api/chat/messages`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            fullscreenMessagesContainer.innerHTML = '<div class="chat-loading">Error loading messages</div>';
            return;
        }

        const result = await response.json();
        
        if (result.success && result.messages) {
            // Deduplicate messages by messageId
            const messageMap = new Map();
            result.messages.forEach(msg => {
                if (msg.messageId && !messageMap.has(msg.messageId)) {
                    messageMap.set(msg.messageId, msg);
                }
            });
            const messages = Array.from(messageMap.values());
            
            // Render messages
            if (messages.length === 0) {
                fullscreenMessagesContainer.innerHTML = '<div class="chat-loading">No messages yet. Be the first to say something!</div>';
                return;
            }

            fullscreenMessagesContainer.innerHTML = '';

            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'chat-message';
                
                const timeStr = formatChatTime(msg.timestamp);
                
                messageDiv.innerHTML = `
                    <div class="chat-message-header">
                        <span class="chat-message-user">${escapeHtml(msg.userName)}</span>
                        <span class="chat-message-time">${timeStr}</span>
                    </div>
                    <div class="chat-message-text">${escapeHtml(msg.message)}</div>
                `;
                
                fullscreenMessagesContainer.appendChild(messageDiv);
            });

            // Scroll to bottom
            fullscreenMessagesContainer.scrollTop = fullscreenMessagesContainer.scrollHeight;
        }
    } catch (error) {
        console.error('Error loading fullscreen chat messages:', error);
        fullscreenMessagesContainer.innerHTML = '<div class="chat-loading">Error loading messages</div>';
    }
}

// Send message from fullscreen chat
async function sendFullscreenChatMessage() {
    const fullscreenInput = document.getElementById('fullscreenChatInput');
    const fullscreenSendBtn = document.getElementById('fullscreenChatSendBtn');
    
    if (!fullscreenInput || !fullscreenSendBtn) return;
    
    const message = fullscreenInput.value.trim();
    
    if (!message || isSendingMessage) {
        return;
    }
    
    if (message.length > 500) {
        alert('Message is too long (max 500 characters)');
        return;
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('You must be logged in to send messages');
        return;
    }
    
    isSendingMessage = true;
    fullscreenInput.disabled = true;
    fullscreenSendBtn.disabled = true;
    fullscreenSendBtn.textContent = 'Sending...';
    
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/chat/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            let errorMessage = 'Failed to send message';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to send message');
        }
        
        fullscreenInput.value = '';
        
        // Reload messages
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadFullscreenChatMessages();
        // Also reload sidebar if visible
        if (!isFullscreenChatActive) {
            await loadChatMessages();
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert(error.message || 'Error sending message. Please try again.');
    } finally {
        isSendingMessage = false;
        fullscreenInput.disabled = false;
        fullscreenSendBtn.disabled = false;
        fullscreenSendBtn.textContent = 'Send';
        fullscreenInput.focus();
    }
}

// Initialize fullscreen chat input handlers
function initializeFullscreenChatInput() {
    const fullscreenInput = document.getElementById('fullscreenChatInput');
    const fullscreenSendBtn = document.getElementById('fullscreenChatSendBtn');
    const fullscreenCloseBtn = document.getElementById('fullscreenChatCloseBtn');
    
    if (fullscreenInput) {
        // Remove existing listeners to prevent duplicates
        const newInput = fullscreenInput.cloneNode(true);
        fullscreenInput.parentNode.replaceChild(newInput, fullscreenInput);
        
        // Add Enter key handler
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendFullscreenChatMessage();
            }
        });
    }
    
    if (fullscreenSendBtn) {
        // Remove existing listeners
        const newBtn = fullscreenSendBtn.cloneNode(true);
        fullscreenSendBtn.parentNode.replaceChild(newBtn, fullscreenSendBtn);
        newBtn.addEventListener('click', sendFullscreenChatMessage);
    }
    
    if (fullscreenCloseBtn) {
        // Remove existing listeners
        const newCloseBtn = fullscreenCloseBtn.cloneNode(true);
        fullscreenCloseBtn.parentNode.replaceChild(newCloseBtn, fullscreenCloseBtn);
        newCloseBtn.addEventListener('click', exitFullscreenChat);
    }
}

// Wire up fullscreen button click handler
function initializeFullscreenButton() {
    const fullscreenBtn = document.getElementById('chatFullscreenBtn');
    
    if (fullscreenBtn) {
        // Remove existing listeners to prevent duplicates
        const newBtn = fullscreenBtn.cloneNode(true);
        fullscreenBtn.parentNode.replaceChild(newBtn, fullscreenBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            enterFullscreenChat();
        });
    }
}

// Initialize fullscreen button when chat is initialized
const originalInitializeChat = initializeChat;
initializeChat = function() {
    originalInitializeChat();
    setTimeout(initializeFullscreenButton, 100);
};

// Also initialize chat on page load if user is already logged in and dashboard is visible
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const mainContent = document.getElementById('mainContent');
        if (mainContent && !mainContent.classList.contains('hidden')) {
            setTimeout(initializeChat, 500);
        }
    });
} else {
    const mainContent = document.getElementById('mainContent');
    if (mainContent && !mainContent.classList.contains('hidden')) {
        setTimeout(initializeChat, 500);
    }
}
