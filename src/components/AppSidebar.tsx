// @ts-nocheck
import { ChargePointSheet } from '@/components/ocpp/ChargePointSheet';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import type { RootState } from '@/store/store';
import { Plus, Zap, Battery, Clock } from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

type NavItem = {
  title: string;
  url: string;
  icon: any;
  items?: { title: string; url: string }[];
};
const data: {
  company: { name: string; logo: string; plan: string };
  navMain: NavItem[];
} = {
  company: {
    name: 'EV Station',
    logo: '⚡',
    plan: 'Enterprise',
  },
  navMain: [],
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [cpSheetOpen, setCpSheetOpen] = useState(false);
  const { items, order } = useSelector((s: RootState) => s.ocpp);

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='lg'
              className='group data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              tooltip='OCPP Simulator'
            >
              <div className='w-full flex items-center gap-2'>
                <Zap className='h-6 w-6' />
                <span className='text-2xl font-bold group-data-[state=collapsed]:hidden'>OCPP Simulator</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <div className='flex items-center justify-between px-2'>
          <SidebarGroupLabel>Connections</SidebarGroupLabel>
          <Button
            size='sm'
            variant='ghost'
            onClick={() => setCpSheetOpen(true)}
            title='Add'
          >
            <Plus className='w-4 h-4' />
          </Button>
        </div>
        <SidebarMenu>
          {order.map((id) => (
            <SidebarMenuItem key={id}>
              <SidebarMenuButton
                className='group cursor-pointer'
                onClick={() => navigate(`/cp/${id}`)}
                tooltip={items[id]?.label || id}
              >
                <span className='inline-flex items-center gap-2'>
                  {items[id]?.status === 'connected' ? (
                    <Zap className='h-4 w-4 text-green-500' />
                  ) : items[id]?.status === 'connecting' ? (
                    <Clock className='h-4 w-4 text-yellow-500' />
                  ) : (
                    <Battery className='h-4 w-4 text-slate-400' />
                  )}
                  <span className='group-data-[state=collapsed]:hidden'>{items[id]?.label || id}</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip='New Connection'
              className='group cursor-pointer flex items-center gap-2'
              onClick={() => setCpSheetOpen(true)}
            >
              <Plus className='w-4 h-4' />
              <span className='group-data-[state=collapsed]:hidden'>New Connection</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <ChargePointSheet open={cpSheetOpen} onOpenChange={setCpSheetOpen} />
    </Sidebar>
  );
}
