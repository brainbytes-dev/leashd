const MCP_CONFIG = `{
  "mcpServers": {
    "leash": {
      "command": "leashd",
      "args": ["serve", "--policy", "workspace.prod"],
      "env": {
        "LEASH_WORKSPACE": "your-workspace-id"
      }
    }
  }
}`;

export function Integration() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid max-w-[66rem] items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-4">
          <h2 className="font-sans text-3xl font-bold tracking-tight">
            Drop it into the stack you already run
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            leashd runs as a local MCP server. Add it to Claude Code or any MCP
            host and your agents get a policy-gated{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
              pay
            </code>{" "}
            tool, plus{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
              check_policy
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
              get_budget
            </code>
            . No SDK to wire up. No keys leave your machine.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <span className="font-mono text-xs text-muted-foreground">
              .mcp.json
            </span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-foreground">
            <code>{MCP_CONFIG}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
