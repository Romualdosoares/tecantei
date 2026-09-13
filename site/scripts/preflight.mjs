import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPreflightEnv, PREFLIGHT_TARGETS, runPreflight } from "./preflight-lib.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetArgument = process.argv.find((argument) => argument.startsWith("--target="));
const target = targetArgument?.slice("--target=".length) || "local";

if (!PREFLIGHT_TARGETS.includes(target)) {
  console.error(`Alvo inválido: ${target}. Use local, preview ou production.`);
  process.exitCode = 2;
} else {
  const env = await loadPreflightEnv(rootDir, target);
  const result = await runPreflight({ rootDir, target, env });
  const symbols = { pass: "PASS", warn: "AVISO", block: "BLOQUEIO" };

  console.log(`Pré-publicação Te Cantei · alvo ${target}`);
  for (const check of result.checks) {
    console.log(`${symbols[check.level]} [${check.area}] ${check.message}`);
  }
  console.log(`Resumo: ${result.summary.pass} aprovados, ${result.summary.warn} avisos, ${result.summary.block} bloqueios.`);
  console.log(result.ready ? "Resultado: PRONTO para este alvo." : "Resultado: NÃO PRONTO para este alvo.");
  process.exitCode = result.ready ? 0 : 1;
}
