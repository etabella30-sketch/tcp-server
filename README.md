# Project Setup and Deployment Instructions

## Development Setup

### 1. Pull Repository
Clone or pull the latest version of the repository:

```bash
git clone <repository-url>
cd <project-directory>
```

Or if you already have the repository:

```bash
git pull origin main
```

### 2. Install Dependencies
Install all required npm packages. The `--force` flag is used to resolve any dependency conflicts:

```bash
npm install --force
```

**Note:** The `--force` flag bypasses certain checks and forces package installation. Use this if you encounter peer dependency warnings or conflicts.

### 3. Start Development Server
Launch the Angular development server:

```bash
node tcp.js
```
