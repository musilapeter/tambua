/* ═══════════════════════════════════════════════════════════════
   TAMBUA — Voice Module
   Web Speech API: Speech-to-Text (STT) & Text-to-Speech (TTS)
   Hold-to-speak with visual feedback
   ═══════════════════════════════════════════════════════════════ */

var VoiceManager = (function () {

    // ─── LANGUAGE MAPPING ───
    // Maps Tambua language codes to BCP-47 speech recognition codes
    var LANG_MAP = {
        en: 'en-KE',
        sw: 'sw-KE',
        ki: 'en-KE',   // Kikuyu uses English (Kenya) recognition as fallback
        sh: 'sw-KE',   // Sheng uses Swahili recognition as base
        lu: 'en-KE',   // Luo uses English (Kenya) as fallback
        ka: 'en-KE'    // Kalenjin uses English (Kenya) as fallback
    };

    // TTS voice language preference
    var TTS_LANG_MAP = {
        en: 'en-GB',
        sw: 'sw',
        ki: 'en-GB',
        sh: 'sw',
        lu: 'en-GB',
        ka: 'en-GB'
    };

    // ─── STATE ───
    var recognition = null;
    var isRecording = false;
    var currentCallback = null;
    var currentTranscript = '';
    var activeButton = null;

    // ─── FEATURE DETECTION ───
    function isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    function isTTSSupported() {
        return 'speechSynthesis' in window;
    }

    // ─── CREATE RECOGNITION INSTANCE ───
    function createRecognition(language) {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;

        var rec = new SpeechRecognition();
        rec.lang = LANG_MAP[language] || 'en-KE';
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        return rec;
    }

    // ─── START LISTENING ───
    function startListening(language, callback, buttonElement) {
        if (!isSupported()) {
            if (typeof showToast === 'function') {
                showToast(t('toast_voice_unsupported'), 'warning');
            }
            return false;
        }

        // Stop any existing recognition
        stopListening();

        currentCallback = callback;
        currentTranscript = '';
        activeButton = buttonElement;

        recognition = createRecognition(language);
        if (!recognition) return false;

        // Set recording state
        isRecording = true;
        if (activeButton) {
            activeButton.classList.add('recording');
        }

        // Events
        recognition.onstart = function () {
            isRecording = true;
            if (activeButton) {
                activeButton.classList.add('recording');
            }
        };

        recognition.onresult = function (event) {
            var finalTranscript = '';
            var interimTranscript = '';

            for (var i = event.resultIndex; i < event.results.length; i++) {
                var transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                currentTranscript += finalTranscript;
            }

            // Show real-time transcript as feedback
            var displayText = currentTranscript + interimTranscript;
            if (displayText && currentCallback) {
                currentCallback(displayText, false); // false = not final
            }
        };

        recognition.onerror = function (event) {
            if (event.error === 'no-speech') {
                // Silently ignore no-speech
                return;
            }
            if (event.error === 'aborted') {
                // Silently ignore aborted (from manual stop)
                return;
            }
            console.warn('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                if (typeof showToast === 'function') {
                    showToast('🎤 Microphone access denied. Please allow microphone access.', 'error');
                }
            }
            cleanupRecording();
        };

        recognition.onend = function () {
            // Deliver final transcript
            if (currentTranscript && currentCallback) {
                currentCallback(currentTranscript, true); // true = final
            }
            cleanupRecording();
        };

        try {
            recognition.start();
            return true;
        } catch (e) {
            console.error('Failed to start speech recognition:', e);
            cleanupRecording();
            return false;
        }
    }

    // ─── STOP LISTENING ───
    function stopListening() {
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                // Ignore
            }
        }
        cleanupRecording();
    }

    // ─── CLEANUP ───
    function cleanupRecording() {
        isRecording = false;
        if (activeButton) {
            activeButton.classList.remove('recording');
        }
        recognition = null;
        activeButton = null;
    }

    // ─── TEXT-TO-SPEECH ───
    function speak(text, language) {
        if (!isTTSSupported()) return;

        // Cancel any existing speech
        window.speechSynthesis.cancel();

        if (!text) return;

        var utterance = new SpeechSynthesisUtterance(text);
        var ttsLang = TTS_LANG_MAP[language] || 'en-GB';
        utterance.lang = ttsLang;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find a matching voice
        var voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            var matchingVoice = voices.find(function (v) {
                return v.lang.startsWith(ttsLang.split('-')[0]);
            });
            if (matchingVoice) {
                utterance.voice = matchingVoice;
            }
        }

        utterance.onerror = function (event) {
            if (event.error !== 'canceled') {
                console.warn('TTS error:', event.error);
            }
        };

        window.speechSynthesis.speak(utterance);
    }

    // ─── STOP SPEAKING ───
    function stopSpeaking() {
        if (isTTSSupported()) {
            window.speechSynthesis.cancel();
        }
    }

    // ─── PUBLIC API ───
    return {
        isSupported: isSupported,
        isTTSSupported: isTTSSupported,
        startListening: startListening,
        stopListening: stopListening,
        speak: speak,
        stopSpeaking: stopSpeaking,
        isRecording: function () { return isRecording; },
        getCurrentTranscript: function () { return currentTranscript; }
    };

})();

// ─── VOICE INPUT INTEGRATION ───
// These functions connect the mic buttons in the HTML to the VoiceManager

function startVoiceInput(target) {
    var buttonMap = {
        'question': 'mic-btn-question',
        'feedback': 'mic-btn-feedback',
        'general-feedback': 'mic-btn-general-feedback'
    };

    var inputMap = {
        'question': 'question-input',
        'feedback': 'feedback-comment',
        'general-feedback': 'feedback-general-comment'
    };

    var btnId = buttonMap[target];
    var inputId = inputMap[target];

    if (!btnId || !inputId) return;

    var button = document.getElementById(btnId);
    var input = document.getElementById(inputId);

    if (!button || !input) return;

    if (!VoiceManager.isSupported()) {
        showToast(t('toast_voice_unsupported'), 'warning');
        return;
    }

    VoiceManager.startListening(state.language, function (transcript, isFinal) {
        if (input.tagName === 'INPUT') {
            input.value = transcript;
        } else if (input.tagName === 'TEXTAREA') {
            input.value = transcript;
        }

        if (isFinal) {
            // Flash success on the button briefly
            button.style.borderColor = 'var(--accent-green-light)';
            setTimeout(function () {
                button.style.borderColor = '';
            }, 1000);
        }
    }, button);
}

function stopVoiceInput(target) {
    VoiceManager.stopListening();
}

// ─── SPEAK AI RESPONSE ───
function speakResponse() {
    var content = state.currentAIResponse;
    if (!content) {
        showToast('No response to read aloud.', 'info');
        return;
    }

    // Strip HTML tags for clean speech
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    var plainText = tempDiv.textContent || tempDiv.innerText || '';

    VoiceManager.speak(plainText, state.language);
    showToast('🔊 Reading response aloud...', 'info');
}

// Preload voices on page load (Chrome requires this)
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = function () {
        window.speechSynthesis.getVoices();
    };
    // Also trigger immediately
    window.speechSynthesis.getVoices();
}
