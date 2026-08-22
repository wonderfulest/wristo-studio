# Wristo Studio Design Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authenticated, conversational Design Agent to Wristo Studio that produces validated semantic patches, previews them without mutating the live design, and applies an accepted patch as one undoable history action.

**Architecture:** Wristo API calls the OpenAI Responses API and returns a strict versioned patch; it never returns Fabric objects or mutates a design. Wristo Studio owns the capability catalog, context serialization, deterministic patch compilation, candidate preview, conflict detection, and transactional application to the existing runtime configuration pipeline.

**Tech Stack:** Vue 3, TypeScript, Pinia, Fabric.js, Vitest, Element Plus, Spring Boot, Java, Jackson, OkHttp, JUnit 5, Mockito, OpenAI Responses API.

---

## Repository and file map

### `wristo-studio`

- Create `src/features/design-agent/designAgentContract.ts`: patch request/response types and runtime validator.
- Create `src/features/design-agent/designAgentContract.test.ts`: strict contract tests.
- Create `src/features/design-agent/designAgentCapabilities.ts`: advertised element presets and deterministic default factories.
- Create `src/features/design-agent/designAgentContext.ts`: compact current-design serializer and stable SHA-256 digest.
- Create `src/features/design-agent/designAgentContext.test.ts`: redaction and digest tests.
- Create `src/features/design-agent/designPatchCompiler.ts`: pure patch-to-candidate compiler.
- Create `src/features/design-agent/designPatchCompiler.test.ts`: add/update/move/remove/reorder and safety tests.
- Create `src/features/design-agent/designAgentApi.ts`: authenticated API client.
- Create `src/features/design-agent/designAgentStore.ts`: conversation, generation and candidate state.
- Create `src/features/design-agent/runtimeDesignApplier.ts`: reusable runtime-config replacement with rollback.
- Modify `src/views/design/useDesignLoader.ts`: delegate existing load/import work to the reusable applier.
- Create `src/features/design-agent/runtimeDesignApplier.test.ts`: transaction and history tests.
- Create `src/features/design-agent/DesignAgentPanel.vue`: chat and request controls.
- Create `src/features/design-agent/DesignAgentPreview.vue`: summary, grouped changes and Apply/Discard controls.
- Create `src/features/design-agent/DesignCandidateCanvas.vue`: isolated SVG candidate rendering that never touches the live Fabric canvas.
- Create `src/features/design-agent/designCandidateSvg.ts`: pure candidate-config to SVG view-model projection.
- Create `src/features/design-agent/DesignAgentPanel.test.ts`: UI workflow tests.
- Modify `src/views/Design.vue`: add the Agent tab to the existing right panel.
- Modify `src/i18n.ts`: English and Chinese user-facing copy.

### `wristo-api`

- Create `src/main/java/com/wukong/face/modules/designagent/dto/DesignAgentRequestDTO.java`: bounded request DTO.
- Create `src/main/java/com/wukong/face/modules/designagent/vo/DesignPatchVO.java`: typed patch response.
- Create `src/main/java/com/wukong/face/modules/designagent/service/DesignAgentService.java`: service boundary.
- Create `src/main/java/com/wukong/face/modules/designagent/service/DesignPatchValidator.java`: operation whitelist and delete-authorization validation.
- Create `src/main/java/com/wukong/face/modules/designagent/client/OpenAiDesignAgentClient.java`: Responses API transport and structured-output parsing.
- Create `src/main/java/com/wukong/face/modules/designagent/service/impl/DesignAgentServiceImpl.java`: prompt and orchestration.
- Create `src/main/java/com/wukong/face/modules/designagent/controller/dsn/DesignAgentDsnController.java`: authenticated Studio endpoint.
- Create focused tests under `src/test/java/com/wukong/face/modules/designagent/`.

## Task 1: Define and validate the Studio patch contract

**Files:**
- Create: `wristo-studio/src/features/design-agent/designAgentContract.ts`
- Create: `wristo-studio/src/features/design-agent/designAgentContract.test.ts`

- [ ] **Step 1: Write failing strict-validator tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseDesignPatch } from './designAgentContract'

