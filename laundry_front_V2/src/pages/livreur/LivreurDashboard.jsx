import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  Archive, 
  RotateCcw, 
  Navigation2, 
  MoreHorizontal,
  LayoutDashboard,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { 
  fetchLivreurDashboardStats, 
  fetchReadyOrders, 
  fetchReadyForDelivery 
} from '../../store/livreur/livreurThunk';
import { 
  selectDashboardStats, 
  selectReadyOrders, 
  selectReadyForDelivery,
  selectLoading 
} from '../../store/livreur/livreurSelectors';

const StatCard = ({ label, count, icon: Icon, colorClass, iconBgClass, iconColorClass, barColorClass }) => (
  <div className={`bg-white rounded-2xl shadow-card p-5 border-t-2 ${colorClass} transition-all hover:shadow-card-hover`}>
    <div className="flex justify-between items-start">
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight max-w-[120px]">
        {label}
      </span>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgClass}`}>
        <Icon className={iconColorClass} size={24} />
      </div>
    </div>
    <div className="mt-3">
      <span className="text-4xl font-black text-text-primary">{count}</span>
    </div>
    <div className="mt-4 flex flex-col gap-2">
      <span className={`text-[10px] font-bold uppercase ${iconColorClass}`}>
        {label.includes('LIVRAISON') ? 'Livraisons clients' : label.includes('RÉCUPÉRER') ? 'Collectes prêtes' : 'À retourner'}
      </span>
      <div className="h-1 w-24 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColorClass}`} style={{ width: count > 0 ? '70%' : '0%' }}></div>
      </div>
    </div>
  </div>
);

const MissionRow = ({ mission, onNavigate }) => {
  const isDelivery = mission.status === 'livree'; // Status 'livree' means 'Sorti' (in transit to client)
  const initials = mission.client?.nom?.split(' ').map(n => n[0]).join('').toUpperCase() || 'C';

  return (
    <>
      {/* Desktop/Tablet Row */}
      <tr className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors hidden md:table-row">
        <td className="px-5 py-4">
          <span className="text-sm font-bold text-text-primary">#{mission.numeroCommande}</span>
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 text-text-secondary font-bold text-sm flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-text-primary truncate">{mission.client?.nom || 'Client Inconnu'}</span>
              <span className="text-[10px] text-text-muted truncate">{mission.client?.addresses?.[0]?.address || 'Pas d\'adresse'}</span>
            </div>
          </div>
        </td>
        <td className="px-5 py-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider
            ${isDelivery 
              ? 'bg-teal-50 text-teal-700 border-teal-200' 
              : 'bg-primary-50 text-primary-600 border-primary-200'}`}>
            {isDelivery ? 'LIVRAISON' : 'COLLECTE ATELIER'}
          </span>
        </td>
        <td className="px-5 py-4">
          <button 
            onClick={() => onNavigate(mission.id)}
            className="w-10 h-10 rounded-xl bg-gray-100 text-text-muted flex items-center justify-center hover:bg-primary-50 hover:text-primary-500 transition-all border border-transparent hover:border-primary-100"
          >
            <Navigation2 size={18} />
          </button>
        </td>
      </tr>

      {/* Mobile Card */}
      <div className="md:hidden bg-white rounded-2xl shadow-card p-4 mb-4 border border-border/40 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-0.5">Commande</span>
            <span className="text-base font-black text-text-primary tracking-tight">#{mission.numeroCommande}</span>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border tracking-widest
            ${isDelivery 
              ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm' 
              : 'bg-primary-50 text-primary-600 border-primary-200 shadow-sm'}`}>
            {isDelivery ? 'LIVRAISON' : 'COLLECTE'}
          </span>
        </div>

        <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-xl mb-4 border border-gray-100">
          <div className="w-12 h-12 rounded-full bg-white text-primary-600 font-black flex items-center justify-center shadow-sm border border-primary-100 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-text-primary uppercase truncate leading-tight">{mission.client?.nom}</p>
            <div className="flex items-start gap-1.5 mt-1">
              <MapPin size={12} className="text-text-muted shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-text-muted truncate leading-relaxed lowercase first-letter:uppercase">{mission.client?.addresses?.[0]?.address}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => onNavigate(mission.id)}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-primary-500/20 text-xs uppercase tracking-widest"
        >
          <Navigation2 size={18} strokeWidth={2.5} fill="white" />
          Démarrer la Mission
        </button>
      </div>
    </>
  );
};

export default function LivreurDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const stats = useSelector(selectDashboardStats);
  const readyOrders = useSelector(selectReadyOrders); // PRETE
  const readyForDelivery = useSelector(selectReadyForDelivery); // LIVREE (Sorti)
  const loading = useSelector(selectLoading);

  useEffect(() => {
    dispatch(fetchLivreurDashboardStats());
    dispatch(fetchReadyOrders());
    dispatch(fetchReadyForDelivery());
  }, [dispatch]);

  // Combine both types of missions for the daily list
  const missions = useMemo(() => {
    return [...readyForDelivery, ...readyOrders].sort((a, b) => b.id - a.id);
  }, [readyOrders, readyForDelivery]);

  const handleNavigateToMission = (id) => {
    navigate(`/livreur/delivery/${id}`); // Match the route in App.jsx
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      
      {/* STAT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <StatCard 
          label="PRÊTES POUR LIVRAISON"
          count={stats.commandesPretesCount}
          icon={Truck}
          colorClass="border-teal-500"
          iconBgClass="bg-teal-50"
          iconColorClass="text-teal-500"
          barColorClass="bg-teal-400"
        />
        <StatCard 
          label="À RÉCUPÉRER À L'ATELIER"
          count={stats.commandesARecupererCount}
          icon={Archive}
          colorClass="border-primary-500"
          iconBgClass="bg-primary-50"
          iconColorClass="text-primary-500"
          barColorClass="bg-primary-400"
        />
        <StatCard 
          label="COMMANDES ANNULÉES"
          count={stats.commandesAnnuleesCount}
          icon={RotateCcw}
          colorClass="border-orange-500"
          iconBgClass="bg-orange-50"
          iconColorClass="text-orange-500"
          barColorClass="bg-orange-300"
        />
      </div>

      {/* MISSIONS DU JOUR */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              Missions du jour
              {missions.length > 0 && (
                <span className="text-[10px] bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full font-black">
                  {missions.length}
                </span>
              )}
            </h2>
            <p className="text-sm text-text-muted">Liste des commandes à traiter</p>
          </div>
          <button className="text-primary-500 text-sm font-bold hover:text-primary-600 transition-colors flex items-center gap-1 group">
            Voir tout le planning
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-card overflow-hidden border border-border/50">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-border hidden md:table-header-group">
                <tr>
                  <th className="px-5 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Commande</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Client / Destination</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Type de mission</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {missions.length > 0 ? (
                  missions.map(mission => (
                    <MissionRow 
                      key={mission.id} 
                      mission={mission} 
                      onNavigate={handleNavigateToMission} 
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <LayoutDashboard size={32} className="text-text-muted opacity-20" />
                        </div>
                        <p className="text-sm font-bold text-text-primary">Aucune mission pour le moment</p>
                        <p className="text-xs text-text-muted mt-1">Vos prochaines livraisons apparaîtront ici.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
