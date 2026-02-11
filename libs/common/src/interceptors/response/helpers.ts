import { IMongoError } from '@libs/common/interfaces';
import { Error } from 'mongoose';

// DUPLICATE ERROR (MORE THAN ONE VALUE)
export const handleDuplicateErrorDB = (err: IMongoError) => {
  const errorKeys = Object.keys(err.keyValue);
  return `${errorKeys[0]}: ${err.keyValue[errorKeys[0]]} already exist. Please use another value`;
};

// CAST ERROR (INVALID VALUE)
export const handleCastErrorDB = (err: IMongoError) => {
  const messages: string[] = [];

  Object.keys(err.errors).forEach((val) => messages.push(`Invalid ${err.errors[val].path} - ${err.errors[val].value}`));

  return messages.join('. ');
};

// VALIDATION ERROR (VALUE DOESN'T MATCH EXPECTED VALUE)
export const handleValidationErrorDB = (err: IMongoError) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  return `Invalid Input Data: ${errors.join('. ').replace(/"/g, `'`)}`;
};

// CAST ERROR (INVALID VALUE)
export const handleCastObjectId = (err: Error.CastError) => {
  return `Invalid ${err.path} - ${err.value}`;
};

export const USER_RESPONSE = (resource: string = 'Product') => {
  return {
    DEFAULT: 'Data fetch Successful.',
    FIND_ALL: `${resource}s Data Fetch Successful.`,
    FIND_ONE_BY_ID: `${resource} Data Fetch Successful.`,
    DELETE: `${resource} Deleted Successully.`,
    CREATE: `${resource} Created Successfully.`,
    UPDATE: `${resource} Updated Successfully.`,
  };
};