describe('parseDesignPatch', () => {
  it('accepts a versioned add operation', () => {
    expect(parseDesignPatch({
      version: '1.0', summary: 'Add time', assistantMessage: 'Added a time element.',
      operations: [{ action: 'add', clientRef: 'main-time', elementType: 'time', preset: 'digital', placement: { anchor: 'center' } }],
    }).operations).toHaveLength(1)
  })

  it.each([
    [{ version: '2.0', summary: 'x', assistantMessage: 'x', operations: [] }, 'version'],
    [{ version: '1.0', summary: 'x', assistantMessage: 'x', operations: [{ action: 'execute', command: 'save' }] }, 'action'],
    [{ version: '1.0', summary: 'x', assistantMessage: 'x', operations: [], extra: true }, 'extra'],
  ])('rejects invalid input %#', (value, field) => {
    expect(() => parseDesignPatch(value)).toThrow(field)
  })
})
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/designAgentContract.test.ts`

Expected: FAIL because `designAgentContract.ts` does not exist.

- [ ] **Step 3: Implement the versioned discriminated contract and exact-key validator**

```ts
export type Anchor = 'center' | 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right'
export type Placement = { anchor: Anchor; offsetX?: number; offsetY?: number; margin?: number; relativeTo?: string }
export type DesignOperation =
  | { action: 'add'; clientRef: string; elementType: string; preset: string; placement: Placement; style?: Record<string, unknown>; binding?: { metric: string } }
  | { action: 'update'; targetId: string; changes: Record<string, unknown> }
  | { action: 'move'; targetId: string; placement: Placement }
  | { action: 'remove'; targetId: string; reason: string }
  | { action: 'reorder'; orderIds: string[] }
  | { action: 'setDesign'; changes: { name?: string; backgroundColor?: string } }

export interface DesignPatch {
  version: '1.0'
  summary: string
  assistantMessage: string
  operations: DesignOperation[]
  adjustments?: string[]
}

const topKeys = new Set(['version', 'summary', 'assistantMessage', 'operations', 'adjustments'])
const actionKeys: Record<DesignOperation['action'], Set<string>> = {
  add: new Set(['action', 'clientRef', 'elementType', 'preset', 'placement', 'style', 'binding']),
  update: new Set(['action', 'targetId', 'changes']),
  move: new Set(['action', 'targetId', 'placement']),
  remove: new Set(['action', 'targetId', 'reason']),
  reorder: new Set(['action', 'orderIds']),
  setDesign: new Set(['action', 'changes']),
}

function assertExactKeys(value: Record<string, unknown>, allowed: Set<string>, path: string): void {
  const invalid = Object.keys(value).find((key) => !allowed.has(key))
  if (invalid) throw new Error(`${path}.${invalid} is not allowed`)
}

export function parseDesignPatch(input: unknown): DesignPatch {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('patch must be an object')
  const value = input as Record<string, unknown>
  assertExactKeys(value, topKeys, 'patch')
  if (value.version !== '1.0') throw new Error('version must be 1.0')
  if (typeof value.summary !== 'string' || typeof value.assistantMessage !== 'string') throw new Error('summary and assistantMessage are required')
  if (!Array.isArray(value.operations) || value.operations.length > 40) throw new Error('operations must contain at most 40 items')
  value.operations.forEach((operation, index) => {
    if (!operation || typeof operation !== 'object' || Array.isArray(operation)) throw new Error(`operations[${index}] must be an object`)
    const action = (operation as Record<string, unknown>).action as DesignOperation['action']
    if (!actionKeys[action]) throw new Error(`operations[${index}].action is invalid`)
    assertExactKeys(operation as Record<string, unknown>, actionKeys[action], `operations[${index}]`)
  })
  return structuredClone(value) as unknown as DesignPatch
}
```

- [ ] **Step 4: Run the contract tests**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/designAgentContract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the isolated Studio contract**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/design-agent/designAgentContract.ts src/features/design-agent/designAgentContract.test.ts
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "add design agent patch contract"
```

## Task 2: Build the capability catalog and compact context

**Files:**
- Create: `wristo-studio/src/features/design-agent/designAgentCapabilities.ts`
- Create: `wristo-studio/src/features/design-agent/designAgentContext.ts`
- Create: `wristo-studio/src/features/design-agent/designAgentContext.test.ts`

- [ ] **Step 1: Write tests for advertised capabilities, redaction and stable digest**

