/* ═══════════════════════════════════════════════════════════════
   TAMBUA — Main Application Module
   Navigation, API layer, i18n, state management, utilities
   ═══════════════════════════════════════════════════════════════ */

// ─── API BASE URL ───
const API = '';

// ─── THEME TOGGLE ───
function initTheme() {
    var savedTheme = localStorage.getItem('tambua_theme') || 'light';
    document.documentElement.className = 'theme-' + savedTheme;
}
initTheme();

function toggleTheme() {
    var currentTheme = document.documentElement.className === 'theme-dark' ? 'dark' : 'light';
    var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.className = 'theme-' + newTheme;
    localStorage.setItem('tambua_theme', newTheme);
    showToast('🌓 ' + (newTheme === 'dark' ? 'Dark Theme' : 'Light Theme'), 'success');
}

// ─── APPLICATION STATE ───
const state = {
    currentSection: 'home',
    previousSection: null,
    selectedBill: null,
    selectedBillData: null,
    language: 'en',
    user: null,
    bills: [],
    recommendations: [],
    predictions: [],
    pastBills: [],
    forums: [],
    feedbackStance: null,
    currentAIResponse: '',
    currentAITitle: '',
    isLoading: false
};

// ─── TRANSLATIONS ───
const translations = {
    en: {
        tagline: "Sauti Yako ni Kenya",
        tagline_full: "Sauti Yako ni Kenya — Your Voice is Kenya",
        nav_home: "🏠 Home",
        nav_bills: "📜 Bills",
        nav_recommendations: "⭐ Recommendations",
        nav_forums: "🏛️ Forums",
        nav_profile: "👤 Profile",
        hero_badge: "Civic Literacy for All Kenyans",
        hero_title: "Understand Your Bills.",
        hero_title_accent: "Shape Your Future.",
        hero_desc: "Tambua uses AI to break down complex legislation into simple language you understand. Ask questions, get summaries in your language, and make your voice heard in Kenya's democracy.",
        hero_cta: "📜 Explore Bills",
        hero_cta2: "⭐ Get Recommendations",
        stat_bills: "Bills Available",
        stat_languages: "Languages",
        stat_counties: "Counties",
        bills_title: "📜 Legislative Bills",
        bills_subtitle: "Browse current and past legislation before the Kenyan Parliament",
        bills_search_placeholder: "Search bills...",
        filter_all: "All",
        filter_active: "🟢 Active",
        filter_passed: "🟡 Passed",
        filter_rejected: "🔴 Rejected",
        back_to_bills: "Back to Bills",
        action_summary: "Summary",
        action_translate: "Translate",
        action_analyze: "Analyze Impact",
        action_guidance: "Civic Guidance",
        ai_response: "AI Response",
        download: "Download",
        share: "Share",
        ask_question_title: "💬 Ask a Question About This Bill",
        ask_placeholder: "Ask anything about this bill...",
        ask_btn: "Ask",
        mic_hint: "🎤 Hold the microphone button to speak your question",
        feedback_title: "📣 Share Your Stance on This Bill",
        support: "Support",
        oppose: "Oppose",
        neutral: "Neutral",
        feedback_placeholder: "Share your thoughts on this bill...",
        submit_feedback: "Submit Feedback",
        rec_title: "⭐ Recommended For You",
        rec_subtitle: "AI-powered bill recommendations based on your interests and history",
        rec_bills_title: "📜 Bills You Might Care About",
        pred_title: "📊 Outcome Predictions",
        past_title: "📋 Past Bill Outcomes",
        past_bills_title: "🏛️ Past Bills & Rulings",
        past_bills_subtitle: "Historical legislation and their outcomes",
        forums_title: "🏛️ Public Participation Forums",
        forums_subtitle: "Find public forums and civic events near you",
        select_county: "Select Your County",
        forums_empty: "Select your county to find nearby forums and civic events",
        impact_title: "📈 Bill Impact Analysis",
        impact_subtitle: "How bills affect economy and livelihoods",
        fb_title: "📣 Your Feedback",
        fb_subtitle: "Share your views on legislation to help shape policy",
        fb_form_title: "Submit New Feedback",
        fb_select_bill: "Select a bill...",
        fb_previous: "📋 Your Previous Feedback",
        fb_empty: "No feedback submitted yet. Your voice matters!",
        profile_title: "👤 Your Profile",
        profile_subtitle: "Manage your settings and view your activity",
        edit_profile: "✏️ Edit Profile",
        label_name: "Full Name",
        label_county: "County",
        label_language: "Preferred Language",
        placeholder_name: "Enter your name",
        save_profile: "Save Profile",
        history_title: "📊 Your Activity Timeline",
        history_empty: "Start exploring bills to see your activity here",
        fb_history_title: "📣 Your Feedback History",
        footer_rights: "Empowering civic literacy through AI.",
        toast_loading: "Loading...",
        toast_success: "Success!",
        toast_error: "Something went wrong. Please try again.",
        toast_copied: "Copied to clipboard!",
        toast_feedback_submitted: "Thank you! Your feedback has been submitted.",
        toast_profile_saved: "Profile updated successfully!",
        toast_no_bill: "Please select a bill first.",
        toast_select_stance: "Please select your stance first.",
        toast_voice_unsupported: "Voice input is not supported in your browser.",
        toast_shared: "Shared successfully!",
        loading_summary: "Generating summary...",
        loading_translate: "Translating...",
        loading_analyze: "Analyzing impact...",
        loading_guidance: "Getting civic guidance...",
        loading_question: "Finding answer...",
        explore_deeper: "Explore Deeper →",
        get_directions: "📍 Get Directions",
        view_details: "View Details"
    },
    sw: {
        tagline: "Sauti Yako ni Kenya",
        tagline_full: "Sauti Yako ni Kenya — Sauti Yako ni Kenya",
        nav_home: "🏠 Nyumbani",
        nav_bills: "📜 Miswada",
        nav_recommendations: "⭐ Mapendekezo",
        nav_forums: "🏛️ Mikutano",
        nav_profile: "👤 Wasifu",
        hero_badge: "Elimu ya Uraia kwa Wakenya Wote",
        hero_title: "Elewa Sheria Zako.",
        hero_title_accent: "Tengeneza Mustakabali Wako.",
        hero_desc: "Tambua inatumia AI kuvunja sheria changamano kuwa lugha rahisi unayoelewa. Uliza maswali, pata muhtasari kwa lugha yako, na sauti yako isikike katika demokrasia ya Kenya.",
        hero_cta: "📜 Tazama Miswada",
        hero_cta2: "⭐ Pata Mapendekezo",
        stat_bills: "Miswada Inayopatikana",
        stat_languages: "Lugha",
        stat_counties: "Kaunti",
        bills_title: "📜 Miswada ya Sheria",
        bills_subtitle: "Tazama miswada ya sasa na iliyopita mbele ya Bunge la Kenya",
        bills_search_placeholder: "Tafuta miswada...",
        filter_all: "Yote",
        filter_active: "🟢 Hai",
        filter_passed: "🟡 Imepita",
        filter_rejected: "🔴 Imekataliwa",
        back_to_bills: "Rudi kwa Miswada",
        action_summary: "Muhtasari",
        action_translate: "Tafsiri",
        action_analyze: "Changanua Athari",
        action_guidance: "Mwongozo wa Kiraia",
        ai_response: "Jibu la AI",
        download: "Pakua",
        share: "Shiriki",
        ask_question_title: "💬 Uliza Swali Kuhusu Muswada Huu",
        ask_placeholder: "Uliza chochote kuhusu muswada huu...",
        ask_btn: "Uliza",
        mic_hint: "🎤 Shikilia kitufe cha maikrofoni kusema swali lako",
        feedback_title: "📣 Shiriki Msimamo Wako",
        support: "Kuunga mkono",
        oppose: "Kupinga",
        neutral: "Hali ya kati",
        feedback_placeholder: "Shiriki mawazo yako kuhusu muswada huu...",
        submit_feedback: "Wasilisha Maoni",
        rec_title: "⭐ Imependekezwa Kwako",
        rec_subtitle: "Mapendekezo ya miswada yanayotokana na maslahi na historia yako",
        rec_bills_title: "📜 Miswada Unayoweza Kujali",
        pred_title: "📊 Utabiri wa Matokeo",
        past_title: "📋 Matokeo ya Miswada Iliyopita",
        past_bills_title: "🏛️ Miswada na Hukumu za Zamani",
        past_bills_subtitle: "Sheria za kihistoria na matokeo yake",
        forums_title: "🏛️ Mikutano ya Umma",
        forums_subtitle: "Pata mikutano ya umma na matukio ya kiraia karibu nawe",
        select_county: "Chagua Kaunti Yako",
        forums_empty: "Chagua kaunti yako ili kupata mikutano ya karibu",
        impact_title: "📈 Uchambuzi wa Athari za Muswada",
        impact_subtitle: "Jinsi miswada inavyoathiri uchumi na maisha",
        fb_title: "📣 Maoni Yako",
        fb_subtitle: "Shiriki maoni yako kuhusu sheria kusaidia kuunda sera",
        fb_form_title: "Wasilisha Maoni Mapya",
        fb_select_bill: "Chagua muswada...",
        fb_previous: "📋 Maoni Yako ya Awali",
        fb_empty: "Hakuna maoni yaliyowasilishwa bado. Sauti yako ni muhimu!",
        profile_title: "👤 Wasifu Wako",
        profile_subtitle: "Dhibiti mipangilio yako na uone shughuli zako",
        edit_profile: "✏️ Hariri Wasifu",
        label_name: "Jina Kamili",
        label_county: "Kaunti",
        label_language: "Lugha Unayopendelea",
        placeholder_name: "Weka jina lako",
        save_profile: "Hifadhi Wasifu",
        history_title: "📊 Ratiba ya Shughuli Zako",
        history_empty: "Anza kutazama miswada ili kuona shughuli zako hapa",
        fb_history_title: "📣 Historia ya Maoni Yako",
        footer_rights: "Kuwezesha elimu ya kiraia kupitia AI.",
        toast_loading: "Inapakia...",
        toast_success: "Imefanikiwa!",
        toast_error: "Kuna kosa. Tafadhali jaribu tena.",
        toast_copied: "Imenakiliwa kwenye ubao wa kunakili!",
        toast_feedback_submitted: "Asante! Maoni yako yamewasilishwa.",
        toast_profile_saved: "Wasifu umesasishwa!",
        toast_no_bill: "Tafadhali chagua muswada kwanza.",
        toast_select_stance: "Tafadhali chagua msimamo wako kwanza.",
        toast_voice_unsupported: "Kuingiza sauti hakutumiki kwenye kivinjari chako.",
        toast_shared: "Imeshirikiwa!",
        loading_summary: "Inatengeneza muhtasari...",
        loading_translate: "Inatafsiri...",
        loading_analyze: "Inachambua athari...",
        loading_guidance: "Inapata mwongozo wa kiraia...",
        loading_question: "Inatafuta jibu...",
        explore_deeper: "Chunguza Zaidi →",
        get_directions: "📍 Pata Mwelekeo",
        view_details: "Tazama Maelezo"
    },
    ki: {
        tagline: "Mwĩrĩru Waku nĩ Kenya",
        tagline_full: "Mwĩrĩru Waku nĩ Kenya — Your Voice is Kenya",
        nav_home: "🏠 Mũciĩ",
        nav_bills: "📜 Irĩa",
        nav_recommendations: "⭐ Mawoni",
        nav_forums: "🏛️ Mĩcemanio",
        nav_profile: "👤 Ũhoro Waku",
        hero_badge: "Ũmenyo wa Ũthiũrĩru kwa Akenya Othe",
        hero_title: "Menya Mĩthenya Yaku.",
        hero_title_accent: "Handa Mũcemanio Waku.",
        hero_desc: "Tambua ĩkũhũthĩra AI kũnjia mĩthenya mĩnene kuũ rũthiomi rwa harĩa. Ũria maũria, nĩguo ũkĩe na kĩama kĩaku kĩiguĩke.",
        hero_cta: "📜 Rora Irĩa",
        hero_cta2: "⭐ Kuona Mawoni",
        stat_bills: "Irĩa Irĩ",
        stat_languages: "Ndũrĩrĩ",
        stat_counties: "Kaunti",
        bills_title: "📜 Irĩa cia Mĩthenya",
        bills_subtitle: "Rora irĩa cia hau na cia mbere ya Bunge ya Kenya",
        bills_search_placeholder: "Caria irĩa...",
        filter_all: "Ciothe",
        filter_active: "🟢 Irĩ Mũoya",
        filter_passed: "🟡 Ciahĩtio",
        filter_rejected: "🔴 Ciaregwo",
        back_to_bills: "Cooka kwa Irĩa",
        action_summary: "Mũhtasari",
        action_translate: "Tafsiri",
        action_analyze: "Changanua",
        action_guidance: "Mwongozo",
        ai_response: "Mwĩrĩru wa AI",
        download: "Pakua",
        share: "Gaya",
        ask_question_title: "💬 Ũria Kĩũria Kuhusu Irĩa Ĩno",
        ask_placeholder: "Ũria kĩũria gĩothe...",
        ask_btn: "Ũria",
        mic_hint: "🎤 Nyitĩra kitufe kĩa maikrofoni ũrie",
        feedback_title: "📣 Gaya Mwĩrĩru Waku",
        support: "Gũtega",
        oppose: "Gũrega",
        neutral: "Hatarĩ mũhĩrĩga",
        feedback_placeholder: "Gaya mawoni maku...",
        submit_feedback: "Tuma Mawoni",
        rec_title: "⭐ Irĩa Ciakũhĩtia",
        rec_subtitle: "Mawoni ma AI mathĩĩte na ũhoro waku",
        rec_bills_title: "📜 Irĩa Ũngĩhooya",
        pred_title: "📊 Ũtabiri",
        past_title: "📋 Matokeo ma Irĩa cia Tene",
        past_bills_title: "🏛️ Irĩa cia Tene",
        past_bills_subtitle: "Mĩthenya ya tene na matokeo mayo",
        forums_title: "🏛️ Mĩcemanio ya Andũ",
        forums_subtitle: "Caria mĩcemanio ya andũ hau gũkuhĩ nawe",
        select_county: "Thagura Kaunti Yaku",
        forums_empty: "Thagura kaunti yaku ũone mĩcemanio",
        impact_title: "📈 Ũchambuzi wa Irĩa",
        impact_subtitle: "Irĩa ciathĩĩre atĩa uchumi",
        fb_title: "📣 Mawoni Maku",
        fb_subtitle: "Gaya mawoni maku kuhusu mĩthenya",
        fb_form_title: "Tuma Mawoni Meru",
        fb_select_bill: "Thagura irĩa...",
        fb_previous: "📋 Mawoni Maku ma Tene",
        fb_empty: "Gũtirĩ mawoni matumiirwo. Mwĩrĩru waku nĩ mũhĩmu!",
        profile_title: "👤 Ũhoro Waku",
        profile_subtitle: "Thiĩra na ũone shughuli ciaku",
        edit_profile: "✏️ Hariria Wasifu",
        label_name: "Rĩĩtwa Rĩaku",
        label_county: "Kaunti",
        label_language: "Rũthiomi",
        placeholder_name: "Ĩkĩra rĩĩtwa rĩaku",
        save_profile: "Hifadhi",
        history_title: "📊 Shughuli Ciaku",
        history_empty: "Ambĩrĩria kũrora irĩa",
        fb_history_title: "📣 Historia ya Mawoni",
        footer_rights: "Kũhũthĩra AI kwa ũmenyo wa ũthiũrĩru.",
        toast_loading: "Inapakia...",
        toast_success: "Nĩ wega!",
        toast_error: "Kũna ihĩtia. Geria rĩngĩ.",
        toast_copied: "Nĩ ĩnakiliitwo!",
        toast_feedback_submitted: "Nĩ wega! Mawoni maku nĩmatumiirwo.",
        toast_profile_saved: "Wasifu nĩwasasishiirwo!",
        toast_no_bill: "Thagura irĩa mbere.",
        toast_select_stance: "Thagura msimamo waku.",
        toast_voice_unsupported: "Sauti ndĩĩtegeerwĩte.",
        toast_shared: "Nĩ igayiirwo!",
        loading_summary: "Gũtũma mũhtasari...",
        loading_translate: "Gũtafsiri...",
        loading_analyze: "Gũchanũga...",
        loading_guidance: "Gũkua mwongozo...",
        loading_question: "Gũcaria jibu...",
        explore_deeper: "Rora Zaidi →",
        get_directions: "📍 Kuona Njĩra",
        view_details: "Rora Maelezo"
    },
    sh: {
        tagline: "Sauti Yako ni Kenya",
        tagline_full: "Sauti Yako ni Kenya — Your Voice ni Kenya",
        nav_home: "🏠 Home",
        nav_bills: "📜 Bills",
        nav_recommendations: "⭐ Mapendekezo",
        nav_forums: "🏛️ Forums",
        nav_profile: "👤 Profile",
        hero_badge: "Civic Literacy kwa Kila Mkenya",
        hero_title: "Elewa Laws Zako.",
        hero_title_accent: "Shape Future Yako.",
        hero_desc: "Tambua inatumia AI ku-break down sheria ngumu hadi lugha rahisi unayo-get. Uliza maswali, pata summary kwa lugha yako, na ufanye voice yako i-count kwa democracy ya Kenya.",
        hero_cta: "📜 Check Bills",
        hero_cta2: "⭐ Get Recommendations",
        stat_bills: "Bills Available",
        stat_languages: "Languages",
        stat_counties: "Counties",
        bills_title: "📜 Bills za Sheria",
        bills_subtitle: "Browse bills za saa hii na zilizopita kwa Bunge ya Kenya",
        bills_search_placeholder: "Search bills...",
        filter_all: "Zote",
        filter_active: "🟢 Active",
        filter_passed: "🟡 Passed",
        filter_rejected: "🔴 Rejected",
        back_to_bills: "Rudi kwa Bills",
        action_summary: "Summary",
        action_translate: "Translate",
        action_analyze: "Analyze Impact",
        action_guidance: "Civic Guidance",
        ai_response: "AI Response",
        download: "Download",
        share: "Share",
        ask_question_title: "💬 Uliza Swali Kuhusu Bill Hii",
        ask_placeholder: "Uliza any question kuhusu bill hii...",
        ask_btn: "Uliza",
        mic_hint: "🎤 Shikilia mic button u-speak swali lako",
        feedback_title: "📣 Share Stance Yako",
        support: "Support",
        oppose: "Oppose",
        neutral: "Neutral",
        feedback_placeholder: "Share thoughts zako kuhusu bill hii...",
        submit_feedback: "Submit Feedback",
        rec_title: "⭐ Recommended Kwako",
        rec_subtitle: "AI-powered recommendations based on history yako",
        rec_bills_title: "📜 Bills Unazoweza Jali",
        pred_title: "📊 Predictions",
        past_title: "📋 Past Bill Outcomes",
        past_bills_title: "🏛️ Past Bills na Rulings",
        past_bills_subtitle: "Historical legislation na outcomes zao",
        forums_title: "🏛️ Public Forums",
        forums_subtitle: "Pata forums na civic events karibu nawe",
        select_county: "Chagua County Yako",
        forums_empty: "Chagua county yako upate forums nearby",
        impact_title: "📈 Bill Impact Analysis",
        impact_subtitle: "How bills zina-affect economy na maisha",
        fb_title: "📣 Feedback Yako",
        fb_subtitle: "Share views zako kuhusu sheria",
        fb_form_title: "Submit New Feedback",
        fb_select_bill: "Chagua bill...",
        fb_previous: "📋 Previous Feedback Yako",
        fb_empty: "Bado huja-submit feedback. Voice yako matters!",
        profile_title: "👤 Profile Yako",
        profile_subtitle: "Manage settings zako na uone activity yako",
        edit_profile: "✏️ Edit Profile",
        label_name: "Full Name",
        label_county: "County",
        label_language: "Preferred Language",
        placeholder_name: "Weka jina lako",
        save_profile: "Save Profile",
        history_title: "📊 Activity Timeline Yako",
        history_empty: "Anza ku-explore bills uone activity yako hapa",
        fb_history_title: "📣 Feedback History",
        footer_rights: "Empowering civic literacy through AI.",
        toast_loading: "Inapakia...",
        toast_success: "Sawa!",
        toast_error: "Kuna shida. Jaribu tena.",
        toast_copied: "Imecopy kwa clipboard!",
        toast_feedback_submitted: "Asante! Feedback yako imeenda.",
        toast_profile_saved: "Profile imeupdate!",
        toast_no_bill: "Please chagua bill kwanza.",
        toast_select_stance: "Please chagua stance yako kwanza.",
        toast_voice_unsupported: "Voice input haifanyi kazi kwa browser yako.",
        toast_shared: "Imeshare!",
        loading_summary: "Inatengeneza summary...",
        loading_translate: "Inatranslate...",
        loading_analyze: "Ina-analyze impact...",
        loading_guidance: "Inapata civic guidance...",
        loading_question: "Inatafuta answer...",
        explore_deeper: "Explore Zaidi →",
        get_directions: "📍 Get Directions",
        view_details: "View Details"
    },
    lu: {
        tagline: "Dwondni en Kenya",
        tagline_full: "Dwondni en Kenya — Your Voice is Kenya",
        nav_home: "🏠 Dala",
        nav_bills: "📜 Chike",
        nav_recommendations: "⭐ Girokni",
        nav_forums: "🏛️ Chokruok",
        nav_profile: "👤 Nyingi",
        hero_badge: "Puonj mar Siasa ni Jo-Kenya Duto",
        hero_title: "Winj Chikegi.",
        hero_title_accent: "Los Kinyuol Mari.",
        hero_desc: "Tambua tiyo gi AI mondo oket chike matek e dhok mayot miwinjo. Penj penjo, yud weche e dhok mari, kendo imi dwondi owinj e piny Kenya.",
        hero_cta: "📜 Ne Chike",
        hero_cta2: "⭐ Yud Girokni",
        stat_bills: "Chike ma ni",
        stat_languages: "Dhok",
        stat_counties: "Kaunti",
        bills_title: "📜 Chike mag Bunge",
        bills_subtitle: "Ne chike masani kod machon e Bunge mar Kenya",
        bills_search_placeholder: "Many chike...",
        filter_all: "Duto",
        filter_active: "🟢 Tich",
        filter_passed: "🟡 Okal",
        filter_rejected: "🔴 Okwer",
        back_to_bills: "Dog ir Chike",
        action_summary: "Achiel Kende",
        action_translate: "Lok",
        action_analyze: "Non Maler",
        action_guidance: "Puonj",
        ai_response: "Dwoko mar AI",
        download: "Gol",
        share: "Pog",
        ask_question_title: "💬 Penj Penjo Kuom Chikni",
        ask_placeholder: "Penj gimoro amora kuom chikni...",
        ask_btn: "Penj",
        mic_hint: "🎤 Mak mic mondo iwuo penjni",
        feedback_title: "📣 Pog Pachi",
        support: "Siemo",
        oppose: "Kwedo",
        neutral: "Onge gi",
        feedback_placeholder: "Pog pachi kuom chikni...",
        submit_feedback: "Or Pachi",
        rec_title: "⭐ Mokwongni",
        rec_subtitle: "Girokni mag AI kaluwore gi timbegi",
        rec_bills_title: "📜 Chike Minyalo Hero",
        pred_title: "📊 Gima Ibiro Timore",
        past_title: "📋 Duoko mag Chike Machon",
        past_bills_title: "🏛️ Chike Machon",
        past_bills_subtitle: "Chike machon gi duokogi",
        forums_title: "🏛️ Chokruok mag Oganda",
        forums_subtitle: "Yud chokruok machiegni kodi",
        select_county: "Yier Kaunti Mari",
        forums_empty: "Yier kaunti mari mondo iyud chokruok",
        impact_title: "📈 Non Chike",
        impact_subtitle: "Kaka chike othago piny",
        fb_title: "📣 Pachni",
        fb_subtitle: "Pog pachni kuom chike",
        fb_form_title: "Or Pach Manyien",
        fb_select_bill: "Yier chik...",
        fb_previous: "📋 Pach Magi Machon",
        fb_empty: "Pok ior pachi. Dwondi ber!",
        profile_title: "👤 Nyingi",
        profile_subtitle: "Lo nyingi kendo ne timbegi",
        edit_profile: "✏️ Lok Nyingi",
        label_name: "Nyingi Duto",
        label_county: "Kaunti",
        label_language: "Dhok Mihero",
        placeholder_name: "Ket nyingi",
        save_profile: "Kan Nyingi",
        history_title: "📊 Gik ma Isetimo",
        history_empty: "Chak ne chike mondo ine timbegi ka",
        fb_history_title: "📣 Pachni Machon",
        footer_rights: "Puonjo ji kuom siasa gi AI.",
        toast_loading: "Pango...",
        toast_success: "Ber!",
        toast_error: "Gimoro ok odhi maber. Tem kendo.",
        toast_copied: "Osegol!",
        toast_feedback_submitted: "Erokamano! Pachni oseor.",
        toast_profile_saved: "Nyingi oseloki!",
        toast_no_bill: "Yier chik mokwongo.",
        toast_select_stance: "Yier pachni mokwongo.",
        toast_voice_unsupported: "Wuoyo ok tiyo e browser mari.",
        toast_shared: "Osepogi!",
        loading_summary: "Loso achiel kende...",
        loading_translate: "Loko...",
        loading_analyze: "Nono...",
        loading_guidance: "Yudo puonj...",
        loading_question: "Manyo duoko...",
        explore_deeper: "Ne Zaidi →",
        get_directions: "📍 Yud Yo",
        view_details: "Ne Malong'o"
    },
    ka: {
        tagline: "Kutitab Komosta Ko Kenya",
        tagline_full: "Kutitab Komosta Ko Kenya — Your Voice is Kenya",
        nav_home: "🏠 Kokwet",
        nav_bills: "📜 Temikab Kiit",
        nav_recommendations: "⭐ Kotiloswek",
        nav_forums: "🏛️ Koboreek",
        nav_profile: "👤 Ngalek Ngung",
        hero_badge: "Netiswek ak Boisiet ne Kenya Tugul",
        hero_title: "Ngelech Kiitab Chii.",
        hero_title_accent: "Kiyosin Sobondeng.",
        hero_desc: "Tambua kigoitoi AI kosir kiitab chii ne nyolu koba lekwet ne tilildo. Teech teebik, kigaam achek kobo lekwet age, ago ago kutitab komostab Kenya.",
        hero_cta: "📜 Tier Temik",
        hero_cta2: "⭐ Kaam Kotiloswek",
        stat_bills: "Temik ab Ne tinyei",
        stat_languages: "Kutikab chii",
        stat_counties: "Kaunti",
        bills_title: "📜 Temik ab Kiit",
        bills_subtitle: "Tier temik ab hoo ne ko ne mi Bunge ne Kenya",
        bills_search_placeholder: "Birchini temik...",
        filter_all: "Tugul",
        filter_active: "🟢 Ne mi",
        filter_passed: "🟡 Ko sir",
        filter_rejected: "🔴 Ko riib",
        back_to_bills: "Wee ko Temik",
        action_summary: "Achek",
        action_translate: "Kilotin",
        action_analyze: "Tinye",
        action_guidance: "Netiswek",
        ai_response: "Ngoliot ne AI",
        download: "Ibuun",
        share: "Kotiil",
        ask_question_title: "💬 Teech Teebik Kobo Temigei",
        ask_placeholder: "Teech kiy age tugul...",
        ask_btn: "Teech",
        mic_hint: "🎤 Namaach mic bo teech teebitab komosta",
        feedback_title: "📣 Kotiil Ngalek Ngung",
        support: "Tililto",
        oppose: "Rib",
        neutral: "Momi kiy",
        feedback_placeholder: "Kotiil ngalek ngung...",
        submit_feedback: "Ibu Ngalek",
        rec_title: "⭐ Kotiloswek Agobo Komosta",
        rec_subtitle: "Kotiloswek ne AI koyob histories",
        rec_bills_title: "📜 Temik ne Nyolu",
        pred_title: "📊 Ngelekab Boisiet",
        past_title: "📋 Resulti ab Temik ne Mi",
        past_bills_title: "🏛️ Temik ne Mi",
        past_bills_subtitle: "Temik ne mi ak resultisiek ko",
        forums_title: "🏛️ Koboreek ab Boisiet",
        forums_subtitle: "Birchini koboreek ne chege ak komosta",
        select_county: "Tep Kaunti Ngoong",
        forums_empty: "Tep kaunti ngoong bo birchini koboreek",
        impact_title: "📈 Tinye ab Temik",
        impact_subtitle: "Yee temik ko oi sobon",
        fb_title: "📣 Ngalek Ngung",
        fb_subtitle: "Kotiil ngalek ngung kobo kiit",
        fb_form_title: "Ibu Ngalek ne Leelu",
        fb_select_bill: "Tep temik...",
        fb_previous: "📋 Ngalek ne Mi",
        fb_empty: "Makomi ngalek ne ibu. Kutitab komosta ko kii!",
        profile_title: "👤 Ngalek Ngung",
        profile_subtitle: "Koyai ak tier boisietab komosta",
        edit_profile: "✏️ Yai Ngalek",
        label_name: "Kaineng Tugul",
        label_county: "Kaunti",
        label_language: "Lekwet ne Tilildo",
        placeholder_name: "Ibu kainengung",
        save_profile: "Kanan Ngalek",
        history_title: "📊 Boisietab Komosta",
        history_empty: "Teeb ko tier temik bo keer boisiet koguuyu",
        fb_history_title: "📣 Ngalek ne Mi",
        footer_rights: "Kiyosin netiswek kobo boisiet ago AI.",
        toast_loading: "Ko yuun...",
        toast_success: "Karam!",
        toast_error: "Komi kiy ne mayon. Teeb keer.",
        toast_copied: "Ko gol!",
        toast_feedback_submitted: "Kongoi! Ngalekwek ko ibu.",
        toast_profile_saved: "Ngalekwek ko yai!",
        toast_no_bill: "Tep temik ne bo.",
        toast_select_stance: "Tep ngalekwek ne bo.",
        toast_voice_unsupported: "Kutit momi boisiet kobo browser ngoong.",
        toast_shared: "Ko kotiil!",
        loading_summary: "Koyosin achek...",
        loading_translate: "Ko lotin...",
        loading_analyze: "Ko tinye...",
        loading_guidance: "Ko kaam netiswek...",
        loading_question: "Ko birchini ngoliot...",
        explore_deeper: "Tier Zaidi →",
        get_directions: "📍 Kaam Oret",
        view_details: "Tier Malong'o"
    }
};

