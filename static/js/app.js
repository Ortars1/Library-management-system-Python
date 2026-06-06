// app.js — main SPA entry point

// ── helpers ──────────────────────────────────────────────────────────────────
function escHtml(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d + (d.includes('T') ? '' : 'T00:00:00'));
    return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}
function isLoggedIn() { return !!localStorage.getItem('access_token'); }
function userRole() { return localStorage.getItem('user_role') || ''; }
function userName() { return localStorage.getItem('username') || 'Пользователь'; }
function isStaff() { return ['librarian','admin'].includes(userRole()); }

function setApp(html) { document.getElementById('app').innerHTML = html; }
function showAlert(msg, type='error') {
    const cls = type === 'error' ? 'alert-error' : 'alert-success';
    return `<div class="alert ${cls}">${escHtml(msg)}</div>`;
}

// ── nav update ────────────────────────────────────────────────────────────────
function updateNav(activePath) {
    const logged = isLoggedIn();
    document.getElementById('nav-login').style.display = logged ? 'none' : 'inline';
    document.getElementById('nav-logout').style.display = logged ? 'inline' : 'none';
    document.getElementById('nav-loans').style.display = logged ? 'inline' : 'none';
    document.getElementById('nav-loans').textContent = (logged && isStaff()) ? 'Приём возвратов' : 'Мои выдачи';
    document.getElementById('nav-reports').style.display = (logged && isStaff()) ? 'inline' : 'none';

    const badgeWrap = document.getElementById('user-badge-wrap');
    badgeWrap.innerHTML = logged
        ? `<span class="user-badge">👤 ${escHtml(userName())}</span>`
        : '';

    // Active link
    document.querySelectorAll('.nav-links a[data-route]').forEach(a => {
        a.classList.toggle('active', a.dataset.route === activePath || a.getAttribute('href') === activePath);
    });
}

