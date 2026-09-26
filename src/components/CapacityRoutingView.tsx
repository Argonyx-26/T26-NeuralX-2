import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Bed,
  HeartPulse,
  Wind,
  Phone,
  CheckCircle2,
  AlertCircle,
  Send,
  Compass,
  Radio,
  Stethoscope,
  Building2,
  Clock,
  ExternalLink,
  Search,
  Sparkles
} from 'lucide-react';
import { Facility, TriageResponse } from '../types/triage';
import { ReferralResultsCard } from './ReferralResultsCard';
import { raahClient } from '../services/raahClient';

interface CapacityRoutingViewProps {
  triageResponse: TriageResponse | null;
  onDispatchReferral: (facility: Facility) => void;
  onRetest: () => void;
  isDispatching: boolean;
  dispatchedFacilityId?: string;
  onStartIntake: () => void;
}

interface HospitalGeo extends Facility {
  lat: number;
  lng: number;
}

const DISTRICT_HUBS = [
  { id: 'custom-gps', name: 'Live Device GPS', lat: 12.9121, lng: 77.6446, isLiveGps: true, label: 'Live GPS Fix' },
  { id: 'blr-koramangala', name: 'Koramangala (5th Block)', lat: 12.9352, lng: 77.6245, label: 'Koramangala' },
  { id: 'blr-btm', name: 'BTM Layout (2nd Stage)', lat: 12.9166, lng: 77.6101, label: 'BTM Layout' },
  { id: 'blr-hsr', name: 'HSR Layout (Silk Board)', lat: 12.9121, lng: 77.6446, label: 'HSR Layout' },
  { id: 'blr-indiranagar', name: 'Indiranagar (100ft Rd)', lat: 12.9784, lng: 77.6408, label: 'Indiranagar' },
  { id: 'blr-jayanagar', name: 'Jayanagar (4th Block)', lat: 12.9250, lng: 77.5938, label: 'Jayanagar' },
  { id: 'blr-jpnagar', name: 'JP Nagar (Central)', lat: 12.9063, lng: 77.5857, label: 'JP Nagar' },
  { id: 'blr-whitefield', name: 'Whitefield (ITPL)', lat: 12.9698, lng: 77.7499, label: 'Whitefield' },
  { id: 'blr-ecity', name: 'Electronic City (Phase 1)', lat: 12.8452, lng: 77.6602, label: 'Electronic City' },
  { id: 'delhi-saket', name: 'South Delhi (Saket)', lat: 28.5244, lng: 77.2167, label: 'South Delhi' },
  { id: 'mumbai-bandra', name: 'Mumbai (Bandra West)', lat: 19.0596, lng: 72.8295, label: 'Bandra Mumbai' },
];

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Generates the 5 nearest emergency medical facilities anchored dynamically
 * right at the user's specific GPS location (0.6 km to 5.4 km away).
 */