// ─── HELPER: GET TRANSLATION ───
function t(key) {
    const lang = state.language || 'en';
    if (translations[lang] && translations[lang][key]) {
        return translations[lang][key];
    }
    if (translations.en[key]) {
        return translations.en[key];
    }
    return key;
}

// ─── INITIALIZATION ───
document.addEventListener('DOMContentLoaded', function () {
    // Restore language preference
    const savedLang = localStorage.getItem('tambua_language');
    if (savedLang && translations[savedLang]) {
        state.language = savedLang;
        document.getElementById('language-select').value = savedLang;
    }

    // Apply translations
    applyTranslations();

    // Set up scroll listener for navbar
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Populate county dropdowns
    populateCountyDropdowns();

    // Load initial data
    loadBills();
    loadProfile();

    // Show home section
    navigateTo('home');

    // Prevent context menu on mic buttons (for hold-to-speak)
    document.querySelectorAll('.mic-button').forEach(function (btn) {
        btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
});

// ─── NAVIGATION ───
function navigateTo(section) {
    // Map section to element id
    const sectionMap = {
        'home': 'home-section',
        'bills': 'bills-section',
        'bill-detail': 'bill-detail',
        'recommendations': 'recommendations-section',
        'past-bills': 'past-bills-section',
        'forums': 'forums-section',
        'impact': 'impact-section',
        'feedback': 'feedback-section',
        'profile': 'profile-section'
    };

    const targetId = sectionMap[section];
    if (!targetId) return;

    state.previousSection = state.currentSection;
    state.currentSection = section;

    // Hide all sections
    document.querySelectorAll('.section').forEach(function (el) {
        el.classList.remove('active');
    });

    // Show target section
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.add('active');
    }

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(function (link) {
        link.classList.remove('active');
        if (link.dataset.section === section) {
            link.classList.add('active');
        }
    });

    // Close mobile nav
    closeMobileNav();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load section-specific data
    if (section === 'recommendations') {
        loadRecommendations();
        loadPredictions();
        loadPastBillOutcomes();
    } else if (section === 'past-bills') {
        loadPastBills();
    } else if (section === 'profile') {
        loadProfile();
        loadHistory();
        loadProfileFeedback();
    } else if (section === 'feedback') {
        populateFeedbackBillSelect();
        loadAllFeedback();
    }
}

// ─── MOBILE NAVIGATION ───
function toggleMobileNav() {
    const navLinks = document.getElementById('nav-links');
    const navToggle = document.getElementById('nav-toggle');
    navLinks.classList.toggle('open');
    navToggle.classList.toggle('active');
}

function closeMobileNav() {
    const navLinks = document.getElementById('nav-links');
    const navToggle = document.getElementById('nav-toggle');
    if (navLinks) navLinks.classList.remove('open');
    if (navToggle) navToggle.classList.remove('active');
}

// ─── SCROLL HANDLER ───
function handleScroll() {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

// ─── LANGUAGE ───
function setLanguage(lang) {
    if (!translations[lang]) return;
    state.language = lang;
    localStorage.setItem('tambua_language', lang);
    document.getElementById('language-select').value = lang;
    applyTranslations();
    showToast('✅ ' + getLanguageName(lang), 'success');
}

function getLanguageName(code) {
    const names = {
        en: 'English',
        sw: 'Kiswahili',
        ki: 'Kikuyu',
        sh: 'Sheng',
        lu: 'Luo',
        ka: 'Kalenjin'
    };
    return names[code] || code;
}

function applyTranslations() {
    // Translate all [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (text) el.textContent = text;
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
        const key = el.getAttribute('data-i18n-placeholder');
        const text = t(key);
        if (text) el.placeholder = text;
    });
}

