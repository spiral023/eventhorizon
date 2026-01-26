import { useState, useEffect } from "react";
import { getBirthdays } from "@/services/apiClient";
import type { BirthdayPageResponse, BirthdayUser } from "@/types/domain";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageLoading } from "@/components/shared/PageLoading";
import { PageError } from "@/components/shared/PageError";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Cake, Calendar, User, Users, Search, ArrowUpDown, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Cell } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function BirthdaysPage() {
  const [data, setData] = useState<BirthdayPageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof BirthdayUser; direction: 'asc' | 'desc' }>({ key: 'daysUntil', direction: 'asc' });

  useEffect(() => {
    loadBirthdays();
  }, []);

  const loadBirthdays = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getBirthdays();
      if (result.error) {
        throw new Error(result.error.message);
      }
      if (result.data) {
        setData(result.data);
      }
    } catch (err) {
      setError("Geburtstage konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: keyof BirthdayUser) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Geburtstage"
          description="Die nächsten Geburtstage in deinen Räumen."
        />
        <PageLoading />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Geburtstage"
          description="Die nächsten Geburtstage in deinen Räumen."
        />
        <PageError message={error || "Keine Daten gefunden"} onRetry={loadBirthdays} />
      </div>
    );
  }

  const filteredUsers = data.all.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };
  
  const formatNextBirthday = (dateString: string | Date) => {
      return new Date(dateString).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          weekday: "long"
      });
  }

  const getDaysLabel = (days: number) => {
    if (days === 0) return "Heute";
    if (days === 1) return "Morgen";
    return `In ${days} Tagen`;
  };

  const nextBirthdayUser = data.upcoming.length > 0 ? data.upcoming[0] : null;
  const birthdaysNext30Days = data.all.filter(u => u.daysUntil <= 30).length;

  // Calculate birthdays per month
  const birthdaysPerMonth = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    label: new Date(0, i).toLocaleString('de-DE', { month: 'short' }),
    fullLabel: new Date(0, i).toLocaleString('de-DE', { month: 'long' }),
    count: 0
  }));

  data.all.forEach(user => {
    if (user.birthday) {
      const month = new Date(user.birthday).getMonth();
      if (birthdaysPerMonth[month]) {
        birthdaysPerMonth[month].count++;
      }
    }
  });

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border text-popover-foreground px-3 py-2 rounded-lg shadow-lg text-xs">
          <p className="font-semibold mb-1">{payload[0].payload.fullLabel}</p>
          <p>{payload[0].value} {payload[0].value === 1 ? 'Geburtstag' : 'Geburtstage'}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Geburtstage"
        description="Behalte den Überblick über die Geburtstage deiner Teamkollegen."
      />

      {/* KPI & Summary Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Next Birthday (Hero) */}
        <Card className="rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between h-full">
          {nextBirthdayUser ? (
            <>
              <div className={cn("absolute top-0 left-0 w-1.5 h-full", 
                 nextBirthdayUser.daysUntil === 0 ? "bg-red-500" : 
                 nextBirthdayUser.daysUntil === 1 ? "bg-orange-500" : "bg-primary"
              )} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Cake className="h-4 w-4" />
                    Nächster Geburtstag
                  </CardTitle>
                  <Badge variant={nextBirthdayUser.daysUntil <= 1 ? "destructive" : "secondary"} className="rounded-md">
                    {getDaysLabel(nextBirthdayUser.daysUntil)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="flex items-center gap-4 mt-2">
                  <Avatar className="h-16 w-16 border-2 border-background shadow-sm ring-2 ring-border/50">
                    <AvatarImage src={nextBirthdayUser.avatarUrl || undefined} />
                    <AvatarFallback className="text-lg">{nextBirthdayUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-2xl font-bold tracking-tight">
                      {nextBirthdayUser.name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium text-foreground">{formatNextBirthday(nextBirthdayUser.nextBirthday)}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <span>wird {nextBirthdayUser.ageTurning}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
              <Cake className="h-10 w-10 mb-2 opacity-20" />
              <p>Keine anstehenden Geburtstage</p>
            </CardContent>
          )}
        </Card>

        {/* Card 2: Birthdays by Month Chart */}
        <Card className="rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm flex flex-col h-full">
          <CardHeader className="pb-2 min-h-[60px]">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Geburtstage nach Monat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[100px] p-0 pb-2">
            {data.all.length > 0 ? (
              <div className="h-full w-full px-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={birthdaysPerMonth} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      interval={0}
                      dy={5}
                    />
                    <Tooltip 
                      content={<CustomTooltip />} 
                      cursor={{ fill: 'hsl(var(--muted)/0.2)', radius: 4 }} 
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {birthdaysPerMonth.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted)/0.3)'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="text-xs">Keine Daten verfügbar</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Data Completeness */}
        <Card className="rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm flex flex-col h-full">
          <CardHeader className="pb-2 min-h-[60px]">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Datenbestand
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end pb-4">
            <div className="flex items-end gap-2 mb-2">
              <div className="text-3xl font-bold">{Math.round(data.stats.rate)}%</div>
              <div className="text-sm text-muted-foreground mb-1.5">eingetragen</div>
            </div>
            <Progress value={data.stats.rate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {data.stats.usersWithBirthday} von {data.stats.totalUsers} Nutzern haben ihren Geburtstag angegeben.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="rounded-2xl border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-b border-border/50">
            <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="bg-primary/10 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Alle Geburtstage</h3>
            </div>
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Suchen..." 
                    className="pl-9 h-10 rounded-xl bg-background/50 border-border/50 focus:bg-background transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <div className="overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/20 hover:bg-muted/20">
                    <TableRow className="border-border/50">
                        <TableHead className="w-[40%] sm:w-[30%] pl-6 h-12">Name</TableHead>
                        <TableHead className="hidden sm:table-cell w-[20%] h-12 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('age')}>
                            <div className="flex items-center gap-1">
                                Alter
                                <ArrowUpDown className="h-3 w-3" />
                            </div>
                        </TableHead>
                        <TableHead className="hidden md:table-cell w-[25%] h-12 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('birthday')}>
                            <div className="flex items-center gap-1">
                                Geburtstag
                                <ArrowUpDown className="h-3 w-3" />
                            </div>
                        </TableHead>
                        <TableHead className="w-[60%] sm:w-[25%] text-right pr-6 h-12 cursor-pointer hover:text-primary transition-colors group" onClick={() => handleSort('daysUntil')}>
                            <div className="flex items-center justify-end gap-1">
                                Nächster Geburtstag
                                <ArrowUpDown className={cn("h-3 w-3 transition-opacity", sortConfig.key === 'daysUntil' ? "opacity-100" : "opacity-0 group-hover:opacity-50")} />
                            </div>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedUsers.length > 0 ? (
                        sortedUsers.map((user) => (
                            <TableRow key={user.id} className="border-border/50 hover:bg-muted/30 transition-colors group">
                                <TableCell className="pl-6 py-3 font-medium">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border border-border/50">
                                            <AvatarImage src={user.avatarUrl || undefined} />
                                            <AvatarFallback className="bg-background text-xs">{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-foreground group-hover:text-primary transition-colors">{user.name}</span>
                                            {/* Show Age on mobile only */}
                                            <span className="sm:hidden text-xs text-muted-foreground">{user.age} Jahre</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell py-3 text-muted-foreground">
                                    {user.age}
                                </TableCell>
                                <TableCell className="hidden md:table-cell py-3 text-muted-foreground">
                                    {formatDate(user.birthday)}
                                </TableCell>
                                <TableCell className="text-right pr-6 py-3">
                                    <div className="flex flex-col items-end gap-0.5">
                                        <Badge 
                                            variant={user.daysUntil <= 1 ? "destructive" : "secondary"} 
                                            className={cn("font-normal px-2 py-0.5 text-xs rounded-md", user.daysUntil > 30 && "bg-muted text-muted-foreground hover:bg-muted/80")}
                                        >
                                            {getDaysLabel(user.daysUntil)}
                                        </Badge>
                                        <span className="text-[11px] text-muted-foreground">
                                            {formatNextBirthday(user.nextBirthday)}
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Search className="h-8 w-8 opacity-20" />
                                    <p>Keine Ergebnisse gefunden.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </Card>
    </div>
  );
}