import app from '../app.js';

const routes = app._router?.stack
  .filter((r) => r.route)
  .map((r) => Object.keys(r.route.methods).map((m) => `${m.toUpperCase()} ${r.route.path}`))
  .flat();

console.log('ROUTES:');
routes.forEach(r => console.log(r));
