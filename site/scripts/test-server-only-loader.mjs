export function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only" && context.parentURL?.endsWith("/lib/lyrics/kie-client.ts")) {
    return { url: "data:text/javascript,export{}", shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