```ts
import { describe, expect, it } from 'vitest'
import { DESIGN_AGENT_CAPABILITIES } from './designAgentCapabilities'
import { serializeDesignContext } from './designAgentContext'

describe('design agent context', () => {
  it('advertises only presets with deterministic factories', () => {
    expect(DESIGN_AGENT_CAPABILITIES.map((item) => item.elementType)).toEqual(['time', 'date', 'text', 'data', 'battery', 'circle', 'rectangle'])
  })

  it('omits asset payloads and produces the same digest for equal configs', async () => {
    const config = { version: '1.0', designId: 'd1', name: 'Demo', properties: {}, textCase: 0, bitmapMode: true, elements: [{ id: 't1', eleType: 'time', left: 227, top: 200, imageData: 'secret' }], orderIds: ['t1'] } as any
    const first = await serializeDesignContext(config, { width: 454, height: 454, shape: 'round' })
    const second = await serializeDesignContext(structuredClone(config), { width: 454, height: 454, shape: 'round' })
    expect(JSON.stringify(first.snapshot)).not.toContain('secret')
    expect(first.digest).toBe(second.digest)
  })
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/designAgentContext.test.ts`

Expected: FAIL because the capability and context modules do not exist.

- [ ] **Step 3: Implement a first-version capability catalog with exact presets**

Define `DESIGN_AGENT_CAPABILITIES` with `time/digital`, `date/default`, `text/plain`, `data/value`, `battery/default`, `circle/default`, and `rectangle/default`. Each entry must include `elementType`, `presets`, `editableFields`, and a `createConfig(id)` factory that imports defaults from the corresponding element schema where one exists. Do not advertise weather, images, hands, charts, or goals until a deterministic factory and focused compiler test exists for that type.

```ts
export interface AgentCapability {
  elementType: string
  presets: readonly string[]
  editableFields: readonly string[]
  createConfig: (id: string) => Record<string, unknown>
}

export const DESIGN_AGENT_CAPABILITIES: AgentCapability[] = [
  { elementType: 'time', presets: ['digital'], editableFields: ['left', 'top', 'fontSize', 'fontFamily', 'fill', 'formatter'], createConfig: (id) => ({ id, eleType: 'time', left: 227, top: 227, originX: 'center', originY: 'center', fontSize: 96, fontFamily: 'roboto-condensed-regular', fill: '#ffffff', formatter: 0, fontRenderType: 'truetype', bitmapFontId: null, fontGap: 4 }) },
  { elementType: 'date', presets: ['default'], editableFields: ['left', 'top', 'fontSize', 'fontFamily', 'fill', 'formatter'], createConfig: (id) => ({ id, eleType: 'date', left: 227, top: 300, originX: 'center', originY: 'center', fontSize: 24, fontFamily: 'roboto-condensed-regular', fill: '#ffffff', formatter: 0 }) },
  { elementType: 'text', presets: ['plain'], editableFields: ['left', 'top', 'fontSize', 'fontFamily', 'fill', 'text'], createConfig: (id) => ({ id, eleType: 'text', left: 227, top: 227, originX: 'center', originY: 'center', fontSize: 24, fontFamily: 'roboto-condensed-regular', fill: '#ffffff', text: 'TEXT' }) },
  { elementType: 'data', presets: ['value'], editableFields: ['left', 'top', 'fontSize', 'fontFamily', 'fill', 'dataProperty'], createConfig: (id) => ({ id, eleType: 'data', left: 227, top: 340, originX: 'center', originY: 'center', fontSize: 24, fontFamily: 'roboto-condensed-regular', fill: '#ffffff' }) },
  { elementType: 'battery', presets: ['default'], editableFields: ['left', 'top', 'fill'], createConfig: (id) => ({ id, eleType: 'battery', left: 227, top: 380, originX: 'center', originY: 'center', fill: '#ffffff' }) },
  { elementType: 'circle', presets: ['default'], editableFields: ['left', 'top', 'radius', 'fill', 'stroke', 'strokeWidth'], createConfig: (id) => ({ id, eleType: 'circle', left: 227, top: 227, originX: 'center', originY: 'center', radius: 40, fill: 'transparent', stroke: '#ffffff', strokeWidth: 2 }) },
  { elementType: 'rectangle', presets: ['default'], editableFields: ['left', 'top', 'width', 'height', 'fill', 'stroke', 'strokeWidth'], createConfig: (id) => ({ id, eleType: 'rectangle', left: 227, top: 227, originX: 'center', originY: 'center', width: 80, height: 40, fill: 'transparent', stroke: '#ffffff', strokeWidth: 2 }) },
]
```

- [ ] **Step 4: Implement compact serialization and digesting**

Serialize only `id`, `eleType`, `left`, `top`, dimensions, display style, formatter, binding, and layer order. Use recursively sorted JSON keys and `crypto.subtle.digest('SHA-256', bytes)` for `digest`; omit keys matching `src`, `imageData`, `blob`, `token`, and `assetBundle`.

