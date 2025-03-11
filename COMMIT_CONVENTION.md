# Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for creating clear and structured commit messages that can be used for automated versioning and changelog generation.

## Format

Each commit message consists of:
- **type(scope)**: subject
- blank line
- body (optional)
- blank line
- footer (optional)

## Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

## Scopes

Scopes should be specific to the area of change:

- **ui**: User interface components and styling
- **server**: Server-side code and functionality
- **api**: API endpoints and related logic
- **browser**: Browser automation and interaction
- **core**: Core application functionality
- **build**: Build configuration
- **repo**: Repository configuration
- **deps**: Dependencies
- **agent**: Agent-related functionality
- **structure**: Code organization and structure
- **imports**: Import statements and module resolution

## Examples

```
feat(ui): implement toast notification system
```

```
fix(browser): correct Python boolean syntax in headless parameter
```

```
docs(readme): update installation instructions
```

```
refactor(ui): simplify PromptInput component structure
```

```
chore(deps): update dependencies to latest versions
```

## Creating Commits

Use the `npm run commit` command to create commits with the proper format using the Commitizen CLI.