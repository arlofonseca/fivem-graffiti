import { build } from 'esbuild';

build({
  entryPoints: ['./client/main.ts'],
  outfile: './dist/client/main.js',
  target: 'es2020',
  minify: true,
  bundle: true,
})
  .then(() => {
    console.log('Successfully built client');
  })
  .catch((error) => {
    console.error('Failed building client:', error);
    process.exit(1);
  });

build({
  entryPoints: ['./server/main.ts'],
  outfile: './dist/server/main.js',
  platform: 'node',
  target: 'es2020',
  minify: true,
  bundle: true,
})
  .then(() => {
    console.log('Successfully built server');
  })
  .catch((error) => {
    console.error('Failed building server:', error);
    process.exit(1);
  });
