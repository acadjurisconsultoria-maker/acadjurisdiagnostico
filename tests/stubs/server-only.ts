// Stub de "server-only" para o ambiente de testes (Vitest).
//
// O pacote real lanca erro fora do bundler do Next.js, porque so sabe
// reconhecer o boundary de Server/Client Component em tempo de build do
// Next.js. Esse boundary ja e garantido pelo `next build` (ver `npm run
// check`) -- os testes unitarios existem para verificar logica de negocio,
// nao esse boundary, entao este stub e um no-op deliberado.
export {};
