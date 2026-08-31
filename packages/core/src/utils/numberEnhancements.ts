// Duration units in seconds
const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

declare module 'numberEnhancements' {
    interface Number {
        get seconds(): number;
        get minutes(): number;
        get hours(): number;
    }
}

// Implementation of the duration methods
// Object.defineProperties(Number.prototype, {
//     seconds: {
//         get: function() {
//             return this * SECOND;
//         }
//     },
//     minutes: {
//         get: function() {
//             return this * MINUTE;
//         }
//     },
//     hours: {
//         get: function() {
//             return this * HOUR;
//         }
//     }
// });

// Example usage:
// 1.seconds  // returns 1
// 2.minutes  // returns 120
// 3.hours    // returns 10800
