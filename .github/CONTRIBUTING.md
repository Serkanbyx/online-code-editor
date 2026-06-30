# Contributing to CodeNest

First off, thank you for considering contributing to this project! It's people like you that make open source such a great community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
  - [Git Commit Messages](#git-commit-messages)
  - [Code Style](#code-style)
- [Branch Naming Convention](#branch-naming-convention)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check [existing issues](https://github.com/serkanbyx/online-code-editor/issues) to avoid duplicates. Use the **Bug Report** issue template when you create a new issue.

Include as many details as possible: steps to reproduce, expected vs. actual behavior, browser/OS, and screenshots when relevant.

### Suggesting Features

Feature suggestions are welcome! Use the **Feature Request** issue template and provide:

- A clear title describing the feature
- A detailed description of the proposed functionality
- Why the feature would be useful
- Possible implementation ideas (optional)

Before suggesting, please check if the feature already exists or if there is an open issue for it.

### Pull Requests

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your feature or fix
4. **Make your changes** following our style guidelines
5. **Test** your changes thoroughly (`npm run lint` in both `client/` and `server/`)
6. **Commit** your changes with clear messages
7. **Push** to your fork
8. **Open a Pull Request** using the provided PR template

**Pull Request Checklist:**

- [ ] Code follows the project's style guidelines
- [ ] Self-review of the code completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] No new warnings or errors introduced
- [ ] Tests added/updated (if applicable)

## Development Setup

### Prerequisites

- **Node.js** v20+ and **npm**
- **MongoDB** — MongoDB Atlas or a local instance
- **Cloudinary** account (optional, for avatar uploads)

### Local Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/online-code-editor.git

# Navigate to project directory
cd online-code-editor

# Set up environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env

# Install dependencies
cd server && npm install
cd ../client && npm install

# Seed the admin user (requires ADMIN_EMAIL and ADMIN_PASSWORD in server/.env)
cd ../server && npm run seed

# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

The API runs at `http://localhost:5000` and the client at `http://localhost:5173`.

## Style Guidelines

### Git Commit Messages

We follow semantic commit messages:

| Prefix      | Description                           |
| ----------- | ------------------------------------- |
| `feat:`     | New feature                           |
| `fix:`      | Bug fix                               |
| `docs:`     | Documentation changes                 |
| `style:`    | Code style changes (formatting, etc.) |
| `refactor:` | Code refactoring                      |
| `test:`     | Adding or updating tests              |
| `chore:`    | Maintenance tasks                     |

**Examples:**

```
feat: add room chat sidebar
fix: resolve Piston run timeout on cold start
docs: update deployment instructions
refactor: simplify Yjs connection pooling
```

**Commit Message Rules:**

- Use imperative mood ("add" not "added")
- Keep first line under 72 characters
- Separate subject from body with blank line
- Use body to explain _what_ and _why_, not _how_

### Code Style

- Use consistent indentation (2 spaces)
- Use meaningful variable and function names in English (camelCase)
- Write comments for complex logic only
- Keep functions small and focused
- Follow DRY (Don't Repeat Yourself) principle
- Remove unused code and imports
- Run `npm run lint` before opening a PR

## Branch Naming Convention

Use descriptive branch names with prefixes:

| Prefix      | Use Case         | Example                   |
| ----------- | ---------------- | ------------------------- |
| `feature/`  | New features     | `feature/room-chat`       |
| `fix/`      | Bug fixes        | `fix/code-run-throttle`   |
| `hotfix/`   | Urgent fixes     | `hotfix/jwt-leak`         |
| `docs/`     | Documentation    | `docs/readme-deploy`      |
| `refactor/` | Code refactoring | `refactor/snippet-search` |

## Questions?

Feel free to [open an issue](https://github.com/serkanbyx/online-code-editor/issues) with your question or start a [Discussion](https://github.com/serkanbyx/online-code-editor/discussions).

---

Thank you for contributing!
