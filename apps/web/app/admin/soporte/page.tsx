"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/shared/admin-shell";
import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ApiState, apiFetch } from "@/lib/api";
import {
  formatDateTime,
  formatStatusLabel,
  shortId,
  supportTicketStatusBadge
} from "@/lib/admin-ui";

type TicketStatus = "open" | "in_progress" | "resolved";

interface TicketDraft {
  status: TicketStatus;
  resolutionNote: string;
}

interface TicketItem {
  id: string;
  bookingId: string | null;
  customerId: string;
  providerId: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  resolutionNote: string | null;
  createdAt: string;
}

export default function AdminSupportPage() {
  const [state, setState] = useState<ApiState>("loading");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [items, setItems] = useState<TicketItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TicketDraft>>({});
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ApiState>("idle");
  const [actionMessage, setActionMessage] = useState("");

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        item.subject.toLowerCase().includes(normalized) ||
        item.description.toLowerCase().includes(normalized) ||
        item.id.toLowerCase().includes(normalized)
      );
    });
  }, [items, query, statusFilter]);

  async function load() {
    try {
      const data = await apiFetch<TicketItem[]>("/support/tickets/mine");
      setItems(data);
      setDrafts(
        Object.fromEntries(
          data.map((item) => [
            item.id,
            {
              status: item.status,
              resolutionNote: item.resolutionNote ?? ""
            }
          ])
        )
      );
      setState(data.length === 0 ? "empty" : "success");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updateDraft(ticketId: string, patch: Partial<TicketDraft>) {
    setDrafts((current) => {
      const previous = current[ticketId] ?? { status: "open", resolutionNote: "" };
      return {
        ...current,
        [ticketId]: {
          ...previous,
          ...patch
        }
      };
    });
  }

  async function submitTicketUpdate(ticket: TicketItem) {
    const draft = drafts[ticket.id];
    if (!draft) {
      return;
    }

    setSavingTicketId(ticket.id);
    setActionState("loading");
    setActionMessage("Actualizando ticket...");

    try {
      await apiFetch(`/support/tickets/${ticket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: draft.status,
          resolutionNote:
            draft.status === "resolved" && draft.resolutionNote.trim().length > 0
              ? draft.resolutionNote.trim()
              : undefined
        })
      });

      await load();
      setActionState("success");
      setActionMessage(`Ticket ${shortId(ticket.id)} actualizado a ${formatStatusLabel(draft.status)}.`);
    } catch {
      setActionState("error");
      setActionMessage(`No fue posible actualizar el ticket ${shortId(ticket.id)}.`);
    } finally {
      setSavingTicketId(null);
    }
  }

  return (
    <AdminShell
      title="Admin · soporte"
      description="Gestión transversal de tickets entre clientes y proveedores."
    >
      <div className="mt-6">
        <StatePanel state={state} />
      </div>

      {actionState !== "idle" ? (
        <div className="mt-4">
          <StatePanel state={actionState} description={actionMessage} />
        </div>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Filtros de tickets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por ID, asunto o descripción"
          />
          <Select
            value={statusFilter}
            onValueChange={(value: "all" | TicketStatus) => setStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm text-muted-foreground">
            Mostrando {filteredItems.length} de {items.length} tickets
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Bandeja de soporte</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Actualización</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const draft = drafts[item.id] ?? {
                  status: item.status,
                  resolutionNote: item.resolutionNote ?? ""
                };

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        id {shortId(item.id)} · booking {item.bookingId ? shortId(item.bookingId) : "N/A"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supportTicketStatusBadge(item.status)}>
                        {formatStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <p>{item.description}</p>
                      <p className="mt-1">
                        cliente {shortId(item.customerId)} · proveedor{" "}
                        {item.providerId ? shortId(item.providerId) : "N/A"} · {formatDateTime(item.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-2">
                        <Select
                          value={draft.status}
                          onValueChange={(value) =>
                            updateDraft(item.id, { status: value as TicketStatus })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                        {draft.status === "resolved" ? (
                          <Input
                            value={draft.resolutionNote}
                            placeholder="Nota de resolución (opcional)"
                            onChange={(event) =>
                              updateDraft(item.id, { resolutionNote: event.target.value })
                            }
                          />
                        ) : null}
                        <Button
                          size="sm"
                          disabled={savingTicketId === item.id}
                          onClick={() => {
                            void submitTicketUpdate(item);
                          }}
                        >
                          Guardar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
