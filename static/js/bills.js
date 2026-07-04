/* ═══════════════════════════════════════════════════════════════
   TAMBUA — Bills Module
   Bill browsing, detail view, AI interactions,
   recommendations, predictions, forums, download/share
   ═══════════════════════════════════════════════════════════════ */

// ─── CURRENT FILTER STATE ───
var billFilter = {
    status: 'all',
    search: ''
};

// ─── LOAD ALL BILLS ───
async function loadBills() {
    var grid = document.getElementById('bills-grid');
    showSkeletons(grid, 6);

    try {
        var data = await api('/api/bills');
        var bills = data.bills || data || [];
        state.bills = bills;

        // Update stats
        var statEl = document.getElementById('stat-bills');
        if (statEl) statEl.textContent = bills.length;

        renderBillsGrid(bills);
        populateFeedbackBillSelect();
    } catch (error) {
        console.error('Error loading bills:', error);
        grid.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">📜</div>' +
                '<p>Unable to load bills. Please try again later.</p>' +
                '<button class="btn btn-outline" onclick="loadBills()" style="margin-top:1rem;">🔄 Retry</button>' +
            '</div>';
    }
}

// ─── RENDER BILLS GRID ───
function renderBillsGrid(bills) {
    var grid = document.getElementById('bills-grid');
    if (!bills || bills.length === 0) {
        grid.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">📭</div>' +
                '<p>No bills found matching your criteria.</p>' +
            '</div>';
        return;
    }

    var html = '';
    bills.forEach(function (bill, index) {
        html += renderBillCard(bill, index);
    });
    grid.innerHTML = html;
}

// ─── RENDER SINGLE BILL CARD ───
function renderBillCard(bill, index) {
    var id = bill.id || bill.bill_id || index;
    var title = escapeHtml(bill.title || 'Untitled Bill');
    var desc = escapeHtml(truncateText(bill.description || bill.summary || '', 120));
    var status = bill.status || 'active';
    var category = escapeHtml(bill.category || 'General');
    var date = bill.date || bill.introduced_date || bill.created_at || '';

    return (
        '<div class="card card-interactive bill-card" onclick="selectBill(\'' + id + '\')" ' +
            'style="animation-delay:' + (index * 0.05) + 's" ' +
            'role="button" tabindex="0" aria-label="View ' + title + '" ' +
            'onkeydown="if(event.key===\'Enter\')selectBill(\'' + id + '\')">' +
            '<div class="bill-card-header">' +
                '<h3 class="bill-card-title">' + title + '</h3>' +
                '<span class="' + getBadgeClass(status) + '">' + getBadgeText(status) + '</span>' +
            '</div>' +
            '<p class="bill-card-desc">' + desc + '</p>' +
            '<div class="bill-card-footer">' +
                '<span class="bill-category">📂 ' + category + '</span>' +
                (date ? '<span class="bill-date">' + formatDate(date) + '</span>' : '') +
            '</div>' +
        '</div>'
    );
}

// ─── FILTER BILLS ───
function filterBills(searchText) {
    billFilter.search = (searchText || '').toLowerCase();
    applyBillFilters();
}

function filterByStatus(status, chip) {
    billFilter.status = status;

    // Update chip UI
    document.querySelectorAll('.filter-chips .chip').forEach(function (c) {
        c.classList.remove('active');
    });
    if (chip) chip.classList.add('active');

    applyBillFilters();
}

function applyBillFilters() {
    var filtered = state.bills.filter(function (bill) {
        var matchStatus = billFilter.status === 'all' ||
            (bill.status || '').toLowerCase() === billFilter.status;

        var matchSearch = !billFilter.search ||
            (bill.title || '').toLowerCase().includes(billFilter.search) ||
            (bill.description || '').toLowerCase().includes(billFilter.search) ||
            (bill.category || '').toLowerCase().includes(billFilter.search);

        return matchStatus && matchSearch;
    });

    renderBillsGrid(filtered);
}

