import { useMediaQuery } from '@chakra-ui/react';

const useIsMobile = () => {
  const [isMobile] = useMediaQuery(`(max-width: 960px)`);
  return isMobile;
};

export default useIsMobile;