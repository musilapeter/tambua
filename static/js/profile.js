/* ═══════════════════════════════════════════════════════════════
   TAMBUA — Profile Module
   User profile, feedback history, interaction timeline
   ═══════════════════════════════════════════════════════════════ */

// ─── LOAD PROFILE ───
async function loadProfile() {
    // Try to load from API first, then fallback to localStorage
    try {
        var data = await api('/api/profile');
        state.user = data;
        renderProfile(data);
        return;
    } catch (error) {
        // Fallback to localStorage
        var saved = localStorage.getItem('tambua_profile');
        if (saved) {
            try {
                state.user = JSON.parse(saved);
                renderProfile(state.user);
            } catch (e) {
                renderProfile(getDefaultProfile());
            }
        } else {
            renderProfile(getDefaultProfile());
        }
    }
}

function getDefaultProfile() {
    return {
        name: 'Guest User',
        county: '',
        language: state.language || 'en'
    };
}

function renderProfile(user) {
    if (!user) return;

    // Avatar initials
    var initials = getInitials(user.name || 'U');
    var avatarEl = document.getElementById('avatar-initials');
    var profileInitials = document.getElementById('profile-initials-lg');
    if (avatarEl) avatarEl.textContent = initials;
    if (profileInitials) profileInitials.textContent = initials;

    // Profile card info
    var nameEl = document.getElementById('profile-name');
    var countyEl = document.getElementById('profile-county');
    var langBadge = document.getElementById('profile-lang-badge');

    if (nameEl) nameEl.textContent = user.name || 'Guest User';
    if (countyEl) countyEl.textContent = user.county || 'County not set';
    if (langBadge) langBadge.textContent = getLanguageName(user.language || state.language);

    // Form fields
    var nameInput = document.getElementById('profile-name-input');
    var countySelect = document.getElementById('profile-county-select');
    var langSelect = document.getElementById('profile-lang-select');

    if (nameInput) nameInput.value = user.name || '';
    if (countySelect) countySelect.value = user.county || '';
    if (langSelect) langSelect.value = user.language || state.language;
}

function getInitials(name) {
    if (!name) return 'U';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
}

// ─── SAVE PROFILE ───
async function saveProfile(event) {
    if (event) event.preventDefault();

    var nameInput = document.getElementById('profile-name-input');
    var countySelect = document.getElementById('profile-county-select');
    var langSelect = document.getElementById('profile-lang-select');

    var profileData = {
        name: (nameInput ? nameInput.value : '').trim(),
        county: countySelect ? countySelect.value : '',
        language: langSelect ? langSelect.value : state.language
    };

    if (!profileData.name) {
        showToast('Please enter your name.', 'warning');
        if (nameInput) nameInput.focus();
        return;
    }

    // Save to localStorage
    localStorage.setItem('tambua_profile', JSON.stringify(profileData));

    // Update state
    state.user = profileData;

    // Update language if changed
    if (profileData.language !== state.language) {
        setLanguage(profileData.language);
    }

    // Render updated profile
    renderProfile(profileData);

    // Try to save to API
    try {
        await api('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    } catch (error) {
        // Silently fail for API - localStorage save is enough
        console.warn('Could not save profile to API:', error);
    }

    showToast(t('toast_profile_saved'), 'success');
}

// ─── UPDATE PROFILE (programmatic) ───
async function updateProfile(data) {
    var current = state.user || getDefaultProfile();
    var merged = Object.assign({}, current, data);

    localStorage.setItem('tambua_profile', JSON.stringify(merged));
    state.user = merged;
    renderProfile(merged);

    try {
        await api('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(merged)
        });
    } catch (error) {
        console.warn('Could not update profile on server:', error);
    }
}

// ─── INTERACTION HISTORY ───
async function loadHistory() {
    var timeline = document.getElementById('interaction-timeline');
    if (!timeline) return;

    // Try API first
    var interactions = [];
    try {
        var data = await api('/api/interactions');
        interactions = data.interactions || data || [];
    } catch (error) {
        // Fallback to localStorage
        var saved = localStorage.getItem('tambua_interactions');
        if (saved) {
            try {
                interactions = JSON.parse(saved);
            } catch (e) {
                interactions = [];
            }
        }
    }

    if (!interactions.length) {
        timeline.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">📊</div>' +
                '<p>' + t('history_empty') + '</p>' +
            '</div>';
        return;
    }

    renderTimeline(interactions);
}