function handleLogout() {
    API.logout();
    updateNav('/login/');
    Router.navigate('/login/');
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
function renderLogin() {
    updateNav('/login/');
    setApp(`
      <div class="login-wrap">
        <div class="login-card">
          <div class="logo-big">📚</div>
          <h1>Добро пожаловать</h1>
          <p class="sub">Введите данные для доступа к личному кабинету</p>
          <div id="login-alert"></div>
          <div class="form-group">
            <label>Логин или Email</label>
            <input id="inp-username" type="text" placeholder="reader1" autocomplete="username">
          </div>
          <div class="form-group">
            <label>Пароль</label>
            <input id="inp-password" type="password" placeholder="••••••••" autocomplete="current-password">
          </div>
          <button class="btn" id="btn-login">Войти в систему</button>
          <div class="hint">Нет аккаунта? <a href="#">Обратитесь к администратору</a></div>
        </div>
      </div>
    `);

    const doLogin = async () => {
        const username = document.getElementById('inp-username').value.trim();
        const password = document.getElementById('inp-password').value;
        const alertEl = document.getElementById('login-alert');
        if (!username || !password) {
            alertEl.innerHTML = showAlert('Введите логин и пароль');
            return;
        }
        document.getElementById('btn-login').disabled = true;
        document.getElementById('btn-login').textContent = 'Вход...';
        try {
            await API.login(username, password);
            updateNav('/catalog/');
            Router.navigate('/catalog/');
        } catch (err) {
            alertEl.innerHTML = showAlert('Неверный логин или пароль');
            document.getElementById('btn-login').disabled = false;
            document.getElementById('btn-login').textContent = 'Войти в систему';
        }
    };

    document.getElementById('btn-login').addEventListener('click', doLogin);
    document.getElementById('inp-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────
function renderHome() {
    updateNav('/');
    setApp(`
      <div class="hero">
        <h1>📚 Система управления библиотекой</h1>
        <p>Электронный каталог, выдача и возврат книг — всё в одном месте</p>
        <a href="/catalog/" data-route="/catalog/" class="btn">Перейти к каталогу</a>
      </div>
    `);
}

// ── CATALOG PAGE ──────────────────────────────────────────────────────────────
// Храним список id книг, которые читатель уже взял (обновляется при загрузке каталога)
window._myActiveBookIds = new Set();

async function renderCatalog() {
    updateNav('/catalog/');
    setApp(`
      <h1 style="margin-bottom:1.5rem">Каталог книг</h1>
      <div class="search-bar">
        <input type="text" id="search-input" placeholder="Поиск по названию, автору или ISBN...">
        <button class="btn" id="btn-search">Найти</button>
      </div>
      <div id="books-grid"><div style="color:var(--muted)">Загрузка...</div></div>
    `);

    // Для читателя — грузим его активные выдачи, чтобы знать какие кнопки заблокировать
    if (isLoggedIn() && !isStaff()) {
        try {
            const active = await API.myActiveLoans();
            window._myActiveBookIds = new Set(active.active_book_ids || []);
        } catch (_) {
            window._myActiveBookIds = new Set();
        }
    }

    const loadBooks = async (q = '') => {
        const grid = document.getElementById('books-grid');
        grid.innerHTML = '<div style="color:var(--muted)">Загрузка...</div>';
        try {
            const params = {};
            if (q) params.search = q;
            const data = await API.getBooks(params);
            const books = data.results || data;
            if (!books.length) { grid.innerHTML = '<p style="color:var(--muted)">Книги не найдены</p>'; return; }
            grid.innerHTML = `<div class="grid">${books.map(book => bookCard(book)).join('')}</div>`;
            // Вешаем обработчики на кнопки «Взять книгу»
            document.querySelectorAll('.btn-borrow').forEach(btn => {
                btn.addEventListener('click', () => handleBorrow(btn));
            });
        } catch (err) {
            grid.innerHTML = showAlert(err.message);
        }
    };

    document.getElementById('btn-search').addEventListener('click', () => {
        loadBooks(document.getElementById('search-input').value.trim());
    });
    document.getElementById('search-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') loadBooks(e.target.value.trim());
    });

    loadBooks();
}

async function handleBorrow(btn) {
    const bookId = btn.dataset.bookId;
    const card = btn.closest('.book-card');
    const msgEl = card.querySelector('.borrow-msg');

    btn.disabled = true;
    btn.textContent = 'Оформляется...';

    try {
        await API.borrowBook(bookId);

        // Обновляем локальный набор активных книг
        window._myActiveBookIds.add(bookId);

        // Обновляем карточку напрямую без перезагрузки страницы
        btn.textContent = 'Уже на руках';
        btn.classList.remove('btn');
        btn.classList.add('btn-outline');
        btn.disabled = true;

        // Обновляем бейдж доступности
        const badgeEl = card.querySelector('.avail-badge');
        if (badgeEl) {
            const cur = Math.max(0, parseInt(badgeEl.dataset.avail, 10) - 1);
            const total = parseInt(badgeEl.dataset.total, 10);
            const cls = cur === 0 ? 'b-red' : cur <= total * 0.3 ? 'b-yellow' : 'b-green';
            const label = cur === 0 ? 'Нет в наличии' : `Доступно: ${cur} из ${total}`;
            badgeEl.className = `badge ${cls} avail-badge`;
            badgeEl.dataset.avail = cur;
            badgeEl.textContent = label;
        }

        if (msgEl) {
            msgEl.textContent = '✓ Книга взята! Срок возврата — 14 дней.';
            msgEl.style.color = 'var(--success)';
        }
    } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Взять книгу';
        if (msgEl) {
            msgEl.textContent = err.message;
            msgEl.style.color = 'var(--danger)';
        }
    }
}

function availBadgeHtml(avail, total) {
    const a = avail, t = total;
    const cls = a === 0 ? 'b-red' : a <= t * 0.3 ? 'b-yellow' : 'b-green';
    const label = a === 0 ? 'Нет в наличии' : `Доступно: ${a} из ${t}`;
    return `<span class="badge ${cls} avail-badge" data-avail="${a}" data-total="${t}">${label}</span>`;
}
// Backward compat alias
function availBadge(book) {
    return availBadgeHtml(book.available_copies, book.total_copies);
}

