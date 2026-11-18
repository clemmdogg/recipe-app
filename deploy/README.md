# Deploying to the server

How the recipe app runs on the Contabo VPS, and how to set it up and update it.

## What runs where

```
 Phone / browser
       │  HTTPS
       ▼
 ┌──────────── Contabo VPS (Ubuntu) ──────────────────────────┐
 │  Firewall: only ports 22 (SSH), 80 and 443 are open         │
 │                                                             │
 │  Caddy container  (ports 80 and 443)                        │
 │    recipes.clemdev.dk      → the web app's files            │
 │    api.recipes.clemdev.dk  → API container                  │
 │                                                             │
 │  API container    (port 3000, only reachable by Caddy)      │
 │  Postgres container (only reachable by the API)             │
 └─────────────────────────────────────────────────────────────┘
```

- **Caddy** gets free HTTPS certificates from Let's Encrypt for both addresses, renews them, and redirects `http://` to `https://`.
- **The API** runs its database migrations when it starts.
- **The web app** is built into the Caddy image (`mobile/Dockerfile`), with the API address written into it.
- Files: `docker-compose.yml` (the three containers), `Caddyfile` (Caddy's settings), `.env` (addresses and secrets, never committed; see `.env.example`).

## 1. Set up the server (once)

On your computer, in PowerShell:

```powershell
ssh-keygen -t ed25519 -C "clemdev-server"   # make an SSH key; choose a passphrase
ssh root@SERVER-IP                           # first login with the root password from Contabo
```

On the server, as `root`:

```bash
apt update && apt full-upgrade -y            # install all updates
adduser deploy                               # your own user (choose a password)
usermod -aG sudo deploy                      # allow it to run admin commands with sudo
```

On your computer, copy your public key to the new user:

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh deploy@SERVER-IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
ssh deploy@SERVER-IP                         # must log in with the key, without the server password
```

Only when that works, turn off password and root login. On the server:

```bash
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf > /dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
sudo systemctl restart ssh
```

Firewall and automatic security updates:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443
sudo ufw enable
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades   # answer Yes
```

Docker, from Docker's own package repository (see https://docs.docker.com/engine/install/ubuntu/):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy               # use docker without sudo (log out and in again)
```

Note: Docker opens container ports in the firewall by itself. That is fine here, because only Caddy publishes ports (80 and 443); Postgres and the API publish none.

## 2. DNS (once)

At the domain registrar, create two **A records** pointing at the server's IP address:

| Name | Type | Value |
|---|---|---|
| `recipes` | A | SERVER-IP |
| `api.recipes` | A | SERVER-IP |

Check from your computer that they work before starting Caddy: `nslookup recipes.clemdev.dk`.

## 3. Start the app

Get the code onto the server into `~/recipe-app`, then:

```bash
cd ~/recipe-app/deploy
cp .env.example .env
# Random secrets. Hex (0-9, a-f) because the password goes into a URL, where / and + would break it.
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 32)/" .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 48)/" .env
chmod 600 .env                               # only you can read it
nano .env                                    # check the addresses (don't share this file)
docker compose up -d --build                 # build and start everything
docker compose logs -f caddy                 # watch Caddy get the certificates (Ctrl+C to stop watching)
```

Then open https://api.recipes.clemdev.dk/v1/health (should show `{"status":"ok"}`) and https://recipes.clemdev.dk.

## 4. Update the app

After new code is on the server:

```bash
cd ~/recipe-app/deploy
docker compose up -d --build                 # rebuilds only what changed; the database stays
```

## Backups

`backup.sh` saves a copy of the whole database in `~/backups` and keeps the last 7 days.

Set it up once, on the server:

```bash
~/recipe-app/deploy/backup.sh                # take a backup now, to check it works
crontab -e                                   # choose nano if asked, and add this line at the bottom:
```

```
30 3 * * * /home/deploy/recipe-app/deploy/backup.sh >> /home/deploy/backups/backup.log 2>&1
```

That runs it every night at 3:30 (server time, UTC). `~/backups/backup.log` shows each run.

**Test a backup** without touching the real database: restore it into a separate one and count the users.

```bash
cd ~/recipe-app/deploy
latest=$(ls -t ~/backups/recipe_app-*.dump | head -1)
docker compose exec -T db createdb -U recipe_app restore_test
docker compose exec -T db pg_restore -U recipe_app -d restore_test --no-owner < "$latest"
docker compose exec -T db psql -U recipe_app -d restore_test -c "SELECT count(*) FROM users"
docker compose exec -T db dropdb -U recipe_app restore_test
```

**Keep a copy off the server**, in case the server itself is lost. On your computer:

```powershell
scp "deploy@SERVER-IP:~/backups/recipe_app-*.dump" .
```

**Restore for real** (this replaces all data in the database with the backup):

```bash
cd ~/recipe-app/deploy
docker compose stop api
docker compose exec -T db pg_restore -U recipe_app -d recipe_app --clean --if-exists --no-owner < ~/backups/BACKUP-FILE.dump
docker compose start api
```

## Useful commands

```bash
docker compose ps                            # what is running
docker compose logs -f api                   # the API's log
docker compose restart api                   # restart one container
docker compose exec db psql -U recipe_app    # open the database (\q to quit)
docker compose down                          # stop everything (the data stays in Docker volumes)
```

## The phone app

Build the Android app with `EXPO_PUBLIC_API_URL=https://api.recipes.clemdev.dk`, so it talks to the server instead of your computer.
