export const checkDeviceCapabilities = () => {
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) {
    return {
      isMobile: false,
      hasWebGPU: false,
      hardwareConcurrency: 0
    };
  }

  // Simple Mobile Detection
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobile = /android|ipad|iphone|ipod/i.test(userAgent);

  // WebGPU Detection
  // Note: navigator.gpu needs type definition or casting if not in tsconfig
  const hasWebGPU = 'gpu' in navigator;

  return {
    isMobile,
    hasWebGPU,
    hardwareConcurrency: navigator.hardwareConcurrency || 4
  };
};

export const isLowEndDevice = () => {
    const { isMobile, hasWebGPU, hardwareConcurrency } = checkDeviceCapabilities();
    // Consider low end if:
    // 1. Mobile AND No WebGPU (iPhone/Older Android)
    // 2. Low core count (< 4)
    return (isMobile && !hasWebGPU) || hardwareConcurrency < 4;
};
