import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './component/AppRoutes'; // Your component using useRoutes()

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
