import { useRoutes } from 'react-router-dom';
import Test from './test';
import Prev from './prev';

const AppRoutes = () => {
  const routes = useRoutes([
    { path: "/test", element: <Test /> },
    { path: "/prev", element: <Prev /> }
  ]);

  return routes;
};

export default AppRoutes;