// ─── SELECT A BILL ───
async function selectBill(billId) {
    state.selectedBill = billId;

    // Find bill in local state
    var bill = state.bills.find(function (b) {
        return (b.id || b.bill_id) == billId;
    });

    if (bill) {
        state.selectedBillData = bill;
        populateBillDetail(bill);
    }

    // Try to fetch full details from API
    try {
        var data = await api('/api/bills/' + billId);
        var billObj = data.bill || data;
        state.selectedBillData = billObj;
        populateBillDetail(billObj);
    } catch (error) {
        console.warn('Could not fetch bill details:', error);
        if (!bill) {
            showToast(t('toast_error'), 'error');
            return;
        }
    }

    // Navigate to detail view
    navigateTo('bill-detail');

    // Reset feedback state
    state.feedbackStance = null;
    document.querySelectorAll('#stance-toggle .stance-btn').forEach(function (b) {
        b.classList.remove('active');
    });
    var feedbackComment = document.getElementById('feedback-comment');
    if (feedbackComment) feedbackComment.value = '';

    // Hide previous AI response
    var aiArea = document.getElementById('ai-response-area');
    if (aiArea) aiArea.style.display = 'none';

    // Load existing feedback for this bill
    loadBillFeedback(billId);
}

function populateBillDetail(bill) {
    var billObj = bill.bill || bill;
    var title = document.getElementById('detail-title');
    var desc = document.getElementById('detail-description');
    var badge = document.getElementById('detail-badge');
    var category = document.getElementById('detail-category');
    var dateEl = document.getElementById('detail-date');
    var sponsor = document.getElementById('detail-sponsor');

    if (title) title.textContent = billObj.title || 'Untitled Bill';
    if (desc) {
        var rawDesc = billObj.description || billObj.summary || 'No description available.';
        desc.textContent = truncateText(rawDesc, 100);
    }

    if (badge) {
        badge.className = getBadgeClass(billObj.status);
        badge.textContent = getBadgeText(billObj.status || 'active');
    }

    if (category) category.textContent = '📂 ' + (billObj.category || 'General');
    if (dateEl) dateEl.textContent = formatDate(billObj.date || billObj.introduced_date || '');
    if (sponsor) sponsor.textContent = billObj.sponsor || billObj.introduced_by || 'Parliament';
}

// ─── AI INTERACTIONS ───

