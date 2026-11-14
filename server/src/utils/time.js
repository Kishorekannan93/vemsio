export const timeToFloat = (value) => {
  if (typeof value === 'number') return value;
  if (!value || !String(value).includes(':')) return 0;
  try { const [h,m] = String(value).split(':').map(Number); return h + m / 60; } catch { return 0; }
};
export const floatToTime = (hours) => { const total = Math.round((Number(hours)||0)*60); return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`; };
export const SPECIAL_ACTIVITIES = ['Office meeting','Celebration','System problem','Training','Power cut','Permission','Late','Project discussion','Half day Leave'];
export const performanceStatus = (est,taken) => {
 if(est>0 && taken>0){const diff=est-taken;if(diff>=est*.2)return 'Excellent (>= 20% faster)';if(diff>0)return 'Good (Faster)';if(Math.abs(diff)<=est*.05)return 'On Track (Matches Est.)';if(diff>est*-.2)return 'Fair (Up to 20% slower)';return 'Needs Improvement (> 20% slower)';}
 if(taken>0 && est===0)return 'Time Logged (Est. Missing)'; return 'No Data';
};

export const parseHHMM = (value) => {
 const match = /^(\d{1,3}):([0-5]\d)$/.exec(String(value ?? '').trim());
 if (!match) throw new Error('Time must use HH:MM format (minutes 00–59).');
 return Number(match[1]) * 60 + Number(match[2]);
};
export const dailyCapacitySummary = (entries, capacity = 8.5) => {
 const productionMinutes = (entries || []).reduce((sum, entry) => sum + Math.max(0, parseHHMM(entry.production_hours || '00:00')), 0);
 const extraMinutes = (entries || []).reduce((sum, entry) => sum + Math.max(0, parseHHMM(entry.extra_hours || '00:00')), 0);
 const capMinutes = Math.max(0, Math.round(Number(capacity) * 60));
 return { remaining: Math.max(0, capMinutes - productionMinutes) / 60, production: productionMinutes / 60, extra: extraMinutes / 60, capacity: capMinutes / 60 };
};
export const allocateDailyTime = (taken, consumedProduction, capacity = 8.5) => {
 const takenMinutes = Math.max(0, typeof taken === 'string' ? parseHHMM(taken) : Math.round(Number(taken || 0) * 60));
 const consumedMinutes = Math.max(0, Math.round(Number(consumedProduction || 0) * 60));
 const capacityMinutes = Math.max(0, Math.round(Number(capacity || 0) * 60));
 const productionMinutes = Math.min(takenMinutes, Math.max(0, capacityMinutes - consumedMinutes));
 return { production: productionMinutes / 60, extra: (takenMinutes - productionMinutes) / 60 };
};
