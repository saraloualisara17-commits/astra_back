import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MapPin,
  Package,
  Phone,
  Navigation,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  X,
  Clock,
  User,
  CheckCircle2,
  Map as MapIcon,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  fetchReadyForDelivery,
  confirmPayment,
  fetchPaymentTypes,
  cancelDelivery
} from '../../store/livreur/livreurThunk';
import {
  selectReadyForDelivery,
  selectLoading,
  selectPaymentTypes
} from '../../store/livreur/livreurSelectors';

// Leaflet Imports
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom styles for Leaflet
const leafletStyles = `
  .leaflet-control-attribution {
    font-size: 9px !important;
  }
`;

// Custom orange marker for non-optimized or general use
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Numbered icon for optimized route
const createNumberedIcon = (number) =>
  new L.DivIcon({
    html: `
      <div style="
        background: #F97316;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">${number}</div>
    `,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

// ─── Sub-Components ───────────────────

const PaymentModal = ({ isOpen, onClose, onConfirm, order, paymentTypes, loading }) => {
  const [selectedType, setSelectedType] = useState(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>

      <div className="relative bg-white w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl shadow-modal overflow-hidden animate-in slide-in-from-bottom duration-300 p-6">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden"></div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Mode de paiement</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} className="text-text-muted" />
          </button>
        </div>

        <p className="text-sm text-text-muted mb-6 font-bold uppercase tracking-widest text-[10px]">
          Commande <span className="text-primary-500">#{order?.numeroCommande || order?.id}</span>
        </p>

        <div className="space-y-2 mb-6">
          {paymentTypes.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <div
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                    ? 'border-2 border-primary-500 bg-primary-50'
                    : 'border-border hover:border-primary-300 hover:bg-primary-50'
                  }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary-500' : 'border-gray-300'}`}>
                  {isSelected && <div className="w-2.5 h-2.5 bg-primary-500 rounded-full"></div>}
                </div>
                <span className="text-sm font-bold text-text-primary uppercase tracking-tight">{type.label}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onConfirm(selectedType)}
          disabled={!selectedType || loading}
          className="w-full bg-primary-500 text-white rounded-xl py-4 text-sm font-black uppercase tracking-[0.1em] shadow-xl shadow-primary-500/30 flex items-center justify-center gap-2 hover:bg-primary-600 disabled:opacity-50 transition-all active:scale-95"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Confirmer le paiement'}
        </button>
      </div>
    </div>
  );
};

const DeliveryCard = ({ order, onPay, onCancel, onShowGallery, isOptimized }) => {
  const baseUrl = import.meta.env.VITE_API_URL// 'http://localhost:8080';

  const getAllPhotos = (order) => {
    const photos = [];
    const tapisList = order.commandeTapis || [];
    tapisList.forEach(t => {
      const imgs = t.tapisImages || t.images || t.imageUrls || [];
      if (Array.isArray(imgs)) {
        imgs.forEach(img => {
          const url = img.imageUrl || img.url || img.path || (typeof img === 'string' ? img : null);
          if (url) {
            photos.push(url.startsWith('http') ? url : `${baseUrl}${url}`);
          }
        });
      } else if (t.imageUrl) {
        photos.push(t.imageUrl.startsWith('http') ? t.imageUrl : `${baseUrl}${t.imageUrl}`);
      }
    });
    return photos;
  };

  const allPhotos = useMemo(() => getAllPhotos(order), [order]);
  const mainPhoto = allPhotos[0];

  const timeAgo = useMemo(() => {
    const created = new Date(order.dateCreation);
    const now = new Date();
    const diffMs = now - created;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}j`;
  }, [order.dateCreation]);

  const handleItinerary = () => {
    const lat = order.client?.addresses?.[0]?.latitude;
    const lng = order.client?.addresses?.[0]?.longitude;
    const address = order.client?.addresses?.[0]?.address;

    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    } else if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    } else {
      toast.warning("Coordonnées GPS et adresse non disponibles");
    }
  };

  return (
    <div className="relative bg-white rounded-2xl shadow-md overflow-hidden flex flex-col md:flex-row border border-border/40 animate-in slide-in-from-bottom duration-500 group">

      {/* STOP NUMBER BADGE */}
      {isOptimized && order._stopNumber && (
        <div className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-primary-500 text-white text-xs font-black flex items-center justify-center shadow-lg border-2 border-white">
          {order._stopNumber}
        </div>
      )}

      {/* LEFT IMAGE SECTION */}
      <div className="w-full md:w-44 h-48 md:h-auto shrink-0 relative bg-gray-50 overflow-hidden">
        {mainPhoto ? (
          <img
            src={mainPhoto}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
            alt="tapis"
            onClick={() => onShowGallery(allPhotos, 0)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-400">
            <Package size={48} strokeWidth={1.5} />
          </div>
        )}

        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
          {order.montantTotal} DH
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex justify-between items-start gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-base font-black text-text-primary tracking-tight truncate uppercase">#{order.numeroCommande} • {order.client?.nom || order.client?.name || order.client?.fullName || 'Client'}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-green-100 text-green-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-green-200">
                  PRÊT
                </span>
                <div className="flex items-center gap-1 text-text-muted">
                  <Clock size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">{timeAgo}</span>
                </div>
              </div>
            </div>
            {order._legDistance && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1 px-2 py-1 bg-primary-50 rounded-lg border border-primary-100">
                  <Navigation size={10} className="text-primary-500" />
                  <span className="text-[9px] font-black text-primary-600 uppercase tracking-widest">{order._legDistance} KM</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50/50 p-3 rounded-xl mb-4 border border-gray-100">
            <div className="flex items-start gap-2.5 mb-2">
              <MapPin size={14} className="text-primary-500 mt-0.5 shrink-0" />
              <p className="text-xs font-bold text-text-primary leading-relaxed uppercase tracking-tight line-clamp-2">{order.client?.addresses?.[0]?.address || 'Sans adresse'}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone size={14} className="text-primary-500 shrink-0" />
              <a href={`tel:${order.client?.phones?.[0]?.phoneNumber}`} className="text-xs font-black text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-wider">
                {order.client?.phones?.[0]?.phoneNumber || 'Sans numéro'}
              </a>
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={handleItinerary}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white rounded-xl py-3.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-primary-500/10 active:scale-95"
          >
            <Navigation size={14} fill="white" /> Itinéraire
          </button>
          <button
            onClick={() => onPay(order)}
            className="flex-1 bg-white hover:bg-gray-50 text-text-primary border border-border rounded-xl py-3.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <CreditCard size={14} /> Paiement
          </button>
          <button
            onClick={() => onCancel(order)}
            className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-text-muted hover:bg-red-50 hover:text-red-500 transition-all border border-border/50 active:scale-95 shrink-0"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReadyForDelivery() {
  const dispatch = useDispatch();

  const orders = useSelector(selectReadyForDelivery);
  const paymentTypes = useSelector(selectPaymentTypes);
  const loading = useSelector(selectLoading);

  const [paymentModal, setPaymentModal] = useState({ isOpen: false, order: null });

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Optimization State
  const [optimizedOrders, setOptimizedOrders] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [optimized, setOptimized] = useState(false);

  const [noGpsWarning, setNoGpsWarning] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Cancellation State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    dispatch(fetchReadyForDelivery());
    dispatch(fetchPaymentTypes());
    setMapReady(true);
  }, [dispatch]);

  // Route Optimization Logic (OSRM)
  const optimizeRoute = async () => {
    const ordersWithGPS = orders.filter(order =>
      order.client?.addresses?.[0]?.latitude && order.client?.addresses?.[0]?.longitude
    );

    if (ordersWithGPS.length < 2) {
      setOptimizationError('Minimum 2 adresses GPS nécessaires pour optimiser le trajet');
      return;
    }

    setIsOptimizing(true);
    setOptimizationError(null);

    try {
      const coords = ordersWithGPS
        .map(order => `${order.client.addresses[0].longitude},${order.client.addresses[0].latitude}`)
        .join(';');

      const response = await fetch(
        `https://router.project-osrm.org/trip/v1/driving/${coords}?roundtrip=false&source=first&destination=last&overview=full&geometries=geojson&annotations=true`
      );

      if (!response.ok) throw new Error('OSRM unavailable');
      const data = await response.json();

      if (data.code !== 'Ok') throw new Error('Optimization failed');

      const waypointOrder = data.waypoints
        .sort((a, b) => a.waypoint_index - b.waypoint_index)
        .map(wp => wp.waypoint_index);

      const reordered = waypointOrder.map(idx => ordersWithGPS[waypointOrder.indexOf(idx)]);
      // Note: OSRM Trip API returns waypoints in the order they appear in the input, but with a 'trips_index' or similar to indicate order. 
      // Actually, for Trip API, waypoints[i].waypoint_index corresponds to input index i.
      // The order is determined by data.trips[0].legs and the sequences.
      // Correct reordering for Trip API:
      const trip = data.trips[0];
      const itemsOrder = data.waypoints.sort((a, b) => a.trips_index - b.trips_index).map(wp => wp.waypoint_index);
      const reorderedOrders = itemsOrder.map(idx => ordersWithGPS[idx]);

      const legs = trip.legs;
      const reorderedWithInfo = reorderedOrders.map((order, idx) => ({
        ...order,
        _legDistance: legs[idx] ? (legs[idx].distance / 1000).toFixed(1) : null,
        _legDuration: legs[idx] ? Math.round(legs[idx].duration / 60) : null,
        _stopNumber: idx + 1
      }));

      const ordersWithoutGPS = orders.filter(order =>
        !order.client?.addresses?.[0]?.latitude || !order.client?.addresses?.[0]?.longitude
      );

      setOptimizedOrders([...reorderedWithInfo, ...ordersWithoutGPS]);
      setRouteCoords(trip.geometry.coordinates.map(coord => [coord[1], coord[0]]));
      setTotalDistance((trip.distance / 1000).toFixed(1));
      setTotalDuration(Math.round(trip.duration / 60));
      setOptimized(true);

    } catch (error) {
      console.error('Optimization error:', error);
      setOptimizationError("Impossible d'optimiser le trajet. Utilisation de l'ordre par défaut.");
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    const hasGPS = orders.some(o => o.client?.addresses?.[0]?.latitude && o.client?.addresses?.[0]?.longitude);
    if (orders.length >= 2 && hasGPS && !optimized) {
      optimizeRoute();
    }
  }, [orders]);

  const displayOrders = optimized ? optimizedOrders : orders;

  // Map Data Logic
  const mapMarkers = useMemo(() => {
    const source = optimized ? optimizedOrders : orders;
    return source
      .filter(order => order.client?.addresses?.[0]?.latitude && order.client?.addresses?.[0]?.longitude)
      .map((order, idx) => ({
        lat: parseFloat(order.client.addresses[0].latitude),
        lng: parseFloat(order.client.addresses[0].longitude),
        clientName: order.client?.nom || order.client?.name || order.client?.fullName || 'Client',
        phone: order.client?.phones?.[0]?.phoneNumber || 'N/A',
        orderId: order.numeroCommande || order.id,
        amount: order.montantTotal || 0,
        address: order.client?.addresses?.[0]?.address || '',
        stopNumber: optimized ? order._stopNumber : null
      }));
  }, [displayOrders, optimized]);

  const defaultCenter = [33.5731, -7.5898];
  const mapCenter = mapMarkers.length > 0 ? [mapMarkers[0].lat, mapMarkers[0].lng] : defaultCenter;

  const handleOpenPayment = (order) => {
    setPaymentModal({ isOpen: true, order });
  };

  const handleConfirmPayment = async (methodId) => {
    if (!paymentModal.order) return;
    try {
      await dispatch(confirmPayment({
        orderId: paymentModal.order.id,
        data: { modePaiement: methodId }
      })).unwrap();
      toast.success("Paiement validé !");
      setPaymentModal({ isOpen: false, order: null });
      dispatch(fetchReadyForDelivery());
    } catch (err) {
      toast.error(err || "Une erreur est survenue");
    }
  };

  const handleCancelOrder = (order) => {
    setOrderToCancel(order);
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!orderToCancel) return;
    setCancelLoading(true);
    try {
      const orderId = orderToCancel.id;
      await dispatch(cancelDelivery(orderId)).unwrap();

      // Refresh the orders list
      dispatch(fetchReadyForDelivery());

      setCancelModalOpen(false);
      setOrderToCancel(null);
      setSuccessMessage('Commande annulée avec succès. Elle apparaît dans "Annulées".');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      console.error('Cancel error:', error);
      setErrorMessage("Erreur lors de l'annulation. Veuillez réessayer.");
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleShowGallery = (images, index) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleSmartRoute = () => {
    const markers = optimized ? optimizedOrders.filter(o => o.client?.addresses?.[0]?.latitude) : orders.filter(o => o.client?.addresses?.[0]?.latitude);

    if (markers.length === 0) {
      setNoGpsWarning(true);
      setTimeout(() => setNoGpsWarning(false), 4000);
      return;
    }

    if (markers.length === 1) {
      window.open(`https://www.google.com/maps?q=${markers[0].client.addresses[0].latitude},${markers[0].client.addresses[0].longitude}`, '_blank');
      return;
    }

    const origin = markers[0];
    const dest = markers[markers.length - 1];
    const stops = markers.slice(1, -1);
    const waypointsParam = stops.map(o => `${o.client.addresses[0].latitude},${o.client.addresses[0].longitude}`).join('|');

    const url = waypointsParam
      ? `https://www.google.com/maps/dir/${origin.client.addresses[0].latitude},${origin.client.addresses[0].longitude}/${waypointsParam}/${dest.client.addresses[0].latitude},${dest.client.addresses[0].longitude}`
      : `https://www.google.com/maps/dir/${origin.client.addresses[0].latitude},${origin.client.addresses[0].longitude}/${dest.client.addresses[0].latitude},${dest.client.addresses[0].longitude}`;

    window.open(url, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-32 animate-fade-in px-4 overflow-x-hidden">
      <style>{leafletStyles}</style>

      {/* SUCCESS/ERROR BANNERS */}
      {successMessage && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 shadow-sm animate-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-sm font-bold text-green-800 uppercase tracking-tight">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 shadow-sm animate-in slide-in-from-top duration-300">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm font-bold text-red-800 uppercase tracking-tight">{errorMessage}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase">Livraisons du jour</h1>
          <p className="text-sm text-text-muted mt-1 font-bold">Optimisez votre trajet et gérez vos encaissements.</p>
        </div>

        <div className="bg-primary-50 border border-primary-200 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm shrink-0">
          <ShoppingBag className="text-primary-500" size={20} />
          <p className="text-sm font-black text-primary-600 uppercase tracking-widest leading-none">
            {orders.length} Commandes
          </p>
        </div>
      </div>

      {/* OPTIMIZATION STATUS */}
      <div className="space-y-3">
        {isOptimizing && (
          <div className="flex items-center gap-3 bg-white border border-border/50 rounded-2xl px-4 py-3 shadow-sm animate-pulse">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-text-muted uppercase tracking-tight">Optimisation du trajet en cours...</span>
          </div>
        )}

        {optimized && !isOptimizing && (
          <div className="flex items-center gap-4 flex-wrap bg-white border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Optimisé</span>
            </div>
            <div className="flex items-center gap-1.5 bg-primary-50 border border-primary-200 rounded-xl px-3 py-1.5">
              <MapPin className="w-4 h-4 text-primary-500" />
              <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{totalDistance} KM</span>
            </div>
            <div className="flex items-center gap-1.5 bg-primary-50 border border-primary-200 rounded-xl px-3 py-1.5">
              <Clock className="w-4 h-4 text-primary-500" />
              <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">~{totalDuration} MIN</span>
            </div>
            <button
              className="text-[10px] font-black text-text-muted hover:text-primary-500 uppercase tracking-widest underline ml-auto transition-colors"
              onClick={() => {
                setOptimized(false);
                setOptimizedOrders([]);
                setRouteCoords([]);
              }}
            >
              Réinitialiser
            </button>
          </div>
        )}

        {optimizationError && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-bold text-amber-800 uppercase tracking-tight">{optimizationError}</span>
          </div>
        )}
      </div>

      {/* MAP SECTION */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-6 w-full max-w-full border border-border/50">
        <div className="h-48 sm:h-56 md:h-64 lg:h-72 w-full relative overflow-hidden z-0">
          {mapReady && (
            <MapContainer
              center={mapCenter}
              zoom={mapMarkers.length > 0 ? 12 : 10}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              zoomControl={true}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {routeCoords.length > 0 && (
                <Polyline
                  positions={routeCoords}
                  color="#F97316"
                  weight={4}
                  opacity={0.8}
                />
              )}

              {mapMarkers.map((marker, idx) => (
                <Marker
                  key={idx}
                  position={[marker.lat, marker.lng]}
                  icon={optimized ? createNumberedIcon(marker.stopNumber) : orangeIcon}
                >
                  <Popup>
                    <div style={{ minWidth: '160px' }}>
                      <div style={{ fontWeight: 900, fontSize: '13px', marginBottom: '4px', textTransform: 'uppercase', color: '#111827' }}>
                        {optimized ? `Arrêt ${marker.stopNumber}: ` : ''}{marker.clientName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', fontWeight: 600 }}>
                        {marker.address}
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                        <div style={{ fontSize: '12px', color: '#F97316', fontWeight: 900 }}>
                          {marker.amount} DH
                        </div>
                        <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700 }}>
                          #{marker.orderId}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}

          {mapMarkers.length === 0 && (
            <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-md">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
                <MapPin size={32} className="text-gray-300" />
              </div>
              <p className="text-sm font-black text-text-primary uppercase tracking-tight">Aucune coordonnée GPS</p>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">L'optimisation nécessite les positions clients</p>
            </div>
          )}
        </div>

        {/* SmartRoute banner */}
        <div className="bg-gray-900 px-4 py-3 md:px-5 md:py-4 flex justify-between items-center gap-3">
          <div>
            <h4 className="font-semibold text-sm md:text-base text-white leading-tight uppercase">Lancer la Livraison</h4>
            <p className="text-gray-400 text-xs mt-0.5 hidden sm:block font-bold">
              {mapMarkers.length > 0
                ? `Ouvrir l'itinéraire pour ${mapMarkers.length} clients`
                : 'Gagnez du temps sur votre tournée'
              }
            </p>
          </div>
          <button
            className="bg-primary-500 text-white rounded-xl px-3 py-2 md:px-4 text-xs md:text-sm font-semibold whitespace-nowrap flex-shrink-0"
            onClick={handleSmartRoute}
          >
            Google Maps
          </button>
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-4">
        {displayOrders.length > 0 ? (
          displayOrders.map(order => (
            <DeliveryCard
              key={order.id}
              order={order}
              onPay={handleOpenPayment}
              onCancel={handleCancelOrder}
              onShowGallery={handleShowGallery}
              isOptimized={optimized}
            />
          ))
        ) : (
          <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-border/50">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Navigation size={40} className="text-text-muted opacity-20" />
            </div>
            <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">Aucune livraison en attente</h3>
            <p className="text-sm font-bold text-text-muted mt-2 uppercase tracking-widest text-center px-8">Toutes vos livraisons ont été effectuées pour le moment.</p>
          </div>
        )}
      </div>

      {/* MODALS */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        order={paymentModal.order}
        paymentTypes={paymentTypes}
        loading={loading.payment}
        onClose={() => setPaymentModal({ isOpen: false, order: null })}
        onConfirm={handleConfirmPayment}
      />

      {/* CANCEL MODAL */}
      {cancelModalOpen && orderToCancel && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCancelModalOpen(false);
              setOrderToCancel(null);
            }
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

          <div className="relative bg-white rounded-3xl shadow-modal max-w-sm w-full p-8 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-500" />
            </div>

            <h3 className="text-xl font-black text-text-primary text-center mb-2 uppercase tracking-tight">Annuler la livraison ?</h3>

            <p className="text-sm text-text-muted text-center mb-1 font-bold uppercase tracking-widest text-[10px]">
              Commande <span className="text-red-500">#{orderToCancel.numeroCommande || orderToCancel.id}</span>
            </p>
            <p className="text-xs text-text-muted text-center mb-8 font-medium">
              Cette action marquera la commande comme annulée. Elle apparaîtra dans la section "Annulées".
            </p>

            <div className="flex gap-4">
              <button
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                onClick={() => {
                  setCancelModalOpen(false);
                  setOrderToCancel(null);
                }}
                disabled={cancelLoading}
              >
                Garder
              </button>
              <button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={handleCancelConfirm}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  'Annuler'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <div className="absolute top-4 left-4 bg-black/50 text-white text-sm font-medium px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>

          <button
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10 transition-all"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              onClick={() => setLightboxIndex(i => i - 1)}
            >
              <ChevronLeft className="w-10 h-10 text-white" />
            </button>
          )}

          <img
            src={lightboxImages[lightboxIndex]}
            className="max-w-[90vw] max-h-[75vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-500"
            alt="photo zoom"
          />

          {lightboxIndex < lightboxImages.length - 1 && (
            <button
              className="absolute right-4 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              onClick={() => setLightboxIndex(i => i + 1)}
            >
              <ChevronRight className="w-10 h-10 text-white" />
            </button>
          )}

          <div className="flex gap-3 mt-8 flex-wrap justify-center px-4 max-w-2xl">
            {lightboxImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                className={`w-14 h-14 rounded-xl object-cover cursor-pointer border-2 transition-all shadow-lg
                           ${idx === lightboxIndex
                    ? 'border-primary-500 scale-110'
                    : 'border-transparent opacity-50 hover:opacity-100'}`}
                onClick={() => setLightboxIndex(idx)}
                alt={`thumb ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
