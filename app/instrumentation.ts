export async function register() {
  process.on('unhandledRejection', (err) => {
    console.error('unhandledRejection', err);
  });
  process.on('uncaughtException', (err) => {
    console.error('uncaughtException', err);
  });
}