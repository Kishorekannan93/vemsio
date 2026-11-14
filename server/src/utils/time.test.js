import test from 'node:test'; import assert from 'node:assert/strict'; import {timeToFloat,floatToTime,performanceStatus,allocateDailyTime,dailyCapacitySummary,parseHHMM} from './time.js';
test('legacy HH:MM conversions',()=>{assert.equal(timeToFloat('08:30'),8.5);assert.equal(timeToFloat('01:15'),1.25);assert.equal(floatToTime(8.75),'08:45');assert.equal(floatToTime(0),'00:00')});
test('legacy performance thresholds',()=>{assert.equal(performanceStatus(10,7.5),'Excellent (>= 20% faster)');assert.equal(performanceStatus(10,9),'Good (Faster)');assert.equal(performanceStatus(10,10.4),'On Track (Matches Est.)');assert.equal(performanceStatus(10,11.5),'Fair (Up to 20% slower)');assert.equal(performanceStatus(10,13),'Needs Improvement (> 20% slower)');assert.equal(performanceStatus(0,2),'Time Logged (Est. Missing)');assert.equal(performanceStatus(0,0),'No Data')});

test('daily 08:30 capacity allocates production first, then extra',()=>{
 const a=allocateDailyTime(5,0);assert.equal(floatToTime(a.production),'05:00');assert.equal(floatToTime(a.extra),'00:00');
 const b=allocateDailyTime(4,5);assert.equal(floatToTime(b.production),'03:30');assert.equal(floatToTime(b.extra),'00:30');
 const c=allocateDailyTime(1,8.5);assert.equal(floatToTime(c.production),'00:00');assert.equal(floatToTime(c.extra),'01:00');
});
test('deleting an entry releases its consumed production capacity for the next new entry',()=>{
 const afterDelete=allocateDailyTime(4,3.5);assert.equal(floatToTime(afterDelete.production),'04:00');assert.equal(floatToTime(afterDelete.extra),'00:00');
});
test('daily capacity is not exceeded by production allocation',()=>{
 const a=allocateDailyTime(10,7);assert.equal(floatToTime(a.production),'01:30');assert.equal(floatToTime(a.extra),'08:30');
});
test('remaining production display drops from 08:30 to 03:30 after a 05:00 entry',()=>{
 const summary=dailyCapacitySummary([{production_hours:'05:00',extra_hours:'00:00'}]);
 assert.equal(floatToTime(summary.remaining),'03:30');
});
test('deleting the only 05:00 entry restores remaining production to 08:30',()=>{
 const before=dailyCapacitySummary([{production_hours:'05:00',extra_hours:'00:00'}]);
 const afterDelete=dailyCapacitySummary([]);
 assert.equal(floatToTime(before.remaining),'03:30');
 assert.equal(floatToTime(afterDelete.remaining),'08:30');
});
test('extra time starts only after the remaining production capacity is used',()=>{
 const five=allocateDailyTime('05:00',0);
 const four=allocateDailyTime('04:00',5);
 assert.equal(floatToTime(five.extra),'00:00');
 assert.equal(floatToTime(four.production),'03:30');
 assert.equal(floatToTime(four.extra),'00:30');
});
test('reject invalid HH:MM minute values',()=>{
 assert.throws(()=>parseHHMM('05:75'));
 assert.throws(()=>parseHHMM('5.5'));
 assert.equal(parseHHMM('05:30'),330);
});
