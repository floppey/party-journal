# Custom Domain Setup for journal.nat20.no

## DNS Configuration

Make sure your DNS provider (where nat20.no is hosted) has the following records:

### CNAME Record

```
journal.nat20.no → floppey.github.io
```

Or if you prefer APEX domain setup:

### A Records

```
journal.nat20.no → 185.199.108.153
journal.nat20.no → 185.199.109.153
journal.nat20.no → 185.199.110.153
journal.nat20.no → 185.199.111.153
```

## GitHub Pages Configuration

1. Go to your repository Settings > Pages
2. In the "Custom domain" field, enter: `journal.nat20.no`
3. Check "Enforce HTTPS" (recommended)
4. GitHub will automatically verify the domain

## Firebase Authentication Setup

1. Go to Firebase Console > Authentication > Settings
2. Under "Authorized domains", add: `journal.nat20.no`
3. Remove any old domains if needed

## Verification

After setup, verify:

- [ ] DNS propagation: `nslookup journal.nat20.no`
- [ ] HTTPS certificate: Visit `https://journal.nat20.no`
- [ ] Firebase auth: Try signing in
- [ ] All app functionality works

## Troubleshooting

**Domain not working?**

- Check DNS propagation (can take up to 48 hours)
- Verify CNAME file exists in repository
- Ensure GitHub Pages custom domain is set correctly

**Authentication failing?**

- Check Firebase authorized domains
- Verify all environment variables are set in GitHub Secrets
- Check browser developer console for errors

**SSL/HTTPS issues?**

- Wait for GitHub to provision SSL certificate (can take a few minutes)
- Ensure "Enforce HTTPS" is enabled in GitHub Pages settings
