// drkhan.js – Chinese Learning Assistant v3.0 (Full English UI + 4 New Features)
(function() {
    const STORAGE_KEY = 'drkhan_conversations';
    const FLASHCARD_KEY = 'drkhan_flashcards';
    const STREAK_KEY = 'drkhan_streak';
    const LAST_ADD_KEY = 'drkhan_last_flashcard_add';
    const MAX_MESSAGE_LENGTH = 1000;
    const MAX_HISTORY_MESSAGES = 20;

    let conversations = [];
    let currentConvId = null;
    let isWaiting = false;
    let pinnedMessages = [];
    let currentSearch = '';
    let fontSize = 16;
    let panelDarkMode = false;
    let personality = 'tutor';
    let hskLevel = 3;
    let sidebarOpen = true;
    let currentModelId = null;
    let flashcards = [];
    let streak = 0;
    let lastActiveDate = '';
    let lastFlashcardAdd = '';

    // ---------- TIPS (30+ English tips) ----------
    const TIPS = [
        "Tip: 的 (de) is for possession (my book = 我的书). 地 (de) turns adjectives into adverbs (quickly = 快地). 得 (de) shows degree (well done = 做得好).",
        "Tip: Measure words are essential! Use 个 (gè) for general objects, 本 (běn) for books, 只 (zhī) for animals.",
        "Tip: 不 (bù) is for present/future negation. 没 (méi) is for past negation or 'have not'.",
        "Tip: 了 (le) shows completed action OR a change of state. Context is key!",
        "Tip: 把 (bǎ) structure is used to emphasize the object: 我把书放在桌子上 (I put the book on the table).",
        "Tip: Learn radicals! 氵 (water) appears in 河, 海, 洗. 木 (wood) appears in 树, 林, 材.",
        "Tip: 的 (de) can also form adjectives: 漂亮的 (beautiful) or 红色的 (red).",
        "Tip: 是 (shì) is NOT used with adjectives. Say 我很高兴 (I am happy), NOT 我是高兴.",
        "Tip: 有 (yǒu) means 'have' or 'there is'. 有没有 (yǒu méi yǒu) means 'is there?' or 'do you have?'.",
        "Tip: Verb doubling (看看, 听听) softens the tone: 你看看 (take a look).",
        "Tip: 一边…一边… (yībiān…yībiān…) means 'doing two things at once': 一边听音乐一边学习 (study while listening to music).",
        "Tip: 除了…以外 (chúle…yǐwài) means 'except for' or 'in addition to'.",
        "Tip: 越来越 (yuèláiyuè) means 'more and more': 越来越热 (getting hotter).",
        "Tip: 一…就… (yī…jiù…) means 'as soon as': 一到家就睡觉 (sleep as soon as I get home).",
        "Tip: 都 (dōu) means 'all'. 也 (yě) means 'also'. 还 (hái) means 'still' or 'also'.",
        "Tip: 能 (néng) = physical ability. 可以 (kěyǐ) = permission. 会 (huì) = learned skill or future will.",
        "Tip: 想 (xiǎng) = want or miss. 要 (yào) = want/need or future 'will'.",
        "Tip: 从 (cóng) = from. 离 (lí) = away from. 到 (dào) = to. Use these for directions.",
        "Tip: 为了 (wèile) = for the purpose of. 因为 (yīnwèi) = because. 所以 (suǒyǐ) = therefore.",
        "Tip: 虽然 (suīrán) = although. 但是 (dànshì) = but. They often go together.",
        "Tip: 如果 (rúguǒ) = if. 就 (jiù) = then. 如果明天不下雨，我们就去公园 (If it doesn't rain tomorrow, we'll go to the park).",
        "Tip: 被 (bèi) is for passive voice: 书被拿走了 (The book was taken away).",
        "Tip: 给 (gěi) means 'give' or acts as a preposition: 我给你打电话 (I will call you).",
        "Tip: 让 (ràng) = let / make someone do something: 让我看看 (Let me see).",
        "Tip: 对 (duì) = to/towards, or correct. 我对汉语感兴趣 (I am interested in Chinese).",
        "Tip: 跟 (gēn) = with / follow. 我跟朋友一起去 (I go with friends).",
        "Tip: 在 (zài) can be 'at/in/on' (location) or an action in progress (正在).",
        "Tip: 着 (zhe) shows a continuous state: 站着 (standing), 笑着 (laughing).",
        "Tip: 过 (guò) shows experience in the past: 我去过北京 (I have been to Beijing).",
        "Tip: 吧 (ba) softens a suggestion: 我们去吃饭吧 (Let's go eat). 吗 (ma) is for yes/no questions.",
        "Tip: 口 (kǒu) is the measure word for family members: 三口人 (3 people in a family)."
    ];

    function getDailyTip() {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        return TIPS[dayOfYear % TIPS.length];
    }

    // ---------- Streak & Flashcard tracking ----------
    function updateStreak() {
        const today = new Date().toDateString();
        if (lastActiveDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastActiveDate === yesterday.toDateString()) { streak += 1; }
            else { streak = 1; }
            lastActiveDate = today;
            localStorage.setItem(STREAK_KEY, JSON.stringify({ streak, lastActiveDate }));
            checkStreakCelebration();
        }
    }

    function loadStreak() {
        try {
            const data = JSON.parse(localStorage.getItem(STREAK_KEY));
            if (data) {
                streak = data.streak || 0;
                lastActiveDate = data.lastActiveDate || '';
                const today = new Date().toDateString();
                const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                if (lastActiveDate !== today && lastActiveDate !== yesterday.toDateString()) streak = 0;
            }
        } catch(e) { streak = 0; }
    }

    function checkStreakCelebration() {
        if (streak >= 7) {
            // Show confetti-style celebration (CSS emoji burst)
            const celebration = document.createElement('div');
            celebration.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none; z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                font-size: 4rem; animation: drkhanConfetti 2s ease-out forwards;
            `;
            celebration.innerHTML = '🎉🔥 Amazing! ' + streak + '-day streak! Keep it up! 🔥🎉';
            // Inject keyframe if not exists
            if (!document.getElementById('drkhan-confetti-style')) {
                const style = document.createElement('style');
                style.id = 'drkhan-confetti-style';
                style.textContent = `
                    @keyframes drkhanConfetti {
                        0% { opacity: 0; transform: scale(0.5) rotate(0deg); }
                        20% { opacity: 1; transform: scale(1.2) rotate(5deg); }
                        100% { opacity: 0; transform: scale(1.5) rotate(10deg) translateY(-80px); }
                    }
                `;
                document.head.appendChild(style);
            }
            document.body.appendChild(celebration);
            setTimeout(() => celebration.remove(), 2500);
        }
    }

    function loadFlashcards() {
        try { flashcards = JSON.parse(localStorage.getItem(FLASHCARD_KEY)) || []; } catch(e) { flashcards = []; }
        lastFlashcardAdd = localStorage.getItem(LAST_ADD_KEY) || '';
    }
    function saveFlashcards() { 
        localStorage.setItem(FLASHCARD_KEY, JSON.stringify(flashcards)); 
        // Update last add time if adding new cards
        renderSidebar(); 
    }
    function addFlashcard(word, context) {
        if (!word || word.trim().length === 0) return;
        const trimmed = word.trim();
        if (!flashcards.includes(trimmed)) {
            flashcards.push(trimmed);
            localStorage.setItem(LAST_ADD_KEY, new Date().toISOString());
            lastFlashcardAdd = localStorage.getItem(LAST_ADD_KEY);
            saveFlashcards();
            showToast('✅ Added "' + trimmed + '" to flashcards');
        } else {
            showToast('"' + trimmed + '" already in flashcards');
        }
    }
    function removeFlashcard(word) {
        flashcards = flashcards.filter(w => w !== word);
        saveFlashcards();
        renderSidebar();
    }

    function daysSinceLastFlashcard() {
        if (!lastFlashcardAdd) return Infinity;
        const last = new Date(lastFlashcardAdd);
        const now = new Date();
        const diff = (now - last) / (1000 * 60 * 60 * 24);
        return diff;
    }

    // ---------- Core helpers (unchanged) ----------
    function extractPuterMessage(raw) {
        if (typeof raw === 'string') {
            try { return JSON.parse(raw).message?.content || raw; } catch { return raw; }
        }
        return raw?.message?.content || raw?.content || JSON.stringify(raw);
    }
    function formatText(text) {
        if (!text) return text;
        let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }
    function truncateText(text, maxLen) {
        if (text.length <= maxLen) return text;
        return text.substring(0, maxLen) + '…';
    }
    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'drkhan-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    function loadConversations() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                conversations = JSON.parse(stored);
                conversations.forEach(c => {
                    if (!c.id) c.id = Date.now() + Math.random();
                    if (!c.name) c.name = 'Chat';
                    if (!c.messages) c.messages = [];
                });
            } catch(e) { conversations = []; }
        }
        if (conversations.length === 0) {
            conversations.push({
                id: Date.now(),
                name: 'New Chat',
                messages: [{ role: 'assistant', content: '👋 Hi! I\'m Dr. Khan, your Chinese learning assistant. Ask me about vocabulary, grammar, or anything about learning Chinese!', timestamp: Date.now() }]
            });
        }
        if (!currentConvId) currentConvId = conversations[0].id;
        const storedPinned = localStorage.getItem('drkhan_pinned');
        if (storedPinned) pinnedMessages = JSON.parse(storedPinned);
    }
    function saveConversations() { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); }
    function getCurrentConv() { return conversations.find(c => c.id === currentConvId); }
    function addMessage(role, content) {
        const conv = getCurrentConv();
        if (!conv) return;
        conv.messages.push({ role, content, timestamp: Date.now() });
        saveConversations();
        renderMessages();
        renderSidebar();
        updateStats();
        if (role === 'user') { updateStreak(); renderSidebar(); }
    }
    function deleteMessage(index) {
        const conv = getCurrentConv();
        if (!conv) return;
        pinnedMessages = pinnedMessages.filter(p => p.convId !== currentConvId || p.idx !== index);
        conv.messages.splice(index, 1);
        saveConversations();
        savePinned();
        renderMessages();
        renderSidebar();
        updateStats();
    }
    function editUserMessage(index, newContent) {
        if (!newContent) return;
        const conv = getCurrentConv();
        if (!conv || conv.messages[index]?.role !== 'user') return;
        conv.messages[index].content = newContent;
        if (index + 1 < conv.messages.length && conv.messages[index+1].role === 'assistant') {
            conv.messages.splice(index+1, 1);
        }
        saveConversations();
        renderMessages();
        sendMessage(newContent, true);
    }
    function togglePinMessage(idx) {
        const conv = getCurrentConv();
        const msg = conv.messages[idx];
        if (!msg || msg.role !== 'assistant') return;
        const existingIdx = pinnedMessages.findIndex(p => p.convId === currentConvId && p.idx === idx);
        if (existingIdx !== -1) pinnedMessages.splice(existingIdx, 1);
        else pinnedMessages.push({ convId: currentConvId, idx, content: msg.content });
        savePinned();
        renderSidebar();
        renderMessages();
    }
    function savePinned() { localStorage.setItem('drkhan_pinned', JSON.stringify(pinnedMessages)); }
    function isPinned(idx) { return pinnedMessages.some(p => p.convId === currentConvId && p.idx === idx); }

    // ---------- Sidebar (FULL ENGLISH UI) ----------
    function renderSidebar() {
        const sidebar = document.getElementById('drkhan-sidebar');
        if (!sidebar) return;
        let html = '<div class="sidebar-section"><div class="section-title">📋 Chats</div><div class="conv-list">';
        conversations.forEach(c => {
            const active = c.id === currentConvId ? 'active' : '';
            html += '<div class="conv-item ' + active + '" data-id="' + c.id + '" ondblclick="window.renameConversationPrompt(' + c.id + ')">';
            html += '<span class="conv-name">' + escapeHtml(c.name) + '</span>';
            html += '<span class="conv-actions"><button class="icon-btn delete-conv" data-id="' + c.id + '" title="Delete">🗑️</button></span>';
            html += '</div>';
        });
        html += '</div><button class="icon-btn new-chat-sidebar" id="new-chat-sidebar">➕ New Chat</button></div>';

        html += '<div class="sidebar-section pinned-section-sidebar"><div class="section-title">📌 Saved Notes</div>';
        const pinnedForConv = pinnedMessages.filter(p => p.convId === currentConvId);
        if (pinnedForConv.length === 0) html += '<div class="muted">No saved notes</div>';
        else {
            pinnedForConv.forEach(p => {
                const snippet = truncateText(p.content, 60);
                html += '<div class="pinned-note-item" onclick="window.scrollToMessage(' + p.idx + ')">📌 ' + escapeHtml(snippet) + '</div>';
            });
        }
        html += '</div>';

        html += '<div class="sidebar-section flashcards-section"><div class="section-title">📇 Word Cards (' + flashcards.length + ')</div>';
        if (flashcards.length === 0) html += '<div class="muted">No word cards yet – click 📇 on messages to add</div>';
        else {
            flashcards.forEach(word => {
                html += '<div class="flashcard-item">';
                html += '<span class="flashcard-word">' + escapeHtml(word) + '</span>';
                html += '<button class="icon-btn flashcard-ask" data-word="' + escapeHtml(word) + '" title="Ask Dr. Khan">💬</button>';
                html += '<button class="icon-btn flashcard-remove" data-word="' + escapeHtml(word) + '" title="Remove">✕</button>';
                html += '</div>';
            });
        }
        html += '</div>';

        html += '<div class="sidebar-section settings-section"><div class="section-title">⚙️ Settings</div>';
        html += '<div class="setting-row"><label>Tutor Mode</label><select id="sidebar-personality">';
        html += '<option value="tutor" ' + (personality === 'tutor' ? 'selected' : '') + '>📘 All‑round Tutor</option>';
        html += '<option value="grammar" ' + (personality === 'grammar' ? 'selected' : '') + '>📝 Grammar Focus</option>';
        html += '<option value="vocab" ' + (personality === 'vocab' ? 'selected' : '') + '>📚 Vocabulary Builder</option>';
        html += '<option value="exam" ' + (personality === 'exam' ? 'selected' : '') + '>🎯 Exam Prep</option>';
        html += '</select></div>';
        html += '<div class="setting-row"><label>HSK Level</label><select id="sidebar-hsk">';
        for (let i = 1; i <= 6; i++) {
            html += '<option value="' + i + '" ' + (hskLevel === i ? 'selected' : '') + '>HSK ' + i + '</option>';
        }
        html += '</select></div>';
        html += '<div class="setting-row"><span>Dark Mode</span><label class="toggle-switch"><input type="checkbox" id="sidebar-dark-toggle" ' + (panelDarkMode ? 'checked' : '') + '><span class="slider"></span></label></div>';
        html += '<div class="setting-row"><span>Font Size</span><div class="font-controls"><button id="font-minus">A-</button><button id="font-plus">A+</button></div></div>';
        html += '</div>';

        sidebar.innerHTML = html;

        // Event listeners
        document.querySelectorAll('.conv-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                if (e.target.closest('.delete-conv')) return;
                const id = Number(this.dataset.id);
                if (id !== currentConvId) {
                    currentConvId = id;
                    saveConversations();
                    renderAll();
                }
            });
        });
        document.querySelectorAll('.delete-conv').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = Number(this.dataset.id);
                deleteConversation(id);
            });
        });
        document.getElementById('new-chat-sidebar')?.addEventListener('click', function(e) {
            e.stopPropagation();
            newConversation();
        });
        document.getElementById('sidebar-personality')?.addEventListener('change', function(e) {
            personality = e.target.value;
        });
        document.getElementById('sidebar-hsk')?.addEventListener('change', function(e) {
            hskLevel = parseInt(e.target.value);
        });
        document.getElementById('sidebar-dark-toggle')?.addEventListener('change', togglePanelDarkMode);
        document.getElementById('font-minus')?.addEventListener('click', function(e) {
            e.stopPropagation();
            setFontSize(-2);
        });
        document.getElementById('font-plus')?.addEventListener('click', function(e) {
            e.stopPropagation();
            setFontSize(2);
        });

        document.querySelectorAll('.flashcard-ask').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const word = this.dataset.word;
                if (word) {
                    document.getElementById('drkhan-input').value = 'Explain the usage of "' + word + '"';
                    sendMessage();
                }
            });
        });
        document.querySelectorAll('.flashcard-remove').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const word = this.dataset.word;
                if (word) removeFlashcard(word);
            });
        });
    }

    // ---------- Render functions (English UI) ----------
    function renderAll() {
        renderSidebar();
        renderMessages();
        updateStats();
        updateContextSuggestions();
        updateWordOfDay();
        updateBubbleReminders();
    }

    function renderMessages() {
        const msgsDiv = document.getElementById('drkhan-messages');
        if (!msgsDiv) return;
        const conv = getCurrentConv();
        if (!conv) return;
        let filtered = conv.messages;
        if (currentSearch) filtered = conv.messages.filter(m => m.content.toLowerCase().includes(currentSearch));
        let html = '';
        filtered.forEach((msg, filteredIdx) => {
            const originalIdx = conv.messages.indexOf(msg);
            const isUser = msg.role === 'user';
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const avatar = isUser ? '👤' : '📘';
            const fullContent = msg.content;
            const isLong = fullContent.length > 400;
            const contentHtml = isLong ? truncateText(fullContent, 400) : formatText(fullContent);
            const pinned = isPinned(originalIdx);
            html += '<div class="message ' + msg.role + '" data-idx="' + originalIdx + '">';
            html += '<div class="avatar">' + avatar + '</div>';
            html += '<div class="bubble-wrapper">';
            html += '<div class="message-bubble" style="font-size:' + fontSize + 'px">';
            html += '<div class="message-content ' + (isLong ? 'truncated' : '') + '" id="msg-content-' + originalIdx + '">' + contentHtml + '</div>';
            if (isLong) html += '<button class="read-more" data-idx="' + originalIdx + '">Read more</button>';
            html += '</div>';
            html += '<div class="message-actions">';
            if (!isUser) {
                html += '<button class="icon-btn pin-btn" data-idx="' + originalIdx + '" title="' + (pinned ? 'Unpin' : 'Pin') + '">' + (pinned ? '📌' : '📍') + '</button>';
                html += '<button class="icon-btn flashcard-add-btn" data-msgidx="' + originalIdx + '" title="Add to word cards">📇</button>';
            }
            html += '<button class="icon-btn copy-btn" data-idx="' + originalIdx + '" title="Copy">📋</button>';
            if (isUser) html += '<button class="icon-btn edit-btn" data-idx="' + originalIdx + '" title="Edit">✏️</button>';
            else html += '<button class="icon-btn quote-btn" data-idx="' + originalIdx + '" title="Quote reply">💬</button>';
            html += '<button class="icon-btn delete-btn" data-idx="' + originalIdx + '" title="Delete">🗑️</button>';
            html += '</div>';
            html += '<div class="timestamp">' + time + '</div>';
            html += '</div></div>';
        });
        if (isWaiting) {
            html += '<div class="message assistant typing"><div class="avatar">📘</div><div class="bubble-wrapper"><div class="message-bubble typing-indicator"><span>.</span><span>.</span><span>.</span></div></div></div>';
        }
        msgsDiv.innerHTML = html;

        msgsDiv.querySelectorAll('.read-more').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.idx);
                window.toggleReadMore(idx);
            });
        });
        msgsDiv.querySelectorAll('.pin-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                window.togglePinMessage(parseInt(this.dataset.idx));
            });
        });
        msgsDiv.querySelectorAll('.flashcard-add-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.msgidx);
                const conv = getCurrentConv();
                if (!conv || !conv.messages[idx]) return;
                const msg = conv.messages[idx].content;
                const words = msg.match(/[\u4e00-\u9fa5]{2,}/g);
                if (words && words.length > 0) {
                    const word = prompt('Add word to cards (select or type):', words[0]);
                    if (word && word.trim()) addFlashcard(word.trim(), msg);
                } else {
                    const word = prompt('Enter the word to add:');
                    if (word && word.trim()) addFlashcard(word.trim(), msg);
                }
            });
        });
        msgsDiv.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                window.copyMessageContent(parseInt(this.dataset.idx));
            });
        });
        msgsDiv.querySelectorAll('.quote-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                window.quoteMessage(parseInt(this.dataset.idx));
            });
        });
        msgsDiv.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                window.deleteMessage(parseInt(this.dataset.idx));
            });
        });
        msgsDiv.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.idx);
                const conv = getCurrentConv();
                if (!conv || !conv.messages[idx]) return;
                const newContent = prompt('Edit your message:', conv.messages[idx].content);
                if (newContent && newContent.trim()) {
                    window.editUserMessage(idx, newContent.trim());
                }
            });
        });

        msgsDiv.scrollTop = msgsDiv.scrollHeight;
    }

    window.toggleReadMore = function(idx) {
        const conv = getCurrentConv();
        if (!conv || !conv.messages[idx]) return;
        const contentEl = document.getElementById('msg-content-' + idx);
        if (!contentEl) return;
        if (contentEl.classList.contains('truncated')) {
            contentEl.innerHTML = formatText(conv.messages[idx].content);
            contentEl.classList.remove('truncated');
        } else {
            contentEl.innerHTML = truncateText(conv.messages[idx].content, 400);
            contentEl.classList.add('truncated');
        }
    };

    function updateStats() {
        const conv = getCurrentConv();
        if (!conv) return;
        const msgCount = conv.messages.length;
        const wordCount = conv.messages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
        const statsEl = document.getElementById('drkhan-stats');
        if (statsEl) statsEl.innerText = msgCount + ' msgs · ~' + wordCount + ' words · 🔥 ' + streak + 'd streak';
    }

    function updateContextSuggestions() {
        const container = document.getElementById('suggestions');
        if (!container) return;
        const allSuggestions = [
            'How to use "把" (bǎ) structure?',
            'Difference between "漂亮" and "美丽"',
            'Correct this: "我昨天去图书馆了。"',
            'How to remember "图书馆" (túshūguǎn)?',
            'Usage of "虽然...但是..."',
            'Give me an HSK4 example sentence',
        ];
        container.innerHTML = allSuggestions.slice(0,5).map(function(s) {
            return '<div class="suggestion-chip" data-question="' + escapeHtml(s) + '">📖 ' + escapeHtml(s) + '</div>';
        }).join('');
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', function(e) {
                e.stopPropagation();
                const q = this.getAttribute('data-question');
                if (q) {
                    document.getElementById('drkhan-input').value = q;
                    sendMessage(q);
                }
            });
        });
    }

    // ---------- Word of the Day (English label) ----------
    let wordOfDay = '', wordOfDayMeaning = '';
    function updateWordOfDay() {
        const wodEl = document.getElementById('word-of-day');
        if (!wodEl) return;
        const words = [
            { word: '图书馆', meaning: 'library' },
            { word: '老师', meaning: 'teacher' },
            { word: '学习', meaning: 'study' },
            { word: '帮助', meaning: 'help' },
            { word: '朋友', meaning: 'friend' },
            { word: '医院', meaning: 'hospital' },
            { word: '学校', meaning: 'school' },
            { word: '吃饭', meaning: 'eat' },
            { word: '快乐', meaning: 'happy' },
            { word: '天气', meaning: 'weather' },
        ];
        const idx = new Date().getDate() % words.length;
        const chosen = words[idx];
        wordOfDay = chosen.word;
        wordOfDayMeaning = chosen.meaning;
        wodEl.innerHTML = '📖 Word of the Day: <strong>' + chosen.word + '</strong> (' + chosen.meaning + ') <button class="wod-ask">❓</button>';
        wodEl.querySelector('.wod-ask')?.addEventListener('click', function() {
            document.getElementById('drkhan-input').value = 'Explain "' + chosen.word + '" with examples';
            sendMessage();
        });
    }

    // ---------- Bubble Reminders (Daily Tip + Flashcard Reminder) ----------
    function updateBubbleReminders() {
        const bubble = document.querySelector('.drkhan-bubble');
        if (!bubble) return;
        // Remove old reminder label if exists
        const oldReminder = bubble.querySelector('.drkhan-reminder');
        if (oldReminder) oldReminder.remove();

        const reminder = document.createElement('div');
        reminder.className = 'drkhan-reminder';
        reminder.style.cssText = `
            position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%);
            background: rgba(10,41,66,0.95); color: #ffd966;
            padding: 3px 12px; border-radius: 30px; font-size: 0.6rem;
            font-weight: 600; white-space: nowrap; border: 1px solid #ffd966;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            pointer-events: none;
            animation: drkhanPulse 2s infinite ease-in-out;
        `;
        // Add pulse animation if not exists
        if (!document.getElementById('drkhan-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'drkhan-pulse-style';
            style.textContent = `
                @keyframes drkhanPulse {
                    0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
                    50% { opacity: 1; transform: translateX(-50%) scale(1.05); }
                }
            `;
            document.head.appendChild(style);
        }

        // Priority: Flashcard reminder (if >3 days) > Daily Tip
        const daysSince = daysSinceLastFlashcard();
        if (daysSince > 3 && flashcards.length > 0) {
            reminder.textContent = '📇 Add new words!';
        } else {
            const tip = getDailyTip();
            reminder.textContent = '💡 ' + tip.substring(0, 30) + '…';
            // Click on bubble will open chat with full tip (already handled by click)
            // We'll attach a custom click to send the full tip to chat
            const oldClick = bubble._clickHandler;
            if (oldClick) {
                bubble.removeEventListener('click', oldClick);
            }
            const handler = function(e) {
                // Send full tip to chat when bubble is clicked (if it's not already open)
                // We'll check if panel is open; if not, open and send tip.
                const panel = document.querySelector('.drkhan-panel');
                if (panel && panel.style.display !== 'flex') {
                    // Open panel and send tip
                    panel.style.display = 'flex';
                    document.getElementById('drkhan-input').value = 'Daily tip: ' + getDailyTip();
                    sendMessage();
                }
            };
            bubble._clickHandler = handler;
            bubble.addEventListener('click', handler);
        }

        bubble.appendChild(reminder);
    }

    // ---------- Quick Quiz (New Feature) ----------
    function startQuickQuiz() {
        // Generate 5 random HSK questions based on current HSK level
        const wordList = window['HSK' + hskLevel + '_WORDS'];
        if (!wordList || wordList.length === 0) {
            showToast('No word list for HSK ' + hskLevel);
            return;
        }
        const shuffled = [...wordList].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 5);
        let quizText = '🎯 **Quick Quiz (HSK ' + hskLevel + ')**\n\n';
        selected.forEach((w, i) => {
            const options = [w.meaning];
            // Add 3 random wrong options
            const others = wordList.filter(x => x.meaning !== w.meaning).sort(() => Math.random() - 0.5);
            for (let j = 0; j < 3 && j < others.length; j++) {
                if (!options.includes(others[j].meaning)) options.push(others[j].meaning);
            }
            // Shuffle options
            const shuffledOpts = options.sort(() => Math.random() - 0.5);
            const correctLetter = String.fromCharCode(65 + shuffledOpts.indexOf(w.meaning));
            quizText += (i+1) + '. **' + w.word + '**\n';
            shuffledOpts.forEach((opt, idx) => {
                quizText += '   ' + String.fromCharCode(65 + idx) + '. ' + opt + '\n';
            });
            quizText += '   ✅ Answer: ' + correctLetter + '\n\n';
        });
        // Send to chat
        addMessage('user', '🎯 Start Quick Quiz (HSK ' + hskLevel + ')');
        addMessage('assistant', quizText);
    }

    // ---------- Quote / Copy / Speech (unchanged) ----------
    function quoteMessage(idx) {
        const conv = getCurrentConv();
        if (!conv || !conv.messages[idx]) return;
        const msg = conv.messages[idx];
        const quoted = '> ' + msg.content.replace(/\n/g, '\n> ');
        const input = document.getElementById('drkhan-input');
        if (input) {
            input.value = input.value ? input.value + '\n' + quoted : quoted;
            input.focus();
        }
    }
    function copyMessageContent(idx) {
        const conv = getCurrentConv();
        if (!conv) return;
        navigator.clipboard.writeText(conv.messages[idx].content).then(() => showToast('Copied!')).catch(() => showToast('Copy failed'));
    }

    function startPronunciationCheck() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showToast('Your browser does not support speech recognition');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('drkhan-input').value = 'Please evaluate my pronunciation: "' + transcript + '"';
            sendMessage();
        };
        recognition.onerror = function(e) { showToast('Speech error: ' + e.error); };
        recognition.start();
        showToast('🎤 Speak Chinese...');
    }

    // ---------- Model selection & Send message (system prompt in English, but instructs AI to respond in Chinese) ----------
    async function getBestModel() {
        if (currentModelId) return currentModelId;
        try {
            const models = await puter.ai.listModels();
            const preferred = [
                'google/gemini-3.1-flash-lite',
                'google/gemini-2.5-flash-lite-001',
                'google/gemini-2.0-flash-lite-001',
                'gpt-5.4-nano'
            ];
            for (const preferredId of preferred) {
                if (models.some(m => m.id === preferredId)) {
                    currentModelId = preferredId;
                    return currentModelId;
                }
            }
            const geminiModel = models.find(m => m.id.toLowerCase().includes('gemini'));
            if (geminiModel) {
                currentModelId = geminiModel.id;
                return currentModelId;
            }
            if (models.length > 0) {
                currentModelId = models[0].id;
                return currentModelId;
            }
            throw new Error('No chat models available');
        } catch (err) {
            console.warn('Model listing failed, using safe default', err);
            currentModelId = 'google/gemini-3.1-flash-lite';
            return currentModelId;
        }
    }

    async function sendMessage(initialText, isRegenerate) {
        const input = document.getElementById('drkhan-input');
        const text = initialText || (input ? input.value.trim() : '');
        if (!text || isWaiting) return;

        let puterReady = false;
        for (let i = 0; i < 5; i++) {
            if (window.puter && window.puter.ai) { puterReady = true; break; }
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!puterReady) {
            addMessage('assistant', 'Dr. Khan is not ready. Please refresh the page.');
            return;
        }
        if (input) input.value = '';
        if (!isRegenerate) addMessage('user', text);
        isWaiting = true;
        renderMessages();

        let personalityInstruction = '';
        if (personality === 'grammar') personalityInstruction = 'Focus on grammar analysis. Explain sentence structure, particle usage, and common errors. Provide corrected versions.';
        else if (personality === 'vocab') personalityInstruction = 'Expand vocabulary: give synonyms, antonyms, collocations, radicals, and mnemonic tips. Offer example sentences in different contexts.';
        else if (personality === 'exam') personalityInstruction = 'Focus on HSK ' + hskLevel + ' exam preparation. Give high-frequency vocabulary, test-taking strategies, and practice questions. Tailor all content to HSK ' + hskLevel + ' level.';
        else personalityInstruction = 'Act as a friendly Chinese tutor. Explain vocabulary usage, correct mistakes, provide mnemonics, and give contextual examples. Encourage the student and make learning fun.';

        const systemPrompt = `You are a professional Chinese language tutor named Dr. Khan. Your main job is to help students learn Chinese (Mandarin). You only answer questions related to Chinese learning, including vocabulary, grammar, pronunciation, writing, and cultural background.

Current student HSK level: ${hskLevel}.

Guidelines:
- Provide clear, accurate, and useful answers to every question.
- When a student asks about a word, give example sentences in multiple contexts and explain common collocations.
- If a student writes a sentence, check grammar and word choice, point out errors, and provide corrections.
- Provide memory techniques: breaking down characters (radicals), association, synonyms/antonyms.
- Adjust the difficulty of your answers according to the student's HSK level (${hskLevel}).
- Keep a friendly, encouraging tone and make learning fun.

${personalityInstruction}

IMPORTANT: Always respond in Chinese (Mandarin) unless the student explicitly asks for English. Do not translate the student's question to English; answer in Chinese.`;

        const conv = getCurrentConv();
        if (!conv) { isWaiting = false; return; }

        const history = [];
        const messagesToInclude = conv.messages.slice(-MAX_HISTORY_MESSAGES);
        for (const msg of messagesToInclude) {
            if (isRegenerate && msg.role === 'assistant' && msg === conv.messages[conv.messages.length-1]) continue;
            history.push({ role: msg.role, content: msg.content });
        }

        const chatMessages = [
            { role: 'system', content: systemPrompt },
            ...history
        ];

        try {
            const modelId = await getBestModel();
            const raw = await puter.ai.chat(chatMessages, { model: modelId });
            const clean = extractPuterMessage(raw);
            isWaiting = false;
            addMessage('assistant', clean);
        } catch (e) {
            isWaiting = false;
            addMessage('assistant', 'Dr. Khan error: ' + e.message);
        }
    }

    // ---------- Conversation management (English labels) ----------
    function newConversation() {
        const id = Date.now();
        conversations.push({
            id: id,
            name: 'Chat ' + (conversations.length + 1),
            messages: [{ role: 'assistant', content: '👋 Hi! I\'m Dr. Khan, your Chinese learning assistant. Ask me about vocabulary, grammar, or anything about learning Chinese!', timestamp: Date.now() }]
        });
        currentConvId = id;
        saveConversations();
        renderAll();
    }

    function deleteConversation(id) {
        if (conversations.length <= 1) return;
        const idx = conversations.findIndex(c => c.id === id);
        if (idx === -1) return;
        conversations.splice(idx, 1);
        if (currentConvId === id) currentConvId = conversations[0].id;
        pinnedMessages = pinnedMessages.filter(p => p.convId !== id);
        saveConversations();
        savePinned();
        renderAll();
    }

    window.renameConversationPrompt = function(id) {
        const conv = conversations.find(c => c.id === id);
        if (!conv) return;
        const newName = prompt('Rename conversation:', conv.name);
        if (newName && newName.trim()) {
            conv.name = newName.trim();
            saveConversations();
            renderSidebar();
            const headerName = document.getElementById('current-conv-name');
            if (headerName && currentConvId === id) headerName.textContent = conv.name;
        }
    };

    function exportConversation() {
        const conv = getCurrentConv();
        if (!conv) return;
        let text = 'Conversation: ' + conv.name + '\nExported: ' + new Date().toLocaleString() + '\n\n';
        conv.messages.forEach(function(m) {
            const role = m.role === 'user' ? 'You' : 'Dr. Khan';
            const time = new Date(m.timestamp).toLocaleTimeString();
            text += '[' + role + '] (' + time + '):\n' + m.content + '\n\n';
        });
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drkhan-' + conv.name.replace(/\s+/g, '_') + '.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    function shareConversation() {
        const conv = getCurrentConv();
        if (!conv) return;
        let text = 'Dr. Khan Chinese Learning Chat: ' + conv.name + '\n\n';
        conv.messages.forEach(function(m) {
            text += (m.role === 'user' ? 'You' : 'Dr. Khan') + ': ' + m.content + '\n\n';
        });
        navigator.clipboard.writeText(text).then(function() { showToast('Copied!'); }).catch(function() { showToast('Copy failed'); });
    }

    function setFontSize(delta) {
        fontSize = Math.min(32, Math.max(12, fontSize + delta));
        document.querySelectorAll('.message-bubble').forEach(function(el) { el.style.fontSize = fontSize + 'px'; });
    }

    function togglePanelDarkMode() {
        panelDarkMode = !panelDarkMode;
        const panel = document.querySelector('.drkhan-panel');
        if (panel) panelDarkMode ? panel.classList.add('dark') : panel.classList.remove('dark');
        const toggleInput = document.getElementById('sidebar-dark-toggle');
        if (toggleInput) toggleInput.checked = panelDarkMode;
    }

    // ---------- Create Widget (UI) ----------
    function createWidget() {
        const container = document.createElement('div');
        container.id = 'drkhan-container';
        container.innerHTML = `
<style>
    #drkhan-container * { box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    :root { --primary: #e67e22; --primary-dark: #d35400; --bg-glass: rgba(255,255,255,0.65); --bg-sidebar: rgba(248,252,255,0.8); --border-light: rgba(230,126,34,0.2); --shadow-sm: 0 8px 30px rgba(0,0,0,0.08); --shadow-lg: 0 20px 50px rgba(0,0,0,0.2); }
    .drkhan-bubble {
        position: fixed; bottom: 25px; right: 25px; width: 64px; height: 64px; border-radius: 50%;
        background: #0a2942;
        color: white;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        box-shadow: 0 6px 20px rgba(0,0,0,0.25); z-index: 10000; transition: 0.2s;
        border: 2px solid #ffd966; font-size: 2.4rem; touch-action: manipulation;
        padding: 0;
    }
    .drkhan-bubble svg { width: 42px; height: 42px; display: block; }
    .drkhan-bubble:hover { transform: scale(1.05); }
    .drkhan-bubble .tooltip {
        position: absolute; top: -32px; background: #0a2942; color: white;
        padding: 5px 14px; border-radius: 30px; font-size: 0.8rem; opacity: 0;
        transition: opacity 0.2s; pointer-events: none; white-space: nowrap;
    }
    .drkhan-bubble:hover .tooltip { opacity: 1; }
    .drkhan-panel {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 850px; max-width: 95vw; height: 85vh; max-height: 800px;
        background: rgba(255,255,255,0.7); backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px); border-radius: 28px;
        box-shadow: var(--shadow-lg); display: none; flex-direction: column;
        z-index: 10001; overflow: hidden; border: 1px solid var(--border-light);
        transition: background 0.2s;
    }
    .drkhan-panel.dark { background: rgba(30,30,46,0.85); color: #e0e0e0; --bg-glass: rgba(30,30,46,0.85); --bg-sidebar: rgba(20,20,30,0.9); --border-light: rgba(255,255,255,0.1); }
    .drkhan-panel-header {
        background: rgba(211,84,0,0.9); backdrop-filter: blur(12px); color: white;
        padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;
        border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;
    }
    .drkhan-panel-header h3 { margin:0; font-size:1.2rem; display:flex; align-items:center; gap:8px; }
    .panel-actions { display: flex; gap: 8px; }
    .panel-btn {
        background: rgba(255,255,255,0.15); border: none; color: white;
        width: 32px; height: 32px; border-radius: 30px; font-size: 1rem;
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s;
    }
    .panel-btn:hover { background: rgba(255,255,255,0.3); }
    .drkhan-body { display: flex; flex: 1; overflow: hidden; }
    .drkhan-sidebar {
        width: 250px; background: var(--bg-sidebar); backdrop-filter: blur(12px);
        border-right: 1px solid var(--border-light); display: flex; flex-direction: column;
        overflow-y: auto; flex-shrink: 0; transition: width 0.3s;
    }
    .sidebar-section { padding: 16px 12px; border-bottom: 1px solid var(--border-light); }
    .section-title { font-weight: 600; opacity: 0.7; margin-bottom: 12px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .conv-list { display: flex; flex-direction: column; gap: 4px; }
    .conv-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 12px; border-radius: 12px; cursor: pointer;
        transition: background 0.2s; font-size: 0.85rem;
    }
    .conv-item:hover { background: rgba(230,126,34,0.1); }
    .conv-item.active { background: var(--primary); color: white; }
    .conv-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .conv-actions { display: none; gap: 4px; }
    .conv-item:hover .conv-actions { display: flex; }
    .new-chat-sidebar { background: transparent; border: 1px dashed var(--primary); border-radius: 30px; color: var(--primary); padding: 8px 12px; margin-top: 8px; width: 100%; cursor: pointer; }
    .flashcard-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; font-size: 0.85rem; }
    .flashcard-item .flashcard-word { flex:1; cursor:pointer; }
    .flashcard-item .flashcard-word:hover { color: var(--primary); }
    .pinned-note-item { padding: 6px 0; cursor: pointer; font-size: 0.8rem; border-bottom: 1px solid var(--border-light); }
    .settings-section label, .settings-section select { font-size: 0.85rem; }
    .setting-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top:0; left:0; right:0; bottom:0; background: #ccc; border-radius: 22px; transition: 0.3s; }
    .slider:before { position: absolute; content:""; height: 18px; width: 18px; left: 2px; bottom: 2px; background: white; border-radius: 50%; transition: 0.3s; }
    input:checked + .slider { background: var(--primary); }
    input:checked + .slider:before { transform: translateX(18px); }
    .font-controls { display: flex; gap: 6px; }
    .font-controls button { background: var(--primary); color: white; border: none; border-radius: 20px; padding: 4px 12px; cursor: pointer; }
    .drkhan-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .chat-header {
        padding: 10px 20px; display: flex; align-items: center; gap: 12px;
        border-bottom: 1px solid var(--border-light); flex-shrink: 0; flex-wrap: wrap;
    }
    .chat-header .wod { font-size: 0.9rem; color: var(--text-secondary); flex-shrink:0; }
    .chat-header input { flex: 1; padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border-light); background: rgba(255,255,255,0.5); min-width: 120px; }
    .drkhan-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .message { display: flex; gap: 12px; align-items: flex-start; }
    .message.user { flex-direction: row-reverse; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: #e6f0fa; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
    .user .avatar { background: var(--primary); color: white; }
    .bubble-wrapper { max-width: 80%; position: relative; }
    .message-bubble {
        padding: 12px 16px; border-radius: 20px;
        background: rgba(255,255,255,0.7); backdrop-filter: blur(4px);
        box-shadow: 0 2px 10px rgba(0,0,0,0.03); line-height: 1.5; word-wrap: break-word;
    }
    .dark .message-bubble { background: rgba(45,45,68,0.8); color: #e0e0e0; }
    .user .message-bubble { background: var(--primary); color: white; }
    .message-actions {
        position: absolute; top: -12px; right: 10px; display: flex; gap: 4px;
        opacity: 0; transform: translateY(5px); transition: all 0.2s;
        background: rgba(255,255,255,0.9); border-radius: 20px; padding: 2px 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .dark .message-actions { background: rgba(40,40,60,0.9); }
    .message:hover .message-actions { opacity: 1; transform: translateY(0); }
    .icon-btn { background: transparent; border: none; cursor: pointer; color: inherit; opacity: 0.7; font-size: 0.9rem; padding: 2px 4px; }
    .icon-btn:hover { opacity: 1; }
    .timestamp { font-size: 0.65rem; opacity: 0.5; margin-top: 4px; text-align: right; }
    .read-more { background: transparent; border: none; color: var(--primary); cursor: pointer; font-size: 0.8rem; margin-top: 4px; }
    .typing .message-bubble { background: #e6f0fa; display: flex; gap: 4px; padding: 12px 16px; }
    .typing-indicator span { animation: blink 1.4s infinite; font-size: 1.2rem; }
    @keyframes blink { 0% { opacity:0.2; } 20% { opacity:1; } 100% { opacity:0.2; } }
    .input-area {
        padding: 12px 20px; border-top: 1px solid var(--border-light);
        display: flex; gap: 8px; align-items: flex-end; background: rgba(255,255,255,0.4);
    }
    .input-area textarea {
        flex: 1; padding: 10px 16px; border-radius: 24px; border: 1px solid var(--border-light);
        background: rgba(255,255,255,0.7); resize: none; font-size: 0.9rem; outline: none; max-height: 120px;
    }
    .send-btn, .share-btn, .mic-btn, .quiz-btn {
        border: none; border-radius: 50%; width: 44px; height: 44px;
        display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem;
        box-shadow: 0 4px 12px rgba(230,126,34,0.3); flex-shrink: 0;
    }
    .send-btn { background: var(--primary); color: white; }
    .share-btn { background: #555; color: white; }
    .mic-btn { background: #4a9eff; color: white; }
    .quiz-btn { background: #8b5cf6; color: white; }
    .suggestions {
        display: flex; gap: 8px; padding: 6px 20px; overflow-x: auto;
        white-space: nowrap; flex-wrap: nowrap; border-top: 1px solid var(--border-light);
        background: rgba(255,255,255,0.3); scrollbar-width: none; -ms-overflow-style: none;
    }
    .suggestions::-webkit-scrollbar { display: none; }
    .suggestion-chip {
        flex-shrink: 0; background: rgba(230,126,34,0.1); border-radius: 30px;
        padding: 5px 12px; font-size: 0.75rem; cursor: pointer; transition: 0.2s;
    }
    .suggestion-chip:hover { background: rgba(230,126,34,0.2); transform: scale(1.02); }
    .drkhan-stats { font-size: 0.65rem; opacity: 0.5; padding: 4px 20px 8px; text-align: right; }
    .drkhan-toast {
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: var(--primary); color: white; padding: 10px 24px; border-radius: 30px;
        z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: fadeInUp 0.3s;
    }
    @keyframes fadeInUp { from { opacity:0; transform:translate(-50%,20px); } to { opacity:1; transform:translate(-50%,0); } }
    .muted { opacity: 0.5; font-size: 0.8rem; }
    @media (max-width: 700px) { .drkhan-sidebar { width: 0 !important; } .drkhan-panel { width: 95vw; height: 90vh; } }
</style>
<div class="drkhan-bubble">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" fill="none">
        <rect width="800" height="800" rx="200" fill="#0a2942"/>
        <g transform="translate(200, 200) scale(0.8)">
            <path d="M192 32c0-17.7-14.3-32-32-32s-32 14.3-32 32v25.6C69.5 68.4 16 127.1 16 200v32c0 101.7 82.3 184 184 184h64c101.7 0 184-82.3 184-184v-32c0-72.9-53.5-131.6-128-142.4V32c0-17.7-14.3-32-32-32s-32 14.3-32 32v16H192V32zM48 200c0-63.1 48-115.4 109.5-126.9 4.2-.7 8.5-1.1 12.8-1.1h31.5c4.3 0 8.6 .4 12.8 1.1C288 84.6 336 136.9 336 200v32c0 75.1-60.9 136-136 136h-64c-75.1 0-136-60.9-136-136v-32zm320 240c0-8.8-7.2-16-16-16H32c-8.8 0-16 7.2-16 16v48c0 8.8 7.2 16 16 16h320c8.8 0 16-7.2 16-16v-48z" fill="#ffd966"/>
        </g>
    </svg>
    <span class="tooltip">Dr. Khan 帮你学中文</span>
</div>
<div class="drkhan-panel">
    <div class="drkhan-panel-header">
        <h3>📘 Dr. Khan</h3>
        <div class="panel-actions">
            <button class="panel-btn" id="sidebar-toggle" title="Toggle sidebar">☰</button>
            <button class="panel-btn" id="export-chat" title="Export chat">📥</button>
            <button class="panel-btn" id="minimize-panel" title="Minimize">─</button>
            <button class="panel-btn" id="close-panel" title="Close">✕</button>
        </div>
    </div>
    <div class="drkhan-body">
        <div class="drkhan-sidebar" id="drkhan-sidebar"></div>
        <div class="drkhan-main" id="drkhan-main">
            <div class="chat-header">
                <span id="current-conv-name" style="font-weight:600; flex-shrink:0;">New Chat</span>
                <span class="wod" id="word-of-day">📖 Word of the Day: --</span>
                <input type="text" id="drkhan-search" placeholder="🔍 Search messages...">
            </div>
            <div class="drkhan-messages" id="drkhan-messages"></div>
            <div class="suggestions" id="suggestions"></div>
            <div class="input-area">
                <button class="mic-btn" id="mic-btn" title="Voice input">🎙️</button>
                <textarea id="drkhan-input" placeholder="Type your Chinese question here..." rows="1" maxlength="1000"></textarea>
                <button class="share-btn" id="share-conv" title="Share chat">🔗</button>
                <button class="quiz-btn" id="quiz-btn" title="Quick Quiz (5 questions)">🎯</button>
                <button class="send-btn" id="drkhan-send">➤</button>
            </div>
            <div class="drkhan-stats" id="drkhan-stats"></div>
        </div>
    </div>
</div>`;
        document.body.appendChild(container);

        const panel = container.querySelector('.drkhan-panel');
        const bubble = container.querySelector('.drkhan-bubble');

        bubble.addEventListener('click', function(e) {
            e.stopPropagation();
            panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
        });

        document.addEventListener('click', function(e) {
            if (panel.style.display === 'flex' &&
                !panel.contains(e.target) &&
                e.target !== bubble &&
                !e.target.closest('#drkhan-selection-popup')) {
                panel.style.display = 'none';
            }
        });

        const mainArea = document.getElementById('drkhan-main');
        mainArea.addEventListener('click', function(e) {
            const sidebar = document.getElementById('drkhan-sidebar');
            if (sidebarOpen && !e.target.closest('#sidebar-toggle') && !e.target.closest('.drkhan-sidebar')) {
                sidebarOpen = false;
                sidebar.style.width = '0px';
            }
        });

        document.getElementById('minimize-panel').onclick = function() { panel.style.display = 'none'; };
        document.getElementById('close-panel').onclick = function() { panel.style.display = 'none'; };
        document.getElementById('sidebar-toggle').onclick = function(e) {
            e.stopPropagation();
            sidebarOpen = !sidebarOpen;
            document.getElementById('drkhan-sidebar').style.width = sidebarOpen ? '250px' : '0px';
        };
        document.getElementById('export-chat').onclick = exportConversation;
        document.getElementById('share-conv').onclick = shareConversation;
        document.getElementById('drkhan-send').onclick = function() { sendMessage(); };
        document.getElementById('mic-btn').onclick = startPronunciationCheck;
        document.getElementById('quiz-btn').onclick = startQuickQuiz;

        const textarea = document.getElementById('drkhan-input');
        textarea.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(120, this.scrollHeight) + 'px';
        });
        document.getElementById('drkhan-search').addEventListener('input', function(e) {
            currentSearch = e.target.value.trim().toLowerCase();
            renderMessages();
        });

        // drag
        let isDragging = false, dragOffsetX, dragOffsetY;
        const header = panel.querySelector('.drkhan-panel-header');
        header.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            panel.style.transition = 'none';
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            panel.style.left = (e.clientX - dragOffsetX) + 'px';
            panel.style.top = (e.clientY - dragOffsetY) + 'px';
            panel.style.transform = 'none';
        });
        window.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                panel.style.transition = '';
            }
        });

        // keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('drkhan-search').focus();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                newConversation();
            }
        });

        // ---------- Animated suggestion label (Daily Tip / Reminder) ----------
        const suggestionLabel = document.createElement('div');
        suggestionLabel.className = 'drkhan-suggestion';
        suggestionLabel.textContent = '💬 Ask Dr. Khan';
        suggestionLabel.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 30px;
            background: rgba(10, 41, 66, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 40px;
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.5s ease, transform 0.5s ease;
            pointer-events: none;
            white-space: nowrap;
            border: 1px solid #ffd966;
            backdrop-filter: blur(4px);
        `;
        document.body.appendChild(suggestionLabel);

        let suggestionTimer = setTimeout(() => {
            suggestionLabel.style.opacity = '1';
            suggestionLabel.style.transform = 'translateY(0)';
        }, 4000);

        function hideSuggestion() {
            suggestionLabel.style.opacity = '0';
            suggestionLabel.style.transform = 'translateY(10px)';
            clearTimeout(suggestionTimer);
        }
        bubble.addEventListener('click', hideSuggestion);
        panel.addEventListener('click', hideSuggestion);
        document.getElementById('drkhan-input').addEventListener('focus', hideSuggestion);
        document.getElementById('drkhan-input').addEventListener('input', hideSuggestion);

        // Also hide when user sends a message
        document.getElementById('drkhan-send').addEventListener('click', hideSuggestion);

        // Refresh reminders every 30 seconds (for flashcard reminder)
        setInterval(() => {
            updateBubbleReminders();
        }, 30000);
    }

    // ---------- Init ----------
    function init() {
        loadStreak();
        loadFlashcards();
        loadConversations();
        createWidget();
        renderAll();
    }

    // Expose
    window.sendMessage = sendMessage;
    window.scrollToMessage = function(idx) {
        const el = document.querySelector('.message[data-idx="' + idx + '"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.togglePinMessage = togglePinMessage;
    window.editUserMessage = editUserMessage;
    window.deleteMessage = deleteMessage;
    window.copyMessageContent = copyMessageContent;
    window.quoteMessage = quoteMessage;
    window.addFlashcard = addFlashcard;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
