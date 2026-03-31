// speech.js – Reliable text-to-speech for all devices
(function() {
  // Check if speech synthesis is supported
  if (!window.speechSynthesis) {
    console.warn("❌ Speech synthesis not supported in this browser.");
    window.speakText = function(text) {
      console.warn("Cannot speak: " + text);
    };
    return;
  }

  // Global speak function – call this whenever you need to speak
  window.speakText = function(text) {
    if (!text) return;
    try {
      // Cancel any ongoing speech to avoid overlapping
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';    // Chinese (Mandarin)
      utterance.rate = 0.9;        // Slightly slower for clarity
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      console.log("🔊 Speaking:", text);
    } catch (err) {
      console.error("Speech error:", err);
    }
  };

  // Optional: wait for voices to load (some browsers need this)
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', function onVoices() {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      console.log("✅ Voices loaded – speech ready.");
    });
  } else {
    console.log("✅ Voices already available.");
  }

  console.log("🎤 Speech module loaded – speakText is ready.");
})();
