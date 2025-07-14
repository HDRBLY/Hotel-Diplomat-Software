# Contributing to Hotel Diplomat Software

Thank you for your interest in contributing to the Hotel Diplomat Software project! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- A GitHub account

### Initial Setup

1. **Fork the repository**
   - Go to [https://github.com/HDRBLY/Hotel-Diplomat-Software](https://github.com/HDRBLY/Hotel-Diplomat-Software)
   - Click the "Fork" button in the top right

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Hotel-Diplomat-Software.git
   cd Hotel-Diplomat-Software
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/HDRBLY/Hotel-Diplomat-Software.git
   ```

4. **Run the setup script**
   ```bash
   # On Windows
   setup.bat
   
   # On macOS/Linux
   chmod +x setup.sh
   ./setup.sh
   ```

5. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🔄 Development Workflow

### 1. Before Starting Work

Always sync with the main repository:
```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### 2. Creating a Feature Branch

```bash
git checkout -b feature/descriptive-feature-name
```

**Branch Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

**Examples:**
- `feature/guest-search-functionality`
- `fix/login-authentication-bug`
- `docs/update-api-documentation`

### 3. Making Changes

1. **Write your code** following the coding standards below
2. **Test your changes** thoroughly
3. **Commit your changes** with meaningful messages

### 4. Committing Changes

```bash
git add .
git commit -m "type: description of changes"
```

**Commit Message Format:**
```
type: brief description

- Use present tense ("add" not "added")
- Use imperative mood ("move" not "moves")
- Limit first line to 72 characters
- Reference issues when applicable
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
- `feat: add guest search functionality`
- `fix: resolve login authentication issue`
- `docs: update API documentation`
- `refactor: improve room management component`

### 5. Pushing Changes

```bash
git push origin feature/your-feature-name
```

### 6. Creating a Pull Request

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Fill out the PR template
4. Request review from maintainers

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper interfaces and types
- Avoid `any` type when possible
- Use strict TypeScript configuration

### React Components

- Use functional components with hooks
- Follow the naming convention: `PascalCase`
- Keep components focused and single-purpose
- Use proper prop types and interfaces

### File Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── services/           # API and business logic
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── hooks/              # Custom React hooks
```

### Styling

- Use Tailwind CSS for styling
- Follow mobile-first responsive design
- Maintain consistent spacing and colors
- Use the design system components

### Code Quality

- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable and function names

## 🧪 Testing

### Before Submitting

1. **Run the development server**
   ```bash
   npm run dev
   ```

2. **Test your changes** in the browser
3. **Check for linting errors**
   ```bash
   npm run lint
   ```

4. **Type checking**
   ```bash
   npm run type-check
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

## 📋 Pull Request Guidelines

### PR Title
Use the same format as commit messages:
```
type: brief description
```

### PR Description
Include:
- **Summary** of changes
- **Motivation** for the change
- **Testing** performed
- **Screenshots** (if UI changes)
- **Related issues** (if any)

### Example PR Description
```markdown
## Summary
Added guest search functionality to the guests page.

## Changes
- Added search input field
- Implemented real-time search filtering
- Added search results highlighting
- Updated guest list component

## Testing
- [x] Tested search with various inputs
- [x] Verified search works with existing filters
- [x] Tested on mobile devices
- [x] No breaking changes to existing functionality

## Screenshots
[Add screenshots here]

## Related Issues
Closes #123
```

## 🔍 Code Review Process

1. **Self-review** your code before submitting
2. **Request review** from maintainers
3. **Address feedback** promptly
4. **Make requested changes** and push updates
5. **Wait for approval** before merging

## 🚫 What Not to Do

- Don't commit directly to `main` branch
- Don't submit PRs without testing
- Don't ignore code review feedback
- Don't commit large files or sensitive data
- Don't use vague commit messages

## 🆘 Getting Help

If you need help:
1. Check the [README.md](README.md)
2. Search existing issues
3. Create a new issue with details
4. Ask in discussions

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Hotel Diplomat Software! 🏨 