// Show AI response area with content
function showAIResponse(content, isHtml) {
    var area = document.getElementById('ai-response-area');
    var contentEl = document.getElementById('ai-response-content');

    state.currentAIResponse = content;
    state.currentAITitle = (state.selectedBillData ? state.selectedBillData.title : 'Bill') + ' — AI Response';

    if (isHtml) {
        contentEl.innerHTML = content;
    } else {
        contentEl.textContent = content;
    }

    area.style.display = 'block';
    area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showAILoading(message) {
    var area = document.getElementById('ai-response-area');
    var contentEl = document.getElementById('ai-response-content');

    area.style.display = 'block';
    contentEl.innerHTML = '<div class="loading-spinner"></div><p style="text-align:center;color:var(--text-secondary);margin-top:1rem;">' + escapeHtml(message || t('toast_loading')) + '</p>';
}

// ─── GENERATE SUMMARY ───
async function generateSummary() {
    if (!state.selectedBill) {
        showToast(t('toast_no_bill'), 'warning');
        return;
    }

    showAILoading(t('loading_summary'));

    try {
        var data = await api('/api/bills/' + state.selectedBill + '/interact', {
            method: 'POST',
            body: JSON.stringify({
                interaction_type: 'summary',
                language: state.language
            })
        });

        var response = data.response || data.summary || data.result || 'Summary generated.';
        showAIResponse(formatAIResponse(response), true);
        showToast('📝 ' + t('toast_success'), 'success');

        // Log interaction
        logInteraction('summary', state.selectedBillData ? state.selectedBillData.title : '');
    } catch (error) {
        showAIResponse('❌ ' + error.message, false);
        showToast(t('toast_error'), 'error');
    }
}

// ─── TRANSLATE BILL ───
async function translateBill() {
    if (!state.selectedBill) {
        showToast(t('toast_no_bill'), 'warning');
        return;
    }

    showAILoading(t('loading_translate'));

    try {
        var data = await api('/api/bills/' + state.selectedBill + '/interact', {
            method: 'POST',
            body: JSON.stringify({
                interaction_type: 'translate',
                language: state.language
            })
        });

        var response = data.response || data.translation || data.result || 'Translation completed.';
        showAIResponse(formatAIResponse(response), true);
        showToast('🌍 ' + t('toast_success'), 'success');

        logInteraction('translate', state.selectedBillData ? state.selectedBillData.title : '');
    } catch (error) {
        showAIResponse('❌ ' + error.message, false);
        showToast(t('toast_error'), 'error');
    }
}

// ─── ANALYZE BILL IMPACT ───
async function analyzeBill() {
    if (!state.selectedBill) {
        showToast(t('toast_no_bill'), 'warning');
        return;
    }

    showAILoading(t('loading_analyze'));

    try {
        var data = await api('/api/bills/' + state.selectedBill + '/interact', {
            method: 'POST',
            body: JSON.stringify({
                interaction_type: 'analyze',
                language: state.language
            })
        });

        var response = data.response || data.analysis || data.result || 'Analysis completed.';
        showAIResponse(formatAIResponse(response), true);
        showToast('⚖️ ' + t('toast_success'), 'success');

        logInteraction('analyze', state.selectedBillData ? state.selectedBillData.title : '');
    } catch (error) {
        showAIResponse('❌ ' + error.message, false);
        showToast(t('toast_error'), 'error');
    }
}

// ─── CIVIC GUIDANCE ───
async function getCivicGuidance() {
    if (!state.selectedBill) {
        showToast(t('toast_no_bill'), 'warning');
        return;
    }

    showAILoading(t('loading_guidance'));

    try {
        var data = await api('/api/bills/' + state.selectedBill + '/interact', {
            method: 'POST',
            body: JSON.stringify({
                interaction_type: 'civic_guidance',
                language: state.language
            })
        });

        var response = data.response || data.guidance || data.result || 'Guidance provided.';
        showAIResponse(formatAIResponse(response), true);
        showToast('🤝 ' + t('toast_success'), 'success');

        logInteraction('civic_guidance', state.selectedBillData ? state.selectedBillData.title : '');
    } catch (error) {
        showAIResponse('❌ ' + error.message, false);
        showToast(t('toast_error'), 'error');
    }
}

// ─── ASK QUESTION ───
async function askQuestion() {
    var input = document.getElementById('question-input');
    var question = (input ? input.value : '').trim();

    if (!question) {
        showToast('Please enter or speak a question.', 'warning');
        input.focus();
        return;
    }

    if (!state.selectedBill) {
        showToast(t('toast_no_bill'), 'warning');
        return;
    }

    showAILoading(t('loading_question'));

    try {
        var data = await api('/api/bills/' + state.selectedBill + '/interact', {
            method: 'POST',
            body: JSON.stringify({
                interaction_type: 'query',
                query: question,
                language: state.language
            })
        });

        var response = data.response || data.answer || data.result || 'Response generated.';
        showAIResponse(formatAIResponse(response), true);
        showToast('💬 ' + t('toast_success'), 'success');

        // Clear input
        if (input) input.value = '';

        logInteraction('query', question);
    } catch (error) {
        showAIResponse('❌ ' + error.message, false);
        showToast(t('toast_error'), 'error');
    }
}

// ─── FORMAT AI RESPONSE ───
function formatAIResponse(text) {
    if (!text) return '';

    // Basic markdown-like formatting
    var html = escapeHtml(text);

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Bullet points
    html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Numbered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Paragraphs (double newlines)
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
}

// ─── DOWNLOAD SUMMARY ───
function downloadCurrentResponse() {
    var content = state.currentAIResponse;
    if (!content) {
        showToast('No content to download.', 'warning');
        return;
    }

    // Strip HTML
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    var plainText = tempDiv.textContent || tempDiv.innerText || '';

    var title = state.currentAITitle || 'Tambua Response';
    downloadSummary(plainText, title);
}

function downloadSummary(content, billTitle) {
    var text = '═══════════════════════════════════════\n';
    text += 'TAMBUA — Civic Literacy Platform\n';
    text += '═══════════════════════════════════════\n\n';
    text += billTitle + '\n';
    text += '───────────────────────────────────────\n\n';
    text += content + '\n\n';
    text += '───────────────────────────────────────\n';
    text += 'Generated: ' + new Date().toLocaleString() + '\n';
    text += 'Language: ' + getLanguageName(state.language) + '\n';
    text += 'Sauti Yako ni Kenya — Your Voice is Kenya\n';

    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFilename(billTitle) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('⬇️ Downloaded!', 'success');
}

function sanitizeFilename(name) {
    return (name || 'tambua-response')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50)
        .toLowerCase();
}

