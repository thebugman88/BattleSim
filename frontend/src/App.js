import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import SetupPage from "@/pages/SetupPage";
import BattlePage from "@/pages/BattlePage";
import HistoryPage from "@/pages/HistoryPage";

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Header />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/battle/new" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
            <Route path="/battle/:id" element={<ProtectedRoute><BattlePage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: "#121212", border: "1px solid #2A2A2A", color: "#fff" } }} />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
