import { ChargePointSheet } from '@/components/ocpp/ChargePointSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Plus, Settings } from 'lucide-react';
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  <div>
                    <span>OCPP</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
                side='bottom'
                align='start'
                sideOffset={4}
              >
                <DropdownMenuLabel className='p-0 font-normal'></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate('/account')}>
                    <Settings />
                    Account
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menüler</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => {
              const active = isActive(item.url);

              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={active}
                  className='group/collapsible'
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={active}
                        className='cursor-pointer'
                        onClick={() => !item.items && navigate(item.url)}
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        {item.items && (
                          <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {item.items && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={location.pathname === subItem.url}
                              >
                                <Button
                                  onClick={() => navigate(subItem.url)}
                                  className='cursor-pointer'
                                  variant='ghost'
                                >
                                  <span className='text-sm'>
                                    {subItem.title}
                                  </span>
                                </Button>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent> */}

      {/* Connections List */}
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
                className='cursor-pointer'
                onClick={() => navigate(`/cp/${id}`)}
              >
                <span className='inline-flex items-center gap-2'>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      items[id]?.status === 'connected'
                        ? 'bg-green-500'
                        : items[id]?.status === 'connecting'
                        ? 'bg-yellow-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  {items[id]?.label || id}
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
              className='cursor-pointer flex items-center gap-2'
              onClick={() => setCpSheetOpen(true)}
            >
              <Plus className='w-4 h-4' />
              <span>New Connection</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <ChargePointSheet open={cpSheetOpen} onOpenChange={setCpSheetOpen} />
    </Sidebar>
  );
}
