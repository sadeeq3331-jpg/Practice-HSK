// drkhan.js – Chinese Learning Assistant v3.6 (Level-Upgraded + Animated Dropdown)
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

    // ---------- HSK Level Segments ----------
    const HSK_SEGMENTS = {
        1: { label: 'HSK 1', focus: 'Basic Vocabulary & Listening', segments: ['🎧 Picture Matching', '📖 Word Recognition'], writing: false },
        2: { label: 'HSK 2', focus: 'Everyday Topics', segments: ['🎧 Short Dialogues', '📖 Sentence Matching', '✍️ Basic Sentences'], writing: true },
        3: { label: 'HSK 3', focus: 'Intermediate Grammar', segments: ['🎧 Dialogues & Passages', '📖 Cloze & Arrangement', '✍️ Word Order'], writing: true },
        4: { label: 'HSK 4', focus: 'Complex Topics', segments: ['🎧 Longer Passages', '📖 Reading Comprehension', '✍️ Short Essays'], writing: true },
        5: { label: 'HSK 5', focus: 'Academic & Abstract', segments: ['🎧 Complex Dialogues', '📖 Advanced Cloze', '✍️ Essays (150c)'], writing: true },
        6: { label: 'HSK 6', focus: 'Native Level', segments: ['🎧 Long Passages', '📖 Advanced Comprehension', '✍️ Essays (300c)'], writing: true }
    };

    function getLevelSegments(level) {
        return HSK_SEGMENTS[level] || HSK_SEGMENTS[3];
    }

    function getLevelExercisePrompt(level) {
        const prompts = {
            1: 'Give me a simple vocabulary exercise for HSK 1. Include 5 words with their pinyin and meanings. Then ask a basic question like "What is 你好 in English?"',
            2: 'Give me a short dialogue exercise for HSK 2. Write a 3-line dialogue between two people on a daily topic. Then ask the student to fill in a missing word.',
            3: 'Give me a sentence arrangement exercise for HSK 3. Provide 5 scrambled Chinese words and ask the student to arrange them into a correct sentence. Include the correct answer for reference.',
            4: 'Give me a cloze test for HSK 4. Write a short passage (40-50 characters) with 3 blanks. Provide 4 options for each blank. Include the correct answers.',
            5: 'Give me an essay topic for HSK 5. Provide a topic that requires writing about 150 characters. Include a brief outline to help structure the essay.',
            6: 'Give me a summary exercise for HSK 6. Provide a passage (100-120 characters) and ask the student to summarize it in 50-60 characters. Include a sample summary.'
        };
        return prompts[level] || prompts[3];
    }

    // ---------- HSK Theme Colors ----------
    const HSK_THEMES = {
        1: { accent: '#3b82f6', accentHover: '#2563eb', gradient: 'linear-gradient(145deg, #3b82f6, #1d4ed8)', glow: 'rgba(59,130,246,0.3)', darkAccent: '#60a5fa' },
        2: { accent: '#22c55e', accentHover: '#16a34a', gradient: 'linear-gradient(145deg, #22c55e, #15803d)', glow: 'rgba(34,197,94,0.3)', darkAccent: '#4ade80' },
        3: { accent: '#14b8a6', accentHover: '#0d9488', gradient: 'linear-gradient(145deg, #14b8a6, #0f766e)', glow: 'rgba(20,184,166,0.3)', darkAccent: '#2dd4bf' },
        4: { accent: '#8b5cf6', accentHover: '#7c3aed', gradient: 'linear-gradient(145deg, #8b5cf6, #6d28d9)', glow: 'rgba(139,92,246,0.3)', darkAccent: '#a78bfa' },
        5: { accent: '#f59e0b', accentHover: '#d97706', gradient: 'linear-gradient(145deg, #f59e0b, #b45309)', glow: 'rgba(245,158,11,0.3)', darkAccent: '#fbbf24' },
        6: { accent: '#ef4444', accentHover: '#dc2626', gradient: 'linear-gradient(145deg, #ef4444, #b91c1c)', glow: 'rgba(239,68,68,0.3)', darkAccent: '#f87171' }
    };

    function getTheme(level) {
        return HSK_THEMES[level] || HSK_THEMES[3];
    }

    function applyThemeToPanel(level) {
        const panel = document.querySelector('.drkhan-panel');
        if (!panel) return;
        const theme = getTheme(level);
        const isDark = document.body.classList.contains('dark') || panelDarkMode;
        const accent = isDark ? (theme.darkAccent || theme.accent) : theme.accent;
        const accentHover = isDark ? theme.accent : theme.accentHover;
        panel.style.setProperty('--hsk-accent', accent);
        panel.style.setProperty('--hsk-accent-hover', accentHover);
        panel.style.setProperty('--hsk-gradient', theme.gradient);
        panel.style.setProperty('--hsk-glow', theme.glow);
        const header = panel.querySelector('.drkhan-panel-header');
        if (header) {
            header.style.background = isDark ? `linear-gradient(145deg, ${accent}, ${accentHover})` : theme.gradient;
        }
        const sendBtn = panel.querySelector('#drkhan-send');
        if (sendBtn) sendBtn.style.background = accent;
        const quizBtn = panel.querySelector('#quiz-btn');
        if (quizBtn) quizBtn.style.background = accent;
        document.querySelectorAll('.drkhan-toast').forEach(el => el.style.background = accent);
        // Update level badge
        updateLevelBadge(level);
    }

    // ---------- Level Badge ----------
    function updateLevelBadge(level) {
        const badge = document.getElementById('level-badge');
        if (!badge) return;
        const segments = getLevelSegments(level);
        badge.textContent = segments.segments.join(' · ');
        badge.style.color = getTheme(level).accent;
    }

    // ---------- TIPS ----------
    const TIPS = [
        "Tip: 的 (de) is for possession (my book = 我的书). 地 (de) turns adjectives into adverbs (quickly = 快地). 得 (de) shows degree (well done = 做得好).",
        "Tip: Measure words are essential! Use 个 (gè) for general objects, 本 (běn) for books, 只 (zhī) for animals.",
        "Tip: 不 (bù) is for present/future negation. 没 (méi) is for past negation or 'have not'.",
        "Tip: 了 (le) shows completed action OR a change of state. Context is key!",
        "Tip: 把 (bǎ) structure is used to emphasize the object: 我把书放在桌子上 (wǒ bǎ shū fàng zài zhuōzi shàng) – I put the book on the table.",
        "Tip: Learn radicals! 氵 (water) appears in 河, 海, 洗. 木 (wood) appears in 树, 林, 材.",
        "Tip: 的 (de) can also form adjectives: 漂亮的 (piàoliang de) – beautiful, or 红色的 (hóngsè de) – red.",
        "Tip: 是 (shì) is NOT used with adjectives. Say 我很高兴 (wǒ hěn gāoxìng) – I am happy, NOT 我是高兴.",
        "Tip: 有 (yǒu) means 'have' or 'there is'. 有没有 (yǒu méi yǒu) means 'is there?' or 'do you have?'.",
        "Tip: Verb doubling (看看 kànkan, 听听 tīngting) softens the tone: 你看看 (nǐ kànkan) – take a look.",
        "Tip: 一边…一边… (yībiān…yībiān…) means 'doing two things at once': 一边听音乐一边学习 (yībiān tīng yīnyuè yībiān xuéxí) – study while listening to music.",
        "Tip: 除了…以外 (chúle…yǐwài) means 'except for' or 'in addition to'.",
        "Tip: 越来越 (yuèláiyuè) means 'more and more': 越来越热 (yuèláiyuè rè) – getting hotter.",
        "Tip: 一…就… (yī…jiù…) means 'as soon as': 一到家就睡觉 (yī dào jiā jiù shuìjiào) – sleep as soon as I get home.",
        "Tip: 都 (dōu) means 'all'. 也 (yě) means 'also'. 还 (hái) means 'still' or 'also'.",
        "Tip: 能 (néng) = physical ability. 可以 (kěyǐ) = permission. 会 (huì) = learned skill or future will.",
        "Tip: 想 (xiǎng) = want or miss. 要 (yào) = want/need or future 'will'.",
        "Tip: 从 (cóng) = from. 离 (lí) = away from. 到 (dào) = to. Use these for directions.",
        "Tip: 为了 (wèile) = for the purpose of. 因为 (yīnwèi) = because. 所以 (suǒyǐ) = therefore.",
        "Tip: 虽然 (suīrán) = although. 但是 (dànshì) = but. They often go together.",
        "Tip: 如果 (rúguǒ) = if. 就 (jiù) = then. 如果明天不下雨，我们就去公园 (rúguǒ míngtiān bù xià yǔ, wǒmen jiù qù gōngyuán) – If it doesn't rain tomorrow, we'll go to the park.",
        "Tip: 被 (bèi) is for passive voice: 书被拿走了 (shū bèi ná zǒu le) – The book was taken away.",
        "Tip: 给 (gěi) means 'give' or acts as a preposition: 我给你打电话 (wǒ gěi nǐ dǎ diànhuà) – I will call you.",
        "Tip: 让 (ràng) = let / make someone do something: 让我看看 (ràng wǒ kànkan) – Let me see.",
        "Tip: 对 (duì) = to/towards, or correct. 我对汉语感兴趣 (wǒ duì hànyǔ gǎn xìngqù) – I am interested in Chinese.",
        "Tip: 跟 (gēn) = with / follow. 我跟朋友一起去 (wǒ gēn péngyou yīqǐ qù) – I go with friends.",
        "Tip: 在 (zài) can be 'at/in/on' (location) or an action in progress (正在 zhèngzài).",
        "Tip: 着 (zhe) shows a continuous state: 站着 (zhànzhe) – standing, 笑着 (xiàozhe) – laughing.",
        "Tip: 过 (guò) shows experience in the past: 我去过北京 (wǒ qù guò běijīng) – I have been to Beijing.",
        "Tip: 吧 (ba) softens a suggestion: 我们去吃饭吧 (wǒmen qù chīfàn ba) – Let's go eat. 吗 (ma) is for yes/no questions.",
        "Tip: 口 (kǒu) is the measure word for family members: 三口人 (sān kǒu rén) – 3 people in a family."
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
            const celebration = document.createElement('div');
            celebration.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                pointer-events: none; z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                font-size: 4rem; animation: drkhanConfetti 2s ease-out forwards;
            `;
            celebration.innerHTML = '🎉🔥 Amazing! ' + streak + '-day streak! Keep it up! 🔥🎉';
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

    // ---------- Core helpers ----------
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

    // ---------- Sidebar ----------
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
        html += '<div class="setting-row"><span>Dark Mode</span><label class="toggle-switch"><input type="checkbox" id="sidebar-dark-toggle" ' + (panelDarkMode ? 'checked' : '') + '><span class="slider"></span></label></div>';
        html += '<div class="setting-row"><span>Font Size</span><div class="font-controls"><button id="font-minus">A-</button><button id="font-plus">A+</button></div></div>';
        html += '</div>';

        sidebar.innerHTML = html;

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

    // ---------- Render functions ----------
    function renderAll() {
        renderSidebar();
        renderMessages();
        updateStats();
        updateContextSuggestions();
        updateWordOfDay();
        updateBubbleReminders();
        const headerHsk = document.getElementById('header-hsk');
        if (headerHsk) headerHsk.value = hskLevel;
        applyThemeToPanel(hskLevel);
        updateLevelBadge(hskLevel);
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
        const levelSegments = getLevelSegments(hskLevel);
        let levelSpecificSuggestions = [];
        if (hskLevel <= 2) {
            levelSpecificSuggestions = [
                'What does "你好" mean?',
                'Give me a simple sentence with "我"',
                'How to say "thank you" in Chinese?'
            ];
        } else if (hskLevel === 3) {
            levelSpecificSuggestions = [
                'Give me a sentence arrangement exercise',
                'How to use "把" (bǎ) structure?',
                'Correct this: "我昨天去图书馆了。"'
            ];
        } else if (hskLevel === 4) {
            levelSpecificSuggestions = [
                'Give me a cloze test (fill in the blanks)',
                'Explain "虽然...但是..." with examples',
                'Give me an HSK4 example sentence'
            ];
        } else if (hskLevel === 5) {
            levelSpecificSuggestions = [
                'Give me an essay topic (150 characters)',
                'Summarize this passage for me',
                'Advanced vocabulary for HSK 5'
            ];
        } else {
            levelSpecificSuggestions = [
                'Give me a summary exercise',
                'Give me an essay topic (300 characters)',
                'Advanced grammar for HSK 6'
            ];
        }
        const allSuggestions = [
            'How to use "把" (bǎ) structure?',
            'Difference between "漂亮" and "美丽"',
            'Correct this: "我昨天去图书馆了。"',
            'How to remember "图书馆" (túshūguǎn)?',
            'Usage of "虽然...但是..."',
            'Give me an HSK4 example sentence',
        ];
        // Use level-specific suggestions first, fallback to general
        const finalSuggestions = levelSpecificSuggestions.length > 0 ? levelSpecificSuggestions : allSuggestions;
        container.innerHTML = finalSuggestions.slice(0,5).map(function(s) {
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

    // ---------- Word of the Day ----------
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

    // ---------- Bubble Reminders ----------
    function updateBubbleReminders() {
        const bubble = document.querySelector('.drkhan-bubble');
        if (!bubble) return;
        const oldReminder = bubble.querySelector('.drkhan-reminder');
        if (oldReminder) oldReminder.remove();

        const reminder = document.createElement('div');
        reminder.className = 'drkhan-reminder';
        reminder.style.cssText = `
            position: absolute; bottom: -22px; left: 50%; transform: translateX(-50%);
            background: rgba(10,41,66,0.95); color: #ffd966;
            padding: 3px 12px; border-radius: 30px; font-size: 0.6rem;
            font-weight: 600; white-space: nowrap; border: 1px solid #ffd966;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            cursor: pointer;
            pointer-events: auto;
            transition: background 0.2s;
            animation: drkhanPulse 2s infinite ease-in-out;
        `;
        reminder.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(10,41,66,1)';
        });
        reminder.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(10,41,66,0.95)';
        });

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

        const daysSince = daysSinceLastFlashcard();
        let reminderText, tipContent;
        if (daysSince > 3 && flashcards.length > 0) {
            reminderText = '📇 Add new words!';
            tipContent = '📇 Reminder: You haven\'t added any new flashcards in a while. Try adding a new word to your deck!';
        } else {
            const tip = getDailyTip();
            reminderText = '💡 ' + tip.substring(0, 30) + '…';
            tipContent = 'Daily tip: ' + tip;
        }
        reminder.textContent = reminderText;

        reminder.addEventListener('click', function(e) {
            e.stopPropagation();
            const panel = document.querySelector('.drkhan-panel');
            if (panel) {
                panel.style.display = 'flex';
                const input = document.getElementById('drkhan-input');
                if (input) {
                    input.value = tipContent;
                    setTimeout(() => input.focus(), 200);
                }
                const suggestionLabel = document.querySelector('.drkhan-suggestion');
                if (suggestionLabel) {
                    suggestionLabel.style.opacity = '0';
                    suggestionLabel.style.transform = 'translateY(10px)';
                }
            }
        });

        bubble.appendChild(reminder);
    }

    // ---------- Level-Specific Quick Quiz ----------
    function startQuickQuiz() {
        const wordList = window['HSK' + hskLevel + '_WORDS'];
        if (!wordList || wordList.length === 0) {
            showToast('No word list for HSK ' + hskLevel);
            return;
        }
        const shuffled = [...wordList].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 5);
        let quizText = '🎯 **Quick Quiz (HSK ' + hskLevel + ')**\n\n';

        // Level-specific quiz header
        const segments = getLevelSegments(hskLevel);
        quizText += '📌 *' + segments.focus + '*\n';
        quizText += '🎧 ' + segments.segments.join(' · ') + '\n\n';

        if (hskLevel <= 2) {
            // Simple vocabulary quiz
            selected.forEach((w, i) => {
                quizText += (i+1) + '. **' + w.word + '** → ' + w.meaning + '\n';
            });
            quizText += '\n✍️ **Exercise:** Write a simple sentence using one of these words.';
        } else if (hskLevel === 3) {
            // Sentence arrangement
            const scrambled = selected.slice(0, 3);
            scrambled.forEach((w, i) => {
                const sentence = w.word + ' ' + (w.example || '');
                const words = sentence.split(/\s+/).sort(() => Math.random() - 0.5);
                quizText += (i+1) + '. Arrange: **' + words.join(' ') + '**\n';
                quizText += '   ✅ Hint: ' + w.meaning + '\n';
            });
            quizText += '\n💡 Try to form a correct sentence!';
        } else if (hskLevel === 4) {
            // Cloze style
            const passage = '学习中文是很有意义的。' + selected[0].word + '让我感到快乐。' + selected[1].word + '也很重要。' + selected[2].word + '是每天都要做的。';
            const blanks = selected.slice(0, 3).map(w => w.word);
            const options = [
                ['学习', '工作', '休息'],
                ['朋友', '家人', '老师'],
                ['看书', '写字', '听歌']
            ];
            quizText += '**Fill in the blanks:**\n\n';
            const parts = passage.split('___');
            // Simpler approach: show options
            quizText += 'Choose the correct word for each blank:\n';
            blanks.forEach((word, i) => {
                quizText += '  ' + (i+1) + '. ' + options[i].join(' / ') + ' → ✅ ' + word + '\n';
            });
        } else {
            // HSK 5-6: Essay or summary prompts
            quizText += '✍️ **Writing Exercise:**\n\n';
            if (hskLevel === 5) {
                quizText += '**Topic:** Write about your favorite hobby (150 characters).\n\n';
                quizText += '**Outline:**\n- What is your hobby?\n- Why do you like it?\n- How often do you do it?\n\n';
            } else {
                quizText += '**Topic:** Discuss the importance of learning languages (200-300 characters).\n\n';
                quizText += '**Outline:**\n- Why learn languages?\n- What are the benefits?\n- Share your personal experience.\n\n';
            }
            quizText += '💡 Write your essay and I\'ll give you feedback!';
        }

        addMessage('user', '🎯 Start Quick Quiz (HSK ' + hskLevel + ')');
        addMessage('assistant', quizText);
    }

    // ---------- Quote / Copy / Speech ----------
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

    // ---------- Model selection ----------
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

    // ---------- Send message ----------
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

        const segments = getLevelSegments(hskLevel);
        const levelContext = 'Student is at HSK ' + hskLevel + ' level. Focus areas: ' + segments.focus + '. Segments: ' + segments.segments.join(', ') + '.';

        const systemPrompt = `You are a professional Chinese language tutor named Dr. Khan. Your main job is to help students learn Chinese (Mandarin). You only answer questions related to Chinese learning, including vocabulary, grammar, pronunciation, writing, and cultural background.

Current student HSK level: ${hskLevel}.
${levelContext}

Guidelines:
- Provide clear, accurate, and useful answers to every question.
- When a student asks about a word, give example sentences in multiple contexts and explain common collocations.
- If a student writes a sentence, check grammar and word choice, point out errors, and provide corrections.
- Provide memory techniques: breaking down characters (radicals), association, synonyms/antonyms.
- Adjust the difficulty of your answers according to the student's HSK level (${hskLevel}).
- Keep a friendly, encouraging tone and make learning fun.

${personalityInstruction}

IMPORTANT INSTRUCTION: 
- Always respond in English for all explanations, grammar points, corrections, and instructions. 
- When providing example sentences, write them in Chinese characters, followed by pinyin in parentheses, and then the English translation. For example: "我喜欢学习中文 (wǒ xǐhuān xuéxí zhōngwén) – I like learning Chinese."
- Do not respond in Chinese for the explanation part; only the example sentences and their pinyin/translations should contain Chinese.
- This ensures that students understand the lesson clearly while being exposed to the target language in a controlled way.`;

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

    // ---------- Conversation management ----------
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
        if (panel) {
            if (panelDarkMode) {
                panel.classList.add('dark');
                document.body.classList.add('dark');
            } else {
                panel.classList.remove('dark');
                document.body.classList.remove('dark');
            }
        }
        const toggleInput = document.getElementById('sidebar-dark-toggle');
        if (toggleInput) toggleInput.checked = panelDarkMode;
        applyThemeToPanel(hskLevel);
    }

    // ---------- Animated Level Change ----------
    function animateLevelChange() {
        const dropdown = document.getElementById('header-hsk');
        if (!dropdown) return;
        // Add pulse animation
        dropdown.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        dropdown.style.transform = 'scale(1.2)';
        dropdown.style.boxShadow = '0 0 30px var(--hsk-glow, rgba(230,126,34,0.5))';
        setTimeout(() => {
            dropdown.style.transform = 'scale(1)';
            dropdown.style.boxShadow = 'none';
        }, 400);
        // Show a toast notification
        const segments = getLevelSegments(hskLevel);
        showToast('📚 Switched to ' + segments.label + ' – ' + segments.focus);
    }

    // ---------- Create Widget ----------
    function createWidget() {
        const container = document.createElement('div');
        container.id = 'drkhan-container';
        container.innerHTML = `
<style>
    #drkhan-container * { box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    :root {
        --primary: #e67e22;
        --primary-dark: #d35400;
        --bg-glass: rgba(255,255,255,0.7);
        --bg-sidebar: rgba(248,252,255,0.85);
        --border-light: rgba(0,0,0,0.08);
        --shadow-sm: 0 8px 30px rgba(0,0,0,0.06);
        --shadow-lg: 0 25px 60px rgba(0,0,0,0.15);
        --radius: 20px;
        --radius-sm: 12px;
        --text-primary: #1a202c;
        --text-secondary: #4a5568;
        --text-muted: #718096;
    }
    .dark {
        --bg-glass: rgba(20,20,30,0.9);
        --bg-sidebar: rgba(15,15,25,0.95);
        --border-light: rgba(255,255,255,0.08);
        --text-primary: #e2e8f0;
        --text-secondary: #a0aec0;
        --text-muted: #718096;
        background: rgba(0,0,0,0.3);
    }
    
    .drkhan-bubble {
        position: fixed; bottom: 25px; right: 25px; width: 68px; height: 68px; border-radius: 50%;
        background: #0a2942;
        color: white;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3); z-index: 10000; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 2px solid #ffd966; touch-action: manipulation; padding: 0;
    }
    .drkhan-bubble svg { width: 44px; height: 44px; display: block; }
    .drkhan-bubble:hover { transform: scale(1.08) rotate(-5deg); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
    .drkhan-bubble .tooltip {
        position: absolute; top: -34px; background: rgba(10,41,66,0.95); color: white;
        padding: 4px 16px; border-radius: 30px; font-size: 0.75rem; opacity: 0;
        transition: opacity 0.3s; pointer-events: none; white-space: nowrap; backdrop-filter: blur(8px);
    }
    .drkhan-bubble:hover .tooltip { opacity: 1; }
    
    .drkhan-panel {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 880px; max-width: 95vw; height: 88vh; max-height: 820px;
        background: var(--bg-glass); backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-radius: 32px; box-shadow: var(--shadow-lg);
        display: none; flex-direction: column; z-index: 10001;
        overflow: hidden; border: 1px solid rgba(255,255,255,0.12);
        transition: background 0.3s, border-color 0.3s;
    }
    .dark .drkhan-panel { border-color: rgba(255,255,255,0.05); }
    
    .drkhan-panel-header {
        background: linear-gradient(145deg, #e67e22, #d35400);
        backdrop-filter: blur(12px);
        color: white;
        padding: 14px 24px;
        display: flex; align-items: center; justify-content: space-between;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
        transition: background 0.4s ease;
    }
    .drkhan-panel-header h3 { margin:0; font-size:1.2rem; font-weight:700; display:flex; align-items:center; gap:10px; letter-spacing:-0.3px; }
    .panel-actions { display: flex; gap: 6px; }
    .panel-btn {
        background: rgba(255,255,255,0.12); border: none; color: white;
        width: 34px; height: 34px; border-radius: 30px; font-size: 0.9rem;
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
        transition: all 0.2s; backdrop-filter: blur(4px);
    }
    .panel-btn:hover { background: rgba(255,255,255,0.25); transform: scale(1.05); }
    
    .drkhan-body { display: flex; flex: 1; overflow: hidden; }
    .drkhan-sidebar {
        width: 250px; background: var(--bg-sidebar); backdrop-filter: blur(12px);
        border-right: 1px solid var(--border-light); display: flex; flex-direction: column;
        overflow-y: auto; flex-shrink: 0; transition: width 0.3s, background 0.3s;
        color: var(--text-primary);
    }
    .sidebar-section { padding: 16px 14px; border-bottom: 1px solid var(--border-light); }
    .section-title { font-weight: 600; opacity: 0.6; margin-bottom: 12px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary); }
    .conv-list { display: flex; flex-direction: column; gap: 4px; }
    .conv-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 12px; border-radius: var(--radius-sm); cursor: pointer;
        transition: all 0.15s; font-size: 0.85rem;
        color: var(--text-primary);
    }
    .conv-item:hover { background: rgba(0,0,0,0.04); }
    .dark .conv-item:hover { background: rgba(255,255,255,0.04); }
    .conv-item.active { background: var(--hsk-accent, #e67e22); color: white; }
    .conv-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .conv-actions { display: none; gap: 4px; }
    .conv-item:hover .conv-actions { display: flex; }
    .new-chat-sidebar {
        background: transparent; border: 1.5px dashed var(--hsk-accent, #e67e22);
        border-radius: 30px; color: var(--hsk-accent, #e67e22);
        padding: 8px 12px; margin-top: 8px; width: 100%; cursor: pointer;
        font-weight: 600; transition: all 0.2s;
    }
    .new-chat-sidebar:hover { background: var(--hsk-accent, #e67e22); color: white; }
    
    .flashcard-item { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; font-size: 0.85rem; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
    .flashcard-item .flashcard-word { flex:1; cursor:pointer; font-weight:500; }
    .flashcard-item .flashcard-word:hover { color: var(--hsk-accent, #e67e22); }
    .pinned-note-item { padding: 6px 0; cursor: pointer; font-size: 0.8rem; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
    .pinned-note-item:hover { color: var(--hsk-accent, #e67e22); }
    
    .settings-section label, .settings-section select { font-size: 0.85rem; color: var(--text-primary); }
    .setting-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .setting-row select { background: var(--bg-glass); border: 1px solid var(--border-light); border-radius: 20px; padding: 4px 10px; color: var(--text-primary); }
    .toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top:0; left:0; right:0; bottom:0; background: #ccc; border-radius: 22px; transition: 0.3s; }
    .slider:before { position: absolute; content:""; height: 18px; width: 18px; left: 2px; bottom: 2px; background: white; border-radius: 50%; transition: 0.3s; }
    input:checked + .slider { background: var(--hsk-accent, #e67e22); }
    input:checked + .slider:before { transform: translateX(18px); }
    .font-controls { display: flex; gap: 6px; }
    .font-controls button { background: var(--hsk-accent, #e67e22); color: white; border: none; border-radius: 20px; padding: 4px 12px; cursor: pointer; font-weight:600; }
    
    .drkhan-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .chat-header {
        padding: 10px 20px; display: flex; align-items: center; gap: 12px;
        border-bottom: 1px solid var(--border-light); flex-shrink: 0; flex-wrap: wrap;
        background: var(--bg-glass);
        color: var(--text-primary);
    }
    .chat-header .wod { font-size: 0.8rem; color: var(--text-secondary); flex-shrink:0; }
    .chat-header input { flex: 1; padding: 8px 16px; border-radius: 40px; border: 1px solid var(--border-light); background: rgba(255,255,255,0.5); min-width: 120px; font-size:0.85rem; outline:none; color: var(--text-primary); }
    .dark .chat-header input { background: rgba(255,255,255,0.05); color: var(--text-primary); }
    .chat-header select {
        background: var(--bg-glass); border: 1px solid var(--border-light);
        border-radius: 40px; padding: 6px 14px; font-size: 0.8rem;
        font-weight: 600; color: var(--text-primary);
        flex-shrink:0; cursor:pointer; outline:none;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .dark .chat-header select { background: rgba(255,255,255,0.05); color: var(--text-primary); }
    
    /* Level Badge */
    .level-badge {
        font-size: 0.65rem; background: var(--bg-glass); border: 1px solid var(--border-light);
        border-radius: 30px; padding: 2px 12px; color: var(--text-secondary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 200px; flex-shrink: 1;
    }
    
    .drkhan-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .message { display: flex; gap: 12px; align-items: flex-start; }
    .message.user { flex-direction: row-reverse; }
    .avatar { width: 38px; height: 38px; border-radius: 50%; background: #e6f0fa; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
    .user .avatar { background: var(--hsk-accent, #e67e22); color: white; }
    .bubble-wrapper { max-width: 80%; position: relative; }
    .message-bubble {
        padding: 12px 18px; border-radius: 20px;
        background: rgba(255,255,255,0.85); backdrop-filter: blur(4px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.03); line-height: 1.6; word-wrap: break-word;
        color: var(--text-primary);
    }
    .dark .message-bubble { background: rgba(50,50,70,0.9); color: #e2e8f0; }
    .user .message-bubble { background: var(--hsk-accent, #e67e22); color: white; }
    .message-actions {
        position: absolute; top: -12px; right: 10px; display: flex; gap: 4px;
        opacity: 0; transform: translateY(4px); transition: all 0.2s;
        background: rgba(255,255,255,0.9); border-radius: 20px; padding: 2px 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .dark .message-actions { background: rgba(40,40,60,0.9); color: #e0e0e0; }
    .message:hover .message-actions { opacity: 1; transform: translateY(0); }
    .icon-btn { background: transparent; border: none; cursor: pointer; color: inherit; opacity: 0.6; font-size: 0.85rem; padding: 2px 4px; transition: opacity 0.15s; }
    .icon-btn:hover { opacity: 1; }
    .timestamp { font-size: 0.6rem; opacity: 0.5; margin-top: 4px; text-align: right; color: var(--text-muted); }
    .read-more { background: transparent; border: none; color: var(--hsk-accent, #e67e22); cursor: pointer; font-size: 0.8rem; margin-top: 4px; font-weight:500; }
    .typing .message-bubble { background: #e6f0fa; display: flex; gap: 4px; padding: 12px 16px; }
    .dark .typing .message-bubble { background: rgba(50,50,70,0.9); }
    .typing-indicator span { animation: blink 1.4s infinite; font-size: 1.2rem; }
    @keyframes blink { 0% { opacity:0.2; } 20% { opacity:1; } 100% { opacity:0.2; } }
    
    .input-area {
        padding: 12px 20px; border-top: 1px solid var(--border-light);
        display: flex; gap: 8px; align-items: flex-end;
        background: var(--bg-glass);
        backdrop-filter: blur(4px);
    }
    .input-area textarea {
        flex: 1; padding: 10px 16px; border-radius: 40px;
        border: 1px solid var(--border-light); background: rgba(255,255,255,0.6);
        resize: none; font-size: 0.9rem; outline: none; max-height: 120px;
        transition: border-color 0.2s;
        color: var(--text-primary);
    }
    .dark .input-area textarea { background: rgba(255,255,255,0.05); color: var(--text-primary); }
    .input-area textarea::placeholder { color: var(--text-muted); }
    .input-area textarea:focus { border-color: var(--hsk-accent, #e67e22); }
    .send-btn, .share-btn, .mic-btn, .quiz-btn {
        border: none; border-radius: 50%; width: 44px; height: 44px;
        display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.1rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08); flex-shrink: 0;
        transition: all 0.2s;
    }
    .send-btn { background: var(--hsk-accent, #e67e22); color: white; }
    .send-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px var(--hsk-glow, rgba(230,126,34,0.3)); }
    .share-btn { background: #555; color: white; }
    .share-btn:hover { transform: scale(1.05); }
    .mic-btn { background: #4a9eff; color: white; }
    .mic-btn:hover { transform: scale(1.05); }
    .quiz-btn { background: var(--hsk-accent, #8b5cf6); color: white; }
    .quiz-btn:hover { transform: scale(1.05); }
    
    .suggestions {
        display: flex; gap: 8px; padding: 6px 20px; overflow-x: auto;
        white-space: nowrap; flex-wrap: nowrap; border-top: 1px solid var(--border-light);
        background: var(--bg-glass); scrollbar-width: none; -ms-overflow-style: none;
    }
    .suggestion-chip {
        flex-shrink: 0; background: rgba(0,0,0,0.04); border-radius: 30px;
        padding: 4px 14px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
        border: 1px solid transparent;
        color: var(--text-primary);
    }
    .dark .suggestion-chip { background: rgba(255,255,255,0.04); color: var(--text-primary); }
    .suggestion-chip:hover { background: var(--hsk-accent, #e67e22); color: white; border-color: var(--hsk-accent, #e67e22); transform: scale(1.02); }
    
    .drkhan-stats { font-size: 0.6rem; opacity: 0.5; padding: 4px 20px 8px; text-align: right; color: var(--text-muted); }
    .drkhan-toast {
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: var(--hsk-accent, #e67e22); color: white; padding: 10px 24px; border-radius: 30px;
        z-index: 99999; box-shadow: 0 4px 16px rgba(0,0,0,0.2); animation: fadeInUp 0.3s;
    }
    @keyframes fadeInUp { from { opacity:0; transform:translate(-50%,20px); } to { opacity:1; transform:translate(-50%,0); } }
    .muted { opacity: 0.6; font-size: 0.8rem; color: var(--text-muted); }
    @media (max-width: 700px) { .drkhan-sidebar { width: 0 !important; } .drkhan-panel { width: 95vw; height: 92vh; } }
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
                <select id="header-hsk">
                    <option value="1">HSK 1</option>
                    <option value="2">HSK 2</option>
                    <option value="3" selected>HSK 3</option>
                    <option value="4">HSK 4</option>
                    <option value="5">HSK 5</option>
                    <option value="6">HSK 6</option>
                </select>
                <span class="level-badge" id="level-badge">🎧 Picture Selection · 📖 Word Recognition</span>
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

        const headerHsk = document.getElementById('header-hsk');
        headerHsk.addEventListener('change', function(e) {
            hskLevel = parseInt(e.target.value);
            applyThemeToPanel(hskLevel);
            updateLevelBadge(hskLevel);
            animateLevelChange();
            const sidebar = document.getElementById('drkhan-sidebar');
            if (sidebar) {
                const theme = getTheme(hskLevel);
                sidebar.style.setProperty('--hsk-accent', theme.accent);
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

        // Suggestion label
        const suggestionLabel = document.createElement('div');
        suggestionLabel.className = 'drkhan-suggestion';
        suggestionLabel.textContent = '💬 Ask Dr. Khan';
        suggestionLabel.style.cssText = `
            position: fixed; bottom: 100px; right: 30px;
            background: rgba(10,41,66,0.92); color: white;
            padding: 8px 18px; border-radius: 40px; font-size: 0.9rem; font-weight: 600;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 9999;
            opacity: 0; transform: translateY(10px);
            transition: opacity 0.5s ease, transform 0.5s ease;
            pointer-events: none; white-space: nowrap;
            border: 1px solid #ffd966; backdrop-filter: blur(8px);
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
        document.getElementById('drkhan-send').addEventListener('click', hideSuggestion);

        setInterval(() => {
            updateBubbleReminders();
        }, 30000);

        applyThemeToPanel(hskLevel);
        updateLevelBadge(hskLevel);
    }

    // ---------- Init ----------
    function init() {
        loadStreak();
        loadFlashcards();
        loadConversations();
        createWidget();
        renderAll();
    }

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
