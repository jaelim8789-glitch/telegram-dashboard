# Contributing to TeleMon

Thank you for your interest in contributing to TeleMon! This document outlines the guidelines for contributing to this project.

## Branch Strategy

- `master` - Production-ready code
- `develop` - Integration branch for features
- Feature branches: `feature/<feature-name>`, `bugfix/<issue-id>-<short-description>`, `hotfix/<issue-id>-<short-description>`
- Release branches: `release/v<version>`

## Commit Convention

We follow the Conventional Commits specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### Examples
```
feat(auth): add login with social accounts
fix(api): resolve timeout issue in user profile endpoint
docs(readme): update installation instructions
```

## Pull Request Guidelines

### Before Submitting
- Ensure all tests pass (`npm run test`)
- Run linter (`npm run lint`) and formatter (`npm run format`)
- Run type checking (`npm run typecheck`)
- Update documentation if necessary
- Squash commits if they don't represent meaningful milestones

### PR Description Template
```
## Summary
Brief description of changes

## Changes Made
- List of changes made

## Testing
- How was this tested?
- What scenarios were covered?

## Notes
- Any additional notes for reviewers
```

### Review Process
- At least one approval required before merging
- Address all review comments before merging
- PR author should merge their own PR after approval

## Code Quality Standards

### TypeScript
- All code must pass type checking (`npx tsc --noEmit`)
- Follow strict mode settings in tsconfig.json
- Use explicit types where inference isn't clear

### Testing
- New features must include unit tests
- Bug fixes should include regression tests
- Aim for 80%+ test coverage on critical paths

### Documentation
- Exported functions/classes must have JSDoc
- Complex logic should have inline comments
- Update README if public APIs change

## Local Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Set up environment: copy `.env.example` to `.env.local`
4. Run development server: `npm run dev`

## Pre-push Hooks

The project includes pre-push hooks that run:
- Build validation (`npm run build`)
- Type checking (`npx tsc --noEmit`)
- Linting (`npm run lint`)

## Getting Help

- For questions about contribution, create a GitHub issue
- For bugs, please include reproduction steps
- For feature requests, explain the use case

Thank you for contributing!