// ─── SHARE ───
async function shareCurrentResponse() {
    var content = state.currentAIResponse;
    if (!content) {
        showToast('No content to share.', 'warning');
        return;
    }

    // Strip HTML
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    var plainText = tempDiv.textContent || tempDiv.innerText || '';

    var title = state.currentAITitle || 'Tambua — Bill Information';
    await shareBill(title, plainText);
}

async function shareBill(billTitle, summary) {
    var shareText = '🛡️ TAMBUA\n' + billTitle + '\n\n' + truncateText(summary, 500) + '\n\n🇰🇪 Sauti Yako ni Kenya';

    // Try Web Share API first
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Tambua — ' + billTitle,
                text: shareText,
                url: window.location.href
            });
            showToast(t('toast_shared'), 'success');
            return;
        } catch (error) {
            if (error.name !== 'AbortError') {
                // Fallback to clipboard
                await copyToClipboard(shareText);
            }
            return;
        }
    }

    // Fallback: copy to clipboard
    await copyToClipboard(shareText);
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(t('toast_copied'), 'success');
    } catch (error) {
        // Final fallback: textarea copy
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast(t('toast_copied'), 'success');
        } catch (e) {
            showToast('Could not copy text.', 'error');
        }
        document.body.removeChild(textarea);
    }
}

// ─── SUBMIT BILL FEEDBACK (from detail view) ───
async function submitBillFeedback() {
    if (!state.selectedBill) {
        showToast(t('toast_no_bill'), 'warning');
        return;
    }

    if (!state.feedbackStance) {
        showToast(t('toast_select_stance'), 'warning');
        return;
    }

    var comment = (document.getElementById('feedback-comment').value || '').trim();

    try {
        await api('/api/feedback', {
            method: 'POST',
            body: JSON.stringify({
                bill_id: state.selectedBill,
                stance: state.feedbackStance,
                comment: comment
            })
        });

        showToast(t('toast_feedback_submitted'), 'success');

        // Reset
        state.feedbackStance = null;
        document.querySelectorAll('#stance-toggle .stance-btn').forEach(function (b) {
            b.classList.remove('active');
        });
        document.getElementById('feedback-comment').value = '';

        logInteraction('feedback', state.feedbackStance + ' on ' + (state.selectedBillData ? state.selectedBillData.title : ''));
    } catch (error) {
        showToast(t('toast_error'), 'error');
    }
}

