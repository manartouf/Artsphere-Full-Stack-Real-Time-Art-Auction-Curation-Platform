import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthContext } from './context/AuthContext';
import { useContext } from 'react';

import Navbar from './components/Navbar';
import SpotlightOverlay from './components/SpotlightOverlay';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Browse from './pages/Browse';
import Artists from "./pages/Artists";
import Auctions from "./pages/Auctions";
import ArtDetails from './pages/ArtDetails';
import ArtistProfile from './pages/ArtistProfile';
import Exhibitions from './pages/Exhibitions';
import ExhibitionRoom from './pages/ExhibitionRoom';
import AuctionRoom from './pages/AuctionRoom';
import AdminDashboard from './pages/AdminDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import ArtistDashboard from './pages/ArtistDashboard';
import CreateCollection from './pages/CreateCollection';
import RequestAuction from './pages/RequestAuction';
import UploadArt from './pages/UploadArt';

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" />;
  return children;
};

const RoleRoute = ({ children, role }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" />;
  if (user.role !== role) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0a1a] text-white">
        <Toaster position="top-center" />
        {/* ── Global cursor spotlight — pointer-events:none, safe ── */}
        <SpotlightOverlay />
        <Navbar />
        <Routes>
          <Route path="/"               element={<Home />} />
          <Route path="/browse"         element={<Browse />} />
          <Route path="/auctions"       element={<Auctions />} />
          <Route path="/art/:id"        element={<ArtDetails />} />
          <Route path="/artist/:id"     element={<ArtistProfile />} />
          <Route path="/exhibitions"    element={<Exhibitions />} />
          <Route path="/exhibition/:id" element={<ExhibitionRoom />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/artists"        element={<Artists />} />

          <Route path="/profile"            element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/auction/:id"        element={<ProtectedRoute><AuctionRoom /></ProtectedRoute>} />
          <Route path="/upload"             element={<ProtectedRoute><UploadArt /></ProtectedRoute>} />
          <Route path="/create-collection"  element={<ProtectedRoute><CreateCollection /></ProtectedRoute>} />
          <Route path="/request-auction"    element={<ProtectedRoute><RequestAuction /></ProtectedRoute>} />

          <Route path="/buyer"            element={<RoleRoute role="buyer"><BuyerDashboard /></RoleRoute>} />
          <Route path="/artist/dashboard" element={<RoleRoute role="artist"><ArtistDashboard /></RoleRoute>} />
          <Route path="/admin"            element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>} />

          <Route path="*" element={
            <div className="text-center py-20 text-gray-500">
              <p className="text-6xl mb-4">404</p>
              <p className="text-xl">Page not found</p>
              <button onClick={() => window.location.href = "/"} className="mt-6 px-6 py-3 bg-[#6c3483] rounded-lg font-bold text-white hover:bg-opacity-90 transition">
                Go Home
              </button>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;