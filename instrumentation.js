export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { default: backend } = await import('./lib/backend.js');
    backend.getBackend().initialize();
  }
}
