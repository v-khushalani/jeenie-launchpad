import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '@/lib/analytics';

/**
 * Tracks page views on every route change.
 * Place inside <BrowserRouter> in App.tsx.
 */
const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    analytics.pageView(location.pathname, document.title);
  }, [location.pathname]);

  return null;
};

export default RouteTracker;