// ─── SUBMIT GENERAL FEEDBACK (from feedback section) ───
async function submitGeneralFeedback() {
    var billSelect = document.getElementById('feedback-bill-select');
    var billId = billSelect ? billSelect.value : '';

    if (!billId) {
        showToast('Please select a bill.', 'warning');
        return;
    }

    var stanceToggle = document.getElementById('feedback-stance-toggle');
    var activeStance = stanceToggle.querySelector('.stance-btn.active');
    if (!activeStance) {
        showToast(t('toast_select_stance'), 'warning');
        return;
    }
    var stance = activeStance.dataset.stance;

    var comment = (document.getElementById('feedback-general-comment').value || '').trim();

    try {
        await api('/api/feedback', {
            method: 'POST',
            body: JSON.stringify({
                bill_id: billId,
                stance: stance,
                comment: comment
            })
        });

        showToast(t('toast_feedback_submitted'), 'success');

        // Reset form
        stanceToggle.querySelectorAll('.stance-btn').forEach(function (b) {
            b.classList.remove('active');
        });
        document.getElementById('feedback-general-comment').value = '';
        billSelect.value = '';

        // Reload feedback list
        loadAllFeedback();
    } catch (error) {
        showToast(t('toast_error'), 'error');
    }
}

// ─── LOAD FEEDBACK ───
async function loadBillFeedback(billId) {
    try {
        var data = await api('/api/feedback/' + billId);
        // We could display existing feedback for this bill here if needed
    } catch (error) {
        // Silently fail — no existing feedback
    }
}

async function loadAllFeedback() {
    var list = document.getElementById('feedback-list');
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
        list.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">📭</div>' +
                '<p>' + t('fb_empty') + '</p>' +
            '</div>';
    }
}

function renderFeedbackItem(fb) {
    var stanceEmoji = { support: '👍', oppose: '👎', neutral: '🤔' };
    var stanceBadgeClass = {
        support: 'badge badge-active',
        oppose: 'badge badge-rejected',
        neutral: 'badge badge-passed'
    };

    return (
        '<div class="feedback-item">' +
            '<div class="feedback-item-header">' +
                '<span class="feedback-item-bill">' + escapeHtml(fb.bill_title || fb.bill_id || 'Bill') + '</span>' +
                '<span class="' + (stanceBadgeClass[fb.stance] || 'badge') + '">' +
                    (stanceEmoji[fb.stance] || '') + ' ' + (fb.stance || 'Unknown') +
                '</span>' +
            '</div>' +
            (fb.comment ? '<p class="feedback-item-comment">"' + escapeHtml(fb.comment) + '"</p>' : '') +
            '<span class="feedback-item-date">' + formatDate(fb.created_at || fb.date || '') + '</span>' +
        '</div>'
    );
}

// ─── RECOMMENDATIONS ───
async function loadRecommendations() {
    var grid = document.getElementById('recommended-grid');
    showSkeletons(grid, 3);

    try {
        var data = await api('/api/recommendations');
        var recs = data.recommendations || data.bills || data || [];
        
        // Fallback: if recommendations are empty, use the first 3 bills
        if ((!recs || recs.length === 0) && (!state.bills || state.bills.length === 0)) {
            await loadBills();
        }
        if ((!recs || recs.length === 0) && state.bills && state.bills.length > 0) {
            recs = state.bills.slice(0, 3);
        }
        
        state.recommendations = recs;

        if (!recs.length) {
            grid.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-icon">⭐</div>' +
                    '<p>Start interacting with bills to get personalized recommendations!</p>' +
                '</div>';
            return;
        }

        var html = '';
        recs.forEach(function (bill, index) {
            html += renderBillCard(bill, index);
        });
        grid.innerHTML = html;
    } catch (error) {
        console.warn('Failed to load recommendations, trying fallback:', error);
        if (state.bills && state.bills.length > 0) {
            var recs = state.bills.slice(0, 3);
            state.recommendations = recs;
            var html = '';
            recs.forEach(function (bill, index) {
                html += renderBillCard(bill, index);
            });
            grid.innerHTML = html;
        } else {
            grid.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-icon">⭐</div>' +
                    '<p>Recommendations will appear after you explore some bills.</p>' +
                '</div>';
        }
    }
}

