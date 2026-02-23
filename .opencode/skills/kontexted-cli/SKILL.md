---
name: kontexted-cli
description: Access and manage Kontexted workspaces, search notes, retrieve content, and create/update notes and folders through the kontexted CLI. Use when the user needs to explore workspace structure, find specific notes, read note content, or modify workspace content using profile aliases.
alias: jean2
---

# Kontexted CLI Skill Commands

## Read Commands

\`\`\`
kontexted skill workspace-tree --alias jean2
kontexted skill search-notes --alias jean2 --query "<text>" [--limit <n>]
kontexted skill note-by-id --alias jean2 --note-id <id>
\`\`\`

## Write Commands

```
kontexted skill create-folder --alias jean2 --name <name> --display-name "<displayName>" [--parent-id <id>]
kontexted skill create-note --alias jean2 --name <name> --title "<title>" [--folder-id <id>] [--content "<content>"]
kontexted skill update-note-content --alias jean2 --note-id <id> --content "<content>"
```

## Prerequisites

Before using the kontexted CLI skill commands, ensure:

1. **kontexted CLI is installed** - Install via npm or your preferred package manager
2. **User has authenticated** - User must have run \`kontexted login\` with a profile alias
3. **Profile has a workspace configured** - The profile alias must be associated with an active workspace
4. **Write operations enabled** - This profile has write access enabled

All commands require the \`--alias\` parameter. This skill is configured for the `jean2` profile.

## Available Tools

### Read Tools

#### workspace-tree

Get the complete folder and note structure of a workspace.

\`\`\`bash
kontexted skill workspace-tree --alias jean2
\`\`\`

**Options:**
- \`--alias\` (required): The profile alias to use for authentication

**Returns:** JSON object containing the workspace structure with folders and notes hierarchy

**When to use:**
- When you need to understand the organization of a workspace
- When exploring available notes before reading specific content
- When building navigation paths to locate notes

#### search-notes

Search for notes containing specific text content.

\`\`\`bash
kontexted skill search-notes --alias jean2 --query "<text>" [--limit <n>]
\`\`\`

**Options:**
- \`--alias\` (required): The profile alias to use for authentication
- \`--query\` (required): The search text to find in notes
- \`--limit\` (optional): Maximum number of results to return (default: 20, max: 50)

**Returns:** JSON array of matching notes with metadata including note ID, title, and relevant snippets

**When to use:**
- When you need to find notes containing specific keywords
- When searching for content across multiple notes
- When the user asks to find notes about a particular topic

#### note-by-id

Retrieve the complete content of a specific note by its ID.

\`\`\`bash
kontexted skill note-by-id --alias jean2 --note-id <id>
\`\`\`

**Options:**
- \`--alias\` (required): The profile alias to use for authentication
- \`--note-id\` (required): The unique identifier of the note to retrieve

**Returns:** JSON object containing the full note content including body, metadata, and structure

**When to use:**
- When you have a specific note ID and need its content
- After finding a note via search or workspace tree exploration
- When the user asks to read a specific note

### Write Tools

#### create-folder

Create a new folder in the workspace. Optionally nest under a parent folder.

```bash
kontexted skill create-folder --alias jean2 --name <name> --display-name "<displayName>" [--parent-id <parentPublicId>]
```

**Options:**
- `--alias` (required): The profile alias to use for authentication
- `--name` (required): URL-safe folder name (kebab-case, camelCase, snake_case, or PascalCase)
- `--display-name` (required): Human-readable display name for the folder
- `--parent-id` (optional): Public ID of parent folder (omit for root level)

**Returns:** JSON object containing the created folder's public ID and metadata

**When to use:**
- When creating a new folder to organize notes
- When setting up a hierarchical folder structure

**Error cases:**
- **"Folder with this name already exists"** - Choose a different name
- **"Parent folder not found"** - Verify the parent folder ID
- **"Invalid folder name"** - Use kebab-case, camelCase, snake_case, or PascalCase

#### create-note

Create a new note in the workspace. Optionally place in a folder.

```bash
kontexted skill create-note --alias jean2 --name <name> --title "<title>" [--folder-id <folderPublicId>] [--content "<content>"]
```

**Options:**
- `--alias` (required): The profile alias to use for authentication
- `--name` (required): URL-safe note name (kebab-case, camelCase, snake_case, or PascalCase)
- `--title` (required): Human-readable title for the note
- `--folder-id` (optional): Public ID of folder (omit for root level)
- `--content` (optional): Initial content for the note (defaults to empty)

**Returns:** JSON object containing the created note's public ID and metadata

**When to use:**
- When creating a new note in the workspace
- When the user asks to write or create a document/note

**Error cases:**
- **"Note with this name already exists"** - Choose a different name
- **"Folder not found"** - Verify the folder ID
- **"Invalid note name"** - Use kebab-case, camelCase, snake_case, or PascalCase

#### update-note-content

Update the content of an existing note. This creates a revision for history.

```bash
kontexted skill update-note-content --alias jean2 --note-id <notePublicId> --content "<content>"
```

**Options:**
- `--alias` (required): The profile alias to use for authentication
- `--note-id` (required): Public ID of the note to update
- `--content` (required): New content for the note

**Returns:** JSON object containing the note's public ID, revision ID, and updated timestamp

**When to use:**
- When updating the content of an existing note
- When the user asks to edit or modify a note's content
- When appending or replacing note content

**Important notes:**
- This operation replaces the entire note content
- A revision is created for history tracking
- Connected clients are notified in real-time

**Error cases:**
- **"Note not found"** - Verify the note ID
- **"Invalid note public ID"** - Check the ID format

## Typical Workflow

The skill commands work best when combined in a logical sequence:

### Read-Only Workflow

1. **Explore** - Use \`workspace-tree\` to understand workspace structure
2. **Search** - Use \`search-notes\` to find relevant notes by content
3. **Read** - Use \`note-by-id\` to retrieve full content of specific notes

### Write Workflow

1. **Create structure** - Use `create-folder` to organize content
2. **Create notes** - Use `create-note` to create new notes
3. **Update content** - Use `update-note-content` to modify existing notes

**Example write workflow:**
```bash
# Create a folder for project documentation
kontexted skill create-folder --alias jean2 --name "project-docs" --display-name "Project Documentation"

