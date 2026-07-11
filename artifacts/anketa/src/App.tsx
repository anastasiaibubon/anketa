import { Route, Switch, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';
import LandingPage from '@/pages/landing';
import CreatedPage from '@/pages/created';
import FillPage from '@/pages/fill';
import ResultsPage from '@/pages/results';
import LoginPage from '@/pages/login';
import DashboardPage from '@/pages/dashboard';

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/created/:roomId/:key" component={CreatedPage} />
      <Route path="/fill/:roomId" component={FillPage} />
      <Route path="/results/:roomId/:key" component={ResultsPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Router />
    </WouterRouter>
  );
}

export default App;