- [ ] **Step 5: Run focused tests**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/designAgentContext.test.ts`

Expected: PASS with seven advertised element types and stable digest.

- [ ] **Step 6: Commit context and capability catalog**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/design-agent/designAgentCapabilities.ts src/features/design-agent/designAgentContext.ts src/features/design-agent/designAgentContext.test.ts
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "add design agent capability context"
```

## Task 3: Compile semantic patches into candidate runtime configs

**Files:**
- Create: `wristo-studio/src/features/design-agent/designPatchCompiler.ts`
- Create: `wristo-studio/src/features/design-agent/designPatchCompiler.test.ts`

- [ ] **Step 1: Write failing compiler tests**

Test these exact invariants: add assigns the injected UUID and resolves `center`; update preserves every non-whitelisted field; move clamps the element center inside the device bounds; remove fails unless `allowDestructive` is true; reorder contains every surviving ID exactly once; invalid metric binding rejects the entire patch; compilation never mutates the source config.

```ts
const result = compileDesignPatch(baseConfig, patch, {
  width: 454, height: 454, shape: 'round', allowDestructive: false,
  availableMetrics: new Map([['steps', 'data_steps']]),
  createId: () => 'generated-1',
})
expect(result.config.elements.find((item) => item.id === 'generated-1')).toMatchObject({ eleType: 'time', left: 227, top: 227 })
expect(baseConfig.elements).toEqual(originalElements)
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/designPatchCompiler.test.ts`

Expected: FAIL because `compileDesignPatch` is missing.

- [ ] **Step 3: Implement deterministic placement and operation reduction**

```ts
export interface CompileOptions {
  width: number
  height: number
  shape: 'round' | 'square'
  allowDestructive: boolean
  availableMetrics: Map<string, string>
  createId: () => string
}

export interface DesignChange { kind: 'add' | 'update' | 'remove' | 'reorder' | 'design'; id?: string; label: string }
export interface CompileResult { config: RuntimeDesignConfig; changes: DesignChange[]; adjustments: string[] }

export function compileDesignPatch(source: RuntimeDesignConfig, patch: DesignPatch, options: CompileOptions): CompileResult {
  const config = structuredClone(source)
  const changes: DesignChange[] = []
  const adjustments: string[] = []
  // Reduce operations against `config`; throw DesignPatchCompileError on the first invalid operation.
  // Resolve anchors from width/height, clamp centers to [0,width] and [0,height], and append a readable adjustment.
  // Look up add factories and editable fields from DESIGN_AGENT_CAPABILITIES.
  // Convert binding.metric through availableMetrics and write the resulting property ID to dataProperty.
  // Rebuild orderIds from surviving IDs after all operations and assert uniqueness.
  return { config, changes, adjustments }
}
```

For `setDesign.backgroundColor`, update the existing `background` element's `color`; when none exists, prepend a background config centered at half width/height with the target device dimensions and an empty `imageUrl`. Implement the listed behavior directly; keep Fabric, Pinia and browser UI imports out of this module.

- [ ] **Step 4: Run compiler and contract tests**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/designAgentContract.test.ts src/features/design-agent/designAgentContext.test.ts src/features/design-agent/designPatchCompiler.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the compiler**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/design-agent/designPatchCompiler.ts src/features/design-agent/designPatchCompiler.test.ts
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "compile design agent patches"
```

## Task 4: Add the authenticated API and structured OpenAI response

**Files:**
- Create: `wristo-api/src/main/java/com/wukong/face/modules/designagent/dto/DesignAgentRequestDTO.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/designagent/vo/DesignPatchVO.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/designagent/service/DesignAgentService.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/designagent/service/DesignPatchValidator.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/designagent/client/OpenAiDesignAgentClient.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/designagent/service/impl/DesignAgentServiceImpl.java`
- Create: `wristo-api/src/main/java/com/wukong/face/modules/designagent/controller/dsn/DesignAgentDsnController.java`
- Test: `wristo-api/src/test/java/com/wukong/face/modules/designagent/service/DesignPatchValidatorTest.java`
- Test: `wristo-api/src/test/java/com/wukong/face/modules/designagent/service/DesignAgentServiceImplTest.java`
- Test: `wristo-api/src/test/java/com/wukong/face/modules/designagent/controller/dsn/DesignAgentDsnControllerTest.java`

- [ ] **Step 1: Write validator and service tests**

The tests must assert: blank prompts fail; prompts over 4,000 characters fail; more than 12 history messages fail; more than 40 operations fail; unknown actions fail; `remove` fails when `destructiveIntent` is false; a valid client response passes unchanged; transport errors map to `BizException` without including the API key.

```java
@Test
void rejectsRemoveWithoutDestructiveIntent() {
    DesignPatchVO patch = patchWithOperation(Map.of("action", "remove", "targetId", "time-1", "reason", "replace"));
    BizException error = assertThrows(BizException.class, () -> validator.validate(patch, false));
    assertTrue(error.getMessage().contains("remove"));
}
```

- [ ] **Step 2: Run tests and verify missing-type failures**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest='DesignPatchValidatorTest,DesignAgentServiceImplTest,DesignAgentDsnControllerTest' test`

