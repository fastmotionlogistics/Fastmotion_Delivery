// import * as moment from 'moment';
const moment = require('moment');
const moment_tz = require('moment-timezone');
// import * as moment_tz from '';
import * as crypto from 'crypto';
export const CONFIG_NAMES = {
  SINGLE_ELECTION_QUEUE_JOB_NOTIFICATION: 'SINGLE_ELECTION_QUEUE_JOB_NOTIFICATION',
  STAGED_ELECTION_QUEUE_JOB_NOTIFICATION: 'STAGED_ELECTION_QUEUE_JOB_NOTIFICATION',
  ELECTION_TRANSACTIONS: 'ELECTION_TRANSACTIONS',
  ACTIVE_ELECTIONS_JOBS: 'ACTIVE_ELECTIONS_JOBS',
};

export const JOB_NAMES = {
  ELECTION_SEND_EMAIL: 'ELECTION_SEND_EMAIL',
  NOTHING_TO_INITIAL_CHANGE_SINGLE_ELECTION_STATE: 'NOTHING_TO_INITIAL_CHANGE_SINGLE_ELECTION_STATE',
  SET_INITIAL_TO_REMINDER_BROADCAST_SINGLE_ELECTION_STATE: 'SET_INITIAL_TO_REMINDER_BROADCAST_SINGLE_ELECTION_STATE',
  SET_REMINDER_TO_KICKOFF_BROADCAST_SINGLE_ELECTION_STATE: 'SET_REMINDER_TO_KICKOFF_BROADCAST_SINGLE_ELECTION_STATE',
  CHANGE_STAGED_ELECTION_STATE: 'CHANGE_STAGED_ELECTION_STATE',
  ELECTION_ENDED_STATE: 'ELECTION_ENDED_STATE',
  PROCESS_TRANSACTION: 'PROCESS_TRANSACTION',
  VERIFY_AND_ADD: 'VERIFY_AND_ADD',

  SINGLE_ELECTION_VERIFY_AND_ADD: 'SINGLE_ELECTION_VERIFY_AND_ADD',

  //CREATION TO STAGE ONE
  NOTHING_TO_INITIAL_CHANGE_STAGED_ELECTION_STATE: 'NOTHING_TO_INITIAL_CHANGE_STAGED_ELECTION_STATE',
  SET_INITIAL_TO_REMINDER_BROADCAST_STAGED_ELECTION_STATE: 'SET_INITIAL_TO_REMINDER_BROADCAST_STAGED_ELECTION_STATE',
  SET_REMINDER_TO_KICKOFF_BROADCAST_STAGED_ELECTION_STATE: 'SET_REMINDER_TO_KICKOFF_BROADCAST_STAGED_ELECTION_STATE',

  //STAGE ONE
  STAGE_ONE_NOTHING_TO_INITIAL_CHANGE_STAGED_ELECTION_STATE:
    'STAGE_ONE_NOTHING_TO_INITIAL_CHANGE_STAGED_ELECTION_STATE',
  STAGE_ONE_SET_INITIAL_TO_REMINDER_BROADCAST_STAGED_ELECTION_STATE:
    'STAGE_ONE_SET_INITIAL_TO_REMINDER_BROADCAST_STAGED_ELECTION_STATE',
  STAGE_ONE_SET_REMINDER_TO_KICKOFF_BROADCAST_STAGED_ELECTION_STATE:
    'STAGE_ONE_SET_REMINDER_TO_KICKOFF_BROADCAST_STAGED_ELECTION_STATE',
};

export const STAGE_JOB_NAMES = {
  STAGE_ONE_ELECTION: 'STAGE_ONE_ELECTION',
  STAGE_TWO_ELECTION: 'STAGE_TWO_ELECTION',
  STAGE_THREE_ELECTION: 'STAGE_THREE_ELECTION',
  STAGE_ONE_CANDIDATE_NOTIFICATION: 'STAGE_ONE_CANDIDATE_NOTIFICATION',
};

export const SUBSCRIPTION_PROCCESOR_NAMES = {
  STAGE_ONE_CANDIDATE_LIST_SUBSCRIPTION: 'STAGE_ONE_CANDIDATE_LIST_SUBSCRIPTION',
};
export const SUBSCRIPTION_JOB_NAMES = {
  CREATE_STAGEONE_CANDIDATELIST_SUBSCRIPTION_AND_SETEXPIRY: 'CREATE_STAGEONE_CANDIDATELIST_SUBSCRIPTION',
  CREATE_STAGETWO_CANDIDATELIST_SUBSCRIPTION_AND_SETEXPIRY: 'CREATE_STAGETWO_CANDIDATELIST_SUBSCRIPTION',
  CREATE_STAGETHREE_CANDIDATELIST_SUBSCRIPTION_AND_SETEXPIRY: 'CREATE_STAGETHREE_CANDIDATELIST_SUBSCRIPTION',
};

