/**
 * Hello-world for the Weaviate TypeScript client, plus the README task:
 * verify whether *using* the client produces a warning about the deprecated
 * `punycode` module.
 *
 * Node emits `[DEP0040] DeprecationWarning: The punycode module is deprecated`
 * the first time the built-in `punycode` module is loaded from user code.
 * Inside the client this only happens via transitive deps:
 *   weaviate-client -> graphql-request -> cross-fetch -> node-fetch@2
 *   -> whatwg-url@5 -> tr46@0.0.3 (both `require("punycode")`).
 * Modern Node suppresses DEP0040 when the require originates inside
 * `node_modules`, so end users of the client do not see it (see README notes).
 *
 * We register a `process.on('warning')` listener BEFORE importing the client to
 * capture any warning, then run a real create/insert/query round-trip.
 */

const capturedWarnings: NodeJS.ErrnoException[] = [];
process.on('warning', (warning: NodeJS.ErrnoException) => {
  capturedWarnings.push(warning);
});

const WEAVIATE_HOST = process.env.WEAVIATE_HOST ?? 'localhost';
const WEAVIATE_HTTP_PORT = Number(process.env.WEAVIATE_HTTP_PORT ?? 8080);
const WEAVIATE_GRPC_PORT = Number(process.env.WEAVIATE_GRPC_PORT ?? 50051);
const COLLECTION = 'DevSetupGreeting';

async function main(): Promise<void> {
  const weaviate = (await import('weaviate-client')).default;
  console.log('weaviate-client imported successfully.');

  const client = await weaviate.connectToLocal({
    host: WEAVIATE_HOST,
    port: WEAVIATE_HTTP_PORT,
    grpcPort: WEAVIATE_GRPC_PORT,
  });

  try {
    const ready = await client.isReady();
    const meta = await client.getMeta();
    console.log(`Connected to Weaviate ${meta.version} (ready=${ready}).`);

    if (await client.collections.exists(COLLECTION)) {
      await client.collections.delete(COLLECTION);
    }
    const greetings = await client.collections.create({
      name: COLLECTION,
      properties: [
        { name: 'message', dataType: 'text' as const },
        { name: 'language', dataType: 'text' as const },
      ],
      vectorizers: weaviate.configure.vectorizer.none(),
    });
    console.log(`Created collection "${COLLECTION}".`);

    const id = await greetings.data.insert({
      properties: { message: 'Hello, Weaviate!', language: 'en' },
    });
    console.log(`Inserted object with id ${id}.`);

    const fetched = await greetings.query.fetchObjects({ limit: 5 });
    console.log(`Queried back ${fetched.objects.length} object(s):`);
    for (const obj of fetched.objects) {
      console.log(`  - ${obj.properties.message} [${obj.properties.language}]`);
    }

    await client.collections.delete(COLLECTION);
    console.log(`Cleaned up collection "${COLLECTION}".`);
  } finally {
    await client.close();
  }

  await new Promise((resolve) => setImmediate(resolve));

  const punycodeWarnings = capturedWarnings.filter(
    (w) => w.code === 'DEP0040' || /punycode/i.test(w.message),
  );
  console.log(`\n--- punycode deprecation check ---`);
  console.log(`Total process warnings captured: ${capturedWarnings.length}`);
  for (const w of capturedWarnings) {
    console.log(`  - [${w.code ?? 'no-code'}] ${w.name}: ${w.message}`);
  }
  console.log(
    punycodeWarnings.length > 0
      ? 'RESULT: punycode deprecation warning surfaced to the user.'
      : 'RESULT: no punycode deprecation warning surfaced (deps require it from inside node_modules, which Node suppresses).',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
