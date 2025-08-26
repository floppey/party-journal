# Party Journal Deployment Guide

This guide explains how to deploy the Party Journal app to GitHub Pages.

## Prerequisites

1. **GitHub Repository**: Your code should be pushed to a GitHub repository
2. **Firebase Project**: You need a Firebase project with Authentication and Firestore enabled
3. **Environment Variables**: Firebase configuration must be set up

## Deployment Steps

### 1. Configure Firebase for Custom Domain

In your Firebase Console:

1. Go to **Authentication > Settings > Authorized domains**
2. Add your custom domain: `journal.nat20.no`
3. For email link authentication, ensure the domain is authorized

### 2. Set Up Repository Secrets

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add these secrets:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Enable GitHub Pages

1. Go to **Settings > Pages** in your repository
2. Under **Source**, select **GitHub Actions**
3. The workflow will automatically deploy when you push to main

### 4. Update User Permissions

Before deploying, make sure to:

1. Edit `src/permissions.ts`
2. Replace the example admin email with your actual email:
   ```typescript
   const ALLOWED_USERS: Record<string, { email: string; role: UserRole }> = {
     "your-email@gmail.com": { email: "your-email@gmail.com", role: "admin" },
   };
   ```

### 5. Deploy

1. Push your changes to the `main` branch
2. The GitHub Action will automatically build and deploy
3. Your app will be available at: `https://journal.nat20.no/`

## Local Development

For local development, create a `.env.local` file:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Then run:
```bash
npm install
npm run dev
```

## Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
npm install gh-pages --save-dev
npm run deploy
```

## Troubleshooting

### Build Errors
- Ensure all Firebase environment variables are set
- Check that all dependencies are installed
- Verify Next.js static export configuration

### Authentication Issues
- Verify custom domain `journal.nat20.no` is in Firebase authorized domains
- Check that Firebase configuration is correct
- Ensure user emails are added to the permissions allowlist

### Deployment Failures
- Check the Actions tab for build logs
- Verify GitHub Pages is enabled in repository settings
- Ensure all secrets are properly configured

## Security Notes

- Never commit Firebase config to public repositories
- Always use environment variables for sensitive data
- The permissions system requires manual user management via `src/permissions.ts`
- Only authorized users can sign in and access the application
