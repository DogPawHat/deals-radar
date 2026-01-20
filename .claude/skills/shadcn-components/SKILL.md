---
name: shadcn-components
description: Adds and modifies shadcn/ui components. Use when adding new UI components, customizing existing shadcn components, or working with src/components/ui files.
---

# shadcn/ui Components

Handles addition, customization, and modification of shadcn/ui components in this project.

## Project Configuration

- **Components location**: `src/components/ui/`
- **Config file**: `components.json`
- **Style**: base-vega
- **Icon library**: tabler (use `@tabler/icons-react`)
- **CSS variables**: enabled
- **Base color**: stone
- **Utilities**: `@/lib/utils` exports `cn()` for class merging

## Adding New Components

Use the shadcn CLI to add components:

```bash
pnpx shadcn@latest add <component-name>
```

Examples:

```bash
pnpx shadcn@latest add dialog
pnpx shadcn@latest add sheet
pnpx shadcn@latest add toast sonner
```

To view a component before installing:

```bash
pnpx shadcn@latest view <component-name>
```

## Component Structure

Each component in `src/components/ui/` follows this pattern:

```tsx
import { cn } from "@/lib/utils";

// Component with variants using class-variance-authority (cva)
const componentVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", secondary: "..." },
    size: { default: "...", sm: "...", lg: "..." },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

function Component({ className, variant, size, ...props }) {
  return <Primitive className={cn(componentVariants({ variant, size, className }))} {...props} />;
}

export { Component, componentVariants };
```

## Modifying Components

When customizing shadcn components:

1. **Add variants**: Extend the `variants` object in the `cva()` call
2. **Change styles**: Modify the base classes or variant classes
3. **Add props**: Extend the component's props interface
4. **Use cn()**: Always use `cn()` from `@/lib/utils` for class merging

### Example: Adding a variant

```tsx
const buttonVariants = cva("...", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      // Add new variant:
      success: "bg-green-500 text-white hover:bg-green-600",
    },
  },
});
```

## Icons

This project uses Tabler Icons. Import like:

```tsx
import { IconPlus, IconSettings } from "@tabler/icons-react";
```

Icons in buttons should use `data-icon` attribute:

```tsx
<Button>
  <IconPlus data-icon="inline-start" />
  Add Item
</Button>
```

## Styling Conventions

- Use Tailwind CSS v4 syntax
- CSS variables for theming (--primary, --secondary, etc.)
- Dark mode support via `dark:` prefix
- Focus states: `focus-visible:ring-[3px] focus-visible:border-ring`
- Disabled states: `disabled:pointer-events-none disabled:opacity-50`
- Use `data-slot` attribute for component identification

## Checking Installed Components

Always check the filesystem as the source of truth:

```bash
ls src/components/ui/
```

If a component is not present and you need it, install via:

```bash
pnpx shadcn@latest add <component-name>
```
