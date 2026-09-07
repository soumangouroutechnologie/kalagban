import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const TELEMETRY_ADMIN_URL =
  process.env.EXPO_PUBLIC_ADMIN_URL ||
  (__DEV__ ? 'http://10.0.2.2:3000' : 'https://admin.kalagban.com');

const RECENT_ERRORS = new Set<string>();

let cachedDeviceId: string | null = null;

export async function getMobileDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const key = 'kalagban_mobile_device_id';
    let id = await AsyncStorage.getItem(key);
    if (!id) {
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      id = `mobile_${Platform.OS}_${randomSuffix}_${Date.now().toString(36)}`;
      await AsyncStorage.setItem(key, id);
    }
    cachedDeviceId = id;
    return id;
  } catch {
    return `mobile_${Platform.OS}_anon`;
  }
}

export function getMobileDeviceInfo(): { os: string; model: string; version: string } {
  const os = Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : 'Autre';
  const model = Device.modelName || Device.productName || `${Platform.OS.toUpperCase()} Device`;
  const version = Constants.expoConfig?.version || '1.0.0';

  return { os, model, version };
}

export interface MobileTelemetryParams {
  app?: 'mobile-buyer' | 'mobile-seller';
  level?: 'fatal' | 'error' | 'warning' | 'info';
  message: string;
  error_stack?: string;
  route_path?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export async function reportMobileError(params: MobileTelemetryParams): Promise<void> {
  const errorKey = `${params.message}::${params.error_stack?.slice(0, 100)}`;
  if (RECENT_ERRORS.has(errorKey)) return;
  RECENT_ERRORS.add(errorKey);
  setTimeout(() => RECENT_ERRORS.delete(errorKey), 10000);

  const { os, model, version } = getMobileDeviceInfo();
  const device_id = await getMobileDeviceId();

  const payload = {
    app: params.app || 'mobile-buyer',
    level: params.level || 'error',
    message: String(params.message).slice(0, 1000),
    error_stack: params.error_stack ? String(params.error_stack).slice(0, 4000) : undefined,
    device_id,
    device_os: os,
    device_model: model,
    app_version: version,
    route_path: params.route_path,
    user_id: params.user_id,
    metadata: {
      ...params.metadata,
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      osVersion: Device.osVersion,
      totalMemory: Device.totalMemory,
      timestamp: new Date().toISOString(),
    },
  };

  try {
    const endpoint = `${TELEMETRY_ADMIN_URL}/api/telemetry/report`;
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    try {
      await supabase.from('system_logs').insert({
        service_name: payload.app,
        log_level: payload.level,
        message: payload.message,
        payload: {
          ...payload.metadata,
          error_stack: payload.error_stack,
          device_id: payload.device_id,
          device_os: payload.device_os,
          device_model: payload.device_model,
          route_path: payload.route_path,
        },
      });
    } catch (dbErr) {
      console.warn('Mobile telemetry reporting failed:', dbErr);
    }
  }
}

let isGlobalHandlerSet = false;

export function initMobileCrashHandler(appName: 'mobile-buyer' | 'mobile-seller' = 'mobile-buyer') {
  if (isGlobalHandlerSet) return;
  isGlobalHandlerSet = true;

  // React Native Global Error Handler
  const defaultHandler = (globalThis as any).ErrorUtils?.getGlobalHandler?.();

  if ((globalThis as any).ErrorUtils) {
    (globalThis as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      reportMobileError({
        app: appName,
        level: isFatal ? 'fatal' : 'error',
        message: error?.message || 'Erreur React Native globale non interceptée',
        error_stack: error?.stack,
      });

      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });
  }
}
