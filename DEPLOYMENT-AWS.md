# Deploy Supermarket Inventory on AWS (using Git)

This guide walks you through deploying the **Supermarket Inventory** app (Node/Express backend + React/Vite frontend + MongoDB) on AWS, using Git to get the code onto the server.

---

## Prerequisites

- **AWS account** with billing enabled
- **Git** repo (GitHub, GitLab, or AWS CodeCommit) with this project pushed
- **MongoDB**: either **MongoDB Atlas** (recommended) or self-hosted

---

## Architecture (simple single-server)

- **1 EC2 instance**: runs backend API + serves frontend static files (or use Nginx to serve frontend)
- **MongoDB Atlas** (free tier): database in the cloud
- **Git**: clone repo on EC2 and pull for updates

---

## Step 1: Set up MongoDB Atlas (if you don’t have a DB)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create an account.
2. Create a **free cluster** (e.g. M0).
3. Under **Database Access** → Add Database User: create a user and note **username** and **password**.
4. Under **Network Access** → Add IP Address: add **0.0.0.0/0** (or your EC2 IP later) so the server can connect.
5. In the cluster, click **Connect** → **Connect your application**.
6. Copy the connection string. It looks like:
   ```text
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```
7. Replace `<user>`, `<password>`, and `<dbname>` (e.g. `supermarket_inventory`).  
   This is your **MONGODB_URI** for production.

---

## Step 2: Create an EC2 instance

1. In **AWS Console** go to **EC2** → **Instances** → **Launch instance**.
2. **Name**: e.g. `supermarket-inventory`.
3. **AMI**: Amazon Linux 2023 (or Ubuntu 22.04).
4. **Instance type**: e.g. **t2.micro** (free tier) or t3.small for better performance.
5. **Key pair**: Create or select a key pair and **download the `.pem`** file. You need it to SSH.
6. **Network**: Create or use a security group and open:
   - **SSH (22)** – your IP (or 0.0.0.0/0 only if you accept the risk).
   - **HTTP (80)** – 0.0.0.0/0 (for the web app).
   - **Custom TCP 5000** – 0.0.0.0/0 if you want to call the API on port 5000; otherwise you’ll use Nginx to proxy and can leave 5000 closed.
7. **Storage**: 8–20 GB is enough.
8. Launch the instance. Note the **Public IP** (or use an Elastic IP).

---

## Step 3: Connect to EC2 and install software

1. **SSH** (replace key and IP):
   ```bash
   ssh -i /path/to/your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
   ```
   (On Ubuntu the user is often `ubuntu` instead of `ec2-user`.)

2. **Update system** (Amazon Linux 2023):
   ```bash
   sudo dnf update -y
   ```
   (Ubuntu: `sudo apt update && sudo apt upgrade -y`.)

3. **Install Node.js 20** (Amazon Linux 2023):
   ```bash
   sudo dnf install -y nodejs
   node -v   # should be v18+ or v20+
   ```
   If the default version is old, use NodeSource:
   ```bash
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo dnf install -y nodejs
   ```

   **Ubuntu:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

4. **Install Git** (if not present):
   ```bash
   sudo dnf install -y git   # Amazon Linux
   # or: sudo apt install -y git   # Ubuntu
   ```

5. **Install Nginx** (to serve frontend and proxy API):
   ```bash
   sudo dnf install -y nginx   # Amazon Linux
   # or: sudo apt install -y nginx   # Ubuntu
   ```

---

## Step 4: Clone the app from Git

1. **Clone** (use your repo URL; HTTPS or SSH):
   ```bash
   cd /home/ec2-user
   git clone https://github.com/YOUR_USERNAME/supermarket-inventory.git
   cd supermarket-inventory
   ```
   If the repo is **private**, use a **deploy key** or **HTTPS with token** instead of the public URL.

2. **Install dependencies and build**:
   ```bash
   # From repo root
   npm run install:all
   npm run build
   ```
   This builds both backend and frontend.

---

## Step 5: Configure the backend (environment variables)

1. Create backend `.env` from the example and edit:
   ```bash
   cd /home/ec2-user/supermarket-inventory/backend
   cp .env.example .env
   nano .env
   ```

2. Set **production** values (use your Atlas URI from Step 1):
   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/supermarket_inventory?retryWrites=true&w=majority
   JWT_SECRET=your-very-long-random-secret-at-least-32-chars
   JWT_EXPIRES_IN=7d
   LOG_LEVEL=info
   ```
   Generate a strong `JWT_SECRET` (e.g. `openssl rand -base64 32`).

3. **(Optional)** If you use `DB_MODE=atlas` and a separate variable:
   ```env
   DB_MODE=atlas
   MONGODB_URI_ATLAS=mongodb+srv://...
   ```

---

## Step 6: Configure the frontend for production API

The frontend calls the API using `VITE_API_URL`. You need to build with that set so the browser talks to your server.

1. In the repo root or frontend folder, create a small env file used only at **build time** (e.g. `.env.production` in `frontend/`):
   ```bash
   cd /home/ec2-user/supermarket-inventory/frontend
   echo 'VITE_API_URL=https://YOUR_DOMAIN_OR_EC2_IP/api' > .env.production
   ```
   Replace `YOUR_DOMAIN_OR_EC2_IP` with your EC2 public IP or domain (e.g. `https://ec2-xx-xx-xx-xx.compute.amazonaws.com` or `https://app.yourdomain.com`).  
   Use **HTTPS** if you add a certificate later; for a quick test you can use `http://YOUR_EC2_IP/api` (browsers may block mixed content if the site is HTTPS).