Expected: FAIL at test compilation because design-agent classes do not exist.

- [ ] **Step 3: Implement bounded DTO and typed response**

```java
@Data
public class DesignAgentRequestDTO {
    private String prompt;
    private String designDigest;
    private JsonNode currentDesign;
    private JsonNode device;
    private JsonNode capabilities;
    private List<Message> history = List.of();
    private boolean destructiveIntent;

    @Data
    public static class Message {
        private String role;
        private String content;
    }
}
```

`DesignPatchVO` must expose `version`, `summary`, `assistantMessage`, `List<Map<String,Object>> operations`, and `List<String> adjustments`. Initialize lists to empty values to avoid nullable collections.

- [ ] **Step 4: Implement strict schema and validator**

The OpenAI JSON Schema must set `additionalProperties: false` at the top level and for every operation variant, require `version` to equal `1.0`, and cap operations at 40. `DesignPatchValidator` repeats security-critical checks after parsing: allowed actions, allowed element types supplied by the request capability list, target IDs present in the current design, and deletion authorization.

- [ ] **Step 5: Implement an injectable Responses API client**

```java
public DesignPatchVO generate(Map<String, Object> requestBody) {
    Request request = new Request.Builder()
        .url(trimRight(baseUrl, "/") + "/responses")
        .header("Authorization", "Bearer " + apiKey)
        .header("Content-Type", "application/json")
        .post(RequestBody.create(objectMapper.writeValueAsBytes(requestBody), JSON))
        .build();
    try (Response response = httpClient.newCall(request).execute()) {
        String responseBody = response.body() == null ? "" : response.body().string();
        if (!response.isSuccessful()) throw upstreamFailure(response.code(), responseBody);
        return objectMapper.readValue(extractOutputText(responseBody), DesignPatchVO.class);
    } catch (IOException error) {
        throw new BizException(BizErrorCode.SYSTEM_ERROR.getCode(), "Design Agent request failed");
    }
}
```

Inject `OkHttpClient`, `ObjectMapper`, base URL, API key and model through the constructor so unit tests use a fake transport. Configure `openai.design-agent.model` with fallback to `${openai.model:gpt-5-mini}`, read timeout 90 seconds, and `max_output_tokens` 4,000. Never log the request authorization header or full upstream response body.

- [ ] **Step 6: Implement service prompt and one repair attempt**

The system prompt must state that the model is a Wristo watch-face designer, can only use the supplied capabilities, must preserve unmentioned elements, cannot save/publish/upload/build, and may emit `remove` only when `destructiveIntent` is true. On schema parse failure, issue one repair request containing the validation error and the prior text; do not retry timeouts or non-2xx HTTP responses.

- [ ] **Step 7: Add the Dsn controller**

```java
@RestController
@RequestMapping("/api/dsn/design-agent")
public class DesignAgentDsnController {
    private final DesignAgentService designAgentService;

    public DesignAgentDsnController(DesignAgentService designAgentService) {
        this.designAgentService = designAgentService;
    }

    @PostMapping("/generate")
    public Result<DesignPatchVO> generate(@RequestBody DesignAgentRequestDTO dto) {
        return Result.success(designAgentService.generate(dto));
    }
}
```

Rely on the existing `/api/dsn/**` authentication chain; add a controller security test proving an unauthenticated request receives the project-standard unauthorized response.

