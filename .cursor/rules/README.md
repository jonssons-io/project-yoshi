# Cursor Rules Structure

The project's Cursor rules have been organized into separate `.mdc` files in the `.cursor/rules/` directory for better maintainability and modularity.

## Files Overview

### 1. `forms.mdc` (alwaysApply: true)
**Form System Rules**

Enforces the custom TanStack Form system with:
- Custom form hooks (`useAppForm`)
- Validation helpers (`createZodValidator`, `createAsyncValidator`)
- Pre-bound field components (`field.TextField`)
- Pre-bound form components (`form.SubmitButton`)
- Zod v4 syntax requirements
- Form submission patterns
- Component structure guidelines

### 2. `general.mdc` (alwaysApply: true)
**Project Guidelines**

Covers general project conventions:
- Package manager (npm)
- Component naming conventions
- Import patterns and organization
- TypeScript best practices
- Component structure
- Documentation standards
- Code quality guidelines
- Testing and linting

### 3. `tanstack.mdc` (alwaysApply: true)
**TanStack Ecosystem**

Guidelines for TanStack libraries:
- **TanStack Router**: File-based routing, links, layouts, data loading
- **TanStack Query**: Data fetching, mutations, caching
- **TanStack Store**: State management, derived state
- **TanStack Table**: Data tables
- Best practices for all TanStack libraries

### 4. `shadcn.mdc` (alwaysApply: false)
**shadcn-ui Reference**

Comprehensive reference for shadcn-ui:
- Installation guides for different frameworks
- Component catalog organized by category
- Dark mode setup
- Forms integration
- Advanced features

## Usage

All rules with `alwaysApply: true` will be automatically applied when working in the codebase. The AI assistant will enforce these patterns and suggest corrections when you deviate from the established conventions.

## Benefits of This Structure

1. **Modularity**: Each concern is separated into its own file
2. **Maintainability**: Easy to update specific rules without affecting others
3. **Clarity**: Developers can quickly find relevant guidelines
4. **Flexibility**: Can toggle `alwaysApply` for specific rule files
5. **Scalability**: Easy to add new rule files as the project grows

## Adding New Rules

To add new rules:

1. Create a new `.mdc` file in `.cursor/rules/`
2. Add frontmatter with `alwaysApply` setting:
   ```markdown
   ---
   alwaysApply: true
   ---
   ```
3. Write your rules in Markdown format
4. Use ❌ and ✅ for wrong/correct examples
5. Include code examples in fenced code blocks

## Related Documentation

- **Form System**: See `docs/FORMS.md` for complete form documentation
- **Project README**: See `README.md` for general project setup
- **Examples**: See `src/components/form/` for practical examples