2. Rebuild the frontend so it bakes in this URL:
   ```bash
   cd /home/ec2-user/supermarket-inventory/frontend
   npm run build
   ```
   The built files will be in `frontend/dist/`.

---

## Step 7: Run the backend and keep it running (PM2)

1. **Install PM2** (process manager):
   ```bash
   sudo npm install -g pm2
   ```

2. **Start the backend** from the backend directory:
   ```bash
   cd /home/ec2-user/supermarket-inventory/backend
   npm run build
   pm2 start dist/index.js --name supermarket-api
   pm2 save
   pm2 startup
   ```
   Run the command that `pm2 startup` prints (it adds PM2 to boot).

3. **Useful PM2 commands**:
   ```bash
   pm2 status
   pm2 logs supermarket-api
   pm2 restart supermarket-api
   ```

---

## Step 8: Configure Nginx (serve frontend + proxy API)

1. Create a config (replace with your domain or remove `server_name` and use default):
   ```bash
   sudo nano /etc/nginx/conf.d/supermarket-inventory.conf
   ```
   Paste (adjust `server_name` and paths if needed):

   ```nginx
   server {
       listen 80;
       server_name YOUR_EC2_PUBLIC_IP;   # or your domain, e.g. app.yourdomain.com

       root /home/ec2-user/supermarket-inventory/frontend/dist;
       index index.html;
       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /uploads {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
       }
   }
   ```

2. **Test and reload Nginx**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   sudo systemctl enable nginx
   ```

3. **Set frontend base URL**: If you’re serving at the root of the domain, you can leave `VITE_BASE_PATH` unset (default `/`). If you used `VITE_API_URL=https://YOUR_EC2_IP/api`, the frontend already points to the same origin for API when opened via `http://YOUR_EC2_IP`, so `/api` will go to Nginx and proxy to the backend.

---

## Step 9: Open the app

1. In a browser go to: `http://YOUR_EC2_PUBLIC_IP`
2. You should see the login screen. Create a user / company / financial year via your app’s flows (or run seed once if you have a seed script and want test data).

---

## Step 10: Deploy updates using Git

Whenever you push new code:

1. SSH into the EC2 instance.
2. Pull and rebuild:
   ```bash
   cd /home/ec2-user/supermarket-inventory
   git pull origin main
   npm run build
   ```
3. Restart the API:
   ```bash
   cd backend && pm2 restart supermarket-api
   ```
4. Frontend is served from `frontend/dist`; Nginx will serve the new files after the build (no restart needed).

---

## Optional: Use a domain and HTTPS

1. **Domain**: In Route 53 (or your DNS provider), create an A record pointing your domain (e.g. `app.yourdomain.com`) to the EC2 instance’s **Elastic IP** (allocate one in EC2 and associate it with the instance so the IP doesn’t change).
2. **HTTPS**: Install Certbot and get a free certificate:
   ```bash
   sudo dnf install -y certbot python3-certbot-nginx   # Amazon Linux
   sudo certbot --nginx -d app.yourdomain.com
   ```
   Then set `VITE_API_URL=https://app.yourdomain.com/api`, rebuild the frontend, and reload Nginx.

---

## Checklist

- [ ] MongoDB Atlas cluster created and connection string set in backend `.env`
- [ ] EC2 instance launched and security group allows SSH (22), HTTP (80)
- [ ] Node.js, Git, Nginx installed on EC2
- [ ] Repo cloned; `npm run install:all` and `npm run build` run
- [ ] Backend `.env` has `NONGODB_URI`, `JWT_SECRET`, `PORT=5000`
- [ ] Frontend built with `VITE_API_URL` pointing to your server’s `/api`
- [ ] Backend run with PM2; Nginx configured to serve `frontend/dist` and proxy `/api` and `/uploads` to port 5000
- [ ] App opens at `http://YOUR_EC2_IP` and login works

---

## Troubleshooting

- **502 Bad Gateway**: Backend not running or not on 5000. Check `pm2 status` and `pm2 logs supermarket-api`.
- **CORS / API errors**: Ensure Nginx proxies `/api` to `http://127.0.0.1:5000` and that `VITE_API_URL` matches how users open the site (same origin or correct domain).
- **Cannot connect to MongoDB**: Check Atlas Network Access (IP), user/password in `MONGODB_URI`, and that the backend can reach the internet (security group outbound rules).
- **Blank page**: Check browser console; often `VITE_API_URL` is wrong or base path mismatch. Rebuild frontend with correct `VITE_API_URL` and ensure Nginx `root` points to `frontend/dist`.
