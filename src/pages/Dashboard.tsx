import { DashboardLayout } from '@/components/DashboardLayout';
import { SEO } from '@/components/SEO';

const Dashboard = () => {
  return (
    <>
      <SEO
        title="Dashboard"
        description="Manage and monitor your OCPP charge point connections. Create new charge points, view connection status, and access all your EV charging station simulations."
        keywords="OCPP dashboard, charge point management, EV charging dashboard, OCPP connections"
      />
      <DashboardLayout>Dashboard</DashboardLayout>
    </>
  );
};

export default Dashboard;