function renderTimeline(interactions) {
    var timeline = document.getElementById('interaction-timeline');
    if (!timeline) return;

    var typeIcons = {
        summary: '📝',
        translate: '🌍',
        analyze: '⚖️',
        civic_guidance: '🤝',
        query: '💬',
        feedback: '📣',
        view: '👁️'
    };

    var typeLabels = {
        summary: 'Generated Summary',
        translate: 'Translated Bill',
        analyze: 'Analyzed Impact',
        civic_guidance: 'Got Civic Guidance',
        query: 'Asked Question',
        feedback: 'Submitted Feedback',
        view: 'Viewed Bill'
    };

    var html = '';
    interactions.forEach(function (item, index) {
        var icon = typeIcons[item.type] || '📌';
        var label = typeLabels[item.type] || item.type || 'Interaction';
        var detail = item.detail || item.bill_title || '';
        var date = item.timestamp || item.created_at || '';

        html +=
            '<div class="timeline-item" style="animation-delay:' + (index * 0.05) + 's">' +
                '<div class="timeline-item-content">' +
                    '<span class="timeline-item-title">' + icon + ' ' + escapeHtml(label) + '</span>' +
                    (detail ? '<p class="timeline-item-desc">' + escapeHtml(truncateText(detail, 100)) + '</p>' : '') +
                    (date ? '<span class="timeline-item-date">' + formatDate(date) + '</span>' : '') +
                '</div>' +
            '</div>';
    });

    timeline.innerHTML = html;
}

// ─── PROFILE FEEDBACK HISTORY ───
async function loadProfileFeedback() {
    var list = document.getElementById('profile-feedback-list');
    if (!list) return;

    try {
        var data = await api('/api/feedback');
        var feedbacks = data.feedbacks || data || [];

        if (!feedbacks.length) {
            list.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-icon">📭</div>' +
                    '<p>' + t('fb_empty') + '</p>' +
                '</div>';
            return;
        }

        var html = '';
        feedbacks.forEach(function (fb) {
            html += renderFeedbackItem(fb);
        });
        list.innerHTML = html;
    } catch (error) {
        // Try localStorage
        var savedFeedback = localStorage.getItem('tambua_feedback');
        if (savedFeedback) {
            try {
                var localFeedbacks = JSON.parse(savedFeedback);
                if (localFeedbacks.length) {
                    var html = '';
                    localFeedbacks.forEach(function (fb) {
                        html += renderFeedbackItem(fb);
                    });
                    list.innerHTML = html;
                    return;
                }
            } catch (e) {
                // Ignore
            }
        }

        list.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">📭</div>' +
                '<p>' + t('fb_empty') + '</p>' +
            '</div>';
    }
}

// ─── FEEDBACK SUBMISSION HELPER ───
async function submitFeedback(billId, stance, comment) {
    if (!billId) {
        showToast(t('toast_no_bill'), 'warning');
        return false;
    }

    if (!stance) {
        showToast(t('toast_select_stance'), 'warning');
        return false;
    }

    // Save locally
    var localFeedback = JSON.parse(localStorage.getItem('tambua_feedback') || '[]');
    var feedbackEntry = {
        bill_id: billId,
        bill_title: getBillTitle(billId),
        stance: stance,
        comment: comment || '',
        created_at: new Date().toISOString()
    };
    localFeedback.unshift(feedbackEntry);
    localStorage.setItem('tambua_feedback', JSON.stringify(localFeedback));

    // Try to save to API
    try {
        await api('/api/feedback', {
            method: 'POST',
            body: JSON.stringify({
                bill_id: billId,
                stance: stance,
                comment: comment
            })
        });
    } catch (error) {
        console.warn('Could not save feedback to API:', error);
    }

    showToast(t('toast_feedback_submitted'), 'success');
    return true;
}

// ─── LOAD FEEDBACK FOR A BILL ───
async function loadFeedback(billId) {
    if (!billId) return [];

    try {
        var data = await api('/api/feedback/' + billId);
        return data.feedbacks || data || [];
    } catch (error) {
        // Try localStorage
        var localFeedback = JSON.parse(localStorage.getItem('tambua_feedback') || '[]');
        return localFeedback.filter(function (fb) {
            return fb.bill_id == billId;
        });
    }
}

// ─── HELPER: GET BILL TITLE ───
function getBillTitle(billId) {
    if (!state.bills || !state.bills.length) return 'Bill #' + billId;
    var bill = state.bills.find(function (b) {
        return (b.id || b.bill_id) == billId;
    });
    return bill ? bill.title : 'Bill #' + billId;
}

// ─── ALL 47 KENYA COUNTIES ───
// (Used by profile and forum county selectors - already defined in app.js as KENYA_COUNTIES)
// Mombasa, Kwale, Kilifi, Tana River, Lamu, Taita-Taveta,
// Garissa, Wajir, Mandera, Marsabit, Isiolo, Meru,
// Tharaka-Nithi, Embu, Kitui, Machakos, Makueni,
// Nyandarua, Nyeri, Kirinyaga, Murang'a, Kiambu,
// Turkana, West Pokot, Samburu, Trans-Nzoia, Uasin Gishu,
// Elgeyo-Marakwet, Nandi, Baringo, Laikipia, Nakuru,
// Narok, Kajiado, Kericho, Bomet, Kakamega, Vihiga,
// Bungoma, Busia, Siaya, Kisumu, Homa Bay, Migori,
// Kisii, Nyamira, Nairobi
