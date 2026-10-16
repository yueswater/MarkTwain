# Architecture

How the code is divided, and the rules that keep the parts apart. Two of the rules are checked: `pnpm lint` fails on an import that crosses a side, and `apps/desktop/src/architecture.test.ts` fails on files that import each other in a circle.

## The sides

```
packages/*            pure TypeScript libraries, no Electron, no app
                      (schema: Markdown and its blocks, render: Typst, build: the build, versioning: snapshots, diff and merge)
apps/desktop/src/
  shared/             what both sides know: the IPC contract, enums, preferences
  main/               the back end (Node.js, Electron)
  renderer/src/       the front end (React)
```

- A package never imports from `apps/` or from Electron.
- `shared` never imports from `main` or `renderer`.
- `main` and `renderer` never import each other. They talk through the IPC contract in `shared/ipc`, one request and one answer for each channel.

## The back end: `main`

```
main/
  index.ts            the composition root: makes the services and hands each controller its service
  core/               what every feature uses: the window, the IPC wrapper, the database session, errors
  config/             constants
  infra/              the database and its migrations
  helpers/, utils/    small functions with no state
  features/<name>/    one feature, see below
```

A feature has the same parts, and only the ones it needs:

| File | Job |
|---|---|
| `<name>.controller.ts` | Registers the IPC channels and calls the service. No logic. |
| `<name>.service.ts` | The logic of the feature. |
| `<name>.repository.ts` | Reads and writes the database. Only the service of the same feature uses it. |

A feature takes what it needs from the **service** of another feature, passed in by `index.ts`, never from its controller. A thing that two features need and that is not a feature itself goes to `features/toolchain` (where the tools of a build are), `helpers` or `core`. That is how the build, the fonts and the watermark use the same paths without importing each other.

## The front end: `renderer/src`

```
shared/               what every feature uses: the IPC client, error texts, the autosaver, hooks
components/ui/        the building blocks of the interface
lib/                  preferences, platform, small helpers
theme/                colors
features/<name>/      one part of the interface
```

The features are `editor`, `project`, `settings`, `build` (the preview), `bibliography`, `fonts` and `shortcuts`. A feature is divided again by what its files are about, not by what they are:

```
features/editor/
  DocumentEditor.tsx  loads a document and puts the parts together, nothing else
  editor-config.ts    the extensions and the handlers of a click
  dialogs/            the dialogs of the editor, what opens them and the commands that they run
  extensions/         TipTap extensions and nodes
  blocks/  figures/  math/  tables/  references/  code/  find/  lines/  lists/  navigation/
```

Each of those folders keeps its components, its hooks, its functions and their tests together.

## Where a new thing goes

- A new IPC channel: the channel in `shared/enums`, its types in `shared/ipc`, the controller and service in a feature of `main`, the call from a hook of a feature of `renderer`.
- A new dialog of the editor: the component next to what it is about, the target in `dialogs/use-dialog-targets.ts`, the rendering in `dialogs/EditorDialogs.tsx`, the command in `dialogs/editor-commands.ts`.
- A new setting: its field in `shared/prefs` or in the advanced fields of `packages/schema`, its control in `features/settings`.

## Tests

- Unit tests sit next to the file they test.
- The end-to-end tests are in `apps/desktop/e2e`, see its README.
