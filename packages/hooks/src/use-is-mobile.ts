import { useMediaQuery } from './use-media-query';

export const useIsMobile = (): boolean => useMediaQuery('(max-width: 767px)');