// ─── API LAYER ───
async function api(endpoint, options) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const mergedOptions = Object.assign({}, defaultOptions, options || {});

    // Add language parameter
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = API + endpoint + separator + 'language=' + state.language;

    try {
        const response = await fetch(url, mergedOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(function () {
                return { detail: 'Request failed with status ' + response.status };
            });
            throw new Error(errorData.detail || errorData.message || 'API request failed');
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Network error. Please check your connection.');
        }
        throw error;
    }
}

// ─── TOAST NOTIFICATIONS ───
function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    var icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    toast.innerHTML =
        '<span>' + (icons[type] || 'ℹ️') + '</span>' +
        '<span>' + escapeHtml(message) + '</span>' +
        '<button class="toast-close" onclick="dismissToast(this)">&times;</button>';

    container.appendChild(toast);

    // Auto-dismiss after 4 seconds
    setTimeout(function () {
        if (toast.parentNode) {
            toast.classList.add('toast-out');
            setTimeout(function () {
                if (toast.parentNode) toast.remove();
            }, 300);
        }
    }, 4000);
}

function dismissToast(btn) {
    var toast = btn.closest('.toast');
    if (toast) {
        toast.classList.add('toast-out');
        setTimeout(function () {
            if (toast.parentNode) toast.remove();
        }, 300);
    }
}