# Create a note in that folder (use the returned publicId)
kontexted skill create-note --alias jean2 --name "requirements" --title "Requirements" --folder-id "FOLDER_PUBLIC_ID"

# Update the note content
kontexted skill update-note-content --alias jean2 --note-id "NOTE_PUBLIC_ID" --content "# Requirements

- Feature A
- Feature B"
```

## Example Usage

### Exploring a workspace

\`\`\`bash
kontexted skill workspace-tree --alias jean2
\`\`\`

### Searching for content

\`\`\`bash
kontexted skill search-notes --alias jean2 --query "meeting notes"
kontexted skill search-notes --alias jean2 --query "todo" --limit 3
\`\`\`

### Reading specific notes

\`\`\`bash
kontexted skill note-by-id --alias jean2 --note-id "note-uuid-123"
\`\`\`

### Creating a folder structure

```bash
kontexted skill create-folder --alias jean2 --name "meetings" --display-name "Meeting Notes"
kontexted skill create-folder --alias jean2 --name "2024" --display-name "2024 Meetings" --parent-id "PARENT_FOLDER_ID"
```

### Creating and populating a note

```bash
kontexted skill create-note --alias jean2 --name "todo" --title "Todo List" --content "# Todo

- [ ] Task 1
- [ ] Task 2"
kontexted skill update-note-content --alias jean2 --note-id "NOTE_ID" --content "# Todo

- [x] Task 1
- [ ] Task 2
- [ ] Task 3"
```

### Combining read and write operations

```bash
kontexted skill search-notes --alias jean2 --query "meeting notes"
kontexted skill update-note-content --alias jean2 --note-id "FOUND_NOTE_ID" --content "Updated content here"
```

## Error Handling

### Authentication errors

1. **"Profile not found"** - The specified alias doesn't exist. Ask the user to run \`kontexted login --alias <profile>\` first.
2. **"Not authenticated"** - The profile exists but isn't authenticated. Ask the user to re-authenticate.
3. **"No workspace configured"** - The profile is authenticated but has no workspace. Ask the user to set up a workspace.

### Write operation errors

1. **"Write operations not enabled for this profile"** - Re-login with `kontexted login --alias jean2 --write` to enable write access
2. **"Folder with this name already exists"** - Use a unique name or check existing folders
3. **"Note with this name already exists"** - Use a unique name or check existing notes
4. **"Parent folder not found"** - Verify the parent folder ID exists
5. **"Note not found"** - Verify the note ID is correct


### Other errors

- **"Note not found"** - The specified note ID doesn't exist or belongs to a different workspace
- **"Workspace not accessible"** - The workspace exists but the user lacks access permissions
- **"Connection error"** - Network issues. Retry the command or check the user's connection

## Output Format

All commands return JSON output that is easy to parse:

### Read commands
- \`workspace-tree\`: Returns nested object with folders and notes
- \`search-notes\`: Returns array of matching notes with ID, title, and snippets
- \`note-by-id\`: Returns complete note object with body and metadata

### Write commands
- `create-folder`: Returns `{ folder: { publicId, name, displayName, parentPublicId } }`
- `create-note`: Returns `{ note: { publicId, name, title, folderPublicId, content } }`
- `update-note-content`: Returns `{ note: { publicId, revisionId, updatedAt } }`

