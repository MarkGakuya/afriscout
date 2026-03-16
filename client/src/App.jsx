import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './lib/api';
import Login from './pages/Login';
import MapPage from './pages/MapPage';
import CollectPage from './pages/CollectPage';
import ProfilePage from './pages/ProfilePage';
import SyncPage from './pages/SyncPage';
import Layout from './components/Layout';

function Protected({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <Protected>
            <Layout />
          </Protected>
        }>
          <Route index element={<Navigate to="/map" replace />} />
          <Route path="map" element={<MapPage />} />
          <Route path="collect" element={<CollectPage />} />
          <Route path="collect/:market/:sector" element={<CollectPage />} />
          <Route path="sync" element={<SyncPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