export const getCronExpression = (date: Date): string => {
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are 0-based in JavaScript

  return `${seconds} ${minutes} ${hours} ${day} ${month} *`;
};
export const timeZoneMoment = (mm: any = moment()) => {
  const timezone = 'Africa/Lagos';
  if (!moment_tz.tz.names().includes(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  return moment_tz(mm).tz(timezone);
};
export const checkIfNowIsLessThanOrEqualToADay = (dateTimeString: string | Date) => {
  const oneDayBefore = timeZoneMoment(dateTimeString).subtract(1, 'days');

  // Check if now is before or equal to one day before
  return (
    timeZoneMoment(moment().toISOString()).isAfter(oneDayBefore) ||
    timeZoneMoment(moment().toISOString()).isSame(oneDayBefore)
  );
};
export const checkIfNowIsLessThanOrEqualToAnHourFromPassedDate = (dateTimeString: string | Date) => {
  const dd = timeZoneMoment(dateTimeString).subtract(1, 'hour');

  // Check if now is before or equal to one day before
  return timeZoneMoment().isBefore(dd) || moment().isSame(dd);
};
export const checkIfNowIsGreaterThanADayFromPassedDate = (dateTimeString: string | Date) => {
  const dd = timeZoneMoment(dateTimeString).subtract(1, 'day');

  // Check if now is before or equal to one day before
  return timeZoneMoment().isBefore(dd);
};

export const checkDayiffPassedDate = (dateTimeString: string | Date) => {
  const difference = timeZoneMoment(dateTimeString).diff(moment());

  // Convert milliseconds to hours and return the absolute value
  return moment.duration(difference).asHours();
};

export function encodeBase64(input: string): string {
  return Buffer.from(input).toString('base64');
}
export function sha512ComputeHash(data: string, secretKey: string): string {
  return crypto.createHmac('sha512', secretKey).update(data, 'utf8').digest('hex');
}

export function generatePhoneCode(length: number): string {
  const valid = '1234567890';
  let res = '';

  while (length-- > 0) {
    const uintBuffer = crypto.randomBytes(4);
    const num = uintBuffer.readUInt32BE(0);
    res += valid[num % valid.length];
  }

  return res;
}

export function createRefreshToken(userId: number | null, expiration: number): any {
  const randomNumber = crypto.randomBytes(64);
  return {
    Token: randomNumber.toString('base64'),
    Expires: new Date(Date.now() + expiration * 24 * 60 * 60 * 1000), // Adds expiration days in milliseconds
    CreatedDate: new Date(),
    UserId: userId,
  };
}

export function phoneFormatter(phoneNumber: string | null): string {
  if (phoneNumber === '' || phoneNumber === null) {
    phoneNumber = '090';
  }

  // If the phone number is valid, add the country code and return the full phone number
  if (phoneNumber.startsWith('0')) {
    phoneNumber = phoneNumber.substring(1);
    phoneNumber = '+234' + phoneNumber;
  }

  if (phoneNumber.startsWith('+234')) {
    // No change needed if it already starts with +234
  } else if (phoneNumber.startsWith('234')) {
    phoneNumber = phoneNumber.substring(3);
    phoneNumber = '+234' + phoneNumber;
  } else if (phoneNumber.length === 10 && !phoneNumber.startsWith('234') && !phoneNumber.startsWith('0')) {
    phoneNumber = '+234' + phoneNumber;
  }

  return phoneNumber;
}

export function removeLeading(phoneNumber: string): string {
  // Remove all non-numeric characters
  let cleanedPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');

  // Check for specific prefixes and remove them
  if (cleanedPhoneNumber.startsWith('2348') || cleanedPhoneNumber.startsWith('08')) {
    cleanedPhoneNumber = cleanedPhoneNumber.substring(4);
  }

  return cleanedPhoneNumber;
}

export function serializeDoc<T>(doc: T): T {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(serializeDoc) as T;

  if (typeof doc === 'object') {
    const result = { ...doc };
    Object.keys(result).forEach((key) => {
      const val = result[key];
      if (val && typeof val === 'object') {
        if (val._bsontype === 'ObjectId' || val.buffer) {
          result[key] = val.toString();
        } else if (!Array.isArray(val)) {
          result[key] = serializeDoc(val);
        } else {
          result[key] = val.map((v) => (typeof v === 'object' ? serializeDoc(v) : v));
        }
      }
    });
    return result as T;
  }
  return doc;
}
