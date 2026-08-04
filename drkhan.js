*** Begin Patch
*** Update File: drkhan.js
@@
     // ---------- Model Selection ----------
     async function getBestModel() {
-        if (currentModelId) return currentModelId;
-        try {
-            const models = await puter.ai.listModels();
-            const preferred = ['google/gemini-3.1-flash-lite', 'google/gemini-2.5-flash-lite-001', 'google/gemini-2.0-flash-lite-001', 'gpt-5.4-nano'];
-            for (const preferredId of preferred) {
-                if (models.some(m => m.id === preferredId)) { currentModelId = preferredId; return currentModelId; }
-            }
-            const geminiModel = models.find(m => m.id.toLowerCase().includes('gemini'));
-            if (geminiModel) { currentModelId = geminiModel.id; return currentModelId; }
-            if (models.length > 0) { currentModelId = models[0].id; return currentModelId; }
-            throw new Error('No chat models available');
-        } catch (err) {
-            console.warn('Model listing failed, using safe default', err);
-            currentModelId = 'google/gemini-3.1-flash-lite';
-            return currentModelId;
-        }
+        if (currentModelId) return currentModelId;
+        // Lazy-load the puter script only when needed. This avoids heavy work during page load.
+        await loadPuterScript().catch(() => null);
+        try {
+            if (!window.puter || !window.puter.ai) throw new Error('puter not available');
+            const models = await puter.ai.listModels();
+            const preferred = ['google/gemini-3.1-flash-lite', 'google/gemini-2.5-flash-lite-001', 'google/gemini-2.0-flash-lite-001', 'gpt-5.4-nano'];
+            for (const preferredId of preferred) {
+                if (models.some(m => m.id === preferredId)) { currentModelId = preferredId; return currentModelId; }
+            }
+            const geminiModel = models.find(m => m.id.toLowerCase().includes('gemini'));
+            if (geminiModel) { currentModelId = geminiModel.id; return currentModelId; }
+            if (models.length > 0) { currentModelId = models[0].id; return currentModelId; }
+            throw new Error('No chat models available');
+        } catch (err) {
+            console.warn('Model listing failed or puter unavailable, using safe default', err);
+            currentModelId = 'google/gemini-3.1-flash-lite';
+            return currentModelId;
+        }
     }
+
+    // Lazy loader for the puter script. Returns a promise that resolves when puter.ai is available.
+    function loadPuterScript() {
+        if (window.puter && window.puter.ai) return Promise.resolve();
+        if (window._puterLoadingPromise) return window._puterLoadingPromise;
+        window._puterLoadingPromise = new Promise((resolve, reject) => {
+            try {
+                const s = document.createElement('script');
+                s.src = 'https://js.puter.com/v2/';
+                s.async = true;
+                s.onload = () => {
+                    const start = Date.now();
+                    (function waitForPuter() {
+                        if (window.puter && window.puter.ai) return resolve();
+                        if (Date.now() - start > 10000) return reject(new Error('puter load timeout'));
+                        setTimeout(waitForPuter, 200);
+                    })();
+                };
+                s.onerror = () => reject(new Error('puter script failed to load'));
+                document.head.appendChild(s);
+            } catch (e) { reject(e); }
+        });
+        return window._puterLoadingPromise;
+    }
*** End Patch
