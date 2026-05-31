# FPS Redirection System

## Deployment Instructions

### Backend Deployment (Render)
1. Create account on render.com
2. Connect GitHub repository
3. Create new Web Service
4. Set environment variables in Render dashboard
5. Deploy backend service

### Frontend Deployment (Vercel)
1. Create account on vercel.com
2. Connect GitHub repository
3. Import project
4. Set environment variables
5. Deploy frontend

### Environment Variables Required

#### Backend (Render):
- `ORS_API_KEY`: Your OpenRouteService API key
- `NODE_ENV`: production
- `PORT`: (auto-assigned by Render)

#### Frontend (Vercel):
- `REACT_APP_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
- `REACT_APP_BACKEND_URL`: Your Render backend URL
- `REACT_APP_ORS_API_KEY`: Your OpenRouteService API key

### Post-Deployment
1. Update CORS settings in backend to include frontend URL
2. Test all functionality
3. Monitor logs for any issues

## Live URLs
- Frontend: (Will be provided after Vercel deployment)
- Backend: (Will be provided after Render deployment)