- [ ] **Step 8: Run focused API tests**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest='DesignPatchValidatorTest,DesignAgentServiceImplTest,DesignAgentDsnControllerTest' test`

Expected: PASS without calling the real OpenAI API.

- [ ] **Step 9: Commit the API slice**

```bash
git -C /Users/mac/workspace/wristo/wristo-api add src/main/java/com/wukong/face/modules/designagent src/test/java/com/wukong/face/modules/designagent
git -C /Users/mac/workspace/wristo/wristo-api commit -m "add studio design agent api"
```

## Task 5: Add the Studio API client and conversation state

**Files:**
- Create: `wristo-studio/src/features/design-agent/designAgentApi.ts`
- Create: `wristo-studio/src/features/design-agent/designAgentStore.ts`
- Create: `wristo-studio/src/features/design-agent/designAgentStore.test.ts`

- [ ] **Step 1: Write store tests for request lifecycle and stale responses**

Assert that generation stores the source digest, parses the server patch, compiles one candidate, preserves the prompt after network failure, ignores a response from an earlier request ID, and clears the candidate on discard.

- [ ] **Step 2: Run the test and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/designAgentStore.test.ts`

Expected: FAIL because the client and store do not exist.

- [ ] **Step 3: Implement the authenticated client**

```ts
import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import { parseDesignPatch, type DesignPatch } from './designAgentContract'

export async function generateDesignPatch(payload: Record<string, unknown>): Promise<DesignPatch> {
  const response = await instance.post<unknown, ApiResponse<unknown>>('/dsn/design-agent/generate', payload)
  return parseDesignPatch(response.data)
}
```

- [ ] **Step 4: Implement Pinia state with dependency-injected generation**

State fields: `messages`, `draft`, `status`, `requestId`, `sourceDigest`, `candidate`, and `errorCode`. Expose `generate(context, dependencies)`, `discardCandidate()`, and `resetSession()`. Only append an assistant message after a patch compiles successfully; cap retained chat history at 12 messages.

- [ ] **Step 5: Run focused tests**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/designAgentStore.test.ts src/features/design-agent/designPatchCompiler.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit API client and state**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/design-agent/designAgentApi.ts src/features/design-agent/designAgentStore.ts src/features/design-agent/designAgentStore.test.ts
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "add design agent conversation state"
```

## Task 6: Extract reusable runtime application and make Agent apply transactional

**Files:**
- Create: `wristo-studio/src/features/design-agent/runtimeDesignApplier.ts`
- Create: `wristo-studio/src/features/design-agent/runtimeDesignApplier.test.ts`
- Modify: `wristo-studio/src/views/design/useDesignLoader.ts`
- Modify: `wristo-studio/src/features/design-agent/designAgentStore.ts`

- [ ] **Step 1: Write a failing transaction test**

Set up adapters whose `loadCandidate()` mutates state and then throws. Assert that `applyCandidate()` restores the captured snapshot, does not append a history entry, and leaves the candidate available for retry. Add a success test asserting exactly one `historyStore.saveState('design-agent')` call.

- [ ] **Step 2: Run the test and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/runtimeDesignApplier.test.ts`

Expected: FAIL because the transaction module does not exist.

- [ ] **Step 3: Extract loader internals behind a reusable adapter**

Move the existing `applyRuntimeDesignConfig`, `loadElements`, order restoration, display-state restoration and editable-canvas clearing logic from `useDesignLoader.ts` into `runtimeDesignApplier.ts`. Preserve current load/import behavior exactly. The service interface must be:

```ts
export interface RuntimeDesignApplier {
  replace(config: RuntimeDesignConfig, options: { resetHistory: boolean; historyLabel?: string }): Promise<void>
  capture(): RuntimeDesignConfig
}

export function createRuntimeDesignApplier(deps: RuntimeDesignApplierDependencies): RuntimeDesignApplier
```

For normal design load and `.wrt` import, call `replace(config, { resetHistory: true })`. For Agent apply, capture the current config, call `replace(candidate, { resetHistory: false, historyLabel: 'design-agent' })`, and on failure call `replace(previous, { resetHistory: false })` while history recording is suspended.

- [ ] **Step 4: Add digest conflict detection before mutation**

Immediately before apply, reserialize the live design and compare its digest with `sourceDigest`. Throw `DesignAgentConflictError` when they differ; do not clear the candidate or mutate the canvas.

- [ ] **Step 5: Run loader, history and transaction tests**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/runtimeDesignApplier.test.ts src/stores/historyStore.test.ts src/views/design/useDesignLoader.exclusionsRace.test.ts`

Expected: PASS and existing design-load race behavior remains intact.

- [ ] **Step 6: Commit the transactional application slice**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/design-agent/runtimeDesignApplier.ts src/features/design-agent/runtimeDesignApplier.test.ts src/features/design-agent/designAgentStore.ts src/views/design/useDesignLoader.ts
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "apply design agent changes transactionally"
```

## Task 7: Build preview-first Studio UI

