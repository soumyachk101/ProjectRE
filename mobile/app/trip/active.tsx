import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import MapView, { Polyline, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { getLocationSafe, ensureLocationPermission } from '../../services/location';
import * as SecureStore from 'expo-secure-store';
import { writeAsStringAsync, cacheDirectory, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { api } from '../../services/api';
import { SensorEngine, VehicleType, Placement } from '../../services/SensorEngine';
import { useTripStore } from '../../store/trip';
import { PocCandidate, ConfirmedEvent } from '../../types';
import { syncManager } from '../../services/sync';
import { colors, gradients, spacing, typography, radius, shadows } from '../../constants/theme';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '../../components/ui/StatCard';
import { EventMarker } from '../../components/map/EventMarker';
import { TripEventMarker } from '../../components/map/TripEventMarker';
import XLSX from 'xlsx';

const OSM_TILE_URL = 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png';

interface RoutePoint {
  latitude: number;
  longitude: number;
}

export default function ActiveTripScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const engineRef = useRef<SensorEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locSubRef = useRef<Location.LocationSubscription | null>(null);

  const [telemetry, setTelemetry] = useState<{
    coords: { latitude: number; longitude: number };
    speed: number;
    route: RoutePoint[];
  }>({
    coords: { latitude: 0, longitude: 0 },
    speed: 0,
    route: [],
  });
  const { coords: liveCoords, speed: liveSpeed, route } = telemetry;

  const [detectedEvents, setDetectedEvents] = useState<Array<{
    id: string;
    lat: number;
    lng: number;
    type: string;
    time: number;
  }>>([]);

  const [communityEvents, setCommunityEvents] = useState<ConfirmedEvent[]>([]);
  const lastFetchedNearbyLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastAnimateTimeRef = useRef<number>(0);

  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [mapRegion, setMapRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }>({
    latitude: 23.55, longitude: 87.31, latitudeDelta: 0.05, longitudeDelta: 0.05,
  });

  // Live telemetry features
  const [engineInstance, setEngineInstance] = useState<SensorEngine | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentDetections, setRecentDetections] = useState<{ id: string; type: string; time: string }[]>([]);
  
  // Interactive confirmations queue
  const [confirmationsQueue, setConfirmationsQueue] = useState<PocCandidate[]>([]);
  const [followUser, setFollowUser] = useState(true);
  const followUserRef = useRef(followUser);
  const isMountedRef = useRef(true);

  useEffect(() => {
    followUserRef.current = followUser;
  }, [followUser]);

  // Post-trip summary and export
  const [showSummary, setShowSummary] = useState(false);
  const [completedTripDetails, setCompletedTripDetails] = useState<{
    tripId: string;
    distanceKm: number;
    durationFormatted: string;
    eventCount: number;
    events: PocCandidate[];
    vehicleType: string;
    placement: string;
  } | null>(null);

  const soundEnabledRef = useRef(true);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const playAlertSound = async (eventType: string) => {
    // Placeholder for future audio alerts — haptics are handled in handlePocDetected
  };

  const activeTrip = useTripStore((s) => s.activeTrip);
  const setActiveTrip = useTripStore((s) => s.setActiveTrip);
  const distanceKm = useTripStore((s) => s.distanceKm);
  const eventCount = useTripStore((s) => s.eventCount);
  const elapsedSeconds = useTripStore((s) => s.elapsedSeconds);
  const lastEventLabel = useTripStore((s) => s.lastEventLabel);
  const incrementEvents = useTripStore((s) => s.incrementEvents);
  const setLastEvent = useTripStore((s) => s.setLastEvent);
  const incrementElapsed = useTripStore((s) => s.incrementElapsed);
  const resetTrip = useTripStore((s) => s.resetTrip);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, [pulseAnim]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const pocBufferRef = useRef<PocCandidate[]>([]);
  const lastCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  const incrementDistance = useTripStore((s) => s.incrementDistance);

  const progress = useSharedValue(1);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const handleConfirmDetection = useCallback(async (poc: PocCandidate, asDetected: boolean, isAutoConfirm: boolean = false) => {
    // Remove from queue immediately
    setConfirmationsQueue((q) => q.slice(1));

    const finalType = asDetected
      ? (poc.z_value < 0 ? 'pothole' : 'speed_breaker')
      : (poc.z_value < 0 ? 'speed_breaker' : 'pothole');

    try {
      await api.events.report({
        event_type: finalType,
        lat: poc.lat,
        lng: poc.lng,
        note: isAutoConfirm ? 'Auto-detected and auto-confirmed' : 'Auto-detected and user-confirmed',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const id = Math.random().toString(36).substring(7);
      setRecentDetections((prev) => [
        { id, type: finalType, time: `${new Date().toLocaleTimeString()} (Confirmed)` },
        ...prev.slice(0, 4)
      ]);
    } catch (e) {
      console.warn('Failed to submit user confirmation:', e);
    }
  }, []);

  const handleDismissDetection = useCallback(() => {
    setConfirmationsQueue((q) => q.slice(1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Auto-dismiss/process items in confirmations queue with auto-confirm
  const firstItemKey = confirmationsQueue[0]?.recorded_at;
  useEffect(() => {
    if (confirmationsQueue.length === 0) return;

    const firstItem = confirmationsQueue[0] as any;
    const remainingMs = firstItem.expiresAt - Date.now();

    if (remainingMs <= 0) {
      handleConfirmDetection(firstItem, true, true);
      return;
    }

    progress.value = remainingMs / 8000;
    progress.value = withTiming(0, { duration: remainingMs });

    const timer = setTimeout(() => {
      handleConfirmDetection(firstItem, true, true);
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [firstItemKey, confirmationsQueue.length, progress, handleConfirmDetection]);

  const handlePocDetected = useCallback((poc: PocCandidate) => {
    incrementEvents();
    const eventType = poc.z_value < 0 ? 'pothole' : 'speed_breaker';
    setLastEvent(eventType);

    const id = Math.random().toString(36).substring(7);
    setRecentDetections((prev) => [
      { id, type: eventType, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 4)
    ]);

    if (eventType === 'pothole') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (soundEnabledRef.current) {
      playAlertSound(eventType);
    }

    // Add to live map markers state
    const newEvent = {
      id: Math.random().toString(36).substring(7),
      lat: poc.lat,
      lng: poc.lng,
      type: eventType,
      time: Date.now(),
    };
    setDetectedEvents((prev) => [...prev, newEvent]);

    // Queue for interactive user confirmation
    const pocWithExpiry = {
      ...poc,
      expiresAt: Date.now() + 8000,
    };
    setConfirmationsQueue((prev) => [...prev, pocWithExpiry]);
  }, [incrementEvents, setLastEvent]);

  const handleFlush = useCallback(async (pocs: PocCandidate[]) => {
    pocBufferRef.current.push(...pocs);
  }, []);

  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleManualReport = async (type: 'pothole' | 'speed_breaker' | 'broken_patch') => {
    try {
      const loc = await getLocationSafe({ accuracy: Location.Accuracy.Balanced, timeoutMs: 8000 });
      await api.events.report({ event_type: type, lat: loc.coords.latitude, lng: loc.coords.longitude });
      incrementEvents();
      setLastEvent(type);

      const id = Math.random().toString(36).substring(7);
      setRecentDetections((prev) => [
        { id, type, time: `${new Date().toLocaleTimeString()} (Confirmed)` },
        ...prev.slice(0, 4)
      ]);

      if (type === 'pothole') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (soundEnabledRef.current) {
        playAlertSound(type);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to report event');
    }
  };

  const computeTripQuality = (eventsCount: number, distance: number) => {
    if (distance <= 0) return { score: 100, label: 'Excellent' };
    const density = eventsCount / distance;
    let score = 100;
    let label = 'Excellent';

    if (density === 0) {
      score = 100;
      label = 'Excellent';
    } else if (density <= 0.5) {
      score = 90;
      label = 'Good';
    } else if (density <= 1.5) {
      score = 75;
      label = 'Fair';
    } else if (density <= 3.0) {
      score = 55;
      label = 'Poor';
    } else {
      score = Math.max(10, Math.round(100 - (density * 15)));
      label = 'Very Poor';
    }
    return { score, label };
  };

  const exportToCSV = async () => {
    if (!completedTripDetails) return;
    try {
      const { score, label } = computeTripQuality(completedTripDetails.eventCount, completedTripDetails.distanceKm);
      const potholes = completedTripDetails.events.filter(e => e.z_value < 0).length;
      const speedBreakers = completedTripDetails.events.filter(e => e.z_value >= 0).length;
      
      const speeds = completedTripDetails.events.map(e => e.speed_kmh);
      const avgSpeed = speeds.length > 0 ? (speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;

      let csvContent = 'ROAD_SENSE AI TRIP REPORT\n\n';
      csvContent += 'Trip Summary\n';
      csvContent += `Trip ID,"${completedTripDetails.tripId}"\n`;
      csvContent += `Vehicle Type,"${completedTripDetails.vehicleType}"\n`;
      csvContent += `Placement,"${completedTripDetails.placement}"\n`;
      csvContent += `Distance (km),${completedTripDetails.distanceKm.toFixed(2)}\n`;
      csvContent += `Duration,"${completedTripDetails.durationFormatted}"\n`;
      csvContent += `Total Events,${completedTripDetails.eventCount}\n`;
      csvContent += `Potholes,${potholes}\n`;
      csvContent += `Speed Breakers,${speedBreakers}\n`;
      csvContent += `Average Speed (km/h),${avgSpeed.toFixed(1)}\n`;
      csvContent += `Road Quality Score,${score} (${label})\n\n`;

      csvContent += 'Event Details\n';
      csvContent += 'Event Type,Latitude,Longitude,Timestamp,Speed (km/h),Z-Value (g)\n';
      completedTripDetails.events.forEach(poc => {
        const type = poc.z_value < 0 ? 'Pothole' : 'Speed Breaker';
        const time = new Date(poc.recorded_at).toLocaleTimeString();
        csvContent += `"${type}",${poc.lat.toFixed(6)},${poc.lng.toFixed(6)},"${time}",${poc.speed_kmh.toFixed(1)},${poc.z_value.toFixed(3)}\n`;
      });

      const fileUri = `${cacheDirectory}trip_report_${completedTripDetails.tripId}.csv`;
      await writeAsStringAsync(fileUri, csvContent, { encoding: EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Share Trip CSV Report' });
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Failed to export CSV');
    }
  };

  const exportToExcel = async () => {
    if (!completedTripDetails) return;
    try {
      const { score, label } = computeTripQuality(completedTripDetails.eventCount, completedTripDetails.distanceKm);
      const potholes = completedTripDetails.events.filter(e => e.z_value < 0).length;
      const speedBreakers = completedTripDetails.events.filter(e => e.z_value >= 0).length;
      
      const speeds = completedTripDetails.events.map(e => e.speed_kmh);
      const avgSpeed = speeds.length > 0 ? (speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;

      const severityBreakdown = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      completedTripDetails.events.forEach(poc => {
        const absZ = Math.abs(poc.z_value);
        if (absZ > 1.5) severityBreakdown.CRITICAL++;
        else if (absZ > 1.0) severityBreakdown.HIGH++;
        else if (absZ > 0.5) severityBreakdown.MEDIUM++;
        else severityBreakdown.LOW++;
      });

      // 1. Create a new workbook
      const wb = XLSX.utils.book_new();

      // 2. Sheet 1: Summary
      const summaryData = [
        ['ROAD_SENSE AI - TRIP SUMMARY'],
        [],
        ['Trip ID', completedTripDetails.tripId],
        ['Vehicle Type', completedTripDetails.vehicleType],
        ['Placement', completedTripDetails.placement],
        ['Distance (km)', parseFloat(completedTripDetails.distanceKm.toFixed(2))],
        ['Duration', completedTripDetails.durationFormatted],
        ['Total Events', completedTripDetails.eventCount],
        ['Potholes', potholes],
        ['Speed Breakers', speedBreakers],
        ['Average Speed (km/h)', parseFloat(avgSpeed.toFixed(1))],
        ['Road Quality Score', `${score} (${label})`],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Trip Summary');

      // 3. Sheet 2: Event Details
      const eventHeaders = [['Event Type', 'Latitude', 'Longitude', 'Timestamp', 'Speed (km/h)', 'Z-Value (g)']];
      const eventRows = completedTripDetails.events.map(poc => {
        const type = poc.z_value < 0 ? 'Pothole' : 'Speed Breaker';
        const time = new Date(poc.recorded_at).toLocaleTimeString();
        return [
          type,
          poc.lat,
          poc.lng,
          time,
          parseFloat(poc.speed_kmh.toFixed(1)),
          parseFloat(poc.z_value.toFixed(3))
        ];
      });
      const wsEvents = XLSX.utils.aoa_to_sheet([...eventHeaders, ...eventRows]);
      XLSX.utils.book_append_sheet(wb, wsEvents, 'Event Details');

      // 4. Sheet 3: Statistics
      const statsData = [
        ['ROAD ANOMALIES STATISTICS'],
        [],
        ['Metric', 'Value'],
        ['Total Potholes', potholes],
        ['Total Speed Breakers', speedBreakers],
        [],
        ['Severity Breakdown (Estimated)', 'Count'],
        ['Critical (>1.5g)', severityBreakdown.CRITICAL],
        ['High (1.0g - 1.5g)', severityBreakdown.HIGH],
        ['Medium (0.5g - 1.0g)', severityBreakdown.MEDIUM],
        ['Low (<0.5g)', severityBreakdown.LOW],
      ];
      const wsStats = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, wsStats, 'Statistics');

      // Write to base64
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileUri = `${cacheDirectory}trip_report_${completedTripDetails.tripId}.xlsx`;
      
      await writeAsStringAsync(fileUri, wbout, { encoding: EncodingType.Base64 });
      await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Share Trip Excel Report' });
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Failed to export Excel');
    }
  };

  const exportToPDF = async () => {
    if (!completedTripDetails) return;
    try {
      const { score, label } = computeTripQuality(completedTripDetails.eventCount, completedTripDetails.distanceKm);
      const potholes = completedTripDetails.events.filter(e => e.z_value < 0).length;
      const speedBreakers = completedTripDetails.events.filter(e => e.z_value >= 0).length;
      
      const speeds = completedTripDetails.events.map(e => e.speed_kmh);
      const avgSpeed = speeds.length > 0 ? (speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;

      const severityBreakdown = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      completedTripDetails.events.forEach(poc => {
        const absZ = Math.abs(poc.z_value);
        if (absZ > 1.5) severityBreakdown.CRITICAL++;
        else if (absZ > 1.0) severityBreakdown.HIGH++;
        else if (absZ > 0.5) severityBreakdown.MEDIUM++;
        else severityBreakdown.LOW++;
      });

      const totalEvents = completedTripDetails.eventCount;
      const potholesPercent = totalEvents > 0 ? (potholes / totalEvents * 100) : 0;
      const speedBreakersPercent = totalEvents > 0 ? (speedBreakers / totalEvents * 100) : 0;

      const htmlContent = `
        <html>
        <head>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background-color: #faf9f6;
              color: #1c1b18;
              padding: 40px;
              margin: 0;
            }
            .header {
              border-bottom: 3px solid #1c1b18;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #f97316;
            }
            h1 {
              font-size: 32px;
              color: #1c1b18;
              margin: 5px 0 0 0;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-grid {
              display: flex;
              flex-wrap: wrap;
              margin-bottom: 30px;
              gap: 15px;
            }
            .meta-card {
              background: #ffffff;
              padding: 16px;
              border-radius: 12px;
              border: 1px solid #e3ddd0;
              flex: 1;
              min-width: 150px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            }
            .meta-label {
              font-size: 10px;
              color: #8a857a;
              text-transform: uppercase;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .meta-val {
              font-size: 20px;
              font-weight: 800;
              color: #1c1b18;
              margin-top: 6px;
            }
            .narrative-card {
              background: #f1ede4;
              border-left: 5px solid #2f4858;
              padding: 20px;
              border-radius: 0 12px 12px 0;
              margin-bottom: 30px;
              font-size: 14px;
              line-height: 1.6;
              color: #2f4858;
            }
            .two-col {
              display: flex;
              gap: 30px;
              margin-bottom: 30px;
            }
            .col {
              flex: 1;
            }
            .section-title {
              font-size: 18px;
              font-weight: 700;
              color: #1c1b18;
              text-transform: uppercase;
              margin-bottom: 15px;
              letter-spacing: 0.5px;
              border-bottom: 1.5px solid #e3ddd0;
              padding-bottom: 6px;
            }
            .stat-bar-container {
              margin-bottom: 12px;
            }
            .stat-bar-label {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .stat-bar-bg {
              background: #e3ddd0;
              height: 10px;
              border-radius: 5px;
              overflow: hidden;
            }
            .stat-bar-fill {
              height: 100%;
              border-radius: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              border: 1px solid #e3ddd0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            }
            th {
              background: #1c1b18;
              color: #ffffff;
              padding: 14px 16px;
              text-align: left;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              padding: 12px 16px;
              border-bottom: 1px solid #e3ddd0;
              font-size: 13px;
              color: #5a564c;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .pothole-badge {
              color: #ef4444;
              font-weight: 800;
            }
            .breaker-badge {
              color: #f59e0b;
              font-weight: 800;
            }
            .quality-Excellent { color: #10b981; }
            .quality-Good { color: #34d399; }
            .quality-Fair { color: #f59e0b; }
            .quality-Poor { color: #f97316; }
            .quality-Very-Poor { color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">RoadSense AI Telemetry</div>
            <h1>Trip Report</h1>
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-label">Trip ID</div>
              <div class="meta-val" style="font-size: 10px; word-break: break-all; margin-top: 8px;">${completedTripDetails.tripId}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Vehicle & Mount</div>
              <div class="meta-val" style="font-size: 14px; margin-top: 8px;">${completedTripDetails.vehicleType.replace('_', ' ').toUpperCase()} (${completedTripDetails.placement.toUpperCase()})</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Distance Covered</div>
              <div class="meta-val">${completedTripDetails.distanceKm.toFixed(2)} km</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Duration</div>
              <div class="meta-val">${completedTripDetails.durationFormatted}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Quality Score</div>
              <div class="meta-val quality-${label.replace(' ', '-')}">${score} <span style="font-size: 12px; font-weight: normal;">(${label})</span></div>
            </div>
          </div>

          <div class="narrative-card">
            This trip was completed using a <strong>${completedTripDetails.vehicleType.replace('_', ' ')}</strong> with the device placed in <strong>${completedTripDetails.placement}</strong> configuration. 
            A total of <strong>${completedTripDetails.eventCount}</strong> road anomalies were detected over a distance of <strong>${completedTripDetails.distanceKm.toFixed(2)} km</strong>, resulting in a road quality rating of <strong>${label}</strong> (${score}/100). 
            The vehicle traveled at an average detection speed of <strong>${avgSpeed.toFixed(1)} km/h</strong>.
          </div>

          <div class="two-col">
            <div class="col">
              <div class="section-title">Anomaly Distribution</div>
              <div class="stat-bar-container">
                <div class="stat-bar-label">
                  <span>Potholes</span>
                  <span>${potholes} (${potholesPercent.toFixed(0)}%)</span>
                </div>
                <div class="stat-bar-bg">
                  <div class="stat-bar-fill" style="width: ${potholesPercent}%; background-color: #ef4444;"></div>
                </div>
              </div>
              <div class="stat-bar-container">
                <div class="stat-bar-label">
                  <span>Speed Breakers</span>
                  <span>${speedBreakers} (${speedBreakersPercent.toFixed(0)}%)</span>
                </div>
                <div class="stat-bar-bg">
                  <div class="stat-bar-fill" style="width: ${speedBreakersPercent}%; background-color: #f59e0b;"></div>
                </div>
              </div>
            </div>

            <div class="col">
              <div class="section-title">Estimated Severity</div>
              <div class="stat-bar-container">
                <div class="stat-bar-label">
                  <span>Critical (>1.5g)</span>
                  <span>${severityBreakdown.CRITICAL}</span>
                </div>
                <div class="stat-bar-bg">
                  <div class="stat-bar-fill" style="width: ${totalEvents > 0 ? (severityBreakdown.CRITICAL / totalEvents * 100) : 0}%; background-color: #7f1d1d;"></div>
                </div>
              </div>
              <div class="stat-bar-container">
                <div class="stat-bar-label">
                  <span>High (1.0g - 1.5g)</span>
                  <span>${severityBreakdown.HIGH}</span>
                </div>
                <div class="stat-bar-bg">
                  <div class="stat-bar-fill" style="width: ${totalEvents > 0 ? (severityBreakdown.HIGH / totalEvents * 100) : 0}%; background-color: #ef4444;"></div>
                </div>
              </div>
              <div class="stat-bar-container">
                <div class="stat-bar-label">
                  <span>Medium (0.5g - 1.0g)</span>
                  <span>${severityBreakdown.MEDIUM}</span>
                </div>
                <div class="stat-bar-bg">
                  <div class="stat-bar-fill" style="width: ${totalEvents > 0 ? (severityBreakdown.MEDIUM / totalEvents * 100) : 0}%; background-color: #f59e0b;"></div>
                </div>
              </div>
              <div class="stat-bar-container">
                <div class="stat-bar-label">
                  <span>Low (<0.5g)</span>
                  <span>${severityBreakdown.LOW}</span>
                </div>
                <div class="stat-bar-bg">
                  <div class="stat-bar-fill" style="width: ${totalEvents > 0 ? (severityBreakdown.LOW / totalEvents * 100) : 0}%; background-color: #3b82f6;"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="section-title">Detailed Road Anomaly Log</div>
          ${completedTripDetails.events.length === 0 ? `
            <div style="background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e3ddd0; text-align: center; color: #8a857a; font-size: 14px;">
              Clean road detected! No potholes or speed breakers were recorded during this trip.
            </div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Coordinates (Lat, Lng)</th>
                  <th>Timestamp</th>
                  <th>Speed at Peak</th>
                  <th>Impact Force (g)</th>
                </tr>
              </thead>
              <tbody>
                ${completedTripDetails.events.map(poc => {
                  const type = poc.z_value < 0 ? 'Pothole' : 'Speed Breaker';
                  const time = new Date(poc.recorded_at).toLocaleTimeString();
                  const badgeClass = poc.z_value < 0 ? 'pothole-badge' : 'breaker-badge';
                  return `
                    <tr>
                      <td><span class="${badgeClass}">${type}</span></td>
                      <td>${poc.lat.toFixed(6)}, ${poc.lng.toFixed(6)}</td>
                      <td>${time}</td>
                      <td>${poc.speed_kmh.toFixed(1)} km/h</td>
                      <td style="font-family: monospace; font-weight: bold;">${poc.z_value.toFixed(3)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Trip PDF Report' });
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Failed to export PDF');
    }
  };

  const fetchNearbyEvents = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await api.events.nearby(lat, lng, 5000);
      setCommunityEvents(response.data || []);
      lastFetchedNearbyLocRef.current = { lat, lng };
    } catch (e) {
      console.warn('Failed to fetch nearby community events:', e);
    }
  }, []);

  const startTrip = async () => {
    setStarting(true);
    syncManager.syncOfflineData().catch(e => console.warn('Offline sync failed:', e));
    try {
      // Ensure location permission is granted BEFORE any GPS calls
      const permitted = await ensureLocationPermission();
      if (!permitted) {
        Alert.alert(
          'Location Required',
          'Please grant location permission and ensure GPS/Location Services are enabled to start a trip.',
        );
        setStarting(false);
        return;
      }

      // Read preferences (instant, from local storage)
      const vehicleType = (await SecureStore.getItemAsync('vehicleType')) as VehicleType ?? 'two_wheeler';
      const placement = (await SecureStore.getItemAsync('placement')) as Placement ?? 'mounter';

      // Try to get initial location, fallback gracefully if it fails/times out
      let loc: Location.LocationObject;
      let isFallback = false;
      try {
        loc = await getLocationSafe({ accuracy: Location.Accuracy.Balanced, timeoutMs: 6000 });
      } catch (err: any) {
        console.warn('[startTrip] Initial location fetch failed, using fallback:', err.message);
        isFallback = true;
        
        // Try to retrieve any last known location as a better fallback
        const lastKnownAny = await Location.getLastKnownPositionAsync().catch(() => null);
        if (lastKnownAny) {
          loc = lastKnownAny;
        } else {
          loc = {
            coords: {
              latitude: 23.55,
              longitude: 87.31,
              altitude: null,
              accuracy: null,
              altitudeAccuracy: null,
              heading: null,
              speed: 0,
            },
            timestamp: Date.now(),
          } as Location.LocationObject;
        }
      }

      // Create a trip on the backend. This is critical.
      const tripResponse = await api.trips.create(vehicleType, placement);
      const trip = tripResponse.data;

      // Set UI state immediately
      const initCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      const initSpeed = Math.max(0, (loc.coords.speed ?? 0) * 3.6);
      const initRoute = !isFallback ? [initCoords] : [];

      setTelemetry({
        coords: initCoords,
        speed: initSpeed,
        route: initRoute,
      });

      setMapRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setActiveTrip(trip);

      if (!isFallback) {
        lastCoordRef.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        fetchNearbyEvents(loc.coords.latitude, loc.coords.longitude).catch(console.error);
      } else {
        lastCoordRef.current = null;
      }

      // Start timer immediately — don't wait for sensors
      timerRef.current = setInterval(() => incrementElapsed(), 1000);

      // Start sensors and location watch (non-blocking — don't await serially)
      const engine = new SensorEngine({
        tripId: trip.id,
        vehicleType,
        placement,
        onPocDetected: handlePocDetected,
        onFlush: handleFlush,
      });
      engineRef.current = engine;
      setEngineInstance(engine);

      // Fire both in parallel — sensor start + location watch
      // Use catch to prevent engine start or location watch failures from breaking the active screen
      try {
        const [, locSub] = await Promise.all([
          engine.start().catch((err) => {
            console.warn('[startTrip] SensorEngine start failed:', err);
          }),
          Location.watchPositionAsync(
            { distanceInterval: 20, accuracy: Location.Accuracy.Balanced },
            (loc) => {
              if (!isMountedRef.current) return;
              const point = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
              const speedMs = loc.coords.speed ?? 0;
              const speed = Math.max(0, speedMs * 3.6);

              // Fetch nearby community events dynamically as we move (every 1km)
              if (lastFetchedNearbyLocRef.current) {
                const distSinceLastFetch = haversineKm(
                  lastFetchedNearbyLocRef.current.lat,
                  lastFetchedNearbyLocRef.current.lng,
                  point.latitude,
                  point.longitude
                );
                if (distSinceLastFetch > 1.0) {
                  fetchNearbyEvents(point.latitude, point.longitude).catch(console.error);
                }
              } else {
                fetchNearbyEvents(point.latitude, point.longitude).catch(console.error);
              }

              setTelemetry((prev) => {
                let newRoute = prev.route;
                if (lastCoordRef.current) {
                  const d = haversineKm(lastCoordRef.current.lat, lastCoordRef.current.lng, point.latitude, point.longitude);
                  if (d > 0.005) {
                    incrementDistance(d); // ignore GPS noise < 5m
                    newRoute = [...prev.route, point];
                    lastCoordRef.current = { lat: point.latitude, lng: point.longitude };
                  }
                } else {
                  newRoute = [point];
                  lastCoordRef.current = { lat: point.latitude, lng: point.longitude };
                }

                return {
                  coords: point,
                  speed: speed,
                  route: newRoute,
                };
              });

              const now = Date.now();
              if (followUserRef.current && now - lastAnimateTimeRef.current >= 2000) {
                mapRef.current?.animateToRegion({ ...point, latitudeDelta: 0.01, longitudeDelta: 0.01 });
                lastAnimateTimeRef.current = now;
              }
            }
          ).catch((err) => {
            console.warn('[startTrip] Location watch failed:', err);
            return null;
          }),
        ]);
        if (locSub) {
          if (!isMountedRef.current || ending) {
            locSub.remove();
          } else {
            locSubRef.current = locSub;
          }
        }
      } catch (err) {
        console.warn('[startTrip] Non-critical initialization error:', err);
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.detail
        ? (typeof e.response.data.detail === 'string' ? e.response.data.detail : JSON.stringify(e.response.data.detail))
        : (e.message ?? 'Failed to start trip');
      console.error('[startTrip] Failed to start trip:', e);
      Alert.alert('Error Starting Trip', errMsg);
    } finally {
      setStarting(false);
    }
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    setCompletedTripDetails(null);
    setEnding(false);
    router.replace('/(tabs)/home');
    resetTrip();
  };

  const endTrip = async () => {
    if (!activeTrip || ending) return;
    setEnding(true);

    // Stop sensors and location immediately
    engineRef.current?.stop();
    setEngineInstance(null);
    locSubRef.current?.remove();
    if (timerRef.current) clearInterval(timerRef.current);

    // Capture trip details for summary screen
    setCompletedTripDetails({
      tripId: activeTrip.id,
      distanceKm: distanceKm,
      durationFormatted: formatTime(elapsedSeconds),
      eventCount: eventCount,
      events: [...pocBufferRef.current],
      vehicleType: activeTrip.vehicle_type || 'two_wheeler',
      placement: activeTrip.phone_placement || 'mounter',
    });
    setShowSummary(true);

    // Fire API calls, handle offline storage on failure
    const tripId = activeTrip.id;
    const pocs = [...pocBufferRef.current];
    pocBufferRef.current = [];

    (async () => {
      let endFailed = false;
      let pocsFailed = false;

      try {
        await api.trips.end(tripId);
      } catch (e) {
        console.warn('[endTrip] Failed to end trip on server:', e);
        endFailed = true;
      }

      if (pocs.length > 0) {
        try {
          await api.trips.uploadPoc(tripId, pocs);
        } catch (e) {
          console.warn('[endTrip] Failed to upload POCs to server:', e);
          pocsFailed = true;
        }
      }

      if (endFailed || pocsFailed) {
        await syncManager.saveUnsyncedTrip({
          tripId,
          pocs,
          endNeedsSync: endFailed,
          pocsNeedSync: pocsFailed,
        });
      }
    })();
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      engineRef.current?.stop();
      setEngineInstance(null);
      locSubRef.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!activeTrip) {
    return (
      <View style={styles.startContainer}>
        <LinearGradient colors={gradients.aurora as any} style={StyleSheet.absoluteFill} />
        <View style={styles.orbOne} />
        <View style={styles.orbTwo} />
        <Animated.View entering={FadeInDown.duration(500)} style={styles.startContent}>
          <Text style={styles.startEyebrow}>NEW SESSION</Text>
          <Animated.View style={iconStyle}>
            <LinearGradient
              colors={gradients.accent as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startIconCircle}
            >
              <MaterialCommunityIcons name="navigation-variant" size={48} color="#fff" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.startTitle}>Ready to ride?</Text>
          <Text style={styles.startSub}>
            RoadSense will detect road anomalies{'\n'}as you drive
          </Text>

          <View style={styles.startStats}>
            <View style={styles.startStatItem}>
              <View style={styles.startStatIcon}>
                <MaterialCommunityIcons name="cellphone-arrow-down" size={18} color={colors.accent} />
              </View>
              <Text style={styles.startStatText}>Keep phone{'\n'}steady</Text>
            </View>
            <View style={styles.startStatDivider} />
            <View style={styles.startStatItem}>
              <View style={styles.startStatIcon}>
                <MaterialCommunityIcons name="map-marker-path" size={18} color={colors.accent} />
              </View>
              <Text style={styles.startStatText}>Route auto{'\n'}tracked</Text>
            </View>
            <View style={styles.startStatDivider} />
            <View style={styles.startStatItem}>
              <View style={styles.startStatIcon}>
                <MaterialCommunityIcons name="shield-check" size={18} color={colors.success} />
              </View>
              <Text style={styles.startStatText}>Data stays{'\n'}private</Text>
            </View>
          </View>

          <TouchableOpacity onPress={startTrip} disabled={starting} activeOpacity={0.85} style={{ width: '100%' }}>
            <LinearGradient
              colors={gradients.accent as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.startBtn, shadows.lg]}
            >
              <MaterialCommunityIcons name="play" size={22} color="#fff" />
              <Text style={styles.startBtnText}>{starting ? 'Starting…' : 'Start Trip'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (showSummary && completedTripDetails) {
    return (
      <View style={styles.summaryContainer}>
        <LinearGradient colors={gradients.aurora as any} style={StyleSheet.absoluteFill} />
        <View style={styles.orbOne} />
        <View style={styles.orbTwo} />
        <SafeAreaView style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.summaryContent}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryEyebrow}>RIDE COMPLETED</Text>
              <Text style={styles.summaryTitle}>Journey Summary</Text>
              <Text style={styles.summarySub}>Your trip has been mapped and uploaded.</Text>
            </View>

            <View style={styles.summaryStatsGrid}>
              <View style={[styles.summaryStatCard, shadows.sm]}>
                <MaterialCommunityIcons name="map-marker-distance" size={24} color={colors.accent} />
                <Text style={styles.summaryStatLabel}>Distance</Text>
                <Text style={styles.summaryStatVal}>{completedTripDetails.distanceKm.toFixed(2)} km</Text>
              </View>
              <View style={[styles.summaryStatCard, shadows.sm]}>
                <MaterialCommunityIcons name="clock-outline" size={24} color={colors.accent} />
                <Text style={styles.summaryStatLabel}>Duration</Text>
                <Text style={styles.summaryStatVal}>{completedTripDetails.durationFormatted}</Text>
              </View>
              <View style={[styles.summaryStatCard, shadows.sm]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={24} color={colors.danger} />
                <Text style={styles.summaryStatLabel}>Anomalies</Text>
                <Text style={styles.summaryStatVal}>{completedTripDetails.eventCount}</Text>
              </View>
            </View>

            <View style={[styles.exportCard, shadows.md]}>
              <Text style={styles.exportCardTitle}>Export Trip Report</Text>
              <Text style={styles.exportCardSub}>Download or share the details of this trip in your preferred format:</Text>
              
              <View style={styles.exportBtnsWrap}>
                <TouchableOpacity onPress={exportToCSV} activeOpacity={0.8} style={styles.exportBtn}>
                  <LinearGradient colors={gradients.primary as any} style={styles.exportBtnGradient}>
                    <MaterialCommunityIcons name="file-delimited-outline" size={18} color="#fff" />
                    <Text style={styles.exportBtnText}>CSV Report</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={exportToExcel} activeOpacity={0.8} style={styles.exportBtn}>
                  <LinearGradient colors={gradients.accent as any} style={styles.exportBtnGradient}>
                    <MaterialCommunityIcons name="file-excel-outline" size={18} color="#fff" />
                    <Text style={styles.exportBtnText}>Excel Report</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={exportToPDF} activeOpacity={0.8} style={styles.exportBtn}>
                  <LinearGradient colors={gradients.danger as any} style={styles.exportBtnGradient}>
                    <MaterialCommunityIcons name="file-pdf-box" size={18} color="#fff" />
                    <Text style={styles.exportBtnText}>PDF Report</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={handleCloseSummary} activeOpacity={0.85} style={styles.closeSummaryBtn}>
              <Text style={styles.closeSummaryBtnText}>Done & Return Home</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType="none"
        initialRegion={mapRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={(reg, details) => {
          if (details?.isGesture) {
            setFollowUser(false);
          }
        }}
      >
        <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} flipY={false} zIndex={1} />
        {route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}

        {/* Community reported events */}
        {communityEvents.map((evt) => (
          <EventMarker
            key={`community-${evt.id}`}
            event={evt}
            onPress={() => {}}
          />
        ))}

        {/* Live detected events during this trip */}
        {detectedEvents.map((evt) => {
          const isLive = Date.now() - evt.time < 5000;
          return (
            <TripEventMarker
              key={`detected-${evt.id}`}
              coordinate={{ latitude: evt.lat, longitude: evt.lng }}
              eventType={evt.type}
              isLive={isLive}
            />
          );
        })}
      </MapView>

      {/* Glassmorphism stats panel */}
      <View style={[styles.statsWrap, { top: insets.top + 12 }]}>
        <BlurView intensity={80} tint="light" style={styles.statsBlur}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.statsRow}>
              <StatCard label="Distance" value={`${distanceKm.toFixed(1)} km`} accentColor={colors.primary} />
              <StatCard label="Duration" value={formatTime(elapsedSeconds)} accentColor={colors.accent} />
              <StatCard label="Events" value={eventCount} sub={lastEventLabel ?? undefined} accentColor={colors.warning} />
            </View>
          </Animated.View>
        </BlurView>
      </View>

      {/* Real-time Telemetry & Confirmations Feed */}
      <View style={styles.telemetryWrap}>
        <BlurView intensity={80} tint="light" style={styles.telemetryBlur}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryTitle}>Live Telemetry</Text>
            <TouchableOpacity 
              style={[styles.soundBtn, soundEnabled && styles.soundBtnActive]} 
              onPress={() => setSoundEnabled(!soundEnabled)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name={soundEnabled ? "volume-high" : "volume-off"} 
                size={16} 
                color={soundEnabled ? colors.success : colors.textMuted} 
              />
              <Text style={[styles.soundText, { color: soundEnabled ? colors.success : colors.textMuted }]}>
                {soundEnabled ? "Sound ON" : "Sound OFF"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <TelemetryDisplay engine={engineInstance} />

          <View style={styles.telemetryDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="speedometer" size={16} color={colors.primary} />
              <Text style={styles.detailText}>Speed: <Text style={styles.detailHighlight}>{liveSpeed.toFixed(1)} km/h</Text></Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="earth" size={16} color={colors.accent} />
              <Text style={styles.detailText}>Coords: <Text style={styles.detailHighlight}>{liveCoords.longitude.toFixed(5)}, {liveCoords.latitude.toFixed(5)}</Text></Text>
            </View>
          </View>

          {recentDetections.length > 0 && (
            <View style={styles.feedContainer}>
              <Text style={styles.feedTitle}>Session Confirmations & Detections</Text>
              {recentDetections.map((det) => (
                <View key={det.id} style={styles.feedItem}>
                  <MaterialCommunityIcons 
                    name={det.type === 'pothole' ? "circle-off-outline" : det.type === 'speed_breaker' ? "alert-circle" : "road-variant"} 
                    size={14} 
                    color={det.type === 'pothole' ? "#ef4444" : det.type === 'speed_breaker' ? "#f59e0b" : "#f97316"} 
                  />
                  <Text style={styles.feedItemText}>
                    {det.type.replace('_', ' ').toUpperCase()} detected
                  </Text>
                  <Text style={styles.feedItemTime}>{det.time}</Text>
                </View>
              ))}
            </View>
          )}
        </BlurView>
      </View>

      {/* Interactive Confirmations Popup */}
      {confirmationsQueue.length > 0 && (
        <View style={styles.confirmWrap}>
          <BlurView intensity={90} tint="light" style={styles.confirmBlur}>
            <View style={styles.confirmHeader}>
              <MaterialCommunityIcons
                name={confirmationsQueue[0].z_value < 0 ? "circle-off-outline" : "alert-circle"}
                size={24}
                color={confirmationsQueue[0].z_value < 0 ? colors.danger : colors.warning}
              />
              <View style={styles.confirmTextContainer}>
                <Text style={styles.confirmTitle}>
                  {confirmationsQueue[0].z_value < 0 ? "Pothole Detected" : "Speed Breaker Detected"}
                  {confirmationsQueue.length > 1 && (
                    <Text style={styles.confirmBadge}> (+{confirmationsQueue.length - 1} more)</Text>
                  )}
                </Text>
                <Text style={styles.confirmSub}>
                  Confirm this road event to help others.
                </Text>
              </View>
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnYes]}
                onPress={() => handleConfirmDetection(confirmationsQueue[0], true)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmBtnTextYes}>Yes, Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnSwitch]}
                onPress={() => handleConfirmDetection(confirmationsQueue[0], false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmBtnTextSwitch}>
                  {confirmationsQueue[0].z_value < 0 ? "Its Breaker" : "Its Pothole"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnNo]}
                onPress={handleDismissDetection}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmBtnTextNo}>Dismiss</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.confirmProgressContainer}>
              <Animated.View style={[styles.confirmProgressBar, progressStyle]} />
            </View>
          </BlurView>
        </View>
      )}

      {/* GPS Location follow button */}
      <TouchableOpacity
        style={styles.locationBtn}
        onPress={() => {
          setFollowUser(true);
          if (liveCoords.latitude && liveCoords.longitude) {
            mapRef.current?.animateToRegion({
              ...liveCoords,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000);
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={followUser ? gradients.accent as any : gradients.surface as any}
          style={styles.locationBtnInner}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={followUser ? "#fff" : colors.accent} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Quick report buttons */}
      <View style={styles.quickReportWrap}>
        <TouchableOpacity
          style={styles.quickReportBtn}
          onPress={() => handleManualReport('pothole')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="circle-off-outline" size={22} color="#ef4444" />
          <Text style={styles.quickReportLabel}>Pothole</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickReportBtn}
          onPress={() => handleManualReport('speed_breaker')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="alert-circle" size={22} color="#f59e0b" />
          <Text style={styles.quickReportLabel}>Breaker</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickReportBtn}
          onPress={() => handleManualReport('broken_patch')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="road-variant" size={22} color="#f97316" />
          <Text style={styles.quickReportLabel}>Patch</Text>
        </TouchableOpacity>
      </View>

      {/* End trip button */}
      <View style={styles.endWrap}>
        <TouchableOpacity onPress={endTrip} disabled={ending} activeOpacity={0.85}>
          <LinearGradient
            colors={ending ? gradients.primary as any : gradients.danger as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.endBtn, shadows.md, ending && { opacity: 0.7 }]}
          >
            <MaterialCommunityIcons name="stop" size={20} color="#fff" />
            <Text style={styles.endBtnText}>{ending ? 'Ending…' : 'End Trip'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const TelemetryDisplay = React.memo(({ engine }: { engine: SensorEngine | null }) => {
  const [sensors, setSensors] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (!engine) {
      setSensors({ x: 0, y: 0, z: 0 });
      return;
    }

    let lastUpdate = 0;
    const unsubscribe = engine.addSensorListener((data) => {
      const now = Date.now();
      if (now - lastUpdate > 250) { // update at most 4 times a second (250ms)
        setSensors(data);
        lastUpdate = now;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [engine]);

  return (
    <View style={styles.telemetryGrid}>
      <View style={styles.telemetryCol}>
        <Text style={styles.telemetryLabel}>X Force (g)</Text>
        <Text style={styles.telemetryValue}>{sensors.x.toFixed(3)}</Text>
      </View>
      <View style={styles.telemetryDivider} />
      <View style={styles.telemetryCol}>
        <Text style={styles.telemetryLabel}>Y Force (g)</Text>
        <Text style={styles.telemetryValue}>{sensors.y.toFixed(3)}</Text>
      </View>
      <View style={styles.telemetryDivider} />
      <View style={styles.telemetryCol}>
        <Text style={styles.telemetryLabel}>Z Force (g)</Text>
        <Text style={styles.telemetryValue}>{sensors.z.toFixed(3)}</Text>
      </View>
    </View>
  );
});
TelemetryDisplay.displayName = 'TelemetryDisplay';

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  // Start screen
  startContainer: { flex: 1, backgroundColor: colors.bg },
  orbOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(47,72,88,0.08)',
    top: -60,
    right: -120,
  },
  orbTwo: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(47,72,88,0.08)',
    bottom: -80,
    left: -140,
  },
  startEyebrow: { ...typography.label, color: colors.accent, marginBottom: spacing.sm },
  startContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  startIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  startTitle: { ...typography.display, color: colors.textPrimary, textAlign: 'center' },
  startSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  startStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  startStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  startStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(47,72,88,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startStatText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  startStatDivider: { width: 1, height: 40, backgroundColor: colors.border },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 18,
    borderRadius: radius.pill,
  },
  startBtnText: { ...typography.h2, color: '#fff' },
  // Active trip
  statsWrap: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statsBlur: {
    padding: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickReportWrap: {
    position: 'absolute',
    bottom: 170,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickReportBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.card,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  quickReportLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  endWrap: {
    position: 'absolute',
    bottom: 100,
    left: spacing.xl,
    right: spacing.xl,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 18,
    borderRadius: radius.pill,
  },
  endBtnText: { ...typography.h2, color: '#fff' },
  telemetryWrap: {
    position: 'absolute',
    top: 175,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...shadows.sm,
  },
  telemetryBlur: {
    padding: spacing.md,
  },
  telemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  telemetryTitle: {
    ...typography.label,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  soundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  soundBtnActive: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.2)',
  },
  soundText: {
    fontSize: 10,
    fontWeight: '700',
  },
  telemetryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  telemetryCol: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  telemetryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  telemetryDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  telemetryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  detailHighlight: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  feedContainer: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  feedTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  feedItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  feedItemTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  confirmWrap: {
    position: 'absolute',
    bottom: 250,
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  confirmBlur: {
    padding: spacing.md,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  confirmTextContainer: {
    flex: 1,
  },
  confirmTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  confirmBadge: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
  },
  confirmSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  confirmBtnYes: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  confirmBtnSwitch: {
    backgroundColor: 'transparent',
    borderColor: colors.accent,
  },
  confirmBtnNo: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  confirmBtnTextYes: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  confirmBtnTextSwitch: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  confirmBtnTextNo: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  confirmProgressContainer: {
    height: 3,
    backgroundColor: colors.borderLight,
    width: '100%',
    marginTop: spacing.sm,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  confirmProgressBar: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  // Summary styles
  summaryContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  summaryContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryEyebrow: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  summaryTitle: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  summarySub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  summaryStatLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  summaryStatVal: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  exportCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  exportCardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  exportCardSub: {
    ...typography.body,
    color: colors.textSecondary,
  },
  exportBtnsWrap: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  exportBtn: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  exportBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: spacing.sm,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeSummaryBtn: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(28,27,24,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  closeSummaryBtnText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  locationBtn: {
    position: 'absolute',
    right: spacing.md,
    bottom: 230,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...shadows.md,
  },
  locationBtnInner: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
