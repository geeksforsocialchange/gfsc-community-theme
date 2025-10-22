# GFSC Ghost Theme Development Environment

This repository contains a local development environment for creating and testing our custom Ghost theme. It includes instructions for setting up Ghost, importing content from the live site, and developing the theme.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) v22.20.0 (we recommend using `nvm` for version control)
- [Git](https://git-scm.com/)
- [Ghost CLI](https://ghost.org/docs/ghost-cli/) (install globally via `npm install -g ghost-cli@latest`)

`nvm` installation for convenience:

```bash
nvm install 22.20.0
npm install -g ghost-cli@latest
```

## Setup Instructions

### 1. Clone the Repository

Clone this repository to your local machine:

```bash
git clone https://github.com/geeksforsocialchange/gfsc-community-theme
```

### 2. Install Ghost Locally

Run the following command to set up a local Ghost instance in a different folder to your theme:

```bash
mkdir gfsc-ghost
cd gfsc-ghost
ghost install local
```

### 3. Start Ghost

_Not needed right after installation_. Start the Ghost server in the `gfsc-ghost` directory:

```bash
ghost start
```

Access your local Ghost instance at `http://localhost:2368`.

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
gfsc-ghost/                           # Ghost installation folder
├── content/
│   ├── data/
│   ├── images/
│   ├── themes/                       # Ghost themes folder (symlink to your theme folder)
├── .ghost.json                       # Ghost CLI configuration
├── README.md                         # This file
└── ...                               # Other Ghost-related files

gfsc-community-theme/                 # Your custom theme folder (located elsewhere)
├── assets/                           # Static assets (CSS, JS, images)
├── partials/                         # Handlebars partials
├── index.hbs                         # Main template file
├── post.hbs                          # Single post template
├── package.json                      # Theme metadata
└── ...                               # Other theme files
```

## Linking the Theme Folder

Since your theme folder (`gfsc-community-theme`) is located outside the Ghost installation folder, we need to create a symbolic link to it inside the `content/themes` directory.

```bash
cd content/themes # Assuming you are already in the gfsc-ghost directory
ln -s ../../../gfsc-community-theme gfsc-community-theme # Create a symlink to our theme directory
ghost restart # New themes don't show up until ghost is restarted
```

## Developing

### 1. Activate the Theme

1. Go to the Ghost admin panel (`http://localhost:2368/ghost`).
2. Navigate to `http://localhost:2368/ghost/#/settings/design/change-theme`
3. Pick the new theme

### 2. Customize the Theme

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
