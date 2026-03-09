import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { pageVisitService, PageVisitSummary, PageVisitStats, DailyStats, TopUser, PageVisitDetail } from '@/services/pageVisitService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Search, Trash2, Eye, Users, Globe, BarChart3, RefreshCw, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardTitleCard from '@/components/dashboard/DashboardTitleCard';

const AdminContadores: React.FC = () => {
  const { isSupport } = useAuth();
  const [summary, setSummary] = useState<PageVisitSummary[]>([]);
  const [stats, setStats] = useState<PageVisitStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  // Detalhes de uma página
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pageDetails, setPageDetails] = useState<PageVisitDetail[]>([]);
  const [detailsPagination, setDetailsPagination] = useState<any>(null);
  const [detailsPage, setDetailsPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, dailyData, topData] = await Promise.all([
        pageVisitService.getSummary(page, 50, search),
        pageVisitService.getDailyStats(30),
        pageVisitService.getTopUsers(10)
      ]);

      setSummary(summaryData.summary);
      setStats(summaryData.stats);
      setPagination(summaryData.pagination);
      setDailyStats(dailyData.daily);
      setTopUsers(topData.users);
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
      toast.error('Erro ao carregar dados dos contadores');
    } finally {
      setLoading(false);
    }
  };

  const loadPageDetails = async (pagePath: string, pg = 1) => {
    try {
      const data = await pageVisitService.getPageDetails(pagePath, pg, 30);
      setPageDetails(data.visits);
      setDetailsPagination(data.pagination);
      setDetailsPage(pg);
      setSelectedPage(pagePath);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
    }
  };

  const handleDeletePage = async (pagePath: string) => {
    if (!confirm(`Deseja remover todos os registros de visita para "${pagePath}"?`)) return;
    try {
      await pageVisitService.deleteByPage(pagePath);
      toast.success('Registros removidos com sucesso');
      loadData();
    } catch (error) {
      toast.error('Erro ao remover registros');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Deseja remover registros com mais de 90 dias?')) return;
    try {
      const result = await pageVisitService.cleanup(90);
      toast.success(result.message);
      loadData();
    } catch (error) {
      toast.error('Erro ao limpar registros');
    }
  };

  useEffect(() => {
    loadData();
  }, [page, search]);

  if (!isSupport) {
    return <Navigate to="/dashboard" replace />;
  }

  const chartData = dailyStats.map(d => ({
    ...d,
    date: format(new Date(d.date), 'dd/MM', { locale: ptBR })
  })).reverse();

  // Tela de detalhes de uma página específica
  if (selectedPage) {
    return (
      <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
        <DashboardTitleCard
          title={`Detalhes: ${selectedPage}`}
          icon={<Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
          backTo="/dashboard/admin/contadores"
          right={
            <Button variant="outline" size="sm" onClick={() => setSelectedPage(null)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          }
        />

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Navegador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageDetails.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="text-sm">
                      {format(new Date(visit.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={visit.visitor_type === 'usuario' ? 'default' : 'secondary'}>
                        {visit.visitor_type === 'usuario' ? 'Usuário' : 'Visitante'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {visit.visitor_type === 'usuario' 
                        ? <span>{visit.full_name || visit.login} <span className="text-muted-foreground">(ID: {visit.user_id})</span></span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{visit.ip_address || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {visit.user_agent ? visit.user_agent.substring(0, 50) + '...' : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {pageDetails.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {detailsPagination && detailsPagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={detailsPage <= 1} onClick={() => loadPageDetails(selectedPage, detailsPage - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground py-2">Página {detailsPage} de {detailsPagination.pages}</span>
            <Button variant="outline" size="sm" disabled={detailsPage >= detailsPagination.pages} onClick={() => loadPageDetails(selectedPage, detailsPage + 1)}>Próxima</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
      <DashboardTitleCard
        title="Contadores de Visitas"
        icon={<BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />}
        right={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleCleanup}>
              <Trash2 className="w-4 h-4 mr-1" /> Limpar +90 dias
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">{Number(stats.total_all_visits).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total de Visitas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">{Number(stats.total_pages).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Páginas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-foreground">{Number(stats.total_unique_users).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Usuários Únicos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-accent" />
              <div className="text-2xl font-bold text-foreground">{Number(stats.total_user_visits).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Visitas de Usuários</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Globe className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold text-foreground">{Number(stats.total_visitors).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Visitantes Anônimos</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pages" className="w-full">
        <TabsList>
          <TabsTrigger value="pages">Páginas</TabsTrigger>
          <TabsTrigger value="chart">Gráfico Diário</TabsTrigger>
          <TabsTrigger value="users">Top Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por caminho da página..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Página</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Usuários</TableHead>
                    <TableHead className="text-center">Visitantes</TableHead>
                    <TableHead className="text-center">Únicos</TableHead>
                    <TableHead>Última Visita</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : summary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : summary.map((item) => (
                    <TableRow key={item.page_path}>
                      <TableCell className="font-mono text-sm max-w-[300px] truncate">{item.page_path}</TableCell>
                      <TableCell className="text-center font-bold">{Number(item.total_visits).toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default">{item.user_count}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{item.visitor_count}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{item.unique_users}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.last_visit ? format(new Date(item.last_visit), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => loadPageDetails(item.page_path)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePage(item.page_path)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground py-2">Página {page} de {pagination.pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Visitas nos Últimos 30 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="user_visits" name="Usuários" fill="hsl(var(--primary))" />
                    <Bar dataKey="visitor_visits" name="Visitantes" fill="hsl(var(--muted-foreground))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados para exibir</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Top Usuários por Visitas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Visitas</TableHead>
                    <TableHead className="text-center">Páginas</TableHead>
                    <TableHead>Última Visita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topUsers.map((user, i) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-bold">{i + 1}</TableCell>
                      <TableCell>{user.full_name || user.login}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-center font-bold">{Number(user.total_visits).toLocaleString()}</TableCell>
                      <TableCell className="text-center">{user.pages_visited}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(user.last_visit), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {topUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum dado disponível
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminContadores;
