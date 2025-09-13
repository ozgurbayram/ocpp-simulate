export interface IDashboardDeviceProps {
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
}

export const detectDevice = (): IDashboardDeviceProps => {
  const width = window.innerWidth;
  
  return {
    isDesktop: width >= 1024,
    isTablet: width >= 768 && width < 1024,
    isMobile: width < 768,
  };
};
