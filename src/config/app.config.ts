export default () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3001', 10),
    globalPrefix: process.env.GLOBAL_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },
});
