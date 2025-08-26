# Party Journal

A collaborative TTRPG campaign journal built with Next.js, Firebase, and real-time editing capabilities.

## Features

- **Real-time collaborative editing**: Multiple users can edit notes simultaneously
- **Markdown support**: Full GFM support with syntax highlighting
- **Wiki-style linking**: Use `[[Note Title]]` to link between notes
- **Hierarchical notes**: Organize notes in folders and sub-notes
- **Admonitions**: Support for styled callout boxes (info, warning, danger, etc.)
- **Role-based access control**: Admin/Editor/Viewer roles with permission management
- **Drag & drop**: Reorganize notes via drag and drop in the sidebar

## Syntax Examples

### Wiki Links
```markdown
Link to another note: [[Campaign Overview]]
Create new note: [[New Character Name]]
```

### Admonitions
```markdown
:::info Player Information
This is important information for players.
:::

:::warning DM Only
Secret information that only the DM should know.
:::

:::danger Spoiler Alert
Major plot spoilers ahead!
:::
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- Firebase project with Authentication and Firestore enabled

### Setup

1. **Clone and install dependencies**:
```bash
git clone https://github.com/yourusername/party-journal.git
cd party-journal
npm install
```

2. **Configure Firebase**:
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase configuration values

3. **Set up user permissions**:
   - Edit `src/permissions.ts`
   - Add your email as an admin user

4. **Run development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment

This app is configured for deployment to GitHub Pages. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy to GitHub Pages

1. Push your code to a GitHub repository
2. Set up Firebase environment variables in GitHub Secrets
3. Enable GitHub Pages with GitHub Actions source
4. Push to main branch to trigger automatic deployment

Your app will be available at: `https://journal.nat20.no/`

## User Management

Access is controlled via a simple allowlist in `src/permissions.ts`. Three roles are supported:

- **Admin**: Full access + user management
- **Editor**: Can create, read, and edit notes  
- **Viewer**: Read-only access

To add users, edit the `ALLOWED_USERS` object or use the admin panel at `/admin`.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase Authentication + Firestore
- **Markdown**: ReactMarkdown with GFM and syntax highlighting
- **Real-time**: Firestore real-time subscriptions
- **Deployment**: GitHub Pages with static export

## License

MIT License - see LICENSE file for details.