// ─── LOADING STATE ───
function showLoading(element) {
    if (!element) return;
    element.innerHTML = '<div class="loading-spinner"></div>';
    element.style.display = 'block';
}

function hideLoading(element) {
    if (!element) return;
    var spinner = element.querySelector('.loading-spinner');
    if (spinner) spinner.remove();
}

function showSkeletons(container, count) {
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
        html +=
            '<div class="card skeleton-card" style="animation-delay:' + (i * 0.1) + 's">' +
                '<div class="skeleton skeleton-title"></div>' +
                '<div class="skeleton skeleton-text"></div>' +
                '<div class="skeleton skeleton-text" style="width:70%"></div>' +
                '<div class="skeleton skeleton-badge"></div>' +
            '</div>';
    }
    container.innerHTML = html;
}

// ─── UTILITIES ───
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        var date = new Date(dateString);
        var langMap = {
            en: 'en-KE', sw: 'sw-KE', ki: 'en-KE',
            sh: 'sw-KE', lu: 'en-KE', ka: 'en-KE'
        };
        return date.toLocaleDateString(langMap[state.language] || 'en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

function truncateText(text, maxLen) {
    maxLen = maxLen || 150;
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
}

function getBadgeClass(status) {
    if (!status) return 'badge';
    var s = status.toLowerCase();
    if (s === 'active' || s === 'pending') return 'badge badge-active';
    if (s === 'passed' || s === 'enacted') return 'badge badge-passed';
    if (s === 'rejected' || s === 'withdrawn') return 'badge badge-rejected';
    return 'badge badge-active';
}

function getBadgeText(status) {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

// ─── MODAL ───
function openModal(contentHtml) {
    document.getElementById('modal-content').innerHTML = contentHtml;
    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
}

// Close modal on Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ─── COUNTY DATA ───
var KENYA_COUNTIES = [
    "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta",
    "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru",
    "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni",
    "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a", "Kiambu",
    "Turkana", "West Pokot", "Samburu", "Trans-Nzoia", "Uasin Gishu",
    "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru",
    "Narok", "Kajiado", "Kericho", "Bomet", "Kakamega", "Vihiga",
    "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay", "Migori",
    "Kisii", "Nyamira", "Nairobi"
];

function populateCountyDropdowns() {
    var selects = [
        document.getElementById('county-select'),
        document.getElementById('profile-county-select')
    ];

    selects.forEach(function (select) {
        if (!select) return;
        // Keep existing first option
        var firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);

        KENYA_COUNTIES.forEach(function (county) {
            var opt = document.createElement('option');
            opt.value = county;
            opt.textContent = county;
            select.appendChild(opt);
        });
    });
}

// ─── STANCE SELECTOR ───
function selectStance(stance, btn, toggleId) {
    var container = btn.closest('.stance-toggle');
    if (toggleId) {
        container = document.getElementById(toggleId);
    }

    // Remove active from all stance buttons in this group
    container.querySelectorAll('.stance-btn').forEach(function (b) {
        b.classList.remove('active');
    });

    // Add active to clicked
    btn.classList.add('active');

    // Update state for bill detail feedback
    if (!toggleId || toggleId === 'stance-toggle') {
        state.feedbackStance = stance;
    }
}

// ─── FEEDBACK BILL SELECT ───
function populateFeedbackBillSelect() {
    var select = document.getElementById('feedback-bill-select');
    if (!select || !state.bills.length) return;

    var firstOpt = select.querySelector('option');
    select.innerHTML = '';
    if (firstOpt) select.appendChild(firstOpt);

    state.bills.forEach(function (bill) {
        var opt = document.createElement('option');
        opt.value = bill.id || bill.bill_id;
        opt.textContent = bill.title;
        select.appendChild(opt);
    });
}