**Files:**
- Create: `wristo-studio/src/features/design-agent/DesignAgentPanel.vue`
- Create: `wristo-studio/src/features/design-agent/DesignAgentPreview.vue`
- Create: `wristo-studio/src/features/design-agent/DesignCandidateCanvas.vue`
- Create: `wristo-studio/src/features/design-agent/designCandidateSvg.ts`
- Create: `wristo-studio/src/features/design-agent/designCandidateSvg.test.ts`
- Create: `wristo-studio/src/features/design-agent/DesignAgentPanel.test.ts`
- Modify: `wristo-studio/src/views/Design.vue`

- [ ] **Step 1: Write component workflow tests**

Cover: empty draft disables send; Enter sends and Shift+Enter inserts a newline; loading disables duplicate submit; successful generation shows grouped add/update/remove changes; candidate SVG renders without accessing `baseStore.canvas`; Discard keeps the live canvas unchanged; Apply calls the store once; conflict displays “Generate again from the latest design”; network failure preserves draft and enables Retry.

- [ ] **Step 2: Run the test and verify failure**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/DesignAgentPanel.test.ts`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the chat panel**

Use Element Plus inputs and buttons. Render example prompt buttons only before the first message. Give the transcript `role="log" aria-live="polite"`; label the textarea; keep focus in the draft after a request completes. Do not render raw model JSON or stack traces.

- [ ] **Step 4: Implement grouped preview controls**

`DesignAgentPreview.vue` receives `CompileResult`, groups `changes` by kind, and emits `apply` or `discard`. Apply is the primary action. Render compiler adjustments in a warning block. A remove row must include the model-provided reason.

`designCandidateSvg.ts` must project the seven advertised element types into inert SVG nodes using escaped text and numeric attributes only. `DesignCandidateCanvas.vue` renders the projection inside an SVG whose `viewBox` matches the target device; use a circular `clipPath` for round devices and a rectangular clip for square devices. It must not import Fabric, Pinia stores, `addElement`, or `runtimeDesignApplier`, so preview cannot mutate the live canvas.

```ts
export interface CandidateSvgNode {
  tag: 'text' | 'circle' | 'rect'
  attrs: Record<string, string | number>
  text?: string
}

export function projectCandidateSvg(config: RuntimeDesignConfig): CandidateSvgNode[] {
  return config.elements.flatMap((element) => projectSupportedElement(element))
}
```

- [ ] **Step 5: Integrate a Settings/Agent tab in `Design.vue`**

Keep `ElementSettings` mounted under the Settings tab and mount `DesignAgentPanel` under Agent. Preserve the existing right-panel resize behavior and width persistence. Do not move the panel into a modal because the user must see the canvas during preview.

```vue
<el-tabs v-model="rightPanelTab" class="right-panel-tabs">
  <el-tab-pane :label="t('designAgent.tabs.settings')" name="settings">
    <ElementSettings v-if="baseStore.canvas != null" />
  </el-tab-pane>
  <el-tab-pane :label="t('designAgent.tabs.agent')" name="agent">
    <DesignAgentPanel v-if="baseStore.canvas != null" />
  </el-tab-pane>
</el-tabs>
```

- [ ] **Step 6: Run the UI tests**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/DesignAgentPanel.test.ts src/views/design/useResizableEditorPanels.test.ts`

Expected: PASS and right-panel resizing remains unchanged.

- [ ] **Step 7: Commit the UI slice**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/features/design-agent/DesignAgentPanel.vue src/features/design-agent/DesignAgentPreview.vue src/features/design-agent/DesignCandidateCanvas.vue src/features/design-agent/designCandidateSvg.ts src/features/design-agent/designCandidateSvg.test.ts src/features/design-agent/DesignAgentPanel.test.ts src/views/Design.vue
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "add studio design agent panel"
```

## Task 8: Add copy, error mapping and service configuration

**Files:**
- Modify: `wristo-studio/src/i18n.ts`
- Create: `wristo-studio/src/features/design-agent/designAgentErrors.ts`
- Test: `wristo-studio/src/features/design-agent/designAgentErrors.test.ts`
- Modify: `wristo-api/src/main/resources/application.yml`
- Modify: `wristo-api/src/main/resources/application-prod.yml` only if that tracked file already contains the existing `openai` block.

- [ ] **Step 1: Write error-mapping tests**

Map timeout, unauthorized, rate-limited, service-unconfigured, invalid-patch, conflict and generic network failures to stable translation keys. Assert that raw upstream response bodies never appear in user-facing messages.

- [ ] **Step 2: Implement English and Chinese UI copy**

Add keys for tabs, welcome text, three example prompts, placeholder, Send, Retry, Apply changes, Discard, grouped change labels, compiler adjustments, conflict regeneration, and all mapped failures. End-user UI copy must be natural English in the English locale; internal comments may remain Chinese.

- [ ] **Step 3: Document API configuration without adding secrets**

```yaml
openai:
  design-agent:
    model: ${OPENAI_DESIGN_AGENT_MODEL:${OPENAI_MODEL:gpt-5-mini}}
    max-output-tokens: ${OPENAI_DESIGN_AGENT_MAX_OUTPUT_TOKENS:4000}
