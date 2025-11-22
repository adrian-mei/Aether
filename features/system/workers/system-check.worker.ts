// System Check Worker
// Handles background verification of system resources (caches, compatibility)

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface WorkerLog {
  type: 'log';
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

interface CheckStatus {
  type: 'status';
  check: 'model-cache';
  status: 'checking' | 'cached' | 'missing' | 'unsupported';
  details?: unknown;
}

const ctx: Worker = self as unknown as Worker;

const log = (level: LogLevel, message: string, data?: unknown) => {
  ctx.postMessage({
    type: 'log',
    level,
    category: 'SYS_WORKER',
    message,
    data
  } as WorkerLog);
};

// Check Model Cache
async function checkModelCache() {
  log('info', 'Starting model cache check');
  
  if (typeof caches === 'undefined') {
    log('warn', 'Cache API not supported in this environment');
    ctx.postMessage({ type: 'status', check: 'model-cache', status: 'unsupported' } as CheckStatus);
    return;
  }

  try {
    const keys = await caches.keys();
    log('debug', 'Available caches', keys);

    let found = false;
    for (const key of keys) {
      const cache = await caches.open(key);
      const requests = await cache.keys();
      
      // Look for ONNX files
      const hasWeights = requests.some(req => req.url.includes('.onnx'));
      
      if (hasWeights) {
        log('info', `Found model weights in cache: ${key}`, { fileCount: requests.length });
        found = true;
        break;
      }
    }

    ctx.postMessage({ 
      type: 'status', 
      check: 'model-cache', 
      status: found ? 'cached' : 'missing' 
    } as CheckStatus);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log('error', 'Cache check failed', { error: msg });
    ctx.postMessage({ type: 'status', check: 'model-cache', status: 'missing' } as CheckStatus);
  }
}

ctx.onmessage = async (event: MessageEvent) => {
  const { type } = event.data;
  
  if (type === 'check-cache') {
    await checkModelCache();
  }
};
