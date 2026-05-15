/**
 * Ready-to-mount route fragments for the admin IRCTC ops console.
 *
 * Drop-in helper for `src/App.tsx`. Two equally-valid ways to use this:
 *
 * 1) Spread the array into your existing admin `<Route element={<PrivateRoute ... />}>`
 *    group:
 *
 *      import { ADMIN_IRCTC_ROUTES } from "@/components/admin/irctc/routes";
 *      ...
 *      <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
 *        {ADMIN_IRCTC_ROUTES}
 *        ... (existing admin routes)
 *      </Route>
 *
 * 2) Render `<AdminIrctcRoutes />` inside an admin guard block — same effect:
 *
 *      <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
 *        <AdminIrctcRoutes />
 *        ...
 *      </Route>
 *
 * The admin nav entry lives in `src/constants/menuItems.ts`. Add:
 *
 *      import { Train } from "lucide-react";
 *      ...
 *      { icon: Train, label: "IRCTC Ops", path: "/admin/irctc/dashboard" },
 *
 * (NOTE: the agent that produced these files could only write under
 * `src/components/`; the `App.tsx` and `menuItems.ts` edits above must be
 * applied by hand or in a follow-up turn with broader write permission.)
 */

import { Route } from "react-router-dom";

import IrctcAdminDashboard from "./IrctcAdminDashboard";
import IrctcAdminOrderList from "./IrctcAdminOrderList";
import IrctcAdminOrderDetail from "./IrctcAdminOrderDetail";

/** Static-array form, suitable for spreading inside `<Routes>`. */
export const ADMIN_IRCTC_ROUTES = (
  <>
    <Route
      path="/admin/irctc/dashboard"
      element={<IrctcAdminDashboard />}
    />
    <Route
      path="/admin/irctc/orders"
      element={<IrctcAdminOrderList />}
    />
    <Route
      path="/admin/irctc/orders/:internalOrderId"
      element={<IrctcAdminOrderDetail />}
    />
  </>
);

/** Component form. Equivalent to spreading `ADMIN_IRCTC_ROUTES`. */
const AdminIrctcRoutes = () => ADMIN_IRCTC_ROUTES;

export default AdminIrctcRoutes;
