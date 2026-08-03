import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TeamMembers from "./pages/TeamMembers";
import Teams from "./pages/Teams";
import TeamRoster from "./pages/TeamRoster";
import TeamMemberDetail from "./pages/TeamMemberDetail";
import EditTeamMember from "./pages/EditTeamMember";
import CheckInForm from "./pages/CheckInForm";
import Review from "./pages/Review";
import CheckInPreparation from "./pages/CheckInPreparation";
import CalendarPage from "./pages/Calendar";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { PageLoading } from "./components/PageLoading";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <TooltipProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/team" element={<TeamMembers />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamRoster />} />
          <Route path="/team/:id" element={<TeamMemberDetail />} />
          <Route path="/team/:id/edit" element={<EditTeamMember />} />
          <Route path="/team/:id/prepare" element={<CheckInPreparation />} />
          <Route path="/check-ins/:id" element={<CheckInForm />} />
          <Route path="/review" element={<Review />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
