import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { CurrencyService } from "@/services/currencyService";
import { ClientsService, Client, calculateAge } from "@/services/clientsService";
import { AnalyticsService, AnalyticsData, AnalyticsFilters, ClientSummary } from "@/services/analyticsService";
import { SoinsService, Soin } from "@/services/soinsService";
import { TypeBien } from "@/services/invoicesService";
import { Calendar, Users, Receipt, TrendingUp, UserSearch, BadgeDollarSign, Briefcase, Search } from "lucide-react";

const ALL_VALUE = "__all__";
const toISODate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "-");

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [raw, setRaw] = useState<AnalyticsData | null>(null);
  const [soinsList, setSoinsList] = useState<Soin[]>([]);
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  });
  const [selectedClientCIN, setSelectedClientCIN] = useState<string>("");
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [clientList, data, soins] = await Promise.all([
        ClientsService.getAll(),
        AnalyticsService.loadAll(),
        SoinsService.getAll(),
      ]);
      if (!mounted) return;
      setClients(clientList);
      setRaw(data);
      setSoinsList(soins);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!raw) return null;
    return AnalyticsService.filterData(raw, filters);
  }, [raw, filters]);

  const kpis = useMemo(() => {
    if (!filtered) return null;
    return AnalyticsService.computeKPIs(filtered);
  }, [filtered]);

  const clientSummary: ClientSummary | null = useMemo(() => {
    if (!filtered || !selectedClientCIN) return null;
    return AnalyticsService.computeClientSummary(filtered, selectedClientCIN);
  }, [filtered, selectedClientCIN]);

  const topServices = useMemo(() => (filtered ? AnalyticsService.topServices(filtered, 10) : []), [filtered]);

  const topServicesByCabinet = useMemo(() => {
    if (!filtered) return [] as { name: string; quantity: number; revenue: number; cabinet: string }[];
    const items = filtered.invoicesWithDetails.flatMap((f) => f.items);
    const map = new Map<string, { name: string; quantity: number; revenue: number; cabinet: string }>();
    items
      .filter((it) => it.type_bien === TypeBien.SOIN)
      .forEach((it) => {
        const name = it.nom_bien || `soin-${it.id_bien}`;
        const soin = soinsList.find((s) => s.id === it.id_bien);
        const cabinet = soin?.Cabinet || "";
        const key = `${name}__${cabinet}`;
        const prev = map.get(key) || { name, quantity: 0, revenue: 0, cabinet };
        map.set(key, {
          name,
          cabinet,
          quantity: prev.quantity + it.quantite,
          revenue: prev.revenue + it.prix_unitaire * it.quantite,
        });
      });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [filtered, soinsList]);
  const topProducts = useMemo(() => (filtered ? AnalyticsService.topProducts(filtered, 10) : []), [filtered]);
  const employeeProduction = useMemo(() => (filtered ? AnalyticsService.employeeProduction(filtered) : []), [filtered]);

  const filteredClients = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      c.nom.toLowerCase().includes(q) ||
      c.prenom.toLowerCase().includes(q) ||
      c.CIN.toLowerCase().includes(q) ||
      (c.email ? c.email.toLowerCase().includes(q) : false)
    );
  }, [clients, clientSearchQuery]);

  const handleClientSelect = (client: Client) => {
    setSelectedClientCIN(client.CIN);
    setIsClientSelectorOpen(false);
    setClientSearchQuery("");
  };

  const clientsInPeriod = useMemo(() => {
    if (!filtered) return [] as {
      CIN: string;
      prenom: string;
      nom: string;
      numero_telephone: string;
      visitsCount: number;
      lastVisit?: string | null;
    }[];

    const map = new Map<string, { CIN: string; prenom: string; nom: string; numero_telephone: string; visitsCount: number; lastVisit?: string | null }>();

    filtered.appointments.forEach((a) => {
      const existing = map.get(a.CIN);
      if (existing) {
        existing.visitsCount += 1;
        if (!existing.lastVisit || new Date(a.date_rendez_vous).getTime() > new Date(existing.lastVisit).getTime()) {
          existing.lastVisit = a.date_rendez_vous;
        }
        map.set(a.CIN, existing);
      } else {
        const client = clients.find((c) => c.CIN === a.CIN);
        map.set(a.CIN, {
          CIN: a.CIN,
          prenom: client?.prenom || "",
          nom: client?.nom || "",
          numero_telephone: client?.numero_telephone || "",
          visitsCount: 1,
          lastVisit: a.date_rendez_vous,
        });
      }
    });

    // Include clients who had invoices but no appointments in the period
    filtered.invoices.forEach((f) => {
      if (!map.has(f.CIN)) {
        const client = clients.find((c) => c.CIN === f.CIN);
        map.set(f.CIN, {
          CIN: f.CIN,
          prenom: client?.prenom || "",
          nom: client?.nom || "",
          numero_telephone: client?.numero_telephone || "",
          visitsCount: 0,
          lastVisit: null,
        });
      }
    });

    return Array.from(map.values());
  }, [filtered, clients]);

  const employeeOptions = useMemo(() => {
    const set = new Set<string>();
    if (raw) {
      raw.invoices.forEach((f) => set.add(f.Cree_par));
      raw.appointments.forEach((a) => set.add(a.Cree_par));
    }
    return Array.from(set);
  }, [raw]);

  const handleDateChange = (key: "startDate" | "endDate", value: string) => {
    const iso = new Date(value + "T00:00:00").toISOString();
    setFilters((prev) => ({ ...prev, [key]: key === "endDate" ? new Date(new Date(iso).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString() : iso }));
  };

  const resetFilters = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    setFilters({ startDate: start.toISOString(), endDate: end.toISOString(), clientCIN: undefined, employeeCIN: undefined });
    setSelectedClientCIN("");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Rapports et Analytique</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres avancés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2 md:col-span-1">
                <Label>Période - Début</Label>
                <Input
                  type="date"
                  value={filters.startDate ? toISODate(new Date(filters.startDate)) : ""}
                  onChange={(e) => handleDateChange("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Période - Fin</Label>
                <Input
                  type="date"
                  value={filters.endDate ? toISODate(new Date(filters.endDate)) : ""}
                  onChange={(e) => handleDateChange("endDate", e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Employé</Label>
                <Select
                  value={filters.employeeCIN ?? ALL_VALUE}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, employeeCIN: v === ALL_VALUE ? undefined : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Tous</SelectItem>
                    {employeeOptions.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Patient</Label>
                <Select
                  value={filters.clientCIN ?? ALL_VALUE}
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, clientCIN: v === ALL_VALUE ? undefined : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Tous</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.CIN} value={c.CIN}>
                        {c.prenom} {c.nom} • {c.CIN}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-1 flex items-end">
                <Button variant="outline" className="w-full" onClick={resetFilters}>
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Clients</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{loading || !kpis ? "-" : kpis.periodClientsCount}</div>
              <div className="text-sm text-muted-foreground">Clients uniques dans la période</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4" /> Rendez-vous</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{loading || !kpis ? "-" : kpis.periodAppointmentsCount}</div>
              <div className="text-sm text-muted-foreground">Nombre de visites</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Chiffre d'affaires</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{loading || !kpis ? "-" : CurrencyService.formatForDisplay(kpis.periodRevenueTotal)}</div>
              <div className="text-sm text-muted-foreground">Total facturé</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-4 w-4" /> Payé</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{loading || !kpis ? "-" : CurrencyService.formatForDisplay(kpis.periodPaidRevenueTotal)}</div>
              <div className="text-sm text-muted-foreground">Total encaissé</div>
            </CardContent>
          </Card>
        </div>

        {/* Lists: Clients & Appointments in period */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Clients dans la période</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto border border-border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Client</th>
                      <th className="text-left p-2">CIN</th>
                      <th className="text-left p-2">Téléphone</th>
                      <th className="text-right p-2">Visites</th>
                      <th className="text-right p-2">Dernière visite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading || !filtered ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center">-</td>
                      </tr>
                    ) : clientsInPeriod.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-muted-foreground">Aucun client</td>
                      </tr>
                    ) : (
                      clientsInPeriod.map((c) => (
                        <tr key={c.CIN} className="border-t border-border">
                          <td className="p-2">{c.prenom} {c.nom}</td>
                          <td className="p-2">{c.CIN}</td>
                          <td className="p-2">{c.numero_telephone}</td>
                          <td className="p-2 text-right">{c.visitsCount}</td>
                          <td className="p-2 text-right">{formatDate(c.lastVisit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4" /> Rendez-vous dans la période</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto border border-border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Heure</th>
                      <th className="text-left p-2">Patient</th>
                      <th className="text-left p-2">Sujet</th>
                      <th className="text-left p-2">Statut</th>
                      <th className="text-left p-2">Praticien</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading || !filtered ? (
                      <tr>
                        <td colSpan={6} className="p-3 text-center">-</td>
                      </tr>
                    ) : filtered.appointments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-3 text-center text-muted-foreground">Aucun rendez-vous</td>
                      </tr>
                    ) : (
                      filtered.appointments.map((a) => {
                        const dt = new Date(a.date_rendez_vous);
                        const dateStr = dt.toLocaleDateString("fr-FR");
                        const timeStr = dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });
                        const client = clients.find((c) => c.CIN === a.CIN);
                        const patientName = a.patient_nom || (client ? `${client.prenom} ${client.nom}` : a.CIN);
                        return (
                          <tr key={a.id} className="border-t border-border">
                            <td className="p-2">{dateStr}</td>
                            <td className="p-2">{timeStr}</td>
                            <td className="p-2">{patientName}</td>
                            <td className="p-2">{a.sujet}</td>
                            <td className="p-2">{a.status}</td>
                            <td className="p-2">{a.Cree_par}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Client details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserSearch className="h-5 w-5" /> Détails par patient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Sélectionner un patient</Label>
                <Popover open={isClientSelectorOpen} onOpenChange={setIsClientSelectorOpen} modal={true as any}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={isClientSelectorOpen} className="w-full justify-between">
                      {selectedClientCIN ? (
                        <div className="flex items-center gap-2">
                          <span>
                            {(() => {
                              const c = clients.find((cl) => cl.CIN === selectedClientCIN);
                              return c ? `${c.prenom} ${c.nom}` : selectedClientCIN;
                            })()}
                          </span>
                          <Badge variant="outline" className="text-xs">{selectedClientCIN}</Badge>
                        </div>
                      ) : (
                        "Rechercher et sélectionner un patient..."
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0 z-[60] shadow-lg border-2" sideOffset={5} align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher par nom, prénom, CIN, email..." value={clientSearchQuery} onValueChange={setClientSearchQuery} />
                      <CommandList>
                        <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                        <CommandGroup>
                          {filteredClients.map((c) => (
                            <CommandItem key={c.id} value={`${c.prenom} ${c.nom} ${c.CIN} ${c.email || ""}`} onSelect={() => handleClientSelect(c)} className="flex items-center justify-between p-3">
                              <div className="flex flex-col">
                                <div className="font-medium">{c.prenom} {c.nom}</div>
                                <div className="text-sm text-muted-foreground">{c.CIN}{c.date_naissance ? ` • Âge: ${calculateAge(c.date_naissance)} ans` : ""}{c.email ? ` • ${c.email}` : ""}</div>
                              </div>
                              {c.groupe_sanguin ? <Badge variant="outline">{c.groupe_sanguin}</Badge> : null}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedClientCIN && (() => {
                  const c = clients.find((cl) => cl.CIN === selectedClientCIN);
                  if (!c) return null;
                  return (
                    <div className="p-3 bg-muted/50 rounded-lg mt-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{c.prenom} {c.nom}</div>
                          <div className="text-sm text-muted-foreground">CIN: {c.CIN}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.groupe_sanguin ? <Badge variant="outline">{c.groupe_sanguin}</Badge> : null}
                          {c.date_naissance ? (
                            <span className="text-sm text-muted-foreground">Âge: {calculateAge(c.date_naissance)} ans</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {clientSummary ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Visites</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-semibold">{clientSummary.visitsCount}</div>
                      <div className="text-sm text-muted-foreground">Dernière: {formatDate(clientSummary.lastVisit)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Total facturé</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-semibold">{CurrencyService.formatForDisplay(clientSummary.totalInvoiced)}</div>
                      <div className="text-sm text-muted-foreground">Payé: {CurrencyService.formatForDisplay(clientSummary.totalPaid)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Dernier paiement</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-semibold">{formatDate(clientSummary.lastPayment)}</div>
                      <div className="text-sm text-muted-foreground">—</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Services consommés</h3>
                    <div className="border border-border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2">Service</th>
                            <th className="text-right p-2">Qté</th>
                            <th className="text-right p-2">Revenu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientSummary.services.map((s) => (
                            <tr key={s.name} className="border-t border-border">
                              <td className="p-2">{s.name}</td>
                              <td className="p-2 text-right">{s.quantity}</td>
                              <td className="p-2 text-right">{CurrencyService.formatForDisplay(s.revenue)}</td>
                            </tr>
                          ))}
                          {clientSummary.services.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-3 text-center text-muted-foreground">Aucun service</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Produits achetés</h3>
                    <div className="border border-border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2">Produit</th>
                            <th className="text-right p-2">Qté</th>
                            <th className="text-right p-2">Revenu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientSummary.products.map((p) => (
                            <tr key={p.name} className="border-t border-border">
                              <td className="p-2">{p.name}</td>
                              <td className="p-2 text-right">{p.quantity}</td>
                              <td className="p-2 text-right">{CurrencyService.formatForDisplay(p.revenue)}</td>
                            </tr>
                          ))}
                          {clientSummary.products.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-3 text-center text-muted-foreground">Aucun produit</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sélectionnez un patient pour voir les détails.</div>
            )}
          </CardContent>
        </Card>

        {/* Top services/products & Employee production */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Services les plus demandés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Service</th>
                      <th className="text-left p-2">Cabinet</th>
                      <th className="text-right p-2">Qté</th>
                      <th className="text-right p-2">Revenu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topServicesByCabinet.map((s) => (
                      <tr key={`${s.name}-${s.cabinet}`} className="border-t border-border">
                        <td className="p-2">{s.name}</td>
                        <td className="p-2">{s.cabinet}</td>
                        <td className="p-2 text-right">{s.quantity}</td>
                        <td className="p-2 text-right">{CurrencyService.formatForDisplay(s.revenue)}</td>
                      </tr>
                    ))}
                    {topServicesByCabinet.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-muted-foreground">Aucune donnée</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BadgeDollarSign className="h-5 w-5" /> Produits les plus vendus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Produit</th>
                      <th className="text-right p-2">Qté</th>
                      <th className="text-right p-2">Revenu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p) => (
                      <tr key={p.name} className="border-t border-border">
                        <td className="p-2">{p.name}</td>
                        <td className="p-2 text-right">{p.quantity}</td>
                        <td className="p-2 text-right">{CurrencyService.formatForDisplay(p.revenue)}</td>
                      </tr>
                    ))}
                    {topProducts.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-muted-foreground">Aucune donnée</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Production des employés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Employé</th>
                      <th className="text-right p-2">Factures</th>
                      <th className="text-right p-2">Revenu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeProduction.map((e) => (
                      <tr key={e.employee} className="border-t border-border">
                        <td className="p-2">{e.employee}</td>
                        <td className="p-2 text-right">{e.invoicesCount}</td>
                        <td className="p-2 text-right">{CurrencyService.formatForDisplay(e.revenue)}</td>
                      </tr>
                    ))}
                    {employeeProduction.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-muted-foreground">Aucune donnée</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
