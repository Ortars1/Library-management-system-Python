# LibraryMVP — Серверная часть системы управления библиотекой

Django + DRF + PostgreSQL + Docker

## Быстрый старт (Docker)

```bash
docker compose up --build
```

Откройте http://localhost:8000 — демо-данные создаются автоматически.

### Демо-пользователи

| Логин | Пароль | Роль |
|-------|--------|------|
| reader1 | reader123 | Читатель |
| librarian1 | lib123 | Библиотекарь |
| admin | admin123 | Администратор |

## Структура проекта

```
library_mvp/
├── apps/
│   ├── users/          — пользователи и JWT-аутентификация
│   ├── catalog/        — книги, авторы, категории, издательства
│   └── circulation/    — выдача и возврат книг
├── config/             — настройки Django, URL-конфигурация
├── static/
│   ├── css/style.css   — стили
│   └── js/
│       ├── api.js      — REST-клиент
│       ├── router.js   — SPA-роутер (History API)
│       └── app.js      — страницы и бизнес-логика UI
├── templates/          — Django-шаблоны (base.html + страницы)
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## API

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/v1/auth/login/ | Вход (JWT) |
| POST | /api/v1/auth/refresh/ | Обновление токена |
| GET | /api/v1/auth/me/ | Текущий пользователь |
| GET/POST | /api/v1/catalog/books/ | Каталог книг |
| GET | /api/v1/catalog/books/?search=... | Поиск |
| GET | /api/v1/loans/ | Выдачи (свои / все для staff) |
| POST | /api/v1/loans/issue/ | Выдать книгу (librarian/admin) |
| POST | /api/v1/loans/{id}/return_book/ | Вернуть книгу (librarian/admin) |
| GET | /api/v1/loans/overdue/ | Просроченные (librarian/admin) |

## Роли

- **reader** — просмотр каталога, свои выдачи
- **librarian** — + выдача/возврат книг, все выдачи, отчёты
- **admin** — все права + Django admin (/admin/)
