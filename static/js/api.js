// api.js — unified REST API client
const API = {
    base: window.API_BASE || '/api/v1',

    _token() {
        return localStorage.getItem('access_token');
    },

    async request(endpoint, options = {}) {
        const url = `${this.base}${endpoint}`;
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        const token = this._token();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let response = await fetch(url, { ...options, headers });

        // Auto-refresh on 401
        if (response.status === 401 && !options._retry) {
            const ok = await this.refreshToken();
            if (ok) {
                headers['Authorization'] = `Bearer ${this._token()}`;
                response = await fetch(url, { ...options, headers, _retry: true });
            } else {
                this.logout();
                Router.navigate('/login/');
                throw new Error('Сессия истекла. Войдите снова.');
            }
        }

        if (!response.ok) {
            let detail = `HTTP ${response.status}`;
            try {
                const err = await response.json();
                detail = err.detail || err.message || JSON.stringify(err);
            } catch (_) {}
            throw new Error(detail);
        }

        if (response.status === 204) return null;
        return response.json();
    },

    async refreshToken() {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) return false;
        try {
            const res = await fetch(`${this.base}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('access_token', data.access);
                return true;
            }
        } catch (_) {}
        return false;
    },

    async login(username, password) {
        const data = await this.request('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        // Fetch user info
        const user = await this.me();
        localStorage.setItem('username', user.username);
        localStorage.setItem('user_role', user.role);
        localStorage.setItem('user_id', user.id);
        return data;
    },

    logout() {
        ['access_token','refresh_token','username','user_role','user_id'].forEach(k => localStorage.removeItem(k));
    },

    me() { return this.request('/auth/me/'); },

    // Catalog
    getBooks(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/catalog/books/${qs ? '?' + qs : ''}`);
    },
    getBook(id) { return this.request(`/catalog/books/${id}/`); },
    getCategories() { return this.request('/catalog/categories/'); },
    getPublishers() { return this.request('/catalog/publishers/'); },
    getAuthors() { return this.request('/catalog/authors/'); },

    // Loans
    getMyLoans(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/loans/${qs ? '?' + qs : ''}`);
    },
    getAllLoans(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/loans/${qs ? '?' + qs : ''}`);
    },
    getOverdueLoans() { return this.request('/loans/overdue/'); },
    issueLoan(bookId, userId) {
        return this.request('/loans/issue/', {
            method: 'POST',
            body: JSON.stringify({ book_id: bookId, user_id: userId }),
        });
    },
    returnLoan(loanId) {
        return this.request(`/loans/${loanId}/return_book/`, { method: 'POST' });
    },

    // Читатель берёт книгу самостоятельно
    borrowBook(bookId) {
        return this.request('/loans/borrow/', {
            method: 'POST',
            body: JSON.stringify({ book_id: bookId }),
        });
    },

    // Книги, которые сейчас у читателя на руках
    myActiveLoans() {
        return this.request('/loans/my_active/');
    },
};
