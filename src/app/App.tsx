import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { AnalyticsTracker } from '@/components/analytics/AnalyticsTracker';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-bg">
        <AppRoutes />
        <AnalyticsTracker />
      </div>
    </BrowserRouter>
  );
}


