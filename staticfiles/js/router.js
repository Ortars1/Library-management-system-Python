// router.js — History API SPA router
const Router = {
    routes: [],

    on(path, handler) {
        this.routes.push({ path, handler });
        return this;
    },

    navigate(path) {
        history.pushState({ path }, '', path);
        this._dispatch(path);
    },

    _dispatch(path) {
        const clean = path.replace(/\?.*$/, '');
        // Try exact match first (with or without trailing slash)
        for (const { path: route, handler } of this.routes) {
            if (clean === route || clean === route + '/' || clean + '/' === route || clean === route.replace(/\/$/, '')) {
                handler(clean);
                return;
            }
        }
        // Prefix match for dynamic segments e.g. /book/UUID/
        for (const { path: route, handler } of this.routes) {
            const prefix = route.replace(/\/$/, '');
            if (clean.startsWith(prefix + '/') || clean.startsWith(prefix)) {
                handler(clean);
                return;
            }
        }
        // Fallback
        window.location.href = path;
    },

    init() {
        window.addEventListener('popstate', () => {
            this._dispatch(location.pathname);
        });
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-route]');
            if (link) {
                e.preventDefault();
                this.navigate(link.dataset.route || link.getAttribute('href'));
            }
        });
        this._dispatch(location.pathname);
    }
};