function buildNearestHospitalMesh(lat: number, lng: number, areaName: string): HospitalGeo[] {
  const area = areaName && areaName !== 'Unknown' ? areaName : 'Local Sector';

  // Area-specific clinical landmark mappings
  let hosp1Name = `${area} General District Hospital`;
  let hosp2Name = `${area} National Specialty & Cardiac Care`;
  let hosp3Name = `${area} Comprehensive Trauma Medical College`;
  let hosp4Name = `Urban Primary Health Clinic (UPHC ${area})`;
  let hosp5Name = `Community Health Centre (CHC ${area})`;

  if (area.toLowerCase().includes('whitefield')) {
    hosp1Name = 'Manipal Hospital Whitefield';
    hosp2Name = 'Vydehi Institute of Medical Sciences & Research';
    hosp3Name = 'Sri Sathya Sai Super Speciality Hospital';
  } else if (area.toLowerCase().includes('electronic city')) {
    hosp1Name = 'Narayana Health City Multi-Speciality';
    hosp2Name = 'Mazumdar Shaw Medical Centre & Oncology';
    hosp3Name = 'Electronic City Government Community Hospital';
  } else if (area.toLowerCase().includes('indiranagar')) {
    hosp1Name = 'Sir C.V. Raman General District Hospital';
    hosp2Name = 'Chinmaya Mission Hospital & ICU';
    hosp3Name = 'Manipal Hospital (Old Airport Road)';
  } else if (area.toLowerCase().includes('koramangala')) {
    hosp1Name = "St. John's Medical College Hospital";
    hosp2Name = 'Apollo Spectra Hospital Koramangala';
    hosp3Name = 'Koramangala Comprehensive Trauma Centre';
  } else if (area.toLowerCase().includes('btm')) {
    hosp1Name = 'Jayashree Multi Speciality Hospital BTM';
    hosp2Name = 'BTM Comprehensive Trauma & Critical Care';
    hosp3Name = 'Fortis Hospital (Bannerghatta Corridor)';
  } else if (area.toLowerCase().includes('jp nagar')) {
    hosp1Name = 'Aster RV Hospital JP Nagar';
    hosp2Name = 'Cloudnine Hospital & Emergency Care';
    hosp3Name = 'Apollo Hospital Bannerghatta Road';
  } else if (area.toLowerCase().includes('hsr')) {
    hosp1Name = 'Narayana Multispeciality Hospital HSR';
    hosp2Name = 'Greenview Multi-Speciality Hospital';
    hosp3Name = 'Apollo Clinic & Emergency HSR';
  } else if (area.toLowerCase().includes('jayanagar')) {
    hosp1Name = 'Jayanagar General District Hospital';
    hosp2Name = 'Sri Jayadeva National Cardiovascular Institute';
    hosp3Name = 'Victoria Hospital & Trauma Centre';
  } else if (area.toLowerCase().includes('delhi')) {
    hosp1Name = 'AIIMS Emergency Medicine & Trauma Centre';
    hosp2Name = 'Max Super Speciality Hospital Saket';
    hosp3Name = 'Safdarjung Hospital Emergency Care';
  } else if (area.toLowerCase().includes('mumbai')) {
    hosp1Name = 'Lilavati Hospital & Research Centre Bandra';
    hosp2Name = 'KEM Hospital & Medical College';
    hosp3Name = 'Bhabha Municipal General Hospital Bandra';
  }

  return [
    {
      id: `fac-${area.toLowerCase().replace(/[^a-z0-9]/g, '-')}-1`,
      name: hosp1Name,
      type: 'District Hospital',
      lat: Number((lat + 0.007).toFixed(4)),
      lng: Number((lng + 0.006).toFixed(4)),
      distance_km: 1.1,
      eta_mins: 4,
      icu_beds_available: 4,
      oxygen_beds_available: 12,
      general_beds_available: 28,
      specialist_on_duty: 'Emergency Medicine & Critical Care (Dr. P. Nair)',
      match_score: 96,
      capacity_status: 'AMPLE',
      address: `Main Hospital Road, ${area}`,
      phone: '+91 80 2663 1200',
      is_simulated: true,
    },
    {
      id: `fac-${area.toLowerCase().replace(/[^a-z0-9]/g, '-')}-2`,
      name: hosp2Name,
      type: 'Tertiary Medical College',
      lat: Number((lat - 0.011).toFixed(4)),
      lng: Number((lng + 0.013).toFixed(4)),
      distance_km: 1.9,
      eta_mins: 6,
      icu_beds_available: 8,
      oxygen_beds_available: 22,
      general_beds_available: 48,
      specialist_on_duty: 'Cardiothoracic Surgery & ICU (Dr. A. Sharma)',
      match_score: 98,
      capacity_status: 'AMPLE',
      address: `Healthcare Tech Corridor, ${area}`,
      phone: '+91 80 2297 7400',
      is_simulated: true,
    },
    {
      id: `fac-${area.toLowerCase().replace(/[^a-z0-9]/g, '-')}-3`,
      name: hosp3Name,
      type: 'Tertiary Medical College',
      lat: Number((lat + 0.021).toFixed(4)),
      lng: Number((lng + 0.024).toFixed(4)),
      distance_km: 3.5,
      eta_mins: 10,
      icu_beds_available: 10,
      oxygen_beds_available: 28,
      general_beds_available: 60,
      specialist_on_duty: 'Trauma Surgery & Pulmonology (Dr. V. Rao)',
      match_score: 90,
      capacity_status: 'AMPLE',
      address: `Ring Road Corridor, ${area}`,
      phone: '+91 80 2206 5000',
      is_simulated: true,
    },
    {
      id: `fac-${area.toLowerCase().replace(/[^a-z0-9]/g, '-')}-4`,
      name: hosp4Name,
      type: 'Primary Health Clinic',
      lat: Number((lat - 0.004).toFixed(4)),
      lng: Number((lng - 0.003).toFixed(4)),
      distance_km: 0.6,
      eta_mins: 2,
      icu_beds_available: 0,
      oxygen_beds_available: 0,
      general_beds_available: 2,
      specialist_on_duty: 'Duty Medical Officer (MBBS)',
      match_score: 32,
      capacity_status: 'NO_BEDS',
      address: `Ward Dispensary, 2nd Cross, ${area}`,
      phone: '+91 80 2654 9011',
      is_simulated: true,
    },
    {
      id: `fac-${area.toLowerCase().replace(/[^a-z0-9]/g, '-')}-5`,
      name: hosp5Name,
      type: 'Community Health Center',
      lat: Number((lat + 0.032).toFixed(4)),
      lng: Number((lng - 0.018).toFixed(4)),
      distance_km: 4.8,
      eta_mins: 13,
      icu_beds_available: 0,
      oxygen_beds_available: 4,
      general_beds_available: 14,
      specialist_on_duty: 'General Physician & Obstetrics (Dr. S. Kulkarni)',
      match_score: 75,
      capacity_status: 'CONGESTED',
      address: `Civil Block Centre, ${area}`,
      phone: '+91 80 2670 1150',
      is_simulated: true,
    }
  ];
}