// ─── PREDICTIONS ───
async function loadPredictions() {
    var grid = document.getElementById('predictions-grid');
    showSkeletons(grid, 3);

    try {
        var data = await api('/api/predictions');
        var predictions = data.predictions || data || [];
        state.predictions = predictions;

        if (!predictions.length) {
            grid.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-icon">📊</div>' +
                    '<p>No predictions available yet.</p>' +
                '</div>';
            return;
        }

        var html = '';
        predictions.forEach(function (pred, index) {
            html += renderPredictionCard(pred, index);
        });
        grid.innerHTML = html;
    } catch (error) {
        grid.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">📊</div>' +
                '<p>Predictions will appear when bill data is available.</p>' +
            '</div>';
    }
}

function renderPredictionCard(prediction, index) {
    var title = escapeHtml(prediction.bill_title || prediction.title || 'Bill');
    var percent = prediction.probability || prediction.percentage || prediction.pass_probability || 50;
    var reason = escapeHtml(prediction.reason || prediction.explanation || '');

    var barColor = percent >= 60 ? 'var(--gradient-green)' : (percent >= 40 ? 'var(--gradient-gold)' : 'var(--gradient-primary)');

    return (
        '<div class="card prediction-card" style="animation-delay:' + (index * 0.1) + 's">' +
            '<h4 style="margin-bottom:0.5rem;">' + title + '</h4>' +
            '<div class="prediction-label">' +
                '<span style="color:var(--text-secondary);font-size:0.875rem;">' + t('pred_title').replace('📊 ', '') + '</span>' +
                '<span class="prediction-percent">' + Math.round(percent) + '%</span>' +
            '</div>' +
            '<div class="progress-bar-container">' +
                '<div class="progress-bar" style="width:' + percent + '%;background:' + barColor + ';"></div>' +
            '</div>' +
            (reason ? '<p class="prediction-text">' + reason + '</p>' : '') +
        '</div>'
    );
}

// ─── PAST BILL OUTCOMES ───
async function loadPastBillOutcomes() {
    var grid = document.getElementById('past-outcomes-grid');
    showSkeletons(grid, 3);

    try {
        var data = await api('/api/bills/past');
        var pastBills = data.bills || data || [];

        if (!pastBills.length) {
            grid.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-icon">📋</div>' +
                    '<p>No past bill data available.</p>' +
                '</div>';
            return;
        }

        var html = '';
        pastBills.forEach(function (bill, index) {
            html += renderPastBillCard(bill, index);
        });
        grid.innerHTML = html;
    } catch (error) {
        grid.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">📋</div>' +
                '<p>Past bill outcomes will appear here.</p>' +
            '</div>';
    }
}

// ─── PAST BILLS (standalone section) ───
async function loadPastBills() {
    var grid = document.getElementById('past-bills-grid');
    showSkeletons(grid, 6);

    try {
        var data = await api('/api/bills/past');
        var pastBills = data.bills || data || [];
        state.pastBills = pastBills;

        if (!pastBills.length) {
            grid.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-icon">🏛️</div>' +
                    '<p>No past legislation data available.</p>' +
                '</div>';
            return;
        }

        var html = '';
        pastBills.forEach(function (bill, index) {
            html += renderPastBillCard(bill, index);
        });
        grid.innerHTML = html;
    } catch (error) {
        grid.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">🏛️</div>' +
                '<p>Could not load past bills. Please try again later.</p>' +
            '</div>';
    }
}

function renderPastBillCard(bill, index) {
    var id = bill.id || bill.bill_id || index;
    var title = escapeHtml(bill.title || 'Untitled Bill');
    var status = bill.status || bill.outcome || 'passed';
    var reason = escapeHtml(bill.ruling_reason || bill.reason || bill.outcome_reason || '');
    var desc = escapeHtml(truncateText(bill.description || bill.summary || '', 100));

    return (
        '<div class="card past-bill-card" style="animation-delay:' + (index * 0.05) + 's">' +
            '<div class="bill-card-header">' +
                '<h3 class="bill-card-title">' + title + '</h3>' +
                '<span class="' + getBadgeClass(status) + '">' + getBadgeText(status) + '</span>' +
            '</div>' +
            (desc ? '<p class="bill-card-desc">' + desc + '</p>' : '') +
            (reason ? '<div class="past-bill-reason">📌 ' + reason + '</div>' : '') +
            '<div class="expandable-content" id="expand-' + id + '">' +
                '<p style="margin-top:1rem;color:var(--text-secondary);font-size:0.875rem;">' +
                    escapeHtml(bill.full_details || bill.description || 'No additional details.') +
                '</p>' +
            '</div>' +
            '<button class="expand-btn" onclick="toggleExpand(\'' + id + '\', this)">' +
                '<span>▼</span> <span>' + t('view_details') + '</span>' +
            '</button>' +
        '</div>'
    );
}

