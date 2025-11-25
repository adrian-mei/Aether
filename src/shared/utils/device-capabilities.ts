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
    // Strict check for stability:
    // 1. Mobile devices without WebGPU should default to Native to avoid slow WASM inference
    // 2. Low core count devices (< 4) should default to Native
    if (isMobile && !hasWebGPU) return true;
    return hardwareConcurrency < 4;
};
