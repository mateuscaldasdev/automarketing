export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { instalar } = await import('./lib/servidor/instalacao.js');
  await instalar();
}
