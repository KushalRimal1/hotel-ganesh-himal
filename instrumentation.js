export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NETLIFY !== 'true' && !process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.HOTEL_STORAGE_DRIVER !== 'netlify') {
    const { default: backend } = await import('./lib/backend.js');
    backend.getBackend().initialize();
  }
}
