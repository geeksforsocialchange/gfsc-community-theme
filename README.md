# GFSC Ghost Theme Development Environment

This repository contains a local development environment for creating and testing our custom Ghost theme. It includes instructions for setting up Ghost, importing content from the live site, and developing the theme.

Instructions are written for using docker as this is how Ghost is deployed on the server.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) v22.20.0 (we recommend using `nvm` for version control)
- [Git](https://git-scm.com/)
- Docker 20.10.13 or higher installed (See: [docker install guide](https://docs.docker.com/engine/install/))

`nvm` installation for convenience:

```bash
nvm install 22.20.0
```

## Setup Instructions

### 1. Clone the theme Repository

Clone this repository to your local machine:

```bash
git clone https://github.com/geeksforsocialchange/gfsc-community-theme
```

### 2. Install Ghost Locally

Clone the Ghost docker repo and enter the folder:
```bash
git clone https://github.com/TryGhost/ghost-docker.git && cd ghost-docker
```
Copy the environment file and Caddyfile:
```bash
cp .env.example .env
cp caddy/Caddyfile.example caddy/Caddyfile
```

Edit `.env` and set the domain to localhost:
```
DOMAIN=localhost
```

Create a file called `compose.override.yml` with the following content:
```yaml
services:
  ghost:
    environment:
      NODE_ENV: development
    volumes:
      - /full/path/to/gfsc-community-theme:/var/lib/ghost/content/themes/gfsc-community-theme
```
Replace `/full/path/to` with the location of gfsc-community-theme on your system, it doesn't work with a relative path. This sets the environment to development which enables live reload of the theme and binds the theme folder into the ghost docker container.

### 3. Start Ghost
Start the ghost service:
```bash
docker compose pull
docker compose up
```

Open https://localhost/ghost/#/setup to set up the initial admin account.
You'll probably get a certificate warning as Caddy is using self-signed certs.

### 4. Run Gulp
If you're wanting to develop CSS you need to run Gulp in the project directory. I struggled to get this working due to the ghost cli and the package gulp being different versions, but this worked for me.

```bash
# Theoretically how it works
nvm use
npm install
gulp
# How I got it working
npx gulp
```

You can also run gulp using the npm script `dev`:
```bash
npm install
npm run dev
```

### 5. Import Content from live site

1. Go to the Ghost admin panel on the remote server and navigate to "import/export" (https://gfsc.community/ghost/#/settings/migration).
2. Import the downloaded file using the CLI, e.g. `ghost import ~/Downloads/geeks-for-social-change.ghost.2025-02-11-13-26-10.json`
3. Ghost will prompt you to enter a new password for the admin account
4. Log in to `http://localhost:2368/ghost` with `kim@gfsc.studio` and your new password (I'm assuming user 1 is the root user)

## Directory Structure

Here’s the structure of the project so far:

```
ghost-docker/                     # Ghost installation folder
├── caddy/
|   ├── Caddyfile                 # Caddyfile
├── data/                         # data folder created when you first run docker
│   ├── ghost/                    # Ghost data
|   |   |── images/
│   |   ├── logs/
│   |   ├── files/
|   |   ├── ...                   # Other Ghost data
|   ├── ...                       # Other data files                 
├── .env                          # environment config for docker                    
└── ...                           # Other Ghost-related files

gfsc-community-theme/             # Your custom theme folder (located elsewhere)
├── assets/                       # Static assets (CSS, JS, images)
├── partials/                     # Handlebars partials
├── index.hbs                     # Main template file
├── post.hbs                      # Single post template
├── package.json                  # Theme metadata
├── README.md                     # This file
└── ...                           # Other theme files
```

## Developing

### 1. Activate the Theme

1. Go to the Ghost admin panel (`https://localhost/ghost`).
2. Navigate to `http://localhost/ghost/#/settings/design/change-theme`
3. Pick the new theme

### 2. Update the site accent colour   

The site accent colour controls the colour of certain elements such as buttons.

1. Navigate to https://localhost/ghost/#/settings/design/edit
2. Change the Accent color to `#EA5B0D`

### 3. Customize the Theme

- Use Handlebars for templating. Refer to the [Ghost Handlebars Documentation](https://ghost.org/docs/themes/handlebars-themes/).
- Add CSS and JavaScript files in the `assets` folder.
- Test the theme using the imported content or create new posts/pages in the Ghost admin panel.

## Deploying the Theme

The theme is deployed to the production server every time `main` branch is updated -- be careful!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Resources

- [Ghost Documentation](https://ghost.org/docs/)
- [Ghost Theme Handbook](https://ghost.org/docs/themes/)
- [Handlebars Documentation](https://handlebarsjs.com/)
