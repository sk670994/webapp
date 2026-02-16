# Simple JWT Posts Web App

## Features
- Signup and login
- Password hashing using `bcryptjs`
- JWT-based authentication (stored in HTTP-only cookie)
- Protected routes for logged-in users
- Create, edit, and view posts
- Users can edit only their own posts
- Admin can view all posts and delete any post

## Required Routes
- `/signup`
- `/login`
- `/dashboard`
- `/create-post`
- `/edit-post/:id`
- `/admin`

## Tech
- Node.js
- Express
- MongoDB + Mongoose
- EJS templates

## Setup
1. Install dependencies:
   - `npm install`
2. Create `.env` from `.env.example`
3. Set:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `PORT` (optional)
4. Run:
   - `npm start`

## Admin Role
New signups are always created with role `user`.
To make an admin manually in MongoDB:

```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

## Demo Cheat Sheet

### Route Map
| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/signup` | Public | Show signup page |
| POST | `/signup` | Public | Create user, hash password, set JWT cookie |
| GET | `/login` | Public | Show login page |
| POST | `/login` | Public | Verify credentials, set JWT cookie |
| POST | `/logout` | Logged-in | Clear auth cookie |
| GET | `/dashboard` | Logged-in | View all posts |
| GET | `/create-post` | Logged-in | Show create form |
| POST | `/posts` | Logged-in | Create post |
| GET | `/edit-post/:id` | Owner only | Show edit form for own post |
| PUT | `/posts/:id` | Owner only | Update own post (`updatedAt` changes) |
| GET | `/admin` | Admin | Admin panel with all posts |
| DELETE | `/posts/:id` | Admin | Delete any post |

### Auth and Middleware Flow
1. User signs up/logs in.
2. Server creates JWT (`userId`, `role`) and stores it in HTTP-only cookie `token`.
3. `attachUserIfLoggedIn` runs on every request and sets `req.user` when token is valid.
4. Protected routes use `requireAuth`.
5. Admin-only routes additionally use `requireAdmin`.

### Permission Matrix
| Action | Guest | User | Admin |
|---|---|---|---|
| Signup/Login | Yes | N/A | N/A |
| View dashboard posts | No | Yes | Yes |
| Create post | No | Yes | Yes |
| Edit own post | No | Yes | Yes |
| Edit others' post | No | No | No |
| Delete post | No | No | Yes |
| Access `/admin` | No | No | Yes |

### Quick Test Sequence
1. Signup user A, create post.
2. Signup user B, verify B can view all posts but cannot edit A's post.
3. Promote one account to admin in MongoDB.
4. Login as admin, open `/admin`, delete any post.
5. Check `users.password` in DB is hashed, not plain text.
