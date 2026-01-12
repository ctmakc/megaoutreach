/**
 * Utilities for making automated actions appear more human-like
 */

import { Page } from 'playwright';

/**
 * Random delay between actions
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Add variance to a value (e.g., typing speed)
 */
export function addVariance(baseValue: number, variancePercent: number): number {
  const variance = baseValue * (variancePercent / 100);
  return baseValue + (Math.random() * variance * 2 - variance);
}

/**
 * Human-like typing with variable speed
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string,
  options: {
    minDelay?: number;
    maxDelay?: number;
    mistakes?: boolean;
  } = {}
): Promise<void> {
  const { minDelay = 50, maxDelay = 150, mistakes = false } = options;
  
  const element = await page.$(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  
  await element.click();
  await randomDelay(100, 300);
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Occasionally make and correct mistakes
    if (mistakes && Math.random() < 0.02) {
      const wrongChar = getRandomChar();
      await page.keyboard.type(wrongChar, { delay: addVariance(80, 20) });
      await randomDelay(100, 300);
      await page.keyboard.press('Backspace');
      await randomDelay(50, 150);
    }
    
    // Type character
    await page.keyboard.type(char, {
      delay: addVariance((minDelay + maxDelay) / 2, 30),
    });
    
    // Occasional pause (like thinking)
    if (Math.random() < 0.05) {
      await randomDelay(200, 500);
    }
    
    // Pause after punctuation
    if (['.', ',', '!', '?'].includes(char)) {
      await randomDelay(100, 300);
    }
  }
}

/**
 * Get a random character for simulating typos
 */
function getRandomChar(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  return chars[Math.floor(Math.random() * chars.length)];
}

/**
 * Shuffle array randomly
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get random user agent
 */
export function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Generate human-like schedule times
 * Returns times during typical working hours with natural distribution
 */
export function generateScheduleTimes(
  count: number,
  options: {
    startHour?: number;
    endHour?: number;
    timezone?: string;
    avoidLunch?: boolean;
  } = {}
): Date[] {
  const {
    startHour = 9,
    endHour = 18,
    avoidLunch = true,
  } = options;
  
  const times: Date[] = [];
  const workMinutes = (endHour - startHour) * 60;
  const lunchStart = 12 * 60; // 12:00
  const lunchEnd = 13 * 60; // 13:00
  
  for (let i = 0; i < count; i++) {
    let minutes: number;
    
    do {
      // Use gaussian-like distribution (more activity mid-morning and mid-afternoon)
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      
      // Map gaussian to work hours
      minutes = startHour * 60 + (workMinutes / 2) + (gaussian * workMinutes / 4);
      minutes = Math.max(startHour * 60, Math.min(endHour * 60 - 1, minutes));
      
    } while (avoidLunch && minutes >= lunchStart && minutes < lunchEnd);
    
    const date = new Date();
    date.setHours(Math.floor(minutes / 60));
    date.setMinutes(Math.floor(minutes % 60));
    date.setSeconds(Math.floor(Math.random() * 60));
    
    times.push(date);
  }
  
  return times.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Check if current time is within working hours
 */
export function isWithinWorkingHours(
  options: {
    startHour?: number;
    endHour?: number;
    workDays?: number[];
    timezone?: string;
  } = {}
): boolean {
  const {
    startHour = 9,
    endHour = 18,
    workDays = [1, 2, 3, 4, 5], // Monday to Friday
  } = options;
  
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  if (!workDays.includes(day)) {
    return false;
  }
  
  return hour >= startHour && hour < endHour;
}

/**
 * Calculate optimal send time for a contact based on their timezone/location
 */
export function getOptimalSendTime(
  location?: string,
  preferredHours: { start: number; end: number } = { start: 9, end: 11 }
): Date {
  const now = new Date();
  const targetDate = new Date(now);
  
  // Simple timezone estimation based on location
  let offsetHours = 0;
  if (location) {
    const loc = location.toLowerCase();
    if (loc.includes('москва') || loc.includes('moscow')) offsetHours = 0;
    else if (loc.includes('санкт-петербург') || loc.includes('petersburg')) offsetHours = 0;
    else if (loc.includes('екатеринбург') || loc.includes('yekaterinburg')) offsetHours = 2;
    else if (loc.includes('новосибирск') || loc.includes('novosibirsk')) offsetHours = 4;
    else if (loc.includes('владивосток') || loc.includes('vladivostok')) offsetHours = 7;
    else if (loc.includes('london') || loc.includes('лондон')) offsetHours = -3;
    else if (loc.includes('new york') || loc.includes('нью-йорк')) offsetHours = -8;
    else if (loc.includes('los angeles') || loc.includes('лос-анджелес')) offsetHours = -11;
  }
  
  // Calculate target hour
  const targetHour = preferredHours.start + Math.random() * (preferredHours.end - preferredHours.start);
  
  targetDate.setHours(Math.floor(targetHour - offsetHours));
  targetDate.setMinutes(Math.floor(Math.random() * 60));
  
  // If time has passed today, schedule for tomorrow
  if (targetDate < now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  
  // Skip weekends
  while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  
  return targetDate;
}