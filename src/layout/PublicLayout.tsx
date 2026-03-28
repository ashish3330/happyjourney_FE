import { FC } from "react";
import { Outlet } from "react-router-dom";
import UserNavbar from "../components/UserNavbar";

const PublicLayout: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <UserNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