function bookCard(book) {
    const authors = (book.authors || []).map(a => `${a.last_name} ${a.first_name}`).join(', ') || '—';
    const year = book.publication_year || '';
    const cat = book.category?.name || '';
    const pub = book.publisher?.name || '';

    let borrowBtn = '';
    if (isLoggedIn() && !isStaff()) {
        const alreadyTaken = window._myActiveBookIds.has(String(book.id));
        const noStock = book.available_copies === 0;
        if (alreadyTaken) {
            borrowBtn = `<button class="btn btn-sm btn-outline btn-borrow" data-book-id="${book.id}" disabled style="margin-top:0.75rem;width:100%">Уже на руках</button>`;
        } else if (noStock) {
            borrowBtn = `<button class="btn btn-sm btn-outline btn-borrow" data-book-id="${book.id}" disabled style="margin-top:0.75rem;width:100%">Нет в наличии</button>`;
        } else {
            borrowBtn = `<button class="btn btn-sm btn-borrow" data-book-id="${book.id}" style="margin-top:0.75rem;width:100%">Взять книгу</button>`;
        }
    }

    return `
      <div class="book-card">
        <h3><a href="/book/${book.id}/" data-route="/book/${book.id}/">${escHtml(book.title)}</a></h3>
        <p class="meta">${escHtml(authors)}${year ? ' • ' + year : ''}</p>
        <div class="tags">
          ${cat ? `<span class="tag">${escHtml(cat)}</span>` : ''}
          ${pub ? `<span class="tag">${escHtml(pub)}</span>` : ''}
        </div>
        ${availBadgeHtml(book.available_copies, book.total_copies)}
        ${borrowBtn}
        <small class="borrow-msg" style="display:block;margin-top:0.4rem;min-height:1rem"></small>
      </div>`;
}

