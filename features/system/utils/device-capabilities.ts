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
    const { hardwareConcurrency } = checkDeviceCapabilities();
    // Relaxed check: We assume modern mobiles (iPhone 11+) can handle Neural Voice (via WASM if needed).
    // We only fallback to native if the CPU is very limited (< 4 cores).
    return hardwareConcurrency < 4;
};