```

Reuse `OPENAI_API_KEY` and the existing base URL fallback. Do not add a key value to any tracked file.

- [ ] **Step 4: Run error and UI tests**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npx vitest run src/features/design-agent/designAgentErrors.test.ts src/features/design-agent/DesignAgentPanel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit copy and configuration separately by repository**

```bash
git -C /Users/mac/workspace/wristo/wristo-studio add src/i18n.ts src/features/design-agent/designAgentErrors.ts src/features/design-agent/designAgentErrors.test.ts
git -C /Users/mac/workspace/wristo/wristo-studio commit -m "add design agent user feedback"
git -C /Users/mac/workspace/wristo/wristo-api add src/main/resources/application.yml src/main/resources/application-prod.yml
git -C /Users/mac/workspace/wristo/wristo-api commit -m "configure studio design agent model"
```

If `application-prod.yml` is absent or does not contain tracked OpenAI configuration, omit it from both the edit and `git add` command.

## Task 9: Verify the complete local story

**Files:**
- Modify only files required to fix failures directly caused by Tasks 1–8.

- [ ] **Step 1: Run all focused Studio tests**

Run:

```bash
cd /Users/mac/workspace/wristo/wristo-studio
npx vitest run \
  src/features/design-agent/designAgentContract.test.ts \
  src/features/design-agent/designAgentContext.test.ts \
  src/features/design-agent/designPatchCompiler.test.ts \
  src/features/design-agent/designAgentStore.test.ts \
  src/features/design-agent/runtimeDesignApplier.test.ts \
  src/features/design-agent/designCandidateSvg.test.ts \
  src/features/design-agent/DesignAgentPanel.test.ts \
  src/features/design-agent/designAgentErrors.test.ts \
  src/stores/historyStore.test.ts \
  src/views/design/useResizableEditorPanels.test.ts
```

Expected: all listed test files PASS.

- [ ] **Step 2: Build Studio from its own repository**

Run: `cd /Users/mac/workspace/wristo/wristo-studio && npm run build`

Expected: TypeScript and Vite build complete successfully. Record unrelated baseline failures separately; do not widen the change into unrelated cleanup.

- [ ] **Step 3: Run focused API tests**

Run: `cd /Users/mac/workspace/wristo/wristo-api && mvn -Dtest='DesignPatchValidatorTest,DesignAgentServiceImplTest,DesignAgentDsnControllerTest' test`

Expected: PASS without real OpenAI network calls.

- [ ] **Step 4: Run the browser workflow against the local API when a development key is available**

Run `mvn spring-boot:run` in `wristo-api` with `OPENAI_API_KEY` supplied through the shell environment, then run `npm run dev` in `wristo-studio`. Open an existing editable design and submit: `Create a minimal fitness watch face with large centered time and steps below it.` Verify: the live design remains unchanged before Apply; the isolated candidate SVG and addition list appear; Apply updates the canvas; one Undo restores the prior design; changing the canvas before applying a second candidate produces a conflict; Save still uses the existing save path. If no development key is available, record this check as not run and rely only on the stubbed API and component tests; do not insert a key into source files.

- [ ] **Step 5: Check diffs in both repositories**

Run:

```bash
git -C /Users/mac/workspace/wristo/wristo-studio diff --check
git -C /Users/mac/workspace/wristo/wristo-studio status --short
git -C /Users/mac/workspace/wristo/wristo-api diff --check
git -C /Users/mac/workspace/wristo/wristo-api status --short
```

Expected: no whitespace errors; only intended Design Agent files plus pre-existing user changes appear.

- [ ] **Step 6: Record proof boundaries in the handoff**

State explicitly that local tests and builds do not prove production OpenAI credentials, rate limits, network behavior, generated Connect IQ output, Garmin Simulator, watch hardware, Build IQ, deployment, publishing, or install delivery.
