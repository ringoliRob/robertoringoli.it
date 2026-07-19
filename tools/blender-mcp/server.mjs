#!/usr/bin/env node

import net from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const BLENDER_HOST = process.env.BLENDER_MCP_HOST ?? "127.0.0.1";
const BLENDER_PORT = Number(process.env.BLENDER_MCP_PORT ?? "9876");
const BLENDER_TOKEN = process.env.BLENDER_MCP_TOKEN ?? "blender-local";
const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(
  process.env.BLENDER_PROJECT_ROOT ?? path.join(SERVER_DIR, "..", ".."),
);
const DEFAULT_EXPORT_DIR = path.join(PROJECT_ROOT, "public", "models");

const tools = [
  {
    name: "blender_status",
    description:
      "Controlla se Blender e l'add-on Portfolio MCP Bridge sono raggiungibili.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: "blender_get_scene",
    description:
      "Legge oggetti, trasformazioni, materiali, selezione e file della scena Blender corrente.",
    inputSchema: {
      type: "object",
      properties: {
        include_hidden: {
          type: "boolean",
          default: false,
          description: "Include gli oggetti nascosti.",
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: "blender_create_primitive",
    description:
      "Crea una primitiva Blender. Usa nomi descrittivi e dimensioni in metri.",
    inputSchema: {
      type: "object",
      required: ["type", "name"],
      properties: {
        type: {
          type: "string",
          enum: ["cube", "sphere", "cylinder", "cone", "plane", "torus"],
        },
        name: { type: "string" },
        location: { $ref: "#/$defs/vector3" },
        rotation: {
          $ref: "#/$defs/vector3",
          description: "Rotazione Euler in gradi.",
        },
        scale: { $ref: "#/$defs/vector3" },
      },
      $defs: {
        vector3: {
          type: "array",
          items: { type: "number" },
          minItems: 3,
          maxItems: 3,
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "blender_set_material",
    description:
      "Crea o aggiorna un materiale Principled BSDF e lo assegna a un oggetto.",
    inputSchema: {
      type: "object",
      required: ["object_name", "material_name", "base_color"],
      properties: {
        object_name: { type: "string" },
        material_name: { type: "string" },
        base_color: {
          type: "array",
          items: { type: "number", minimum: 0, maximum: 1 },
          minItems: 3,
          maxItems: 4,
          description: "Colore RGB o RGBA con valori 0–1.",
        },
        metallic: { type: "number", minimum: 0, maximum: 1, default: 0 },
        roughness: { type: "number", minimum: 0, maximum: 1, default: 0.5 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "blender_delete_objects",
    description: "Elimina dalla scena gli oggetti indicati per nome.",
    inputSchema: {
      type: "object",
      required: ["names"],
      properties: {
        names: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  {
    name: "blender_execute_python",
    description:
      "Esegue codice Python con accesso a bpy nella scena corrente. Usalo per modellazione avanzata non coperta dagli altri strumenti. Imposta una variabile _result per restituire un risultato.",
    inputSchema: {
      type: "object",
      required: ["code"],
      properties: { code: { type: "string" } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  {
    name: "blender_export_glb",
    description:
      "Esporta la scena o gli oggetti selezionati come GLB compatibile con Three.js. I percorsi relativi vengono salvati in public/models.",
    inputSchema: {
      type: "object",
      required: ["filename"],
      properties: {
        filename: {
          type: "string",
          pattern: "^[^\\\\/:*?\"<>|]+\\.glb$",
          description: "Solo nome file, per esempio desk.glb.",
        },
        selected_only: { type: "boolean", default: false },
        apply_modifiers: { type: "boolean", default: true },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "blender_render_preview",
    description:
      "Esegue un render PNG con camera e impostazioni correnti. I percorsi relativi vengono salvati in tmp/blender-previews.",
    inputSchema: {
      type: "object",
      required: ["filename"],
      properties: {
        filename: {
          type: "string",
          pattern: "^[^\\\\/:*?\"<>|]+\\.png$",
        },
        resolution_x: { type: "integer", minimum: 64, maximum: 4096, default: 800 },
        resolution_y: { type: "integer", minimum: 64, maximum: 4096, default: 800 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
];

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function textResult(value, isError = false) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
    isError,
  };
}

function callBlender(method, params = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: BLENDER_HOST,
      port: BLENDER_PORT,
    });
    let buffer = "";
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Blender non ha risposto entro 120 secondi."));
    }, 120_000);

    socket.setEncoding("utf8");
    socket.on("connect", () => {
      socket.write(
        `${JSON.stringify({ token: BLENDER_TOKEN, method, params })}\n`,
      );
    });
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline === -1) return;
      clearTimeout(timeout);
      socket.end();
      try {
        const response = JSON.parse(buffer.slice(0, newline));
        if (!response.ok) {
          reject(new Error(response.error ?? "Errore sconosciuto da Blender."));
          return;
        }
        resolve(response.result);
      } catch (error) {
        reject(new Error(`Risposta Blender non valida: ${error.message}`));
      }
    });
    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `Blender non raggiungibile su ${BLENDER_HOST}:${BLENDER_PORT}. ` +
            `Apri Blender e abilita l'add-on Portfolio MCP Bridge. Dettaglio: ${error.message}`,
        ),
      );
    });
  });
}

async function runTool(name, args) {
  switch (name) {
    case "blender_status":
      return callBlender("status");
    case "blender_get_scene":
      return callBlender("get_scene", args);
    case "blender_create_primitive":
      return callBlender("create_primitive", args);
    case "blender_set_material":
      return callBlender("set_material", args);
    case "blender_delete_objects":
      return callBlender("delete_objects", args);
    case "blender_execute_python":
      return callBlender("execute_python", args);
    case "blender_export_glb":
      return callBlender("export_glb", {
        ...args,
        output_dir: DEFAULT_EXPORT_DIR,
      });
    case "blender_render_preview":
      return callBlender("render_preview", {
        ...args,
        output_dir: path.join(PROJECT_ROOT, "tmp", "blender-previews"),
      });
    default:
      throw new Error(`Strumento sconosciuto: ${name}`);
  }
}

async function handle(message) {
  const { id, method, params = {} } = message;

  if (method === "notifications/initialized") return;
  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params.protocolVersion ?? "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "portfolio-blender", version: "0.1.0" },
        instructions:
          "Controlla Blender per creare asset web. Prima usa blender_status e blender_get_scene. Preferisci tool specifici; usa blender_execute_python solo per modellazione avanzata. Lavora in metri, assegna nomi descrittivi, mantieni una topologia leggera e termina gli asset con blender_export_glb.",
      },
    });
    return;
  }
  if (method === "ping") {
    send({ jsonrpc: "2.0", id, result: {} });
    return;
  }
  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools } });
    return;
  }
  if (method === "tools/call") {
    try {
      const result = await runTool(params.name, params.arguments ?? {});
      send({ jsonrpc: "2.0", id, result: textResult(result) });
    } catch (error) {
      send({
        jsonrpc: "2.0",
        id,
        result: textResult(error instanceof Error ? error.message : String(error), true),
      });
    }
    return;
  }
  if (id !== undefined) {
    send({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Metodo non supportato: ${method}` },
    });
  }
}

let stdinBuffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  stdinBuffer += chunk;
  let newline;
  while ((newline = stdinBuffer.indexOf("\n")) !== -1) {
    const line = stdinBuffer.slice(0, newline).trim();
    stdinBuffer = stdinBuffer.slice(newline + 1);
    if (!line) continue;
    try {
      void handle(JSON.parse(line));
    } catch (error) {
      send({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: `JSON non valido: ${error.message}` },
      });
    }
  }
});
