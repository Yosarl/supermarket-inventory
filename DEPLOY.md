# Deploying to Render

## Create a user (required for login)

Your production MongoDB may be empty. Create an admin user by running the **seed script once** with the same database your backend uses:

1. In the backend folder, set `MONGODB_URI` to the **exact same** URI you set on Render (e.g. your MongoDB Atlas connection string).
2. Run:
   ```bash
   cd backend
   npm run seed
   ```
3. Default login after seed: **username** `admin`, **password** `Admin@123`.

If you see "Invalid username or password", the database has no user or the password is wrong—run the seed as above.

---

## Connect frontend to backend

After both services are deployed:

1. **Get your backend URL** from the Render dashboard (e.g. `https://supermarket-inventory-backend.onrender.com`).

2. **Set the frontend API URL**
   - In Render: open your **frontend** static site → **Environment**.
   - Add or edit:
     - **Key:** `VITE_API_URL`
   - **Value:** `https://YOUR-BACKEND-URL.onrender.com/api`  
     **(Must end with `/api`)** — e.g. `https://supermarket-inventory-backend.onrender.com/api`. Without `/api`, login and all API calls will 404.

3. **Redeploy the frontend**  
   Changing env vars does not rebuild the site. Use **Manual Deploy** → **Deploy latest commit** so the frontend rebuilds with the new `VITE_API_URL`.

4. Open your frontend URL; login and API calls will go to the backend.

**If login fails:** On the free tier the backend **spins down after ~15 min** of no traffic. The first request can take **30–60 seconds** while it wakes up. Wait a minute and try again, or open `https://your-backend.onrender.com/api/health` in a new tab first, then retry login.

---

## URLs summary

| Service  | Example URL |
|----------|-----------------------------|
| Backend  | `https://supermarket-inventory-backend.onrender.com` |
| Frontend | `https://supermarket-inventory-frontend.onrender.com` |
| API base | `https://supermarket-inventory-backend.onrender.com/api` ← use this for `VITE_API_URL` |
