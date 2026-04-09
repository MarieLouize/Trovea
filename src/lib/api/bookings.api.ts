import { apiClient } from './client';
import type { Booking, AvailabilityWindow } from '@/lib/types';

export async function getBookingsByMerchant(): Promise<Booking[]> {
  const { data } = await apiClient.get('/bookings');
  return data;
}

export async function createBooking(dto: any): Promise<Booking> {
  const { data } = await apiClient.post('/bookings', dto);
  return data;
}

export async function updateBooking(id: string, dto: any): Promise<Booking> {
  const { data } = await apiClient.patch(`/bookings/${id}`, dto);
  return data;
}

export async function getWindowsByMerchant(): Promise<AvailabilityWindow[]> {
  const { data } = await apiClient.get('/windows');
  return data;
}

export async function createWindow(dto: any): Promise<AvailabilityWindow> {
  const { data } = await apiClient.post('/windows', dto);
  return data;
}

export async function updateWindow(id: string, dto: any): Promise<AvailabilityWindow> {
  const { data } = await apiClient.patch(`/windows/${id}`, dto);
  return data;
}

export async function deleteWindow(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`/windows/${id}`);
  return data;
}

export async function getOpenWindows(merchantId: string): Promise<AvailabilityWindow[]> {
  const { data } = await apiClient.get(`/windows/merchant/${merchantId}/open`);
  return data;
}