function toggleExpand(id, btn) {
    var content = document.getElementById('expand-' + id);
    if (!content) return;

    var isExpanded = content.classList.contains('expanded');
    content.classList.toggle('expanded');

    var arrow = btn.querySelector('span:first-child');
    if (arrow) {
        arrow.textContent = isExpanded ? '▼' : '▲';
    }
}

// ─── FORUMS ───
async function loadForums(county) {
    var grid = document.getElementById('forums-grid');

    if (!county) {
        grid.innerHTML =
            '<div class="empty-state" id="forums-empty">' +
                '<div class="empty-icon">🗺️</div>' +
                '<p>' + t('forums_empty') + '</p>' +
            '</div>';
        return;
    }

    showSkeletons(grid, 3);

    try {
        var data = await api('/api/forums?county=' + encodeURIComponent(county));
        var forums = data.forums || data || [];
        state.forums = forums;

        if (!forums.length) {
            grid.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-icon">📅</div>' +
                    '<p>No upcoming forums found for ' + escapeHtml(county) + '. Check back later!</p>' +
                '</div>';
            return;
        }

        var html = '';
        forums.forEach(function (forum, index) {
            html += renderForumCard(forum, index);
        });
        grid.innerHTML = html;
    } catch (error) {
        grid.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">📅</div>' +
                '<p>Could not load forums for ' + escapeHtml(county) + '. Please try again.</p>' +
            '</div>';
    }
}

function renderForumCard(forum, index) {
    var venue = escapeHtml(forum.venue || forum.location || 'TBA');
    var date = forum.date || '';
    var time = forum.time || '';
    var billTitle = escapeHtml(forum.bill_title || forum.related_bill || '');
    var county = escapeHtml(forum.county || '');
    var mapUrl = 'https://www.google.com/maps/search/' + encodeURIComponent(venue + ', ' + county + ', Kenya');

    return (
        '<div class="card forum-card" style="animation-delay:' + (index * 0.1) + 's">' +
            '<div class="forum-card-header">' +
                '<div class="forum-icon">🏛️</div>' +
                '<div class="forum-detail">' +
                    '<span class="forum-venue">' + venue + '</span>' +
                    '<span class="forum-date">📅 ' + formatDate(date) + (time ? ' • ⏰ ' + escapeHtml(time) : '') + '</span>' +
                '</div>' +
            '</div>' +
            (billTitle ? '<p class="forum-bill">📜 Related Bill: ' + billTitle + '</p>' : '') +
            '<div class="forum-actions">' +
                '<a href="' + mapUrl + '" target="_blank" rel="noopener" class="btn btn-outline btn-sm">' +
                    t('get_directions') +
                '</a>' +
            '</div>' +
        '</div>'
    );
}

// ─── INTERACTION LOGGING ───
function logInteraction(type, detail) {
    var history = JSON.parse(localStorage.getItem('tambua_interactions') || '[]');
    history.unshift({
        type: type,
        detail: detail,
        bill_id: state.selectedBill,
        bill_title: state.selectedBillData ? state.selectedBillData.title : '',
        timestamp: new Date().toISOString()
    });

    // Keep only last 50
    if (history.length > 50) {
        history = history.slice(0, 50);
    }

    localStorage.setItem('tambua_interactions', JSON.stringify(history));
}
