import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-bg">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}


