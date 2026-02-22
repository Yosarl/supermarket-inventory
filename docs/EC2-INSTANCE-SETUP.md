# Step-by-Step: Create an EC2 Instance for Supermarket Inventory

Use this guide while you are in the **AWS EC2 Console** to launch an instance from scratch.

---

## Step 1: Open EC2 in AWS Console

1. Log in to [AWS Console](https://console.aws.amazon.com/).
2. In the search bar at the top, type **EC2** and click **EC2** (under Services).
3. Make sure the **region** (top-right, e.g. *N. Virginia*, *Mumbai*) is the one you want. You’ll connect to the instance in this region.

---

## Step 2: Start “Launch instance”

1. In the left sidebar, click **Instances**.
2. Click the orange **Launch instance** button.

---

## Step 3: Name and tags

1. **Name**: Type a name, e.g. `supermarket-inventory` (optional but useful).

---

## Step 4: Choose an AMI (operating system)

1. Leave **Quick Start** selected.
2. **Amazon Machine Image (AMI)**:
   - **Amazon Linux 2023 AMI** (recommended), or  
   - **Ubuntu Server 22.04 LTS**  
   Leave the default selection (e.g. 64-bit).

---

## Step 5: Choose instance type

1. **Instance type**: Select **t2.micro** (free tier eligible) or **t3.small** for better performance.
2. Leave other options as default.

---

## Step 6: Create or select a key pair (for SSH)

1. Under **Key pair (login)**:
   - If you already have a `.pem` key you want to use: choose it from the dropdown.
   - If not: click **Create new key pair**.
2. **Create key pair** dialog:
   - **Name**: e.g. `supermarket-inventory-key`.
   - **Key pair type**: RSA.
   - **Private key format**:  
     - **.pem** (Mac/Linux) or  
     - **.ppk** (only if you use PuTTY on Windows).
3. Click **Create key pair**. A file will download (e.g. `supermarket-inventory-key.pem`).
4. **Important**: Move the file to a safe folder and **do not share it**. You need it to SSH into the instance.

---

## Step 7: Network settings (security group)

1. Under **Network settings**, click **Edit**.
2. **VPC**: Leave default (e.g. default VPC).
3. **Subnet**: Leave default (e.g. No preference or first subnet).
4. **Auto-assign public IP**: **Enable** (so the instance gets a public IP).
5. **Firewall (security group)**:
   - Choose **Create security group**.
   - **Security group name**: e.g. `supermarket-inventory-sg`.
   - **Description**: e.g. `Allow SSH and HTTP for supermarket app`.

6. **Inbound security group rules** — add these rules:

   | Type        | Port | Source        | Description (optional) |
   |------------|------|---------------|-------------------------|
   | SSH        | 22   | My IP         | SSH access              |
   | HTTP       | 80   | 0.0.0.0/0     | Web browser access      |
   | Custom TCP | 5000 | 0.0.0.0/0     | API (optional)          |

   To add a rule:
   - Click **Add security group rule**.
   - **Type**: choose SSH → **Source**: **My IP** (your current IP).
   - Click **Add security group rule** again: **Type** HTTP → **Source** `0.0.0.0/0`.
   - (Optional) Add **Custom TCP**, port **5000**, source **0.0.0.0/0** if you want to hit the API directly.

7. **Outbound**: Leave default (all outbound traffic allowed).

---

## Step 8: Storage

1. **Configure storage**: Default is often **8 GiB** gp3. You can leave it or increase to **20 GiB** if you prefer.
2. No need to add another volume for this app.

---

## Step 9: Launch the instance

1. Scroll down and click the orange **Launch instance** button.
2. Click **View all instances** (or you’ll be taken to the instances list).
3. Wait until **Instance state** is **Running** and **Status check** is **2/2 checks passed** (may take 1–2 minutes).

---

## Step 10: Get the public IP and connect (SSH)

1. In the instances list, select your instance (e.g. `supermarket-inventory`).
2. In the details panel below, note:
   - **Public IPv4 address** (e.g. `54.123.45.67`).
   - **Public IPv4 DNS** (e.g. `ec2-54-123-45-67.compute-1.amazonaws.com`).

3. **Connect from your computer** (Mac/Linux or Windows with OpenSSH):

   - Open a terminal.
   - Set key permissions (Mac/Linux; run once):
     ```bash
     chmod 400 /path/to/supermarket-inventory-key.pem
     ```
   - SSH (replace path and IP):
     ```bash
     ssh -i /path/to/supermarket-inventory-key.pem ec2-user@YOUR_PUBLIC_IP
     ```
     - **Amazon Linux 2023**: user is `ec2-user`.
     - **Ubuntu**: user is `ubuntu`:
       ```bash
       ssh -i /path/to/supermarket-inventory-key.pem ubuntu@YOUR_PUBLIC_IP
       ```

4. When asked “Are you sure you want to continue connecting?”, type **yes** and press Enter. You should see the OS prompt (e.g. `[ec2-user@ip-172-31-xx-xx ~]$`).

---

## Step 11: (Optional) Allocate an Elastic IP (fixed public IP)

By default, the **public IP can change** when you stop/start the instance. To keep the same IP:

1. In EC2 left sidebar, under **Network & Security**, click **Elastic IPs**.
2. Click **Allocate Elastic IP address** → **Allocate**.
3. Select the new Elastic IP → **Actions** → **Associate Elastic IP address**.
4. **Resource type**: Instance. **Instance**: select your `supermarket-inventory` instance. Click **Associate**.

Use this Elastic IP for SSH and for your app URL (and in `VITE_API_URL` when you deploy).

---

## Quick reference after creation

| What you need        | Where to find it                          |
|----------------------|-------------------------------------------|
| Public IP            | Instances → select instance → Public IPv4 |
| SSH user             | `ec2-user` (Amazon Linux) or `ubuntu` (Ubuntu) |
| SSH command          | `ssh -i your-key.pem ec2-user@PUBLIC_IP`  |
| Key file             | The `.pem` file you downloaded             |

After the instance is running and you can SSH in, continue with **DEPLOYMENT-AWS.md** from **Step 3** (install Node.js, Git, Nginx, then clone the repo and deploy the app).
