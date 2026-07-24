// drkhan.js – Enhanced Chinese Learning Assistant v2.0
(function() {
    const STORAGE_KEY = 'drkhan_conversations';
    const FLASHCARD_KEY = 'drkhan_flashcards';
    const STREAK_KEY = 'drkhan_streak';
    const MAX_MESSAGE_LENGTH = 1000;
    const MAX_HISTORY_MESSAGES = 20;

    // ---- State ----
    let conversations = [];
    let currentConvId = null;
    let isWaiting = false;
    let pinnedMessages = [];
    let currentSearch = '';
    let fontSize = 16;
    let panelDarkMode = false;
    let personality = 'tutor';
    let hskLevel = 3; // default HSK 3
    let sidebarOpen = true;
    let currentModelId = null;
    let flashcards = [];
    let streak = 0;
    let lastActiveDate = '';

    // ---- Streak tracking ----
    function updateStreak() {
        const today = new Date().toDateString();
        if (lastActiveDate !== today) {
            // If last active was yesterday, increment; else reset to 0
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastActiveDate === yesterday.toDateString()) {
                streak += 1;
            } else {
                streak = 1;
            }
            lastActiveDate = today;
            localStorage.setItem(STREAK_KEY, JSON.stringify({ streak, lastActiveDate }));
        }
    }

    function loadStreak() {
        try {
            const data = JSON.parse(localStorage.getItem(STREAK_KEY));
            if (data) {
                streak = data.streak || 0;
                lastActiveDate = data.lastActiveDate || '';
                // If last active is not today and not yesterday, reset
                const today = new Date().toDateString();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (lastActiveDate !== today && lastActiveDate !== yesterday.toDateString()) {
                    streak = 0;
                }
            }
        } catch(e) { streak = 0; }
    }

    // ---- Flashcards ----
    function loadFlashcards() {
        try {
            const data = JSON.parse(localStorage.getItem(FLASHCARD_KEY));
            flashcards = Array.isArray(data) ? data : [];
        } catch(e) { flashcards = []; }
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
            saveFlashcards();
            showToast(`✅ Added "${trimmed}" to flashcards`);
        } else {
            showToast(`"${trimmed}" already in flashcards`);
        }
    }

    function removeFlashcard(word) {
        flashcards = flashcards.filter(w => w !== word);
        saveFlashcards();
        renderSidebar();
    }

    // ---- Helper functions ----
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

    function truncateText(text, maxLen = 300) {
        if (text.length <= maxLen) return text;
        return text.substring(0, maxLen) + '…';
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
            } catch (e) { conversations = []; }
        }
        if (conversations.length === 0) {
            conversations.push({
                id: Date.now(),
                name: 'New Chat',
                messages: [{ role: 'assistant', content: '👋 你好！我是 Dr. Khan，你的中文学习助手。问我关于词汇、语法或任何中文学习问题吧！', timestamp: Date.now() }]
            });
        }
        if (!currentConvId) currentConvId = conversations[0].id;
        const storedPinned = localStorage.getItem('drkhan_pinned');
        if (storedPinned) pinnedMessages = JSON.parse(storedPinned);
    }

    function saveConversations() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        if (typeof window.syncConversationsUpdate === 'function') {
            window.syncConversationsUpdate(conversations);
        }
    }

    function getCurrentConv() { return conversations.find(c => c.id === currentConvId); }

    function addMessage(role, content) {
        const conv = getCurrentConv();
        if (!conv) return;
        conv.messages.push({ role, content, timestamp: Date.now() });
        saveConversations();
        renderMessages();
        renderSidebar();
        updateStats();
        // Update streak on any user message
        if (role === 'user') {
            updateStreak();
            renderSidebar();
        }
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
        if (existingIdx !== -1) {
            pinnedMessages.splice(existingIdx, 1);
        } else {
            pinnedMessages.push({ convId: currentConvId, idx, content: msg.content });
        }
        savePinned();
        renderSidebar();
        renderMessages();
    }

    function savePinned() { localStorage.setItem('drkhan_pinned', JSON.stringify(pinnedMessages)); }

    function isPinned(idx) { return pinnedMessages.some(p => p.convId === currentConvId && p.idx === idx); }

    // ---- Render functions ----
    function renderSidebar() {
        const sidebar = document.getElementById('drkhan-sidebar');
        if (!sidebar) return;
        let html = `<div class="sidebar-section">
            <div class="section-title">📋 对话</div>
            <div class="conv-list">`;
        conversations.forEach(c => {
            const active = c.id === currentConvId ? 'active' : '';
            html += `<div class="conv-item ${active}" data-id="${c.id}" ondblclick="window.renameConversationPrompt(${c.id})">
                <span class="conv-name">${escapeHtml(c.name)}</span>
                <span class="conv-actions">
                    <button class="icon-btn delete-conv" data-id="${c.id}" title="删除">🗑️</button>
                </span>
            </div>`;
        });
        html += `</div>
            <button class="icon-btn new-chat-sidebar" id="new-chat-sidebar">➕ 新对话</button>
        </div>
        <div class="sidebar-section pinned-section-sidebar">
            <div class="section-title">📌 收藏笔记</div>`;
        const pinnedForConv = pinnedMessages.filter(p => p.convId === currentConvId);
        if (pinnedForConv.length === 0) {
            html += `<div class="muted">暂无收藏</div>`;
        } else {
            pinnedForConv.forEach(p => {
                const snippet = truncateText(p.content, 60);
                html += `<div class="pinned-note-item" onclick="window.scrollToMessage(${p.idx})">📌 ${escapeHtml(snippet)}</div>`;
            });
        }
        html += `</div>
        <div class="sidebar-section flashcards-section">
            <div class="section-title">📇 单词卡 (${flashcards.length})</div>`;
        if (flashcards.length === 0) {
            html += `<div class="muted">还没有单词卡 – 点击消息中的 📇 添加</div>`;
        } else {
            flashcards.forEach(word => {
                html += `<div class="flashcard-item">
                    <span class="flashcard-word">${escapeHtml(word)}</span>
                    <button class="icon-btn flashcard-ask" data-word="${escapeHtml(word)}" title="询问 Dr. Khan">💬</button>
                    <button class="icon-btn flashcard-remove" data-word="${escapeHtml(word)}" title="移除">✕</button>
                </div>`;
            });
        }
        html += `</div>
        <div class="sidebar-section settings-section">
            <div class="section-title">⚙️ 设置</div>
            <div class="setting-row">
                <label>教学模式</label>
                <select id="sidebar-personality">
                    <option value="tutor" ${personality === 'tutor' ? 'selected' : ''}>📘 全能导师</option>
                    <option value="grammar" ${personality === 'grammar' ? 'selected' : ''}>📝 语法专精</option>
                    <option value="vocab" ${personality === 'vocab' ? 'selected' : ''}>📚 词汇拓展</option>
                    <option value="exam" ${personality === 'exam' ? 'selected' : ''}>🎯 考试备战</option>
                </select>
            </div>
            <div class="setting-row">
                <label>HSK 等级</label>
                <select id="sidebar-hsk">
                    <option value="1" ${hskLevel === 1 ? 'selected' : ''}>HSK 1</option>
                    <option value="2" ${hskLevel === 2 ? 'selected' : ''}>HSK 2</option>
                    <option value="3" ${hskLevel === 3 ? 'selected' : ''}>HSK 3</option>
                    <option value="4" ${hskLevel === 4 ? 'selected' : ''}>HSK 4</option>
                    <option value="5" ${hskLevel === 5 ? 'selected' : ''}>HSK 5</option>
                    <option value="6" ${hskLevel === 6 ? 'selected' : ''}>HSK 6</option>
                </select>
            </div>
            <div class="setting-row">
                <span>深色模式</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="sidebar-dark-toggle" ${panelDarkMode ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            <div class="setting-row">
                <span>字体大小</span>
                <div class="font-controls">
                    <button id="font-minus">A-</button>
                    <button id="font-plus">A+</button>
                </div>
            </div>
        </div>`;
        sidebar.innerHTML = html;

        // Event listeners
        document.querySelectorAll('.conv-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (e.target.closest('.delete-conv')) return;
                const id = Number(item.dataset.id);
                if (id !== currentConvId) {
                    currentConvId = id;
                    saveConversations();
                    renderAll();
                }
            });
        });
        document.querySelectorAll('.delete-conv').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = Number(btn.dataset.id);
                deleteConversation(id);
            });
        });
        document.getElementById('new-chat-sidebar')?.addEventListener('click', (e) => {
            e.stopPropagation();
            newConversation();
        });
        document.getElementById('sidebar-personality')?.addEventListener('change', (e) => {
            personality = e.target.value;
        });
        document.getElementById('sidebar-hsk')?.addEventListener('change', (e) => {
            hskLevel = parseInt(e.target.value);
        });
        document.getElementById('sidebar-dark-toggle')?.addEventListener('change', togglePanelDarkMode);
        document.getElementById('font-minus')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setFontSize(-2);
        });
        document.getElementById('font-plus')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setFontSize(2);
        });

        // Flashcard interaction
        document.querySelectorAll('.flashcard-ask').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const word = btn.dataset.word;
                if (word) {
                    document.getElementById('drkhan-input').value = `解释一下这个词的用法：${word}`;
                    sendMessage();
                }
            });
        });
        document.querySelectorAll('.flashcard-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const word = btn.dataset.word;
                if (word) removeFlashcard(word);
            });
        });
    }

    function renderAll() {
        renderSidebar();
        renderMessages();
        updateStats();
        updateContextSuggestions();
        updateWordOfDay();
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
            html += `
                <div class="message ${msg.role}" data-idx="${originalIdx}">
                    <div class="avatar">${avatar}</div>
                    <div class="bubble-wrapper">
                        <div class="message-bubble" style="font-size:${fontSize}px">
                            <div class="message-content ${isLong ? 'truncated' : ''}" id="msg-content-${originalIdx}">
                                ${contentHtml}
                            </div>
                            ${isLong ? `<button class="read-more" data-idx="${originalIdx}">展开</button>` : ''}
                        </div>
                        <div class="message-actions">
                            ${!isUser ? `<button class="icon-btn pin-btn" data-idx="${originalIdx}" title="${pinned ? '取消收藏' : '收藏'}">${pinned ? '📌' : '📍'}</button>` : ''}
                            ${!isUser ? `<button class="icon-btn flashcard-add-btn" data-msgidx="${originalIdx}" title="添加到单词卡">📇</button>` : ''}
                            <button class="icon-btn copy-btn" data-idx="${originalIdx}" title="复制">📋</button>
                            ${isUser ? `<button class="icon-btn edit-btn" data-idx="${originalIdx}" title="编辑">✏️</button>` : `<button class="icon-btn quote-btn" data-idx="${originalIdx}" title="引用">💬</button>`}
                            <button class="icon-btn delete-btn" data-idx="${originalIdx}" title="删除">🗑️</button>
                        </div>
                        <div class="timestamp">${time}</div>
                    </div>
                </div>`;
        });
        if (isWaiting) {
            html += `<div class="message assistant typing">
                <div class="avatar">📘</div>
                <div class="bubble-wrapper"><div class="message-bubble typing-indicator"><span>.</span><span>.</span><span>.</span></div></div>
            </div>`;
        }
        msgsDiv.innerHTML = html;

        // Event listeners
        msgsDiv.querySelectorAll('.read-more').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                window.toggleReadMore(idx);
            });
        });
        msgsDiv.querySelectorAll('.pin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.togglePinMessage(parseInt(btn.dataset.idx));
            });
        });
        msgsDiv.querySelectorAll('.flashcard-add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.msgidx);
                const conv = getCurrentConv();
                if (!conv || !conv.messages[idx]) return;
                // Extract potential vocabulary: simple heuristic – first Chinese word in the message
                const msg = conv.messages[idx].content;
                const words = msg.match(/[\u4e00-\u9fa5]{2,}/g);
                if (words && words.length > 0) {
                    // Ask user which word to add
                    const word = prompt('添加单词到卡片（选择或输入）:', words[0]);
                    if (word && word.trim()) addFlashcard(word.trim(), msg);
                } else {
                    const word = prompt('输入要添加的单词:');
                    if (word && word.trim()) addFlashcard(word.trim(), msg);
                }
            });
        });
        msgsDiv.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.copyMessageContent(parseInt(btn.dataset.idx));
            });
        });
        msgsDiv.querySelectorAll('.quote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.quoteMessage(parseInt(btn.dataset.idx));
            });
        });
        msgsDiv.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.deleteMessage(parseInt(btn.dataset.idx));
            });
        });
        msgsDiv.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                const conv = getCurrentConv();
                if (!conv || !conv.messages[idx]) return;
                const newContent = prompt('编辑你的消息:', conv.messages[idx].content);
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
        const contentEl = document.getElementById(`msg-content-${idx}`);
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
        if (statsEl) statsEl.innerText = `${msgCount} 条消息 · ~${wordCount} 词 · 🔥 ${streak}天`;
    }

    function updateContextSuggestions() {
        const container = document.getElementById('suggestions');
        if (!container) return;
        const allSuggestions = [
            '怎么用 “把” 字句？',
            '“漂亮” 和 “美丽” 的区别',
            '帮我纠正这句话：我昨天去图书馆了。',
            '怎么记 “图书馆” 这个词？',
            '“虽然...但是...” 的用法',
            '给我一个 HSK4 的例句',
        ];
        container.innerHTML = allSuggestions.slice(0,5).map(s => 
            `<div class="suggestion-chip" data-question="${escapeHtml(s)}">📖 ${escapeHtml(s)}</div>`
        ).join('');
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                const q = chip.getAttribute('data-question');
                if (q) {
                    document.getElementById('drkhan-input').value = q;
                    sendMessage(q);
                }
            });
        });
    }

    let wordOfDay = '';
    let wordOfDayMeaning = '';

    function updateWordOfDay() {
        const wodEl = document.getElementById('word-of-day');
        if (!wodEl) return;
        // Simple list of common HSK words
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
        const today = new Date().toDateString();
        // Change daily based on date
        const idx = new Date().getDate() % words.length;
        const chosen = words[idx];
        wordOfDay = chosen.word;
        wordOfDayMeaning = chosen.meaning;
        wodEl.innerHTML = `📖 今日词: <strong>${chosen.word}</strong> (${chosen.meaning}) <button class="wod-ask">❓</button>`;
        wodEl.querySelector('.wod-ask')?.addEventListener('click', () => {
            document.getElementById('drkhan-input').value = `解释 "${chosen.word}" 的用法，并给出例句`;
            sendMessage();
        });
    }

    function quoteMessage(idx) {
        const conv = getCurrentConv();
        if (!conv || !conv.messages[idx]) return;
        const msg = conv.messages[idx];
        const quoted = `> ${msg.content.replace(/\n/g, '\n> ')}`;
        const input = document.getElementById('drkhan-input');
        if (input) {
            input.value = input.value ? `${input.value}\n${quoted}` : quoted;
            input.focus();
        }
    }

    function copyMessageContent(idx) {
        const conv = getCurrentConv();
        if (!conv) return;
        navigator.clipboard.writeText(conv.messages[idx].content).then(() => showToast('已复制！')).catch(() => showToast('复制失败'));
    }

    // ---- Pronunciation Check (Speech Recognition) ----
    function startPronunciationCheck() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showToast('您的浏览器不支持语音识别');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('drkhan-input').value = `请评价我的发音: "${transcript}"`;
            sendMessage();
        };
        recognition.onerror = (e) => {
            showToast('语音识别错误: ' + e.error);
        };
        recognition.start();
        showToast('🎤 请说出中文...');
    }

    // ---- Model selection ----
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

    // ---- Send message (with HSK level) ----
    async function sendMessage(initialText = null, isRegenerate = false) {
        const input = document.getElementById('drkhan-input');
        const text = initialText || (input ? input.value.trim() : '');
        if (!text || isWaiting) return;

        let puterReady = false;
        for (let i = 0; i < 5; i++) {
            if (window.puter && window.puter.ai) { puterReady = true; break; }
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!puterReady) {
            addMessage('assistant', 'Dr. Khan 暂时不可用，请刷新页面重试。');
            return;
        }
        if (input) input.value = '';
        if (!isRegenerate) addMessage('user', text);
        isWaiting = true;
        renderMessages();

        let personalityInstruction = '';
        if (personality === 'grammar') {
            personalityInstruction = 'Focus on grammar analysis. Explain sentence structure, particle usage, and common errors. Provide corrected versions.';
        } else if (personality === 'vocab') {
            personalityInstruction = 'Expand vocabulary: give synonyms, antonyms, collocations, radicals, and mnemonic tips. Offer example sentences in different contexts.';
        } else if (personality === 'exam') {
            personalityInstruction = `Focus on HSK ${hskLevel} exam preparation. Give high-frequency vocabulary, test-taking strategies, and practice questions. Tailor all content to HSK ${hskLevel} level.`;
        } else {
            personalityInstruction = 'Act as a friendly Chinese tutor. Explain vocabulary usage, correct mistakes, provide mnemonics, and give contextual examples. Encourage the student and make learning fun.';
        }

        const systemPrompt = `你是一位专业的中文语言导师，名叫 Dr. Khan。你的主要职责是帮助学生学习中文（普通话）。你只回答与中文学习相关的问题，包括词汇、语法、发音、写作和文化背景。

当前学生 HSK 等级: ${hskLevel}。

指导原则：
- 对每个问题都提供清晰、准确、有用的回答。
- 当学生问某个词怎么用时，给出多种语境下的例句，并解释常见搭配。
- 如果学生写了句子，请检查语法和用词，指出错误并提供正确的说法。
- 提供记忆技巧：如拆解汉字（偏旁部首）、联想记忆、同义词/反义词对比。
- 根据学生的 HSK 等级（${hskLevel}）调整回答的难度。
- 保持友好、鼓励的语气，让学习变得有趣。

${personalityInstruction}

用中文回答，除非被要求用其他语言。`;

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
            addMessage('assistant', 'Dr. Khan 出错了：' + e.message);
        }
    }

    // ---- Conversation management ----
    function newConversation() {
        const id = Date.now();
        conversations.push({
            id,
            name: '对话 ' + (conversations.length + 1),
            messages: [{ role: 'assistant', content: '👋 你好！我是 Dr. Khan，你的中文学习助手。问我关于词汇、语法或任何中文学习问题吧！', timestamp: Date.now() }]
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
        const newName = prompt('重命名对话:', conv.name);
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
        let text = `对话: ${conv.name}\n导出时间: ${new Date().toLocaleString()}\n\n`;
        conv.messages.forEach(m => {
            const role = m.role === 'user' ? '你' : 'Dr. Khan';
            const time = new Date(m.timestamp).toLocaleTimeString();
            text += `[${role}] (${time}):\n${m.content}\n\n`;
        });
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drkhan-${conv.name.replace(/\s+/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function shareConversation() {
        const conv = getCurrentConv();
        if (!conv) return;
        let text = `Dr. Khan 中文学习对话: ${conv.name}\n\n`;
        conv.messages.forEach(m => {
            text += `${m.role === 'user' ? '你' : 'Dr. Khan'}: ${m.content}\n\n`;
        });
        navigator.clipboard.writeText(text).then(() => showToast('已复制！')).catch(() => showToast('复制失败'));
    }

    function setFontSize(delta) {
        fontSize = Math.min(32, Math.max(12, fontSize + delta));
        document.querySelectorAll('.message-bubble').forEach(el => el.style.fontSize = fontSize + 'px');
    }

    function togglePanelDarkMode() {
        panelDarkMode = !panelDarkMode;
        const panel = document.querySelector('.drkhan-panel');
        if (panel) panelDarkMode ? panel.classList.add('dark') : panel.classList.remove('dark');
        const toggleInput = document.getElementById('sidebar-dark-toggle');
        if (toggleInput) toggleInput.checked = panelDarkMode;
    }

    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'drkhan-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ---- Create Widget ----
    function createWidget() {
        const container = document.createElement('div');
        container.id = 'drkhan-container';
        container.innerHTML = `
<style>
    #drkhan-container * { box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    :root {
        --primary: #e67e22;
        --primary-dark: #d35400;
        --bg-glass: rgba(255,255,255,0.65);
        --bg-sidebar: rgba(248,252,255,0.8);
        --border-light: rgba(230,126,34,0.2);
        --shadow-sm: 0 8px 30px rgba(0,0,0,0.08);
        --shadow-lg: 0 20px 50px rgba(0,0,0,0.2);
    }
    .drkhan-bubble {
        position: fixed;
        bottom: 25px;
        right: 25px;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(145deg, #e67e22, #d35400);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        z-index: 10000;
        transition: 0.2s;
        border: 2px solid #f1c40f;
        font-size: 2.4rem;
        touch-action: manipulation;
    }
    .drkhan-bubble:hover { transform: scale(1.05); }
    .drkhan-bubble .tooltip {
        position: absolute;
        top: -32px;
        background: #0a2942;
        color: white;
        padding: 5px 14px;
        border-radius: 30px;
        font-size: 0.8rem;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
        white-space: nowrap;
    }
    .drkhan-bubble:hover .tooltip { opacity: 1; }
    .drkhan-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 850px;
        max-width: 95vw;
        height: 85vh;
        max-height: 800px;
        background: rgba(255,255,255,0.7);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-radius: 28px;
        box-shadow: var(--shadow-lg);
        display: none;
        flex-direction: column;
        z-index: 10001;
        overflow: hidden;
        border: 1px solid var(--border-light);
        transition: background 0.2s;
    }
    .drkhan-panel.dark {
        background: rgba(30,30,46,0.85);
        color: #e0e0e0;
        --bg-glass: rgba(30,30,46,0.85);
        --bg-sidebar: rgba(20,20,30,0.9);
        --border-light: rgba(255,255,255,0.1);
    }
    .drkhan-panel-header {
        background: rgba(211,84,0,0.9);
        backdrop-filter: blur(12px);
        color: white;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        flex-shrink: 0;
    }
    .drkhan-panel-header h3 { margin:0; font-size:1.2rem; display:flex; align-items:center; gap:8px; }
    .panel-actions { display: flex; gap: 8px; }
    .panel-btn {
        background: rgba(255,255,255,0.15);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 30px;
        font-size: 1rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: 0.2s;
    }
    .panel-btn:hover { background: rgba(255,255,255,0.3); }
    .drkhan-body {
        display: flex;
        flex: 1;
        overflow: hidden;
    }
    .drkhan-sidebar {
        width: 250px;
        background: var(--bg-sidebar);
        backdrop-filter: blur(12px);
        border-right: 1px solid var(--border-light);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        flex-shrink: 0;
        transition: width 0.3s;
    }
    .sidebar-section { padding: 16px 12px; border-bottom: 1px solid var(--border-light); }
    .section-title { font-weight: 600; opacity: 0.7; margin-bottom: 12px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .conv-list { display: flex; flex-direction: column; gap: 4px; }
    .conv-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.2s;
        font-size: 0.85rem;
    }
    .conv-item:hover { background: rgba(230,126,34,0.1); }
    .conv-item.active { background: var(--primary); color: white; }
    .conv-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
    .conv-actions { display: none; gap: 4px; }
    .conv-item:hover .conv-actions { display: flex; }
    .new-chat-sidebar { background: transparent; border: 1px dashed var(--primary); border-radius: 30px; color: var(--primary); padding: 8px 12px; margin-top: 8px; width: 100%; cursor: pointer; }
    .flashcard-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 0.85rem;
    }
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
    .drkhan-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .chat-header {
        padding: 10px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid var(--border-light);
        flex-shrink: 0;
        flex-wrap: wrap;
    }
    .chat-header .wod { font-size: 0.9rem; color: var(--text-secondary); flex-shrink:0; }
    .chat-header input { flex: 1; padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border-light); background: rgba(255,255,255,0.5); min-width: 120px; }
    .drkhan-messages {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .message { display: flex; gap: 12px; align-items: flex-start; }
    .message.user { flex-direction: row-reverse; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: #e6f0fa; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
    .user .avatar { background: var(--primary); color: white; }
    .bubble-wrapper { max-width: 80%; position: relative; }
    .message-bubble {
        padding: 12px 16px;
        border-radius: 20px;
        background: rgba(255,255,255,0.7);
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 10px rgba(0,0,0,0.03);
        line-height: 1.5;
        word-wrap: break-word;
    }
    .dark .message-bubble { background: rgba(45,45,68,0.8); color: #e0e0e0; }
    .user .message-bubble { background: var(--primary); color: white; }
    .message-actions {
        position: absolute;
        top: -12px;
        right: 10px;
        display: flex;
        gap: 4px;
        opacity: 0;
        transform: translateY(5px);
        transition: all 0.2s;
        background: rgba(255,255,255,0.9);
        border-radius: 20px;
        padding: 2px 6px;
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
        padding: 12px 20px;
        border-top: 1px solid var(--border-light);
        display: flex;
        gap: 8px;
        align-items: flex-end;
        background: rgba(255,255,255,0.4);
    }
    .input-area textarea {
        flex: 1;
        padding: 10px 16px;
        border-radius: 24px;
        border: 1px solid var(--border-light);
        background: rgba(255,255,255,0.7);
        resize: none;
        font-size: 0.9rem;
        outline: none;
        max-height: 120px;
    }
    .send-btn, .share-btn, .mic-btn {
        border: none;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.2rem;
        box-shadow: 0 4px 12px rgba(230,126,34,0.3);
        flex-shrink: 0;
    }
    .send-btn { background: var(--primary); color: white; }
    .share-btn { background: #555; color: white; }
    .mic-btn { background: #4a9eff; color: white; }
    .suggestions {
        display: flex;
        gap: 8px;
        padding: 6px 20px;
        overflow-x: auto;
        white-space: nowrap;
        flex-wrap: nowrap;
        border-top: 1px solid var(--border-light);
        background: rgba(255,255,255,0.3);
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .suggestions::-webkit-scrollbar { display: none; }
    .suggestion-chip {
        flex-shrink: 0;
        background: rgba(230,126,34,0.1);
        border-radius: 30px;
        padding: 5px 12px;
        font-size: 0.75rem;
        cursor: pointer;
        transition: 0.2s;
    }
    .suggestion-chip:hover { background: rgba(230,126,34,0.2); transform: scale(1.02); }
    .drkhan-stats { font-size: 0.65rem; opacity: 0.5; padding: 4px 20px 8px; text-align: right; }
    .drkhan-toast {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary);
        color: white;
        padding: 10px 24px;
        border-radius: 30px;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: fadeInUp 0.3s;
    }
    @keyframes fadeInUp { from { opacity:0; transform:translate(-50%,20px); } to { opacity:1; transform:translate(-50%,0); } }
    .muted { opacity: 0.5; font-size: 0.8rem; }
    @media (max-width: 700px) {
        .drkhan-sidebar { width: 0 !important; }
        .drkhan-panel { width: 95vw; height: 90vh; }
    }
</style>
<div class="drkhan-bubble">📘<span class="tooltip">Dr. Khan 帮你学中文</span></div>
<div class="drkhan-panel">
    <div class="drkhan-panel-header">
        <h3>📘 Dr. Khan</h3>
        <div class="panel-actions">
            <button class="panel-btn" id="sidebar-toggle" title="切换侧栏">☰</button>
            <button class="panel-btn" id="export-chat" title="导出对话">📥</button>
            <button class="panel-btn" id="minimize-panel" title="最小化">─</button>
            <button class="panel-btn" id="close-panel" title="关闭">✕</button>
        </div>
    </div>
    <div class="drkhan-body">
        <div class="drkhan-sidebar" id="drkhan-sidebar"></div>
        <div class="drkhan-main" id="drkhan-main">
            <div class="chat-header">
                <span id="current-conv-name" style="font-weight:600; flex-shrink:0;">新对话</span>
                <span class="wod" id="word-of-day">📖 今日词: --</span>
                <input type="text" id="drkhan-search" placeholder="🔍 搜索消息...">
            </div>
            <div class="drkhan-messages" id="drkhan-messages"></div>
            <div class="suggestions" id="suggestions"></div>
            <div class="input-area">
                <button class="mic-btn" id="mic-btn" title="语音输入">🎙️</button>
                <textarea id="drkhan-input" placeholder="输入你的中文问题..." rows="1" maxlength="1000"></textarea>
                <button class="share-btn" id="share-conv" title="分享对话">🔗</button>
                <button class="send-btn" id="drkhan-send">➤</button>
            </div>
            <div class="drkhan-stats" id="drkhan-stats"></div>
        </div>
    </div>
</div>`;
        document.body.appendChild(container);

        const panel = container.querySelector('.drkhan-panel');
        const bubble = container.querySelector('.drkhan-bubble');

        bubble.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
        });

        document.addEventListener('click', (e) => {
            if (panel.style.display === 'flex' &&
                !panel.contains(e.target) &&
                e.target !== bubble &&
                !e.target.closest('#drkhan-selection-popup')) {
                panel.style.display = 'none';
            }
        });

        const mainArea = document.getElementById('drkhan-main');
        mainArea.addEventListener('click', (e) => {
            const sidebar = document.getElementById('drkhan-sidebar');
            if (sidebarOpen && !e.target.closest('#sidebar-toggle') && !e.target.closest('.drkhan-sidebar')) {
                sidebarOpen = false;
                sidebar.style.width = '0px';
            }
        });

        document.getElementById('minimize-panel').onclick = () => panel.style.display = 'none';
        document.getElementById('close-panel').onclick = () => panel.style.display = 'none';
        document.getElementById('sidebar-toggle').onclick = (e) => {
            e.stopPropagation();
            sidebarOpen = !sidebarOpen;
            document.getElementById('drkhan-sidebar').style.width = sidebarOpen ? '250px' : '0px';
        };
        document.getElementById('export-chat').onclick = exportConversation;
        document.getElementById('share-conv').onclick = shareConversation;
        document.getElementById('drkhan-send').onclick = () => sendMessage();
        document.getElementById('mic-btn').onclick = startPronunciationCheck;

        const textarea = document.getElementById('drkhan-input');
        textarea.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(120, this.scrollHeight) + 'px';
        });
        document.getElementById('drkhan-search').addEventListener('input', (e) => {
            currentSearch = e.target.value.trim().toLowerCase();
            renderMessages();
        });

        // drag
        let isDragging = false, dragOffsetX, dragOffsetY;
        const header = panel.querySelector('.drkhan-panel-header');
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            panel.style.transition = 'none';
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = (e.clientX - dragOffsetX) + 'px';
            panel.style.top = (e.clientY - dragOffsetY) + 'px';
            panel.style.transform = 'none';
        });
        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panel.style.transition = '';
            }
        });

        // keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('drkhan-search').focus();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                newConversation();
            }
        });
    }

    // ---- Init ----
    function init() {
        loadStreak();
        loadFlashcards();
        loadConversations();
        createWidget();
        renderAll();
    }

    // Expose functions
    window.sendMessage = sendMessage;
    window.scrollToMessage = (idx) => {
        const el = document.querySelector(`.message[data-idx="${idx}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.togglePinMessage = togglePinMessage;
    window.editUserMessage = editUserMessage;
    window.deleteMessage = deleteMessage;
    window.copyMessageContent = copyMessageContent;
    window.quoteMessage = quoteMessage;
    window.addFlashcard = addFlashcard;

    init();
})();