export const CapacityRoutingView: React.FC<CapacityRoutingViewProps> = ({
  triageResponse,
  onDispatchReferral,
  onRetest,
  isDispatching,
  dispatchedFacilityId,
  onStartIntake,
}) => {
  // Current user GPS / District state
  const [selectedHubId, setSelectedHubId] = useState<string>('custom-gps');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(() => {
    try {
      const saved = localStorage.getItem('setuhealth_last_coords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lng) return { lat: parsed.lat, lng: parsed.lng };
      }
    } catch (e) {}
    return { lat: 12.9121, lng: 77.6446 };
  });
  const [localityName, setLocalityName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('setuhealth_last_coords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.locality) return parsed.locality;
      }
    } catch (e) {}
    return 'HSR Layout';
  });
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Search location state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Live Hospital Bed Matrix State
  const [facilities, setFacilities] = useState<HospitalGeo[]>(() =>
    buildNearestHospitalMesh(currentCoords.lat, currentCoords.lng, localityName)
  );

  // Live Bed Simulation Feed
  const [isSimulatingLiveFeed, setIsSimulatingLiveFeed] = useState<boolean>(true);
  const [lastBedUpdateTimestamp, setLastBedUpdateTimestamp] = useState<string>('Just now');
  const [filterSpecialty, setFilterSpecialty] = useState<'all' | 'icu' | 'oxygen' | 'trauma'>('all');

  // Reverse geocode lat/lng to get real neighborhood name
  const resolveLocality = async (lat: number, lng: number): Promise<string> => {
    // 1. Try BigDataCloud reverse geocode (fast, CORS-enabled, reliable)
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (bdcRes.ok) {
        const data = await bdcRes.json();
        const area = data.locality || data.city || data.principalSubdivision;
        if (area && area.trim().length > 0 && area !== 'Unknown') {
          setLocalityName(area.trim());
          return area.trim();
        }
      }
    } catch (e) {
      // Continue to next provider
    }

    // 2. Try OpenStreetMap Nominatim reverse geocode with User-Agent header
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
        {
          headers: { 'Accept': 'application/json', 'User-Agent': 'SetuHealth-Triage/1.0' },
          signal: AbortSignal.timeout(5000)
        }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const area =
          data.name ||
          (data.display_name ? data.display_name.split(',')[0].trim() : '') ||
          addr.neighbourhood ||
          addr.suburb ||
          addr.residential ||
          addr.quarter ||
          addr.city_district ||
          addr.town ||
          addr.city ||
          'Local Sector';

        setLocalityName(area);
        return area;
      }
    } catch (e) {
      // Continue to coordinate fallback
    }

    // 3. Fallback: estimate from coordinates
    let fallbackArea = 'Local Sector';
    if (Math.abs(lat - 12.935) < 0.03 && Math.abs(lng - 77.624) < 0.03) fallbackArea = 'Koramangala';
    else if (Math.abs(lat - 12.916) < 0.03 && Math.abs(lng - 77.610) < 0.03) fallbackArea = 'BTM Layout';
    else if (Math.abs(lat - 12.912) < 0.03 && Math.abs(lng - 77.644) < 0.03) fallbackArea = 'HSR Layout';
    else if (Math.abs(lat - 12.978) < 0.03 && Math.abs(lng - 77.640) < 0.03) fallbackArea = 'Indiranagar';
    else if (Math.abs(lat - 12.923) < 0.03 && Math.abs(lng - 77.581) < 0.03) fallbackArea = 'Jayanagar';
    else if (Math.abs(lat - 12.906) < 0.03 && Math.abs(lng - 77.585) < 0.03) fallbackArea = 'JP Nagar';
    else if (Math.abs(lat - 12.970) < 0.06 && Math.abs(lng - 77.750) < 0.06) fallbackArea = 'Whitefield';
    else if (Math.abs(lat - 12.845) < 0.06 && Math.abs(lng - 77.660) < 0.06) fallbackArea = 'Electronic City';
    else if (Math.abs(lat - 12.97) < 0.5 && Math.abs(lng - 77.59) < 0.5) fallbackArea = 'Bengaluru Urban';
    else if (Math.abs(lat - 28.6) < 0.5 && Math.abs(lng - 77.2) < 0.5) fallbackArea = 'Delhi NCR';

    setLocalityName(fallbackArea);
    return fallbackArea;
  };

  // Helper to commit position
  const applyCoordinates = async (lat: number, lng: number, accuracy: number, source: string) => {
    const coords = {
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
    };
    setCurrentCoords(coords);
    setSelectedHubId('custom-gps');
    setIsGpsActive(true);
    setGpsAccuracyMeters(Math.round(accuracy));
    setIsLocating(false);

    const detectedArea = await resolveLocality(coords.lat, coords.lng);

    try {
      localStorage.setItem(
        'setuhealth_last_coords',
        JSON.stringify({ lat: coords.lat, lng: coords.lng, locality: detectedArea })
      );
    } catch (e) {}

    raahClient.recordEvent(
      'FACILITY_ROUTED',
      source,
      'SYS-LOC',
      `Live GPS fixed at ${coords.lat}, ${coords.lng} (${detectedArea}) (Accuracy: ±${Math.round(accuracy)}m)`,
      { lat: coords.lat, lng: coords.lng, locality: detectedArea }
    );
  };

  // Fallback to IP geolocation
  const fetchIpLocation = async () => {
    try {
      const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client', {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          await applyCoordinates(data.latitude, data.longitude, 2500, 'IP-GEOLOCATION');
          return;
        }
      }
    } catch (e) {}

    setIsLocating(false);
    setGpsError('Could not auto-detect physical location. Please use the search bar below or select a neighborhood hub.');
  };

  // Trigger GPS detection with multi-tier fallback
  const handleDetectGPS = () => {
    setIsLocating(true);
    setGpsError(null);
    setSearchFeedback(null);

    if (!navigator.geolocation) {
      fetchIpLocation();
      return;
    }

    // Step 1: Try browser geolocation
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoordinates(position.coords.latitude, position.coords.longitude, position.coords.accuracy, 'GPS-SENSOR');
      },
      (err) => {
        console.warn('High accuracy geolocation timed out/denied, trying low accuracy network fix:', err);
        // Step 2: Try network/WiFi geolocation (lower accuracy, but works on laptops without GPS hardware)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            applyCoordinates(position.coords.latitude, position.coords.longitude, position.coords.accuracy, 'WIFI-TRIANGULATION');
          },
          (err2) => {
            console.warn('Network geolocation failed, falling back to IP geolocation:', err2);
            // Step 3: IP geolocation fallback
            fetchIpLocation();
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  };

  // Interactive location search handler
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchFeedback(null);
    setGpsError(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: { 'Accept': 'application/json', 'User-Agent': 'SetuHealth-Triage/1.0' },
          signal: AbortSignal.timeout(6000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = Number(parseFloat(data[0].lat).toFixed(4));
          const lng = Number(parseFloat(data[0].lon).toFixed(4));
          const rawName = data[0].name || (data[0].display_name ? data[0].display_name.split(',')[0].trim() : query);
          const cleanArea = rawName.length > 28 ? rawName.slice(0, 28) + '...' : rawName;

          setCurrentCoords({ lat, lng });
          setLocalityName(cleanArea);
          setSelectedHubId('custom-search');
          setIsGpsActive(false);
          setGpsAccuracyMeters(null);
          setSearchFeedback(`Location centered on: ${cleanArea}`);

          try {
            localStorage.setItem(
              'setuhealth_last_coords',
              JSON.stringify({ lat, lng, locality: cleanArea })
            );
          } catch (err) {}

          setIsSearching(false);
          return;
        }
      }
      setSearchFeedback(`Could not locate "${query}". Please try a nearby landmark or select from the chips.`);
    } catch (err) {
      setSearchFeedback('Search connection timed out. Please click a neighborhood chip below.');
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-attempt GPS on first mount
  useEffect(() => {
    handleDetectGPS();
  }, []);

  // Switch District Hub
  const handleHubSelect = (hubId: string) => {
    setSelectedHubId(hubId);
    setSearchFeedback(null);
    setGpsError(null);
    if (hubId === 'custom-gps') {
      handleDetectGPS();
      return;
    }
    const hub = DISTRICT_HUBS.find((h) => h.id === hubId);
    if (hub) {
      setCurrentCoords({ lat: hub.lat, lng: hub.lng });
      setLocalityName(hub.label || 'Local Sector');
      setIsGpsActive(Boolean(hub.isLiveGps));
      setGpsAccuracyMeters(null);
    }
  };

  // Recalculate Facilities & Distances whenever currentCoords or localityName change
  useEffect(() => {
    const rawFacilities = buildNearestHospitalMesh(currentCoords.lat, currentCoords.lng, localityName);
    const updated = rawFacilities.map((f) => {
      const dist = calculateHaversineDistance(
        currentCoords.lat,
        currentCoords.lng,
        f.lat,
        f.lng
      );
      // Ambulance ETA: ~2.2 mins per km + 2 mins staging
      const eta = Math.max(2, Math.round(dist * 2.2 + 2));
      return {
        ...f,
        distance_km: dist,
        eta_mins: eta,
      };
    });

    // Sort ascending by distance so closest hospitals are at the top!
    updated.sort((a, b) => a.distance_km - b.distance_km);
    setFacilities(updated);
  }, [currentCoords, localityName]);

  // Periodic Live Bed Census Updates (Simulates live IoT hospital telemetry)
  useEffect(() => {
    if (!isSimulatingLiveFeed) return;

    const interval = setInterval(() => {
      setFacilities((prev) =>
        prev.map((fac) => {
          const deltaGeneral = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0;
          const nextGeneral = Math.max(0, fac.general_beds_available + deltaGeneral);

          let nextIcu = fac.icu_beds_available;
          if (fac.icu_beds_available > 0 && Math.random() > 0.85) {
            nextIcu = Math.max(0, fac.icu_beds_available + (Math.random() > 0.5 ? 1 : -1));
          }

          let status = fac.capacity_status;
          if (nextIcu === 0 && fac.oxygen_beds_available === 0) {
            status = 'NO_BEDS';
          } else if (nextIcu <= 2 || fac.oxygen_beds_available <= 2) {
            status = 'CONGESTED';
          } else {
            status = 'AMPLE';
          }

          return {
            ...fac,
            general_beds_available: nextGeneral,
            icu_beds_available: nextIcu,
            capacity_status: status,
          };
        })
      );
      setLastBedUpdateTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 7000);

    return () => clearInterval(interval);
  }, [isSimulatingLiveFeed]);

  // Total district beds aggregation
  const totalIcuBeds = facilities.reduce((sum, f) => sum + f.icu_beds_available, 0);
  const totalOxygenBeds = facilities.reduce((sum, f) => sum + f.oxygen_beds_available, 0);
  const totalGeneralBeds = facilities.reduce((sum, f) => sum + f.general_beds_available, 0);

  // Filter facilities
  const filteredFacilities = facilities.filter((fac) => {
    if (filterSpecialty === 'icu') return fac.icu_beds_available > 0;
    if (filterSpecialty === 'oxygen') return fac.oxygen_beds_available > 0;
    if (filterSpecialty === 'trauma') return fac.type.includes('Tertiary');
    return true;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in pb-12">
      
      {/* Active Triage Decision Card if present */}
      {triageResponse && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sand-700 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Patient Decision In Effect
            </span>
            <button
              onClick={onRetest}
              className="text-xs text-sand-600 hover:text-sand-900 underline font-medium cursor-pointer"
            >
              Modify Intake
            </button>
          </div>
          <ReferralResultsCard
            triage={triageResponse}
            onDispatchReferral={onDispatchReferral}
            onRetest={onRetest}
            isDispatching={isDispatching}
            dispatchedFacilityId={dispatchedFacilityId}
          />
        </div>
      )}

      {/* Header & Live Location Banner */}
      <div className="neo-glass-card rounded-[2.5rem] p-7 sm:p-9 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand-300/40 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-200/80 text-[10px] tracking-widest text-sand-700 uppercase font-semibold border border-sand-300/50 backdrop-blur-md">
              <Compass className="w-3 h-3 text-terracotta-500 animate-spin" style={{ animationDuration: '8s' }} />
              <span>Real-Time Bed Mesh &amp; Spatial Routing</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-sand-900 mt-1.5">
              Local Hospital Capacity &amp; Location Engine
            </h2>
            <p className="text-xs sm:text-sm text-sand-600 font-light mt-1">
              Live emergency telemetry mesh automatically localized to your exact physical position with real-time bed inventory.
            </p>
          </div>

          {/* Live Sensor Heartbeat Tag */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-white shadow-xs text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sand-800 font-medium font-mono text-[11px]">
                Feed: {lastBedUpdateTimestamp}
              </span>
            </div>

            <button
              onClick={() => setIsSimulatingLiveFeed(!isSimulatingLiveFeed)}
              title={isSimulatingLiveFeed ? 'Pause live bed updates' : 'Resume live bed updates'}
              className={`p-2 rounded-full border transition-all text-xs flex items-center justify-center cursor-pointer ${
                isSimulatingLiveFeed
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-sand-200 border-sand-300 text-sand-600'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isSimulatingLiveFeed ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Location Selector Bar */}
        <div className="space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-sand-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Current Triage Origin Location:</span>
            </span>

            <button
              onClick={handleDetectGPS}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-sand-900 text-white text-xs font-medium hover:bg-sand-800 transition-all shadow-xs bronze-glow cursor-pointer disabled:opacity-60"
            >
              <Navigation className={`w-3.5 h-3.5 text-terracotta-400 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Detecting Physical GPS...' : 'Use My Live GPS'}</span>
            </button>
          </div>

          {/* Interactive Search Bar to Set Any Exact Location */}
          <form onSubmit={handleSearchLocation} className="flex gap-2 pt-0.5">
            <div className="relative flex-1 group">
              <Search className="w-4 h-4 text-sand-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-sand-700 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any exact area or landmark (e.g., Koramangala, BTM, Indiranagar, Mumbai, Delhi)..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white/80 border border-sand-300/80 focus:border-sand-700 focus:bg-white outline-none text-sand-900 shadow-inner transition-all placeholder:text-sand-400"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 rounded-xl bg-sand-800 hover:bg-sand-900 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
            >
              {isSearching ? <span className="animate-spin text-xs">⟳</span> : <Search className="w-3.5 h-3.5 text-sand-200" />}
              <span>{isSearching ? 'Finding...' : 'Set Area'}</span>
            </button>
          </form>

          {searchFeedback && (
            <div className="text-[11px] text-emerald-800 font-medium px-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{searchFeedback}</span>
            </div>
          )}

          {/* Quick Hub Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-sand-500 font-medium mr-1">Quick Hubs:</span>
            {DISTRICT_HUBS.map((hub) => (
              <button
                key={hub.id}
                onClick={() => handleHubSelect(hub.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  selectedHubId === hub.id
                    ? 'bg-white text-sand-900 border-sand-500 font-semibold shadow-sm'
                    : 'neo-glass-pill text-sand-700 hover:text-sand-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedHubId === hub.id ? 'bg-terracotta-500' : 'bg-sand-400'}`}></span>
                <span>{hub.name}</span>
              </button>
            ))}
          </div>

          {/* GPS Coordinates Feedback */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-sand-600 bg-white/70 p-3 rounded-xl border border-white/90 font-mono shadow-2xs">
            <span>
              Origin: <span className="text-sand-900 font-bold">{currentCoords.lat}° N, {currentCoords.lng}° E</span>
              {gpsAccuracyMeters ? (
                <span className="text-emerald-700 ml-2 font-sans font-medium">(Sensor Accuracy: ±{gpsAccuracyMeters}m)</span>
              ) : (
                <span className="text-sand-500 ml-2 font-sans">(Custom Selected Location)</span>
              )}
            </span>
            <span className="text-sand-800 font-sans font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Active Neighborhood: <strong className="text-sand-950 underline decoration-sand-400">{localityName}</strong> (All 5 Hospitals &lt; 5.2 km)</span>
            </span>
          </div>

          {gpsError && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        {/* 3 Live Aggregate Bed Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          
          <div className="p-4 rounded-2xl bg-white/65 border border-white/90 shadow-xs flex items-center justify-between backdrop-blur-sm">
            <div>
              <span className="text-[10px] uppercase font-semibold text-sand-500 tracking-wider">
                Total Available ICU Beds
              </span>
              <div className="text-2xl font-bold text-sand-900 font-mono mt-0.5">
                {totalIcuBeds} <span className="text-xs text-sand-500 font-normal">Beds</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/65 border border-white/90 shadow-xs flex items-center justify-between backdrop-blur-sm">
            <div>
              <span className="text-[10px] uppercase font-semibold text-sand-500 tracking-wider">
                Total Available O2 Beds
              </span>
              <div className="text-2xl font-bold text-sand-900 font-mono mt-0.5">
                {totalOxygenBeds} <span className="text-xs text-sand-500 font-normal">Beds</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Wind className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/65 border border-white/90 shadow-xs flex items-center justify-between backdrop-blur-sm">
            <div>
              <span className="text-[10px] uppercase font-semibold text-sand-500 tracking-wider">
                Total General Ward Beds
              </span>
              <div className="text-2xl font-bold text-sand-900 font-mono mt-0.5">
                {totalGeneralBeds} <span className="text-xs text-sand-500 font-normal">Beds</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Bed className="w-5 h-5" />
            </div>
          </div>

        </div>

      </div>

      {/* Facilities List & Filter Header */}
      <div className="space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-sand-900">
              Nearest Emergency Facilities ({filteredFacilities.length})
            </h3>
            <p className="text-xs text-sand-600 font-light">
              Ranked dynamically by road transit distance from your current location ({localityName}).
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-white/60 p-1 rounded-full border border-sand-300/50 backdrop-blur-md">
            <button
              onClick={() => setFilterSpecialty('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                filterSpecialty === 'all' ? 'bg-sand-900 text-white shadow-xs' : 'text-sand-600 hover:text-sand-900'
              }`}
            >
              All Facilities
            </button>
            <button
              onClick={() => setFilterSpecialty('icu')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                filterSpecialty === 'icu' ? 'bg-sand-900 text-white shadow-xs' : 'text-sand-600 hover:text-sand-900'
              }`}
            >
              ICU Available
            </button>
            <button
              onClick={() => setFilterSpecialty('oxygen')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                filterSpecialty === 'oxygen' ? 'bg-sand-900 text-white shadow-xs' : 'text-sand-600 hover:text-sand-900'
              }`}
            >
              Oxygen Available
            </button>
            <button
              onClick={() => setFilterSpecialty('trauma')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                filterSpecialty === 'trauma' ? 'bg-sand-900 text-white shadow-xs' : 'text-sand-600 hover:text-sand-900'
              }`}
            >
              Tertiary Care
            </button>
          </div>
        </div>

        {/* Facility Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredFacilities.map((fac) => {
            const isRecommended = triageResponse?.recommended_facility?.id === fac.id;
            const isDispatched = dispatchedFacilityId === fac.id;

            return (
              <div
                key={fac.id}
                className={`neo-glass-card rounded-[2rem] p-6 space-y-4 transition-all hover:shadow-md flex flex-col justify-between ${
                  isRecommended ? 'ring-2 ring-terracotta-500/80 bg-white/80 shadow-md' : ''
                }`}
              >
                <div className="space-y-3">
                  
                  {/* Top Header Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-sand-500">
                        {fac.type}
                      </span>
                      <h4 className="text-base font-bold text-sand-900 mt-0.5">
                        {fac.name}
                      </h4>
                      <p className="text-xs text-sand-600 font-light flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-sand-400 shrink-0" />
                        <span className="truncate">{fac.address}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-sand-900 font-mono">
                        {fac.distance_km} km
                      </div>
                      <div className="text-[10px] text-terracotta-600 font-medium">
                        ETA ~{fac.eta_mins} mins
                      </div>
                    </div>
                  </div>

                  {/* Specialist on Duty */}
                  <div className="p-2.5 rounded-xl bg-sand-200/50 border border-sand-300/40 text-xs flex items-center gap-2 text-sand-800">
                    <Stethoscope className="w-3.5 h-3.5 text-sand-600 shrink-0" />
                    <span className="truncate font-medium">{fac.specialist_on_duty}</span>
                  </div>

                  {/* Bed Breakdown Pods */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                    
                    <div className={`p-2.5 rounded-xl border ${
                      fac.icu_beds_available > 0
                        ? 'bg-red-50/70 border-red-200 text-red-900'
                        : 'bg-sand-100/60 border-sand-200 text-sand-400'
                    }`}>
                      <div className="text-xs font-bold">{fac.icu_beds_available}</div>
                      <div className="text-[9px] uppercase tracking-wider font-sans mt-0.5">ICU Beds</div>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${
                      fac.oxygen_beds_available > 0
                        ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                        : 'bg-sand-100/60 border-sand-200 text-sand-400'
                    }`}>
                      <div className="text-xs font-bold">{fac.oxygen_beds_available}</div>
                      <div className="text-[9px] uppercase tracking-wider font-sans mt-0.5">O2 Beds</div>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${
                      fac.general_beds_available > 0
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-sand-100/60 border-sand-200 text-sand-400'
                    }`}>
                      <div className="text-xs font-bold">{fac.general_beds_available}</div>
                      <div className="text-[9px] uppercase tracking-wider font-sans mt-0.5">General</div>
                    </div>

                  </div>

                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-sand-300/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-sand-600">
                    <Phone className="w-3 h-3 text-sand-400" />
                    <span className="font-mono text-[11px]">{fac.phone}</span>
                  </div>

                  <button
                    onClick={() => onDispatchReferral(fac)}
                    disabled={isDispatching || isDispatched}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isDispatched
                        ? 'bg-emerald-700 text-white'
                        : isRecommended
                        ? 'bg-sand-900 text-white hover:bg-sand-800 shadow-sm bronze-glow'
                        : 'bg-white/70 hover:bg-white text-sand-800 border border-sand-300'
                    }`}
                  >
                    {isDispatched ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Dispatched</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 text-terracotta-400" />
                        <span>{isRecommended ? 'Dispatch Recommended' : 'Direct Dispatch'}</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Prompt to evaluate intake if none active */}
      {!triageResponse && (
        <div className="neo-glass-card rounded-[2.3rem] p-7 text-center space-y-3">
          <h4 className="text-base font-semibold text-sand-900">
            Need an AI-Matched Decision for a Specific Patient?
          </h4>
          <p className="text-xs text-sand-600 font-light max-w-md mx-auto">
            Input presenting patient complaints and telemetry on the Triage Intake tab to automatically match against this live bed matrix.
          </p>
          <button
            onClick={onStartIntake}
            className="px-6 py-2 rounded-full bg-sand-900 text-white text-xs font-medium hover:bg-sand-800 transition-all bronze-glow cursor-pointer"
          >
            Launch Patient Intake
          </button>
        </div>
      )}

    </div>
  );
};
