# Blender MCP per il portfolio

Questa integrazione collega Codex a Blender e salva i modelli GLB direttamente
in `public/models`, pronti per essere caricati da Three.js.

## 1. Installa l'add-on

1. Usa il file già pronto
   `dist/portfolio_mcp_bridge.zip`.
2. In Blender apri **Edit > Preferences > Get Extensions**.
3. Dal menu in alto a destra premi **Install from Disk**, seleziona lo ZIP e
   conferma il permesso di rete locale, quindi abilita
   **Portfolio MCP Bridge**.
4. Nella vista 3D apri la sidebar con `N`: la scheda **MCP** deve mostrare
   “Server attivo su localhost”.

L'add-on ascolta solo su `127.0.0.1:9876`. Il token predefinito è
`blender-local`; puoi cambiarlo nelle preferenze dell'add-on.

## 2. Collega Codex

Il progetto contiene `.codex/config.toml`. Dopo aver riavviato Codex, apri
questo progetto e verifica il server dalla schermata **MCP servers** oppure
scrivi `/mcp`.

In alternativa:

```powershell
codex mcp add portfolio_blender `
  --env BLENDER_PROJECT_ROOT=C:\percorso\del\portfolio `
  -- node C:\percorso\del\portfolio\tools\blender-mcp\server.mjs
```

## 3. Prima prova

Apri Blender, poi in una nuova attività Codex scrivi:

> Controlla la connessione con Blender. Leggi la scena, crea un cubo chiamato
> MCP_Test, assegnagli un materiale rosso opaco ed esporta test-cube.glb.

Il risultato viene salvato in `public/models/test-cube.glb`.

## Prompt utile per un asset web

> Crea in Blender un [oggetto] in stile [stile]. Lavora in metri, mantieni
> meno di [numero] triangoli, usa materiali PBR semplici, applica le
> trasformazioni, imposta nomi descrittivi e salva il file Blender. Esporta
> anche `nome-modello.glb` in public/models. Prima di esportare controlla la
> scena e riferisci il numero di triangoli.

## Sicurezza

`blender_execute_python` può modificare qualunque elemento della scena e
accedere ai file con i permessi di Blender. La configurazione lo mantiene
soggetto ad approvazione. Salva una copia del `.blend` prima di operazioni
ampie.
