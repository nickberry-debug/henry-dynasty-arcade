# 🚀 Deployment Guide — Ship to Vercel

Your game is ready to deploy. Follow this guide to get it live.

---

## Pre-Deployment Checklist

### Code Completeness
- [ ] `Dungeon3D.tsx` has GameHUD imported
- [ ] `Dungeon3D.tsx` has gameIntegration wired
- [ ] Audio manager is integrated
- [ ] No console errors in dev server

### Assets (Optional but Recommended)
- [ ] Kenney assets downloaded and extracted (or using procedural fallbacks)
- [ ] Asset paths verified in `assetLoaderKenney.ts`

### Testing
- [ ] Game launches without errors
- [ ] HUD displays correctly
- [ ] Camera controls work (WASD/arrows)
- [ ] Abilities cast (Q, E, R)
- [ ] Music plays (if assets loaded)
- [ ] SFX plays on hit/death/levelup

---

## Deployment Steps

### Step 1: Update Package.json

Make sure you have the necessary scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "vercel"
  }
}
```

### Step 2: Build for Production

```bash
cd C:\Projects\Arcade\source\henry-dynasty
npm run build
```

Expected output:
```
✓ built in 45.2s
dist/
├── index.html
├── assets/
│   ├── main.[hash].js
│   ├── main.[hash].css
│   └── ... (other chunks)
└── ... (public assets)
```

### Step 3: Test Production Build Locally

```bash
npm run preview
```

Visit `http://localhost:4173` and verify:
- [ ] Game loads
- [ ] HUD displays
- [ ] No console errors
- [ ] Assets/audio load (if present)

### Step 4: Deploy to Vercel

**Option A: Using Vercel CLI**

```bash
npm install -g vercel
vercel deploy --prod
```

Follow prompts:
- Confirm project name: `henry-dynasty` or similar
- Link to existing Vercel project (if you have one)
- Confirm production deployment

**Option B: Using Vercel Dashboard**

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Select your GitHub repo
5. Framework preset: Auto-detect (Vite)
6. Click "Deploy"

### Step 5: Verify Deployment

After deployment completes:

```bash
vercel --prod
```

Visit the URL provided (e.g., `https://henry-dynasty.vercel.app`)

Verify:
- [ ] Game loads
- [ ] HUD displays
- [ ] All controls work
- [ ] No 404 errors in console
- [ ] Assets load (if present)

---

## Environment Variables (If Needed)

Create `.env` file in project root:

```env
VITE_API_URL=https://api.example.com
VITE_ENV=production
```

Update `vercel.json` if you have custom build settings:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_ENV": "production"
  }
}
```

---

## Troubleshooting

### Build Fails
**Error:** `Cannot find module 'three'`

**Fix:**
```bash
npm install
npm run build
```

### Assets 404s
**Error:** Assets load but return 404

**Fix:** Assets must be in `public/` directory or bundled by Vite
```
public/
├── assets/
│   ├── audio/
│   ├── models/
│   └── ui/
```

### HUD Not Showing
**Error:** Blank page, no HUD visible

**Fix:** Verify CSS is imported in Dungeon3D.tsx:
```typescript
import '../styles/hud.css';
```

### Audio Not Playing
**Error:** Game works but no sound

**Fix:** Browser may require user interaction first
- Add click-to-start button
- Or mute by default, unmute on click

**Solution:** Add to Dungeon3D.tsx:

```typescript
const [audioReady, setAudioReady] = useState(false);

useEffect(() => {
  const handleClick = () => {
    // Resume audio context on first click
    if (gameIntegration?.audioManager.listener.context.state === 'suspended') {
      gameIntegration.audioManager.listener.context.resume();
    }
    setAudioReady(true);
  };

  window.addEventListener('click', handleClick, { once: true });
  return () => window.removeEventListener('click', handleClick);
}, [gameIntegration]);
```

---

## Performance Optimization

### Before Deploy

1. **Minify code** (done by Vite automatically)
2. **Compress assets** (use WebP for images)
3. **Lazy-load audio** (load SFX on demand)
4. **Optimize models** (reduce polygon count)

### Monitor Performance

Use Lighthouse or WebPageTest:
```bash
npm install -g lighthouse
lighthouse https://henry-dynasty.vercel.app
```

Target metrics:
- First Contentful Paint: < 2.5s
- Largest Contentful Paint: < 4s
- Cumulative Layout Shift: < 0.1

---

## Monitoring After Deploy

### Enable Vercel Analytics

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Analytics → Enable Web Analytics
4. Add script to `index.html`:

```html
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments) };
</script>
<script defer src="/_vercel/insights/script.js"></script>
```

### Monitor Errors

Set up error tracking (optional):

```typescript
// In Dungeon3D.tsx
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service
});
```

---

## Domain Setup (Optional)

To use a custom domain:

1. Go to Vercel Dashboard
2. Project → Domains
3. Add your domain
4. Follow DNS setup instructions

Example:
```
dungeon.yourdomain.com → henry-dynasty.vercel.app
```

---

## Continuous Deployment

Every time you push to `main` branch, Vercel auto-deploys:

```bash
git add .
git commit -m "Add HUD and audio system"
git push origin main
```

Vercel will automatically:
1. Build your project
2. Run tests (if configured)
3. Deploy to staging
4. Deploy to production (if no errors)

---

## Deployment Checklist

**Before Deploy:**
- [ ] `npm run build` succeeds
- [ ] `npm run preview` works locally
- [ ] No console errors
- [ ] HUD displays
- [ ] Controls work

**Deploy:**
- [ ] Run `vercel --prod`
- [ ] Verify URL works
- [ ] Test on mobile device
- [ ] Check performance (Lighthouse)

**Post-Deploy:**
- [ ] Share link with friends
- [ ] Monitor error logs
- [ ] Collect user feedback
- [ ] Plan next features

---

## What's Next (After Deploy)

1. **Share:** Post link on social media, Discord, etc.
2. **Get feedback:** Ask players what they think
3. **Update:** Fix bugs, add new content
4. **Monetize:** Add ads, cosmetics, paid features (optional)
5. **Native apps:** Wrap in Electron/React Native

---

## Support

**Vercel Docs:** https://vercel.com/docs  
**Vite Docs:** https://vitejs.dev/  
**Three.js Docs:** https://threejs.org/docs/

---

**Your game is ready. Ship it! 🚀🐦**