// ── BOOK DETAIL ───────────────────────────────────────────────────────────────
async function renderBookDetail(path) {
    updateNav('/catalog/');
    const match = path.match(/\/book\/([^/]+)\//);
    if (!match) { Router.navigate('/catalog/'); return; }
    const id = match[1];

    setApp('<div style="color:var(--muted);padding:2rem">Загрузка...</div>');
    try {
        const book = await API.getBook(id);
        const authors = (book.authors || []).map(a => `${a.last_name} ${a.first_name}`).join(', ') || '—';
        let issueBtn = '';
        if (isLoggedIn() && isStaff() && book.available_copies > 0) {
            issueBtn = `<button class="btn btn-sm" id="btn-issue" style="margin-top:1rem">Выдать книгу</button>`;
        }
        setApp(`
          <p style="margin-bottom:1rem"><a href="/catalog/" data-route="/catalog/" style="color:var(--primary);text-decoration:none">← Каталог</a></p>
          <div class="card" style="max-width:600px">
            <h2 style="margin-bottom:0.5rem">${escHtml(book.title)}</h2>
            <p class="meta" style="color:var(--muted);margin-bottom:1rem">${escHtml(authors)}${book.publication_year ? ' • ' + book.publication_year : ''}</p>
            <p><strong>ISBN:</strong> ${escHtml(book.isbn)}</p>
            <p><strong>Категория:</strong> ${escHtml(book.category?.name || '—')}</p>
            <p><strong>Издательство:</strong> ${escHtml(book.publisher?.name || '—')}</p>
            <p style="margin-top:0.75rem">${availBadge(book)}</p>
            <div id="issue-alert"></div>
            ${issueBtn}
          </div>
        `);

        if (isStaff()) {
            document.getElementById('btn-issue')?.addEventListener('click', async () => {
                const userId = prompt('ID читателя:');
                if (!userId) return;
                try {
                    await API.issueLoan(id, userId);
                    document.getElementById('issue-alert').innerHTML = showAlert('Книга выдана!', 'success');
                    // Reload book info
                    setTimeout(() => renderBookDetail(path), 1500);
                } catch (err) {
                    document.getElementById('issue-alert').innerHTML = showAlert(err.message);
                }
            });
        }
    } catch (err) {
        setApp(showAlert(err.message));
    }
}

// ── MY LOANS / RETURNS PAGE ───────────────────────────────────────────────────
async function renderMyLoans() {
    if (!isLoggedIn()) { Router.navigate('/login/'); return; }
    updateNav('/my-loans/');

    if (isStaff()) {
        await renderReturnsPanel();
    } else {
        await renderReaderLoans();
    }
}

// Панель читателя — только его личные выдачи, без колонки «Читатель»
async function renderReaderLoans() {
    setApp(`
      <h1 style="margin-bottom:1.5rem">📖 Мои выдачи</h1>
      <div id="loans-wrap"><div style="color:var(--muted)">Загрузка...</div></div>
    `);

    try {
        const data = await API.getMyLoans();
        const loans = data.results || data;
        const wrap = document.getElementById('loans-wrap');

        if (!loans.length) {
            wrap.innerHTML = '<div class="card"><p style="color:var(--muted)">У вас нет выдач</p></div>';
            return;
        }

        const rows = loans.map(loan => {
            const isOverdue = loan.status === 'active' && new Date(loan.due_date) < new Date();
            const effectiveStatus = (loan.status === 'active' && isOverdue) ? 'overdue' : loan.status;
            const statusLabel = { active: 'Активна', overdue: 'Просрочена', returned: 'Возвращена' }[effectiveStatus] || loan.status;
            const statusClass = { active: 's-active', overdue: 's-overdue', returned: 's-returned' }[effectiveStatus];
            const actionCell = loan.status === 'returned' ? '<span style="color:var(--muted)">—</span>' : '';
            return `
              <tr>
                <td><strong>${escHtml(loan.book?.title || '—')}</strong><br>
                    <small style="color:var(--muted)">${escHtml((loan.book?.authors||[]).map(a=>`${a.last_name} ${a.first_name}`).join(', ') || '')}</small></td>
                <td>${fmtDate(loan.issue_date)}</td>
                <td>${fmtDate(loan.due_date)}</td>
                <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
                <td>${actionCell}</td>
              </tr>`;
        }).join('');

        wrap.innerHTML = `
          <div class="card">
            <div class="loans-table-wrap">
              <table class="loans-table">
                <thead><tr><th>Книга</th><th>Дата выдачи</th><th>Срок возврата</th><th>Статус</th><th></th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`;
    } catch (err) {
        document.getElementById('loans-wrap').innerHTML = showAlert(err.message);
    }
}

// Панель сотрудника — все активные выдачи всех читателей с кнопкой возврата
async function renderReturnsPanel() {
    setApp(`
      <h1 style="margin-bottom:0.5rem">📋 Приём возвратов</h1>
      <p style="color:var(--muted);margin-bottom:1.5rem">Активные и просроченные выдачи всех читателей</p>
      <div id="loans-wrap"><div style="color:var(--muted)">Загрузка...</div></div>
    `);

    try {
        // Загружаем только активные выдачи (статус active)
        const data = await API.getAllLoans();
        const allLoans = data.results || data;
        const loans = allLoans.filter(l => l.status === 'active');
        const wrap = document.getElementById('loans-wrap');

        if (!loans.length) {
            wrap.innerHTML = '<div class="card"><p style="color:var(--muted)">Нет активных выдач</p></div>';
            return;
        }

        const rows = loans.map(loan => {
            const isOverdue = new Date(loan.due_date) < new Date();
            const effectiveStatus = isOverdue ? 'overdue' : 'active';
            const statusLabel = isOverdue ? 'Просрочена' : 'Активна';
            const statusClass = isOverdue ? 's-overdue' : 's-active';
            const reader = loan.user?.username || '—';
            return `
              <tr>
                <td><strong>${escHtml(loan.book?.title || '—')}</strong><br>
                    <small style="color:var(--muted)">${escHtml((loan.book?.authors||[]).map(a=>`${a.last_name} ${a.first_name}`).join(', ') || '')}</small></td>
                <td><span style="font-weight:600">${escHtml(reader)}</span></td>
                <td>${fmtDate(loan.issue_date)}</td>
                <td>${fmtDate(loan.due_date)}</td>
                <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
                <td><button class="btn btn-sm" onclick="doReturn('${loan.id}')">Принять возврат</button></td>
              </tr>`;
        }).join('');

        wrap.innerHTML = `
          <div class="card">
            <div class="loans-table-wrap">
              <table class="loans-table">
                <thead>
                  <tr>
                    <th>Книга</th>
                    <th>Читатель</th>
                    <th>Дата выдачи</th>
                    <th>Срок возврата</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`;
    } catch (err) {
        document.getElementById('loans-wrap').innerHTML = showAlert(err.message);
    }
}

async function doReturn(loanId) {
    if (!confirm('Оформить возврат книги?')) return;
    try {
        await API.returnLoan(loanId);
        renderMyLoans(); // перезагружает нужную панель в зависимости от роли
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
}

// ── REPORTS PAGE ──────────────────────────────────────────────────────────────
async function renderReports() {
    if (!isStaff()) { Router.navigate('/catalog/'); return; }
    updateNav('/reports/');
    setApp(`
      <h1 style="margin-bottom:1.5rem">📊 Отчёты</h1>
      <div id="reports-wrap"><div style="color:var(--muted)">Загрузка...</div></div>
    `);

    try {
        const [booksData, loansData, overdueData] = await Promise.all([
            API.getBooks({ page_size: 1 }),
            API.getAllLoans({ page_size: 1 }),
            API.getOverdueLoans(),
        ]);

        const totalBooks = booksData.count ?? (booksData.results?.length ?? 0);
        const totalLoans = loansData.count ?? (loansData.results?.length ?? 0);
        const overdueLoans = overdueData.results || overdueData || [];
        const overdueCount = overdueLoans.length;

        const overdueRows = overdueLoans.slice(0, 10).map(loan => `
          <tr>
            <td><strong>${escHtml(loan.book?.title || '—')}</strong></td>
            <td>${escHtml(loan.user?.username || '—')}</td>
            <td>${fmtDate(loan.due_date)}</td>
            <td><span class="status-pill s-overdue">Просрочена</span></td>
          </tr>`).join('') || '<tr><td colspan="4" style="color:var(--muted)">Просроченных выдач нет</td></tr>';

        document.getElementById('reports-wrap').innerHTML = `
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-num">${totalBooks}</div>
              <div class="stat-label">Книг в каталоге</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">${totalLoans}</div>
              <div class="stat-label">Всего выдач</div>
            </div>
            <div class="stat-card">
              <div class="stat-num" style="color:var(--danger)">${overdueCount}</div>
              <div class="stat-label">Просроченных</div>
            </div>
          </div>
          <div class="card">
            <h2 style="margin-bottom:1rem">Просроченные выдачи</h2>
            <div class="loans-table-wrap">
              <table class="loans-table">
                <thead><tr><th>Книга</th><th>Читатель</th><th>Срок возврата</th><th>Статус</th></tr></thead>
                <tbody>${overdueRows}</tbody>
              </table>
            </div>
          </div>`;
    } catch (err) {
        document.getElementById('reports-wrap').innerHTML = showAlert(err.message);
    }
}

// ── ROUTER SETUP & INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    Router
        .on('/', renderHome)
        .on('/catalog/', renderCatalog)
        .on('/login/', renderLogin)
        .on('/my-loans/', renderMyLoans)
        .on('/reports/', renderReports)
        .on('/book/', renderBookDetail)
        .init();
});
